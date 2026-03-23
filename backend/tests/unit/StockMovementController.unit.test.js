/**
 * StockMovementController Unit Tests
 * Tests HTTP layer in isolation with mocked stockMovementService dependency.
 */

const { StockMovementController } = require('../../controllers/StockMovementController');

// Mock Logger so constructor does not blow up
jest.mock('../../utils/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Express-style req object.
 * organizationId defaults to 'org-123' so tests can override only what they need.
 */
function buildReq({
  user = { id: 'user-abc', currentOrganizationId: 'org-123' },
  params = {},
  query = {},
  body = {}
} = {}) {
  return { user, params, query, body };
}

/**
 * Build a minimal Express-style res mock that records calls.
 */
function buildRes() {
  const res = {
    _statusCode: 200,
    _json: undefined,
    status: jest.fn().mockImplementation(function (code) {
      res._statusCode = code;
      return res; // chainable
    }),
    json: jest.fn().mockImplementation(function (payload) {
      res._json = payload;
      return res;
    })
  };
  return res;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('StockMovementController Unit Tests', () => {
  let controller;
  let mockStockMovementService;

  beforeEach(() => {
    mockStockMovementService = {
      getOrganizationMovements: jest.fn(),
      getMovementById: jest.fn(),
      createMovement: jest.fn(),
      updateMovement: jest.fn(),
      deleteMovement: jest.fn(),
      getMovementsByProduct: jest.fn(),
      getMovementsByWarehouse: jest.fn(),
      getMovementsByDateRange: jest.fn()
    };

    controller = new StockMovementController(mockStockMovementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // getMovements
  // -------------------------------------------------------------------------

  describe('getMovements', () => {
    test('should return movement list with meta and 200 when org context is present', async () => {
      const movements = [
        { id: 'm-1', type: 'in', quantity: 10 },
        { id: 'm-2', type: 'out', quantity: 5 }
      ];

      mockStockMovementService.getOrganizationMovements.mockResolvedValue(movements);

      const req = buildReq({ query: { limit: '20', offset: '0' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovements(req, res, next);

      expect(mockStockMovementService.getOrganizationMovements).toHaveBeenCalledWith(
        'org-123',
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: movements,
          meta: expect.objectContaining({
            total: 2,
            organizationId: 'org-123'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should pass limit and offset from query to service via buildQueryOptions', async () => {
      mockStockMovementService.getOrganizationMovements.mockResolvedValue([]);

      const req = buildReq({ query: { limit: '50', offset: '10' } });
      const res = buildRes();

      await controller.getMovements(req, res, jest.fn());

      expect(mockStockMovementService.getOrganizationMovements).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ limit: 50, offset: 10 })
      );
    });

    test('should return 400 when organizationId is null', async () => {
      const req = buildReq({ user: { id: 'user-abc', currentOrganizationId: null } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovements(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('organization') })
      );
      expect(mockStockMovementService.getOrganizationMovements).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is undefined', async () => {
      const req = buildReq({ user: { id: 'user-abc', currentOrganizationId: undefined } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovements(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockStockMovementService.getOrganizationMovements).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('DB failure');
      mockStockMovementService.getOrganizationMovements.mockRejectedValue(error);

      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovements(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should return empty data array when no movements exist', async () => {
      mockStockMovementService.getOrganizationMovements.mockResolvedValue([]);

      const req = buildReq();
      const res = buildRes();

      await controller.getMovements(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
          meta: expect.objectContaining({ total: 0 })
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // getMovement
  // -------------------------------------------------------------------------

  describe('getMovement', () => {
    test('should return movement with 200 when found', async () => {
      const movement = { id: 'm-1', type: 'in', quantity: 10, organization_id: 'org-123' };
      mockStockMovementService.getMovementById.mockResolvedValue(movement);

      const req = buildReq({ params: { id: 'm-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovement(req, res, next);

      expect(mockStockMovementService.getMovementById).toHaveBeenCalledWith('m-1', 'org-123');
      expect(res.json).toHaveBeenCalledWith({ data: movement });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 404 when movement is not found (service returns null)', async () => {
      mockStockMovementService.getMovementById.mockResolvedValue(null);

      const req = buildReq({ params: { id: 'nonexistent' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Movement not found' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: 'm-1' },
        user: { id: 'user-abc', currentOrganizationId: null }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockStockMovementService.getMovementById).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is undefined', async () => {
      const req = buildReq({
        params: { id: 'm-1' },
        user: { id: 'user-abc', currentOrganizationId: undefined }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockStockMovementService.getMovementById).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws an unexpected error', async () => {
      const error = new Error('Unexpected DB failure');
      mockStockMovementService.getMovementById.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'm-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovement(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // createMovement
  // -------------------------------------------------------------------------

  describe('createMovement', () => {
    const validBody = {
      product_id: 'prod-1',
      warehouse_id: 'wh-1',
      type: 'in',
      quantity: 50,
      notes: 'Initial stock entry'
    };

    test('should create movement and respond 201 with created data', async () => {
      const created = { id: 'm-99', ...validBody, organization_id: 'org-123' };
      mockStockMovementService.createMovement.mockResolvedValue(created);

      const req = buildReq({ body: validBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.createMovement(req, res, next);

      expect(mockStockMovementService.createMovement).toHaveBeenCalledWith(validBody, 'org-123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Movement created successfully',
          data: created
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is null', async () => {
      const req = buildReq({
        body: validBody,
        user: { id: 'user-abc', currentOrganizationId: null }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.createMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockStockMovementService.createMovement).not.toHaveBeenCalled();
    });

    test('should return 400 when service throws a "required" validation error', async () => {
      const validationError = new Error('product_id is required');
      mockStockMovementService.createMovement.mockRejectedValue(validationError);

      const req = buildReq({ body: {} });
      const res = buildRes();
      const next = jest.fn();

      await controller.createMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: validationError.message })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when service throws a "Required" (capital R) validation error', async () => {
      const validationError = new Error('Required field missing: quantity');
      mockStockMovementService.createMovement.mockRejectedValue(validationError);

      const req = buildReq({ body: {} });
      const res = buildRes();
      const next = jest.fn();

      await controller.createMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: validationError.message })
      );
    });

    test('should return 400 when service throws an "Invalid" error', async () => {
      const validationError = new Error('Invalid movement type');
      mockStockMovementService.createMovement.mockRejectedValue(validationError);

      const req = buildReq({ body: validBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.createMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid movement type' })
      );
    });

    test('should return 400 when service throws a "does not belong" error', async () => {
      const validationError = new Error('Warehouse does not belong to organization');
      mockStockMovementService.createMovement.mockRejectedValue(validationError);

      const req = buildReq({ body: validBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.createMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: validationError.message })
      );
    });

    test('should return 400 when service throws a "found" error (not found variant)', async () => {
      const notFoundError = new Error('Product not found');
      mockStockMovementService.createMovement.mockRejectedValue(notFoundError);

      const req = buildReq({ body: validBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.createMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Product not found' })
      );
    });

    test('should call next(error) on unexpected service error', async () => {
      const error = new Error('Unexpected DB crash');
      mockStockMovementService.createMovement.mockRejectedValue(error);

      const req = buildReq({ body: validBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.createMovement(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalledWith(400);
    });
  });

  // -------------------------------------------------------------------------
  // updateMovement
  // -------------------------------------------------------------------------

  describe('updateMovement', () => {
    const updateBody = { quantity: 75, notes: 'Correction' };

    test('should update movement and respond 200 with updated data', async () => {
      const updated = { id: 'm-1', ...updateBody, organization_id: 'org-123' };
      mockStockMovementService.updateMovement.mockResolvedValue(updated);

      const req = buildReq({ params: { id: 'm-1' }, body: updateBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateMovement(req, res, next);

      expect(mockStockMovementService.updateMovement).toHaveBeenCalledWith(
        'm-1',
        updateBody,
        'org-123'
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Movement updated successfully',
          data: updated
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: 'm-1' },
        body: updateBody,
        user: { id: 'user-abc', currentOrganizationId: null }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockStockMovementService.updateMovement).not.toHaveBeenCalled();
    });

    test('should return 404 when service throws "not found" error', async () => {
      const notFoundError = new Error('Movement not found');
      mockStockMovementService.updateMovement.mockRejectedValue(notFoundError);

      const req = buildReq({ params: { id: 'ghost-id' }, body: updateBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Movement not found' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 404 when service throws "Access denied" error', async () => {
      const accessError = new Error('Access denied');
      mockStockMovementService.updateMovement.mockRejectedValue(accessError);

      const req = buildReq({ params: { id: 'm-1' }, body: updateBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Access denied' })
      );
    });

    test('should return 400 when service throws "required" validation error', async () => {
      const validationError = new Error('quantity is required');
      mockStockMovementService.updateMovement.mockRejectedValue(validationError);

      const req = buildReq({ params: { id: 'm-1' }, body: {} });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'quantity is required' })
      );
    });

    test('should return 400 when service throws "Invalid" error', async () => {
      const validationError = new Error('Invalid movement type');
      mockStockMovementService.updateMovement.mockRejectedValue(validationError);

      const req = buildReq({ params: { id: 'm-1' }, body: updateBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 400 when service throws "does not belong" error', async () => {
      const validationError = new Error('Warehouse does not belong to organization');
      mockStockMovementService.updateMovement.mockRejectedValue(validationError);

      const req = buildReq({ params: { id: 'm-1' }, body: updateBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should call next(error) on unexpected service error', async () => {
      const error = new Error('Unexpected crash');
      mockStockMovementService.updateMovement.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'm-1' }, body: updateBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateMovement(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // deleteMovement
  // -------------------------------------------------------------------------

  describe('deleteMovement', () => {
    test('should delete movement and respond 200 with success message', async () => {
      mockStockMovementService.deleteMovement.mockResolvedValue(undefined);

      const req = buildReq({ params: { id: 'm-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteMovement(req, res, next);

      expect(mockStockMovementService.deleteMovement).toHaveBeenCalledWith('m-1', 'org-123');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Movement deleted successfully' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: 'm-1' },
        user: { id: 'user-abc', currentOrganizationId: undefined }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockStockMovementService.deleteMovement).not.toHaveBeenCalled();
    });

    test('should return 404 when service throws "not found" error', async () => {
      const notFoundError = new Error('Movement not found');
      mockStockMovementService.deleteMovement.mockRejectedValue(notFoundError);

      const req = buildReq({ params: { id: 'ghost-id' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Movement not found' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 404 when service throws "Access denied" error', async () => {
      const accessError = new Error('Access denied');
      mockStockMovementService.deleteMovement.mockRejectedValue(accessError);

      const req = buildReq({ params: { id: 'm-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteMovement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Access denied' })
      );
    });

    test('should call next(error) on unexpected service error', async () => {
      const error = new Error('Constraint violation');
      mockStockMovementService.deleteMovement.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'm-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteMovement(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // getMovementsByProduct
  // -------------------------------------------------------------------------

  describe('getMovementsByProduct', () => {
    test('should return movements with meta for a given product', async () => {
      const movements = [
        { id: 'm-1', product_id: 'prod-1', type: 'in', quantity: 10 }
      ];
      mockStockMovementService.getMovementsByProduct.mockResolvedValue(movements);

      const req = buildReq({ params: { productId: 'prod-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByProduct(req, res, next);

      expect(mockStockMovementService.getMovementsByProduct).toHaveBeenCalledWith(
        'prod-1',
        'org-123',
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: movements,
          meta: expect.objectContaining({
            total: 1,
            productId: 'prod-1',
            organizationId: 'org-123'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should pass pagination options from query to service', async () => {
      mockStockMovementService.getMovementsByProduct.mockResolvedValue([]);

      const req = buildReq({
        params: { productId: 'prod-1' },
        query: { limit: '10', offset: '5' }
      });
      const res = buildRes();

      await controller.getMovementsByProduct(req, res, jest.fn());

      expect(mockStockMovementService.getMovementsByProduct).toHaveBeenCalledWith(
        'prod-1',
        'org-123',
        expect.objectContaining({ limit: 10, offset: 5 })
      );
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { productId: 'prod-1' },
        user: { id: 'user-abc', currentOrganizationId: null }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByProduct(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockStockMovementService.getMovementsByProduct).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Service failure');
      mockStockMovementService.getMovementsByProduct.mockRejectedValue(error);

      const req = buildReq({ params: { productId: 'prod-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByProduct(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('should return empty data array when no movements exist for product', async () => {
      mockStockMovementService.getMovementsByProduct.mockResolvedValue([]);

      const req = buildReq({ params: { productId: 'prod-99' } });
      const res = buildRes();

      await controller.getMovementsByProduct(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
          meta: expect.objectContaining({ total: 0, productId: 'prod-99' })
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // getMovementsByWarehouse
  // -------------------------------------------------------------------------

  describe('getMovementsByWarehouse', () => {
    test('should return movements with meta for a given warehouse', async () => {
      const movements = [
        { id: 'm-3', warehouse_id: 'wh-1', type: 'out', quantity: 20 }
      ];
      mockStockMovementService.getMovementsByWarehouse.mockResolvedValue(movements);

      const req = buildReq({ params: { warehouseId: 'wh-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByWarehouse(req, res, next);

      expect(mockStockMovementService.getMovementsByWarehouse).toHaveBeenCalledWith(
        'wh-1',
        'org-123',
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: movements,
          meta: expect.objectContaining({
            total: 1,
            warehouseId: 'wh-1',
            organizationId: 'org-123'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should pass pagination options from query to service', async () => {
      mockStockMovementService.getMovementsByWarehouse.mockResolvedValue([]);

      const req = buildReq({
        params: { warehouseId: 'wh-1' },
        query: { limit: '25', offset: '0' }
      });
      const res = buildRes();

      await controller.getMovementsByWarehouse(req, res, jest.fn());

      expect(mockStockMovementService.getMovementsByWarehouse).toHaveBeenCalledWith(
        'wh-1',
        'org-123',
        expect.objectContaining({ limit: 25, offset: 0 })
      );
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { warehouseId: 'wh-1' },
        user: { id: 'user-abc', currentOrganizationId: undefined }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByWarehouse(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockStockMovementService.getMovementsByWarehouse).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Warehouse service failure');
      mockStockMovementService.getMovementsByWarehouse.mockRejectedValue(error);

      const req = buildReq({ params: { warehouseId: 'wh-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByWarehouse(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // getMovementsByDateRange
  // -------------------------------------------------------------------------

  describe('getMovementsByDateRange', () => {
    const validQuery = { start: '2024-01-01', end: '2024-12-31' };

    test('should return movements within date range with meta', async () => {
      const movements = [
        { id: 'm-5', type: 'in', quantity: 100 }
      ];
      mockStockMovementService.getMovementsByDateRange.mockResolvedValue(movements);

      const req = buildReq({ query: validQuery });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByDateRange(req, res, next);

      expect(mockStockMovementService.getMovementsByDateRange).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        'org-123',
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: movements,
          meta: expect.objectContaining({
            total: 1,
            dateRange: { start: '2024-01-01', end: '2024-12-31' },
            organizationId: 'org-123'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should pass correctly parsed Date objects to service', async () => {
      mockStockMovementService.getMovementsByDateRange.mockResolvedValue([]);

      const req = buildReq({ query: { start: '2024-03-15', end: '2024-06-30' } });
      const res = buildRes();

      await controller.getMovementsByDateRange(req, res, jest.fn());

      const [startArg, endArg] = mockStockMovementService.getMovementsByDateRange.mock.calls[0];
      expect(startArg).toBeInstanceOf(Date);
      expect(endArg).toBeInstanceOf(Date);
      expect(startArg.getFullYear()).toBe(2024);
      expect(endArg.getMonth()).toBe(5); // June is index 5
    });

    test('should return 400 when start param is missing', async () => {
      const req = buildReq({ query: { end: '2024-12-31' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByDateRange(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Start and end parameters are required' })
      );
      expect(mockStockMovementService.getMovementsByDateRange).not.toHaveBeenCalled();
    });

    test('should return 400 when end param is missing', async () => {
      const req = buildReq({ query: { start: '2024-01-01' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByDateRange(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Start and end parameters are required' })
      );
      expect(mockStockMovementService.getMovementsByDateRange).not.toHaveBeenCalled();
    });

    test('should return 400 when both date params are missing', async () => {
      const req = buildReq({ query: {} });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByDateRange(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockStockMovementService.getMovementsByDateRange).not.toHaveBeenCalled();
    });

    test('should return 400 when start date is invalid', async () => {
      const req = buildReq({ query: { start: 'not-a-date', end: '2024-12-31' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByDateRange(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid dates' })
      );
      expect(mockStockMovementService.getMovementsByDateRange).not.toHaveBeenCalled();
    });

    test('should return 400 when end date is invalid', async () => {
      const req = buildReq({ query: { start: '2024-01-01', end: 'bad-date' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByDateRange(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid dates' })
      );
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        query: validQuery,
        user: { id: 'user-abc', currentOrganizationId: null }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByDateRange(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockStockMovementService.getMovementsByDateRange).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Date range query failed');
      mockStockMovementService.getMovementsByDateRange.mockRejectedValue(error);

      const req = buildReq({ query: validQuery });
      const res = buildRes();
      const next = jest.fn();

      await controller.getMovementsByDateRange(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // buildQueryOptions (private, tested indirectly via getMovements)
  // -------------------------------------------------------------------------

  describe('buildQueryOptions (tested via getMovements)', () => {
    test('should cap limit at 100 even if query requests more', async () => {
      mockStockMovementService.getOrganizationMovements.mockResolvedValue([]);

      const req = buildReq({ query: { limit: '500' } });
      const res = buildRes();

      await controller.getMovements(req, res, jest.fn());

      expect(mockStockMovementService.getOrganizationMovements).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ limit: 100 })
      );
    });

    test('should ignore non-numeric limit', async () => {
      mockStockMovementService.getOrganizationMovements.mockResolvedValue([]);

      const req = buildReq({ query: { limit: 'abc' } });
      const res = buildRes();

      await controller.getMovements(req, res, jest.fn());

      const [, options] = mockStockMovementService.getOrganizationMovements.mock.calls[0];
      expect(options).not.toHaveProperty('limit');
    });

    test('should ignore negative limit', async () => {
      mockStockMovementService.getOrganizationMovements.mockResolvedValue([]);

      const req = buildReq({ query: { limit: '-5' } });
      const res = buildRes();

      await controller.getMovements(req, res, jest.fn());

      const [, options] = mockStockMovementService.getOrganizationMovements.mock.calls[0];
      expect(options).not.toHaveProperty('limit');
    });

    test('should allow offset of 0', async () => {
      mockStockMovementService.getOrganizationMovements.mockResolvedValue([]);

      const req = buildReq({ query: { offset: '0' } });
      const res = buildRes();

      await controller.getMovements(req, res, jest.fn());

      expect(mockStockMovementService.getOrganizationMovements).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ offset: 0 })
      );
    });

    test('should ignore negative offset', async () => {
      mockStockMovementService.getOrganizationMovements.mockResolvedValue([]);

      const req = buildReq({ query: { offset: '-10' } });
      const res = buildRes();

      await controller.getMovements(req, res, jest.fn());

      const [, options] = mockStockMovementService.getOrganizationMovements.mock.calls[0];
      expect(options).not.toHaveProperty('offset');
    });

    test('should include orderBy ascending when order is not desc', async () => {
      mockStockMovementService.getOrganizationMovements.mockResolvedValue([]);

      const req = buildReq({ query: { orderBy: 'created_at', order: 'asc' } });
      const res = buildRes();

      await controller.getMovements(req, res, jest.fn());

      expect(mockStockMovementService.getOrganizationMovements).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          orderBy: { column: 'created_at', ascending: true }
        })
      );
    });

    test('should include orderBy descending when order is desc', async () => {
      mockStockMovementService.getOrganizationMovements.mockResolvedValue([]);

      const req = buildReq({ query: { orderBy: 'created_at', order: 'desc' } });
      const res = buildRes();

      await controller.getMovements(req, res, jest.fn());

      expect(mockStockMovementService.getOrganizationMovements).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          orderBy: { column: 'created_at', ascending: false }
        })
      );
    });

    test('should return empty options object when no query params are given', async () => {
      mockStockMovementService.getOrganizationMovements.mockResolvedValue([]);

      const req = buildReq({ query: {} });
      const res = buildRes();

      await controller.getMovements(req, res, jest.fn());

      const [, options] = mockStockMovementService.getOrganizationMovements.mock.calls[0];
      expect(options).toEqual({});
    });
  });
});
