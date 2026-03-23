/**
 * WarehouseController Unit Tests
 * Tests HTTP layer in isolation with mocked warehouseService dependency.
 */

const { WarehouseController } = require('../../controllers/WarehouseController');

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

describe('WarehouseController Unit Tests', () => {
  let controller;
  let mockWarehouseService;

  beforeEach(() => {
    mockWarehouseService = {
      getOrganizationWarehouses: jest.fn(),
      getWarehouseById: jest.fn(),
      createWarehouse: jest.fn(),
      updateWarehouse: jest.fn(),
      deactivateWarehouse: jest.fn(),
      deleteWarehouse: jest.fn(),
      getWarehouseMovements: jest.fn()
    };

    controller = new WarehouseController(mockWarehouseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // getWarehouses
  // -------------------------------------------------------------------------

  describe('getWarehouses', () => {
    test('should return warehouse list with 200 and correct meta', async () => {
      const warehouses = [
        { id: 'wh-1', name: 'Main Warehouse' },
        { id: 'wh-2', name: 'Secondary Warehouse' }
      ];

      mockWarehouseService.getOrganizationWarehouses.mockResolvedValue(warehouses);

      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      await controller.getWarehouses(req, res, next);

      expect(mockWarehouseService.getOrganizationWarehouses).toHaveBeenCalledWith(
        'org-123',
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: warehouses,
          meta: expect.objectContaining({
            total: 2,
            organizationId: 'org-123'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should pass pagination options from query string', async () => {
      mockWarehouseService.getOrganizationWarehouses.mockResolvedValue([]);

      const req = buildReq({ query: { limit: '5', offset: '10' } });
      const res = buildRes();

      await controller.getWarehouses(req, res, jest.fn());

      expect(mockWarehouseService.getOrganizationWarehouses).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ limit: 5, offset: 10 })
      );
    });

    test('should pass sorting options when sortBy and sortOrder are provided', async () => {
      mockWarehouseService.getOrganizationWarehouses.mockResolvedValue([]);

      const req = buildReq({ query: { sortBy: 'name', sortOrder: 'desc' } });
      const res = buildRes();

      await controller.getWarehouses(req, res, jest.fn());

      expect(mockWarehouseService.getOrganizationWarehouses).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          orderBy: expect.objectContaining({ column: 'name', ascending: false })
        })
      );
    });

    test('should pass active filter when active query param is set to true', async () => {
      mockWarehouseService.getOrganizationWarehouses.mockResolvedValue([]);

      const req = buildReq({ query: { active: 'true' } });
      const res = buildRes();

      await controller.getWarehouses(req, res, jest.fn());

      expect(mockWarehouseService.getOrganizationWarehouses).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          filters: expect.objectContaining({ is_active: true })
        })
      );
    });

    test('should pass active filter when active query param is set to false', async () => {
      mockWarehouseService.getOrganizationWarehouses.mockResolvedValue([]);

      const req = buildReq({ query: { active: 'false' } });
      const res = buildRes();

      await controller.getWarehouses(req, res, jest.fn());

      expect(mockWarehouseService.getOrganizationWarehouses).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          filters: expect.objectContaining({ is_active: false })
        })
      );
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({ user: { id: 'user-abc', currentOrganizationId: null } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getWarehouses(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('organization') })
      );
      expect(mockWarehouseService.getOrganizationWarehouses).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is undefined', async () => {
      const req = buildReq({ user: { id: 'user-abc', currentOrganizationId: undefined } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getWarehouses(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockWarehouseService.getOrganizationWarehouses).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('DB failure');
      mockWarehouseService.getOrganizationWarehouses.mockRejectedValue(error);

      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      await controller.getWarehouses(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getWarehouseById
  // -------------------------------------------------------------------------

  describe('getWarehouseById', () => {
    test('should return warehouse with 200 when found', async () => {
      const warehouse = { id: 'wh-1', name: 'Main Warehouse', organization_id: 'org-123' };
      mockWarehouseService.getWarehouseById.mockResolvedValue(warehouse);

      const req = buildReq({ params: { id: 'wh-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getWarehouseById(req, res, next);

      expect(mockWarehouseService.getWarehouseById).toHaveBeenCalledWith('wh-1', 'org-123');
      expect(res.json).toHaveBeenCalledWith({ data: warehouse });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when warehouse is not found (service throws)', async () => {
      const notFoundError = new Error('Warehouse not found');
      notFoundError.statusCode = 404;
      mockWarehouseService.getWarehouseById.mockRejectedValue(notFoundError);

      const req = buildReq({ params: { id: 'nonexistent' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getWarehouseById(req, res, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: 'wh-1' },
        user: { id: 'user-abc', currentOrganizationId: undefined }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.getWarehouseById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockWarehouseService.getWarehouseById).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is null', async () => {
      const req = buildReq({
        params: { id: 'wh-1' },
        user: { id: 'user-abc', currentOrganizationId: null }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.getWarehouseById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should call next(error) when service throws an unexpected error', async () => {
      const error = new Error('Unexpected failure');
      mockWarehouseService.getWarehouseById.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'wh-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getWarehouseById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // createWarehouse
  // -------------------------------------------------------------------------

  describe('createWarehouse', () => {
    const validBody = {
      name: 'New Warehouse',
      location: '123 Main St',
      capacity: 500
    };

    test('should create warehouse and respond 201 with created data', async () => {
      const created = { id: 'wh-99', ...validBody, organization_id: 'org-123' };
      mockWarehouseService.createWarehouse.mockResolvedValue(created);

      const req = buildReq({ body: validBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.createWarehouse(req, res, next);

      expect(mockWarehouseService.createWarehouse).toHaveBeenCalledWith(
        validBody,
        'user-abc',
        'org-123'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: created,
          message: 'Warehouse created successfully'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should pass userId and organizationId from req.user to service', async () => {
      const created = { id: 'wh-100', name: 'Alt Warehouse', organization_id: 'org-456' };
      mockWarehouseService.createWarehouse.mockResolvedValue(created);

      const req = buildReq({
        body: { name: 'Alt Warehouse' },
        user: { id: 'user-xyz', currentOrganizationId: 'org-456' }
      });
      const res = buildRes();

      await controller.createWarehouse(req, res, jest.fn());

      expect(mockWarehouseService.createWarehouse).toHaveBeenCalledWith(
        expect.any(Object),
        'user-xyz',
        'org-456'
      );
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        body: validBody,
        user: { id: 'user-abc', currentOrganizationId: null }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.createWarehouse(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockWarehouseService.createWarehouse).not.toHaveBeenCalled();
    });

    test('should call next(error) on service error', async () => {
      const serviceError = new Error('Duplicate warehouse name');
      serviceError.statusCode = 409;
      mockWarehouseService.createWarehouse.mockRejectedValue(serviceError);

      const req = buildReq({ body: validBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.createWarehouse(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });
  });

  // -------------------------------------------------------------------------
  // updateWarehouse
  // -------------------------------------------------------------------------

  describe('updateWarehouse', () => {
    const updateBody = { name: 'Updated Warehouse', location: '456 New St' };

    test('should update warehouse and respond 200 with updated data and message', async () => {
      const updated = { id: 'wh-1', ...updateBody, organization_id: 'org-123' };
      mockWarehouseService.updateWarehouse.mockResolvedValue(updated);

      const req = buildReq({ params: { id: 'wh-1' }, body: { ...updateBody } });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateWarehouse(req, res, next);

      expect(mockWarehouseService.updateWarehouse).toHaveBeenCalledWith(
        'wh-1',
        updateBody,
        'org-123'
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: updated,
          message: 'Warehouse updated successfully'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when warehouse is not found (service throws)', async () => {
      const notFoundError = new Error('Warehouse not found');
      notFoundError.statusCode = 404;
      mockWarehouseService.updateWarehouse.mockRejectedValue(notFoundError);

      const req = buildReq({ params: { id: 'nonexistent' }, body: updateBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateWarehouse(req, res, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: 'wh-1' },
        body: updateBody,
        user: { id: 'user-abc', currentOrganizationId: '' }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateWarehouse(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockWarehouseService.updateWarehouse).not.toHaveBeenCalled();
    });

    test('should call next(error) on unexpected service error', async () => {
      const error = new Error('Unexpected DB error');
      mockWarehouseService.updateWarehouse.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'wh-1' }, body: updateBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateWarehouse(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // deactivateWarehouse
  // -------------------------------------------------------------------------

  describe('deactivateWarehouse', () => {
    test('should deactivate warehouse and respond 200 with data and message', async () => {
      const deactivated = { id: 'wh-1', name: 'Main Warehouse', is_active: false };
      mockWarehouseService.deactivateWarehouse.mockResolvedValue(deactivated);

      const req = buildReq({ params: { id: 'wh-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deactivateWarehouse(req, res, next);

      expect(mockWarehouseService.deactivateWarehouse).toHaveBeenCalledWith('wh-1', 'org-123');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: deactivated,
          message: 'Warehouse deactivated successfully'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when warehouse is not found (service throws)', async () => {
      const notFoundError = new Error('Warehouse not found');
      notFoundError.statusCode = 404;
      mockWarehouseService.deactivateWarehouse.mockRejectedValue(notFoundError);

      const req = buildReq({ params: { id: 'nonexistent' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deactivateWarehouse(req, res, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: 'wh-1' },
        user: { id: 'user-abc', currentOrganizationId: null }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.deactivateWarehouse(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockWarehouseService.deactivateWarehouse).not.toHaveBeenCalled();
    });

    test('should call next(error) on unexpected service error', async () => {
      const error = new Error('Cannot deactivate warehouse with active stock');
      mockWarehouseService.deactivateWarehouse.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'wh-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deactivateWarehouse(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // deleteWarehouse
  // -------------------------------------------------------------------------

  describe('deleteWarehouse', () => {
    test('should permanently delete warehouse and respond 200 with success message', async () => {
      mockWarehouseService.deleteWarehouse.mockResolvedValue(undefined);

      const req = buildReq({ params: { id: 'wh-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteWarehouse(req, res, next);

      expect(mockWarehouseService.deleteWarehouse).toHaveBeenCalledWith('wh-1', 'org-123');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Warehouse deleted permanently'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when warehouse is not found (service throws)', async () => {
      const notFoundError = new Error('Warehouse not found');
      notFoundError.statusCode = 404;
      mockWarehouseService.deleteWarehouse.mockRejectedValue(notFoundError);

      const req = buildReq({ params: { id: 'nonexistent' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteWarehouse(req, res, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: 'wh-1' },
        user: { id: 'user-abc', currentOrganizationId: undefined }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteWarehouse(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockWarehouseService.deleteWarehouse).not.toHaveBeenCalled();
    });

    test('should call next(error) on constraint violation', async () => {
      const error = new Error('Cannot delete warehouse with associated records');
      mockWarehouseService.deleteWarehouse.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'wh-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteWarehouse(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // getWarehouseMovements
  // -------------------------------------------------------------------------

  describe('getWarehouseMovements', () => {
    const movementsData = {
      warehouse_id: 'wh-1',
      warehouse_name: 'Main Warehouse',
      movements: [
        { id: 'mv-1', type: 'IN', quantity: 100 },
        { id: 'mv-2', type: 'OUT', quantity: 50 }
      ],
      meta: {
        total: 2,
        limit: 20,
        offset: 0
      }
    };

    test('should return movements with 200 and full meta', async () => {
      mockWarehouseService.getWarehouseMovements.mockResolvedValue(movementsData);

      const req = buildReq({ params: { id: 'wh-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getWarehouseMovements(req, res, next);

      expect(mockWarehouseService.getWarehouseMovements).toHaveBeenCalledWith(
        'wh-1',
        'org-123',
        expect.objectContaining({ limit: 20, offset: 0 })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: movementsData.movements,
          meta: expect.objectContaining({
            warehouse_id: 'wh-1',
            warehouse_name: 'Main Warehouse',
            organizationId: 'org-123'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should use default limit 20 and offset 0 when query params are absent', async () => {
      mockWarehouseService.getWarehouseMovements.mockResolvedValue(movementsData);

      const req = buildReq({ params: { id: 'wh-1' } });
      const res = buildRes();

      await controller.getWarehouseMovements(req, res, jest.fn());

      expect(mockWarehouseService.getWarehouseMovements).toHaveBeenCalledWith(
        'wh-1',
        'org-123',
        { limit: 20, offset: 0 }
      );
    });

    test('should respect custom limit and offset from query string', async () => {
      mockWarehouseService.getWarehouseMovements.mockResolvedValue(movementsData);

      const req = buildReq({ params: { id: 'wh-1' }, query: { limit: '50', offset: '100' } });
      const res = buildRes();

      await controller.getWarehouseMovements(req, res, jest.fn());

      expect(mockWarehouseService.getWarehouseMovements).toHaveBeenCalledWith(
        'wh-1',
        'org-123',
        { limit: 50, offset: 100 }
      );
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: 'wh-1' },
        user: { id: 'user-abc', currentOrganizationId: null }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.getWarehouseMovements(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('organization') })
      );
      expect(mockWarehouseService.getWarehouseMovements).not.toHaveBeenCalled();
    });

    test('should call next(error) when warehouse is not found (service throws)', async () => {
      const notFoundError = new Error('Warehouse not found');
      notFoundError.statusCode = 404;
      mockWarehouseService.getWarehouseMovements.mockRejectedValue(notFoundError);

      const req = buildReq({ params: { id: 'nonexistent' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getWarehouseMovements(req, res, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });

    test('should call next(error) on unexpected service error', async () => {
      const error = new Error('DB connection lost');
      mockWarehouseService.getWarehouseMovements.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'wh-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getWarehouseMovements(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // buildQueryOptions (tested indirectly via getWarehouses)
  // -------------------------------------------------------------------------

  describe('buildQueryOptions (via getWarehouses)', () => {
    test('should cap limit at 100 regardless of provided value', async () => {
      mockWarehouseService.getOrganizationWarehouses.mockResolvedValue([]);

      const req = buildReq({ query: { limit: '999' } });
      const res = buildRes();

      await controller.getWarehouses(req, res, jest.fn());

      expect(mockWarehouseService.getOrganizationWarehouses).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ limit: 100 })
      );
    });

    test('should not include limit or offset in options when query params are absent', async () => {
      mockWarehouseService.getOrganizationWarehouses.mockResolvedValue([]);

      const req = buildReq({ query: {} });
      const res = buildRes();

      await controller.getWarehouses(req, res, jest.fn());

      const calledOptions = mockWarehouseService.getOrganizationWarehouses.mock.calls[0][1];
      expect(calledOptions).not.toHaveProperty('limit');
      expect(calledOptions).not.toHaveProperty('offset');
    });

    test('should set ascending to true when sortOrder is not desc', async () => {
      mockWarehouseService.getOrganizationWarehouses.mockResolvedValue([]);

      const req = buildReq({ query: { sortBy: 'created_at', sortOrder: 'asc' } });
      const res = buildRes();

      await controller.getWarehouses(req, res, jest.fn());

      expect(mockWarehouseService.getOrganizationWarehouses).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          orderBy: expect.objectContaining({ ascending: true })
        })
      );
    });

    test('should not include filters when active query param is absent', async () => {
      mockWarehouseService.getOrganizationWarehouses.mockResolvedValue([]);

      const req = buildReq({ query: { limit: '10' } });
      const res = buildRes();

      await controller.getWarehouses(req, res, jest.fn());

      const calledOptions = mockWarehouseService.getOrganizationWarehouses.mock.calls[0][1];
      expect(calledOptions).not.toHaveProperty('filters');
    });

    test('should spread options into meta of the response', async () => {
      const warehouses = [{ id: 'wh-1' }];
      mockWarehouseService.getOrganizationWarehouses.mockResolvedValue(warehouses);

      const req = buildReq({ query: { limit: '5', offset: '0' } });
      const res = buildRes();

      await controller.getWarehouses(req, res, jest.fn());

      const payload = res.json.mock.calls[0][0];
      expect(payload.meta).toMatchObject({
        total: 1,
        organizationId: 'org-123',
        limit: 5,
        offset: 0
      });
    });
  });
});
