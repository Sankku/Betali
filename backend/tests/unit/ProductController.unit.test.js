/**
 * ProductController Unit Tests
 * Tests HTTP request handling in isolation with all dependencies mocked.
 * No real DB calls — productService is fully mocked via jest.fn().
 */

const { ProductController } = require('../../controllers/ProductController');

// Mock Logger to suppress log output during tests
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
 * Build a minimal mock Express req object.
 * All tests that care about organization context pass currentOrganizationId.
 */
function buildReq({ params = {}, query = {}, body = {}, user = {} } = {}) {
  return { params, query, body, user };
}

/**
 * Build a mock Express res object that records calls and supports chaining.
 */
function buildRes() {
  const res = {
    _status: 200,
    _body: null,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  // Make status().json() work by binding status to mutate _status then return res
  res.status.mockImplementation((code) => {
    res._status = code;
    return res;
  });
  return res;
}

/**
 * Build a mock productService with jest.fn() stubs for every method.
 */
function buildMockProductService() {
  return {
    getOrganizationProducts: jest.fn(),
    getProductById: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
    searchProducts: jest.fn(),
    getExpiringSoonProducts: jest.fn(),
    getAvailableStock: jest.fn()
  };
}

// ---------------------------------------------------------------------------
// Constants reused across tests
// ---------------------------------------------------------------------------
const ORG_ID = 'org-abc-123';
const USER_ID = 'user-xyz-456';
const PRODUCT_ID = 'prod-111-aaa';
const WAREHOUSE_ID = 'wh-222-bbb';

const SAMPLE_PRODUCT = {
  product_id: PRODUCT_ID,
  name: 'Empanadas de Carne',
  price: 250.0,
  organization_id: ORG_ID
};

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('ProductController Unit Tests', () => {
  let controller;
  let mockProductService;
  let next;

  beforeEach(() => {
    mockProductService = buildMockProductService();
    controller = new ProductController(mockProductService);
    // next() represents the Express error-handling middleware
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // getProducts
  // =========================================================================
  describe('getProducts', () => {
    test('should return 200 with paginated product list using organizationId from req.user', async () => {
      const products = [SAMPLE_PRODUCT, { ...SAMPLE_PRODUCT, product_id: 'prod-222', name: 'Milanesa' }];
      mockProductService.getOrganizationProducts.mockResolvedValue(products);

      const req = buildReq({
        user: { id: USER_ID, currentOrganizationId: ORG_ID },
        query: { limit: '10', offset: '0', sortBy: 'name', sortOrder: 'asc' }
      });
      const res = buildRes();

      await controller.getProducts(req, res, next);

      expect(mockProductService.getOrganizationProducts).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({ limit: 10, offset: 0 })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: products,
          meta: expect.objectContaining({
            total: 2,
            organizationId: ORG_ID
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should cap limit at 100 items maximum', async () => {
      mockProductService.getOrganizationProducts.mockResolvedValue([]);

      const req = buildReq({
        user: { id: USER_ID, currentOrganizationId: ORG_ID },
        query: { limit: '999' }
      });
      const res = buildRes();

      await controller.getProducts(req, res, next);

      expect(mockProductService.getOrganizationProducts).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({ limit: 100 })
      );
    });

    test('should build descending sort option when sortOrder is "desc"', async () => {
      mockProductService.getOrganizationProducts.mockResolvedValue([]);

      const req = buildReq({
        user: { id: USER_ID, currentOrganizationId: ORG_ID },
        query: { sortBy: 'price', sortOrder: 'desc' }
      });
      const res = buildRes();

      await controller.getProducts(req, res, next);

      expect(mockProductService.getOrganizationProducts).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          orderBy: { column: 'price', ascending: false }
        })
      );
    });

    test('should return 400 when organizationId is missing from req.user', async () => {
      const req = buildReq({ user: { id: USER_ID, currentOrganizationId: null } });
      const res = buildRes();

      await controller.getProducts(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('No organization context') })
      );
      expect(mockProductService.getOrganizationProducts).not.toHaveBeenCalled();
    });

    test('should call next(error) when productService throws', async () => {
      const dbError = new Error('Database connection lost');
      mockProductService.getOrganizationProducts.mockRejectedValue(dbError);

      const req = buildReq({ user: { id: USER_ID, currentOrganizationId: ORG_ID } });
      const res = buildRes();

      await controller.getProducts(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getProductById
  // =========================================================================
  describe('getProductById', () => {
    test('should return 200 with product data when product is found', async () => {
      mockProductService.getProductById.mockResolvedValue(SAMPLE_PRODUCT);

      const req = buildReq({
        params: { id: PRODUCT_ID },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.getProductById(req, res, next);

      expect(mockProductService.getProductById).toHaveBeenCalledWith(PRODUCT_ID, ORG_ID);
      expect(res.json).toHaveBeenCalledWith({ data: SAMPLE_PRODUCT });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next with NotFoundError when service throws a not-found error', async () => {
      const notFoundError = new Error('Product not found');
      notFoundError.status = 404;
      mockProductService.getProductById.mockRejectedValue(notFoundError);

      const req = buildReq({
        params: { id: 'nonexistent-id' },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.getProductById(req, res, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: PRODUCT_ID },
        user: { id: USER_ID, currentOrganizationId: undefined }
      });
      const res = buildRes();

      await controller.getProductById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('No organization context') })
      );
      expect(mockProductService.getProductById).not.toHaveBeenCalled();
    });

    test('should pass correct organizationId for multi-tenant isolation', async () => {
      const otherOrgId = 'org-other-999';
      mockProductService.getProductById.mockResolvedValue(SAMPLE_PRODUCT);

      const req = buildReq({
        params: { id: PRODUCT_ID },
        user: { id: USER_ID, currentOrganizationId: otherOrgId }
      });
      const res = buildRes();

      await controller.getProductById(req, res, next);

      // Service must receive the requesting org's ID — not any other
      expect(mockProductService.getProductById).toHaveBeenCalledWith(PRODUCT_ID, otherOrgId);
    });
  });

  // =========================================================================
  // createProduct
  // =========================================================================
  describe('createProduct', () => {
    const newProductBody = {
      name: 'Alfajor',
      price: 150.0,
      description: 'Classic Argentine cookie'
    };

    test('should return 201 with created product on success', async () => {
      const createdProduct = { product_id: 'prod-new-999', ...newProductBody, organization_id: ORG_ID };
      mockProductService.createProduct.mockResolvedValue(createdProduct);

      const req = buildReq({
        body: newProductBody,
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.createProduct(req, res, next);

      expect(mockProductService.createProduct).toHaveBeenCalledWith(newProductBody, USER_ID, ORG_ID);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: createdProduct,
          message: 'Product created successfully'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should pass userId and organizationId from req.user to the service', async () => {
      const specificUserId = 'user-creator-001';
      const specificOrgId = 'org-creator-002';
      mockProductService.createProduct.mockResolvedValue({ product_id: 'new-id' });

      const req = buildReq({
        body: newProductBody,
        user: { id: specificUserId, currentOrganizationId: specificOrgId }
      });
      const res = buildRes();

      await controller.createProduct(req, res, next);

      expect(mockProductService.createProduct).toHaveBeenCalledWith(
        newProductBody,
        specificUserId,
        specificOrgId
      );
    });

    test('should call next with validation error when service throws a 400 error', async () => {
      const validationError = new Error('Price must be a positive number');
      validationError.status = 400;
      mockProductService.createProduct.mockRejectedValue(validationError);

      const req = buildReq({
        body: { name: 'Bad Product', price: -10 },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.createProduct(req, res, next);

      expect(next).toHaveBeenCalledWith(validationError);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        body: newProductBody,
        user: { id: USER_ID, currentOrganizationId: '' }
      });
      const res = buildRes();

      await controller.createProduct(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('No organization context') })
      );
      expect(mockProductService.createProduct).not.toHaveBeenCalled();
    });

    test('should propagate unexpected service errors via next(error)', async () => {
      const unexpectedError = new Error('Unexpected DB failure');
      mockProductService.createProduct.mockRejectedValue(unexpectedError);

      const req = buildReq({
        body: newProductBody,
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.createProduct(req, res, next);

      expect(next).toHaveBeenCalledWith(unexpectedError);
    });
  });

  // =========================================================================
  // updateProduct
  // =========================================================================
  describe('updateProduct', () => {
    const updateBody = { name: 'Empanada Saltenha', price: 300.0 };

    test('should return 200 with updated product on success', async () => {
      const updatedProduct = { ...SAMPLE_PRODUCT, ...updateBody };
      mockProductService.updateProduct.mockResolvedValue(updatedProduct);

      const req = buildReq({
        params: { id: PRODUCT_ID },
        body: updateBody,
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.updateProduct(req, res, next);

      expect(mockProductService.updateProduct).toHaveBeenCalledWith(PRODUCT_ID, updateBody, ORG_ID);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: updatedProduct,
          message: 'Product updated successfully'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next with not-found error when product does not exist', async () => {
      const notFoundError = new Error('Product not found');
      notFoundError.status = 404;
      mockProductService.updateProduct.mockRejectedValue(notFoundError);

      const req = buildReq({
        params: { id: 'ghost-product-id' },
        body: updateBody,
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.updateProduct(req, res, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: PRODUCT_ID },
        body: updateBody,
        user: { id: USER_ID, currentOrganizationId: null }
      });
      const res = buildRes();

      await controller.updateProduct(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockProductService.updateProduct).not.toHaveBeenCalled();
    });

    test('should pass organizationId to service for multi-tenant safety', async () => {
      mockProductService.updateProduct.mockResolvedValue({ ...SAMPLE_PRODUCT, ...updateBody });

      const req = buildReq({
        params: { id: PRODUCT_ID },
        body: updateBody,
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.updateProduct(req, res, next);

      // Verify organization scope is always forwarded
      expect(mockProductService.updateProduct).toHaveBeenCalledWith(
        PRODUCT_ID,
        updateBody,
        ORG_ID
      );
    });

    test('should call next(error) on unexpected service failure', async () => {
      const serviceError = new Error('Constraint violation');
      mockProductService.updateProduct.mockRejectedValue(serviceError);

      const req = buildReq({
        params: { id: PRODUCT_ID },
        body: updateBody,
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.updateProduct(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });
  });

  // =========================================================================
  // deleteProduct
  // =========================================================================
  describe('deleteProduct', () => {
    test('should return 200 with success message when product is deleted', async () => {
      mockProductService.deleteProduct.mockResolvedValue(undefined);

      const req = buildReq({
        params: { id: PRODUCT_ID },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.deleteProduct(req, res, next);

      expect(mockProductService.deleteProduct).toHaveBeenCalledWith(PRODUCT_ID, ORG_ID);
      expect(res.json).toHaveBeenCalledWith({ message: 'Product deleted successfully' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next with not-found error when product does not exist', async () => {
      const notFoundError = new Error('Product not found');
      notFoundError.status = 404;
      mockProductService.deleteProduct.mockRejectedValue(notFoundError);

      const req = buildReq({
        params: { id: 'nonexistent-product' },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.deleteProduct(req, res, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: PRODUCT_ID },
        user: { id: USER_ID, currentOrganizationId: undefined }
      });
      const res = buildRes();

      await controller.deleteProduct(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('No organization context') })
      );
      expect(mockProductService.deleteProduct).not.toHaveBeenCalled();
    });

    test('should enforce multi-tenant isolation by passing organizationId to service', async () => {
      mockProductService.deleteProduct.mockResolvedValue(undefined);

      const req = buildReq({
        params: { id: PRODUCT_ID },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.deleteProduct(req, res, next);

      expect(mockProductService.deleteProduct).toHaveBeenCalledWith(PRODUCT_ID, ORG_ID);
    });

    test('should propagate service errors via next(error)', async () => {
      const serviceError = new Error('Foreign key constraint violation');
      mockProductService.deleteProduct.mockRejectedValue(serviceError);

      const req = buildReq({
        params: { id: PRODUCT_ID },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.deleteProduct(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });
  });

  // =========================================================================
  // getAvailableStock
  // =========================================================================
  describe('getAvailableStock', () => {
    test('should return stock data for product and warehouse', async () => {
      const availableStock = 42;
      mockProductService.getAvailableStock.mockResolvedValue(availableStock);

      const req = buildReq({
        params: { id: PRODUCT_ID },
        query: { warehouse_id: WAREHOUSE_ID },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.getAvailableStock(req, res, next);

      expect(mockProductService.getAvailableStock).toHaveBeenCalledWith(
        PRODUCT_ID,
        WAREHOUSE_ID,
        ORG_ID
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          product_id: PRODUCT_ID,
          warehouse_id: WAREHOUSE_ID,
          organization_id: ORG_ID,
          available_stock: availableStock
        })
      );
      // Response should include a timestamp ISO string
      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall).toHaveProperty('timestamp');
      expect(() => new Date(responseCall.timestamp)).not.toThrow();
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when warehouse_id query param is missing', async () => {
      const req = buildReq({
        params: { id: PRODUCT_ID },
        query: {},
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.getAvailableStock(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'warehouse_id query parameter is required' })
      );
      expect(mockProductService.getAvailableStock).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: PRODUCT_ID },
        query: { warehouse_id: WAREHOUSE_ID },
        user: { id: USER_ID, currentOrganizationId: null }
      });
      const res = buildRes();

      await controller.getAvailableStock(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('No organization context') })
      );
      expect(mockProductService.getAvailableStock).not.toHaveBeenCalled();
    });

    test('should return 0 available stock when product has no remaining units', async () => {
      mockProductService.getAvailableStock.mockResolvedValue(0);

      const req = buildReq({
        params: { id: PRODUCT_ID },
        query: { warehouse_id: WAREHOUSE_ID },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.getAvailableStock(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ available_stock: 0 })
      );
    });

    test('should call next(error) when service throws', async () => {
      const serviceError = new Error('Stock calculation failed');
      mockProductService.getAvailableStock.mockRejectedValue(serviceError);

      const req = buildReq({
        params: { id: PRODUCT_ID },
        query: { warehouse_id: WAREHOUSE_ID },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.getAvailableStock(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });
  });

  // =========================================================================
  // searchProducts
  // =========================================================================
  describe('searchProducts', () => {
    test('should return matching products with search meta', async () => {
      const results = [SAMPLE_PRODUCT];
      mockProductService.searchProducts.mockResolvedValue(results);

      const req = buildReq({
        query: { q: 'Empanada' },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.searchProducts(req, res, next);

      expect(mockProductService.searchProducts).toHaveBeenCalledWith('Empanada', ORG_ID);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: results,
          meta: expect.objectContaining({
            searchTerm: 'Empanada',
            organizationId: ORG_ID,
            total: 1
          })
        })
      );
    });

    test('should return 400 when search term is missing', async () => {
      const req = buildReq({
        query: {},
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.searchProducts(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Search term is required' })
      );
      expect(mockProductService.searchProducts).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        query: { q: 'Alfajor' },
        user: { id: USER_ID, currentOrganizationId: '' }
      });
      const res = buildRes();

      await controller.searchProducts(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockProductService.searchProducts).not.toHaveBeenCalled();
    });

    test('should call next(error) on service failure', async () => {
      const serviceError = new Error('Full-text search unavailable');
      mockProductService.searchProducts.mockRejectedValue(serviceError);

      const req = buildReq({
        query: { q: 'Milanesa' },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.searchProducts(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });
  });

  // =========================================================================
  // getExpiringProducts
  // =========================================================================
  describe('getExpiringProducts', () => {
    test('should return expiring products using default 30 day window', async () => {
      const expiringProducts = [SAMPLE_PRODUCT];
      mockProductService.getExpiringSoonProducts.mockResolvedValue(expiringProducts);

      const req = buildReq({
        query: {},
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.getExpiringProducts(req, res, next);

      // Default days param is 30
      expect(mockProductService.getExpiringSoonProducts).toHaveBeenCalledWith(ORG_ID, 30);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expiringProducts,
          meta: expect.objectContaining({
            days: 30,
            organizationId: ORG_ID,
            total: 1
          })
        })
      );
    });

    test('should accept a custom days query parameter', async () => {
      mockProductService.getExpiringSoonProducts.mockResolvedValue([]);

      const req = buildReq({
        query: { days: '7' },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.getExpiringProducts(req, res, next);

      expect(mockProductService.getExpiringSoonProducts).toHaveBeenCalledWith(ORG_ID, 7);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({ days: 7 })
        })
      );
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        query: {},
        user: { id: USER_ID, currentOrganizationId: null }
      });
      const res = buildRes();

      await controller.getExpiringProducts(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockProductService.getExpiringSoonProducts).not.toHaveBeenCalled();
    });

    test('should call next(error) on service failure', async () => {
      const serviceError = new Error('Expiry query failed');
      mockProductService.getExpiringSoonProducts.mockRejectedValue(serviceError);

      const req = buildReq({
        query: {},
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.getExpiringProducts(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });
  });

  // =========================================================================
  // buildQueryOptions (private helper — tested indirectly)
  // =========================================================================
  describe('buildQueryOptions (via getProducts)', () => {
    test('should produce empty options when no query params are provided', async () => {
      mockProductService.getOrganizationProducts.mockResolvedValue([]);

      const req = buildReq({
        query: {},
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.getProducts(req, res, next);

      expect(mockProductService.getOrganizationProducts).toHaveBeenCalledWith(ORG_ID, {});
    });

    test('should set ascending: true when sortOrder is anything other than "desc"', async () => {
      mockProductService.getOrganizationProducts.mockResolvedValue([]);

      const req = buildReq({
        query: { sortBy: 'name', sortOrder: 'asc' },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.getProducts(req, res, next);

      expect(mockProductService.getOrganizationProducts).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          orderBy: { column: 'name', ascending: true }
        })
      );
    });

    test('should parse offset as integer from query string', async () => {
      mockProductService.getOrganizationProducts.mockResolvedValue([]);

      const req = buildReq({
        query: { offset: '50' },
        user: { id: USER_ID, currentOrganizationId: ORG_ID }
      });
      const res = buildRes();

      await controller.getProducts(req, res, next);

      expect(mockProductService.getOrganizationProducts).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({ offset: 50 })
      );
    });
  });
});
