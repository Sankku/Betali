/**
 * OrderController Unit Tests
 * Tests HTTP layer in isolation with mocked orderService dependency.
 */

const OrderController = require('../../controllers/OrderController');

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

describe('OrderController Unit Tests', () => {
  let controller;
  let mockOrderService;

  beforeEach(() => {
    mockOrderService = {
      getOrders: jest.fn(),
      getOrderById: jest.fn(),
      createOrder: jest.fn(),
      updateOrder: jest.fn(),
      updateOrderStatus: jest.fn(),
      deleteOrder: jest.fn(),
      getOrderStats: jest.fn(),
      fulfillOrder: jest.fn(),
      calculateOrderPricing: jest.fn(),
      validateCouponCode: jest.fn(),
      reserveStockForOrder: jest.fn(),
      releaseStockReservations: jest.fn(),
      getOrderReservations: jest.fn(),
      getAvailableStock: jest.fn()
    };

    controller = new OrderController(mockOrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // getOrders
  // -------------------------------------------------------------------------

  describe('getOrders', () => {
    const serviceResult = {
      orders: [
        { order_id: 'o-1', status: 'draft' },
        { order_id: 'o-2', status: 'processing' }
      ],
      pagination: { total: 2, limit: 50, offset: 0 },
      stats: { total_amount: 500 }
    };

    test('should return orders list with pagination and stats on success', async () => {
      mockOrderService.getOrders.mockResolvedValue(serviceResult);

      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      await controller.getOrders(req, res, next);

      expect(mockOrderService.getOrders).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          filters: {},
          pagination: { limit: 50, offset: 0 },
          sort: { orderBy: { column: 'created_at', ascending: false } }
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: serviceResult.orders,
        pagination: serviceResult.pagination,
        stats: serviceResult.stats
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should parse limit, offset and sort query params correctly', async () => {
      mockOrderService.getOrders.mockResolvedValue(serviceResult);

      const req = buildReq({
        query: { limit: '10', offset: '20', sort_by: 'total_amount', sort_order: 'asc' }
      });
      const res = buildRes();

      await controller.getOrders(req, res, jest.fn());

      expect(mockOrderService.getOrders).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          pagination: { limit: 10, offset: 20 },
          sort: { orderBy: { column: 'total_amount', ascending: true } }
        })
      );
    });

    test('should forward status, client_id and search into filters when provided', async () => {
      mockOrderService.getOrders.mockResolvedValue(serviceResult);

      const req = buildReq({
        query: { status: 'processing', client_id: 'c-1', search: 'urgent' }
      });
      const res = buildRes();

      await controller.getOrders(req, res, jest.fn());

      expect(mockOrderService.getOrders).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          filters: { status: 'processing', client_id: 'c-1', search: 'urgent' }
        })
      );
    });

    test('should not include missing optional filters in the filters object', async () => {
      mockOrderService.getOrders.mockResolvedValue(serviceResult);

      const req = buildReq({ query: { status: 'draft' } });
      const res = buildRes();

      await controller.getOrders(req, res, jest.fn());

      const [, options] = mockOrderService.getOrders.mock.calls[0];
      expect(options.filters).toEqual({ status: 'draft' });
      expect(options.filters).not.toHaveProperty('client_id');
      expect(options.filters).not.toHaveProperty('search');
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('DB failure');
      mockOrderService.getOrders.mockRejectedValue(error);

      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      await controller.getOrders(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getOrderById
  // -------------------------------------------------------------------------

  describe('getOrderById', () => {
    const order = { order_id: 'o-1', status: 'draft', client_id: 'c-1' };

    test('should return order with success:true when found', async () => {
      mockOrderService.getOrderById.mockResolvedValue(order);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getOrderById(req, res, next);

      expect(mockOrderService.getOrderById).toHaveBeenCalledWith('o-1', 'org-123');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: order });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 404 when service returns null', async () => {
      mockOrderService.getOrderById.mockResolvedValue(null);

      const req = buildReq({ params: { id: 'nonexistent' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getOrderById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Order not found'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Unexpected DB error');
      mockOrderService.getOrderById.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getOrderById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // createOrder
  // -------------------------------------------------------------------------

  describe('createOrder', () => {
    const orderBody = {
      client_id: 'c-1',
      warehouse_id: 'wh-1',
      items: [{ product_id: 'p-1', quantity: 2, price: 10.0 }]
    };

    test('should create order and respond 201 with created data', async () => {
      const created = { order_id: 'o-99', ...orderBody, user_id: 'user-abc' };
      mockOrderService.createOrder.mockResolvedValue(created);

      const req = buildReq({ body: orderBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.createOrder(req, res, next);

      expect(mockOrderService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ ...orderBody, user_id: 'user-abc' }),
        'org-123'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: created,
        message: 'Order created successfully'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should inject user_id from req.user into the order payload', async () => {
      const created = { order_id: 'o-100', user_id: 'user-xyz' };
      mockOrderService.createOrder.mockResolvedValue(created);

      const req = buildReq({
        body: { client_id: 'c-1' },
        user: { id: 'user-xyz', currentOrganizationId: 'org-456' }
      });
      const res = buildRes();

      await controller.createOrder(req, res, jest.fn());

      expect(mockOrderService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-xyz' }),
        'org-456'
      );
    });

    test('should call next(error) when service throws a validation error', async () => {
      const validationError = new Error('Insufficient stock');
      validationError.statusCode = 400;
      mockOrderService.createOrder.mockRejectedValue(validationError);

      const req = buildReq({ body: orderBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.createOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(validationError);
    });
  });

  // -------------------------------------------------------------------------
  // updateOrder
  // -------------------------------------------------------------------------

  describe('updateOrder', () => {
    const updateBody = { notes: 'Updated notes', status: 'processing' };

    test('should update order and respond 200', async () => {
      const updated = { order_id: 'o-1', ...updateBody };
      mockOrderService.updateOrder.mockResolvedValue(updated);

      const req = buildReq({ params: { id: 'o-1' }, body: updateBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateOrder(req, res, next);

      expect(mockOrderService.updateOrder).toHaveBeenCalledWith('o-1', 'org-123', updateBody);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updated,
        message: 'Order updated successfully'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Order cannot be updated in its current state');
      mockOrderService.updateOrder.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'o-1' }, body: updateBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // updateOrderStatus
  // -------------------------------------------------------------------------

  describe('updateOrderStatus', () => {
    test('should update order status and respond 200 with message', async () => {
      const updated = { order_id: 'o-1', status: 'processing' };
      mockOrderService.updateOrderStatus.mockResolvedValue(updated);

      const req = buildReq({ params: { id: 'o-1' }, body: { status: 'processing' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateOrderStatus(req, res, next);

      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith('o-1', 'org-123', 'processing');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updated,
        message: 'Order status updated to processing'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when status is missing from body', async () => {
      const req = buildReq({ params: { id: 'o-1' }, body: {} });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateOrderStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status is required'
      });
      expect(mockOrderService.updateOrderStatus).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when status is an empty string', async () => {
      const req = buildReq({ params: { id: 'o-1' }, body: { status: '' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateOrderStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockOrderService.updateOrderStatus).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Invalid status transition');
      mockOrderService.updateOrderStatus.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'o-1' }, body: { status: 'completed' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateOrderStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // deleteOrder
  // -------------------------------------------------------------------------

  describe('deleteOrder', () => {
    test('should delete order and respond 200 with success message when service returns true', async () => {
      mockOrderService.deleteOrder.mockResolvedValue(true);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteOrder(req, res, next);

      expect(mockOrderService.deleteOrder).toHaveBeenCalledWith('o-1', 'org-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Order cancelled successfully'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should respond 500 when service returns false', async () => {
      mockOrderService.deleteOrder.mockResolvedValue(false);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to cancel order'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Cannot cancel a fulfilled order');
      mockOrderService.deleteOrder.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // getOrderStats
  // -------------------------------------------------------------------------

  describe('getOrderStats', () => {
    test('should return stats with success:true', async () => {
      const stats = { total_orders: 10, total_amount: 2500, pending: 3 };
      mockOrderService.getOrderStats.mockResolvedValue(stats);

      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      await controller.getOrderStats(req, res, next);

      expect(mockOrderService.getOrderStats).toHaveBeenCalledWith('org-123');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: stats });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Stats query failed');
      mockOrderService.getOrderStats.mockRejectedValue(error);

      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      await controller.getOrderStats(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // duplicateOrder
  // -------------------------------------------------------------------------

  describe('duplicateOrder', () => {
    const originalOrder = {
      order_id: 'o-1',
      client_id: 'c-1',
      warehouse_id: 'wh-1',
      notes: 'Original notes',
      tax_amount: 50,
      order_details: [
        { product_id: 'p-1', quantity: 2, price: 10.0 },
        { product_id: 'p-2', quantity: 1, price: 20.0 }
      ]
    };

    test('should duplicate order and respond 201', async () => {
      const duplicated = { order_id: 'o-99', client_id: 'c-1' };
      mockOrderService.getOrderById.mockResolvedValue(originalOrder);
      mockOrderService.createOrder.mockResolvedValue(duplicated);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.duplicateOrder(req, res, next);

      expect(mockOrderService.getOrderById).toHaveBeenCalledWith('o-1', 'org-123');
      expect(mockOrderService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'c-1',
          warehouse_id: 'wh-1',
          status: 'draft',
          notes: 'Duplicated from Order #o-1',
          items: [
            { product_id: 'p-1', quantity: 2, price: 10.0 },
            { product_id: 'p-2', quantity: 1, price: 20.0 }
          ]
        }),
        'org-123'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: duplicated,
        message: 'Order duplicated successfully'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should pass tax_rate_ids: [] when original order has zero tax_amount', async () => {
      const zeroTaxOrder = { ...originalOrder, tax_amount: 0 };
      mockOrderService.getOrderById.mockResolvedValue(zeroTaxOrder);
      mockOrderService.createOrder.mockResolvedValue({ order_id: 'o-100' });

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();

      await controller.duplicateOrder(req, res, jest.fn());

      const [payload] = mockOrderService.createOrder.mock.calls[0];
      expect(payload.tax_rate_ids).toEqual([]);
    });

    test('should pass tax_rate_ids: [] when original order has null tax_amount', async () => {
      const nullTaxOrder = { ...originalOrder, tax_amount: null };
      mockOrderService.getOrderById.mockResolvedValue(nullTaxOrder);
      mockOrderService.createOrder.mockResolvedValue({ order_id: 'o-101' });

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();

      await controller.duplicateOrder(req, res, jest.fn());

      const [payload] = mockOrderService.createOrder.mock.calls[0];
      expect(payload.tax_rate_ids).toEqual([]);
    });

    test('should not set tax_rate_ids when original order has non-zero tax_amount', async () => {
      mockOrderService.getOrderById.mockResolvedValue(originalOrder); // tax_amount: 50
      mockOrderService.createOrder.mockResolvedValue({ order_id: 'o-102' });

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();

      await controller.duplicateOrder(req, res, jest.fn());

      const [payload] = mockOrderService.createOrder.mock.calls[0];
      expect(payload.tax_rate_ids).toBeUndefined();
    });

    test('should return 404 when original order is not found', async () => {
      mockOrderService.getOrderById.mockResolvedValue(null);

      const req = buildReq({ params: { id: 'nonexistent' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.duplicateOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Order not found'
      });
      expect(mockOrderService.createOrder).not.toHaveBeenCalled();
    });

    test('should call next(error) when getOrderById throws', async () => {
      const error = new Error('DB failure');
      mockOrderService.getOrderById.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.duplicateOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('should call next(error) when createOrder throws', async () => {
      const error = new Error('Create failed');
      mockOrderService.getOrderById.mockResolvedValue(originalOrder);
      mockOrderService.createOrder.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.duplicateOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // fulfillOrder
  // -------------------------------------------------------------------------

  describe('fulfillOrder', () => {
    test('should fulfill order and respond 200', async () => {
      const fulfilled = { order_id: 'o-1', status: 'shipped' };
      mockOrderService.fulfillOrder.mockResolvedValue(fulfilled);

      const req = buildReq({ params: { id: 'o-1' }, body: { tracking_number: 'TRK-001' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.fulfillOrder(req, res, next);

      expect(mockOrderService.fulfillOrder).toHaveBeenCalledWith(
        'o-1',
        'org-123',
        { tracking_number: 'TRK-001' }
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: fulfilled,
        message: 'Order fulfilled successfully. Stock has been deducted.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should use empty object as fulfillmentData when body is absent', async () => {
      const fulfilled = { order_id: 'o-1', status: 'shipped' };
      mockOrderService.fulfillOrder.mockResolvedValue(fulfilled);

      const req = buildReq({ params: { id: 'o-1' } }); // body defaults to {}
      const res = buildRes();

      await controller.fulfillOrder(req, res, jest.fn());

      expect(mockOrderService.fulfillOrder).toHaveBeenCalledWith('o-1', 'org-123', {});
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Insufficient stock to fulfill order');
      mockOrderService.fulfillOrder.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.fulfillOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // processOrder
  // -------------------------------------------------------------------------

  describe('processOrder', () => {
    test('should mark order as processing and respond 200', async () => {
      const updated = { order_id: 'o-1', status: 'processing' };
      mockOrderService.updateOrderStatus.mockResolvedValue(updated);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.processOrder(req, res, next);

      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith('o-1', 'org-123', 'processing');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updated,
        message: 'Order is now being processed. Stock availability validated.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Order already processing');
      mockOrderService.updateOrderStatus.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.processOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // completeOrder
  // -------------------------------------------------------------------------

  describe('completeOrder', () => {
    test('should mark order as completed and respond 200', async () => {
      const updated = { order_id: 'o-1', status: 'completed' };
      mockOrderService.updateOrderStatus.mockResolvedValue(updated);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.completeOrder(req, res, next);

      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith('o-1', 'org-123', 'completed');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updated,
        message: 'Order completed successfully'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Order not in a completable state');
      mockOrderService.updateOrderStatus.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.completeOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // calculateOrderPricing
  // -------------------------------------------------------------------------

  describe('calculateOrderPricing', () => {
    const orderData = {
      items: [{ product_id: 'p-1', quantity: 3, price: 15.0 }],
      coupon_code: 'SAVE10'
    };

    test('should return pricing result with success:true', async () => {
      const pricingResult = {
        subtotal: 45,
        discount: 4.5,
        tax: 3.6,
        total: 44.1
      };
      mockOrderService.calculateOrderPricing.mockResolvedValue(pricingResult);

      const req = buildReq({ body: orderData });
      const res = buildRes();
      const next = jest.fn();

      await controller.calculateOrderPricing(req, res, next);

      expect(mockOrderService.calculateOrderPricing).toHaveBeenCalledWith(orderData, 'org-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: pricingResult,
        message: 'Order pricing calculated successfully'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Product not found during pricing calculation');
      mockOrderService.calculateOrderPricing.mockRejectedValue(error);

      const req = buildReq({ body: orderData });
      const res = buildRes();
      const next = jest.fn();

      await controller.calculateOrderPricing(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // validateOrderCoupon
  // -------------------------------------------------------------------------

  describe('validateOrderCoupon', () => {
    test('should return coupon validation result when coupon_code is provided', async () => {
      const validationResult = { valid: true, discount_amount: 5, coupon: { code: 'SAVE10' } };
      mockOrderService.validateCouponCode.mockResolvedValue(validationResult);

      const req = buildReq({
        body: { coupon_code: 'SAVE10', order_data: { subtotal: 50 } }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.validateOrderCoupon(req, res, next);

      expect(mockOrderService.validateCouponCode).toHaveBeenCalledWith(
        'SAVE10',
        { subtotal: 50 },
        'org-123'
      );
      expect(res.json).toHaveBeenCalledWith({ success: true, data: validationResult });
      expect(next).not.toHaveBeenCalled();
    });

    test('should default order_data to {} when not provided in body', async () => {
      const validationResult = { valid: false };
      mockOrderService.validateCouponCode.mockResolvedValue(validationResult);

      const req = buildReq({ body: { coupon_code: 'INVALID' } });
      const res = buildRes();

      await controller.validateOrderCoupon(req, res, jest.fn());

      expect(mockOrderService.validateCouponCode).toHaveBeenCalledWith(
        'INVALID',
        {},
        'org-123'
      );
    });

    test('should return 400 when coupon_code is missing from body', async () => {
      const req = buildReq({ body: {} });
      const res = buildRes();
      const next = jest.fn();

      await controller.validateOrderCoupon(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Coupon code is required'
      });
      expect(mockOrderService.validateCouponCode).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Coupon service unavailable');
      mockOrderService.validateCouponCode.mockRejectedValue(error);

      const req = buildReq({ body: { coupon_code: 'SAVE10' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.validateOrderCoupon(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // getOrderHistory
  // -------------------------------------------------------------------------

  describe('getOrderHistory', () => {
    const order = {
      order_id: 'o-1',
      status: 'processing',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z'
    };

    test('should return history array with two entries when order is found', async () => {
      mockOrderService.getOrderById.mockResolvedValue(order);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getOrderHistory(req, res, next);

      expect(mockOrderService.getOrderById).toHaveBeenCalledWith('o-1', 'org-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          order_id: 'o-1',
          history: expect.arrayContaining([
            expect.objectContaining({ status: 'draft', action: 'Order created' }),
            expect.objectContaining({ status: 'processing', action: 'Status changed to processing' })
          ])
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 404 when order is not found', async () => {
      mockOrderService.getOrderById.mockResolvedValue(null);

      const req = buildReq({ params: { id: 'nonexistent' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getOrderHistory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Order not found'
      });
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('History query failed');
      mockOrderService.getOrderById.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getOrderHistory(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // reserveStockForOrder
  // -------------------------------------------------------------------------

  describe('reserveStockForOrder', () => {
    test('should reserve stock and respond 200 with reservations', async () => {
      const reservations = [
        { reservation_id: 'r-1', product_id: 'p-1', quantity: 2 },
        { reservation_id: 'r-2', product_id: 'p-2', quantity: 1 }
      ];
      mockOrderService.reserveStockForOrder.mockResolvedValue(reservations);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.reserveStockForOrder(req, res, next);

      expect(mockOrderService.reserveStockForOrder).toHaveBeenCalledWith('o-1', 'org-123', 'user-abc');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Stock reserved successfully',
        data: reservations
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Not enough stock to reserve');
      mockOrderService.reserveStockForOrder.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.reserveStockForOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // releaseStockReservations
  // -------------------------------------------------------------------------

  describe('releaseStockReservations', () => {
    test('should release reservations with default reason "cancelled" and respond 200', async () => {
      const released = [{ reservation_id: 'r-1' }, { reservation_id: 'r-2' }];
      mockOrderService.releaseStockReservations.mockResolvedValue(released);

      const req = buildReq({ params: { id: 'o-1' }, body: {} });
      const res = buildRes();
      const next = jest.fn();

      await controller.releaseStockReservations(req, res, next);

      expect(mockOrderService.releaseStockReservations).toHaveBeenCalledWith(
        'o-1',
        'org-123',
        'cancelled'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Stock reservations released successfully',
        data: released
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should forward a custom reason from the request body', async () => {
      mockOrderService.releaseStockReservations.mockResolvedValue([]);

      const req = buildReq({ params: { id: 'o-1' }, body: { reason: 'expired' } });
      const res = buildRes();

      await controller.releaseStockReservations(req, res, jest.fn());

      expect(mockOrderService.releaseStockReservations).toHaveBeenCalledWith(
        'o-1',
        'org-123',
        'expired'
      );
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('No active reservations found');
      mockOrderService.releaseStockReservations.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'o-1' }, body: {} });
      const res = buildRes();
      const next = jest.fn();

      await controller.releaseStockReservations(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // getOrderReservations
  // -------------------------------------------------------------------------

  describe('getOrderReservations', () => {
    test('should return reservations list with success:true', async () => {
      const reservations = [
        { reservation_id: 'r-1', product_id: 'p-1', quantity: 2, status: 'active' }
      ];
      mockOrderService.getOrderReservations.mockResolvedValue(reservations);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getOrderReservations(req, res, next);

      expect(mockOrderService.getOrderReservations).toHaveBeenCalledWith('o-1', 'org-123');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: reservations });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Reservation query failed');
      mockOrderService.getOrderReservations.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'o-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getOrderReservations(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // getAvailableStock
  // -------------------------------------------------------------------------

  describe('getAvailableStock', () => {
    test('should return available stock when warehouse_id is provided', async () => {
      mockOrderService.getAvailableStock.mockResolvedValue(42);

      const req = buildReq({
        params: { id: 'p-1' },
        query: { warehouse_id: 'wh-1' }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.getAvailableStock(req, res, next);

      expect(mockOrderService.getAvailableStock).toHaveBeenCalledWith('p-1', 'wh-1', 'org-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          product_id: 'p-1',
          warehouse_id: 'wh-1',
          available_stock: 42
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when warehouse_id query param is missing', async () => {
      const req = buildReq({ params: { id: 'p-1' }, query: {} });
      const res = buildRes();
      const next = jest.fn();

      await controller.getAvailableStock(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'warehouse_id query parameter is required'
      });
      expect(mockOrderService.getAvailableStock).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle zero available stock correctly', async () => {
      mockOrderService.getAvailableStock.mockResolvedValue(0);

      const req = buildReq({ params: { id: 'p-1' }, query: { warehouse_id: 'wh-1' } });
      const res = buildRes();

      await controller.getAvailableStock(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ available_stock: 0 }) })
      );
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('Product not found in warehouse');
      mockOrderService.getAvailableStock.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'p-1' }, query: { warehouse_id: 'wh-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getAvailableStock(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
