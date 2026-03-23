/**
 * OrderService Unit Tests
 * Tests business logic in isolation with mocked dependencies
 */

const OrderService = require('../../../services/OrderService');

// Mock Logger
jest.mock('../../../utils/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

// Mock limitEnforcement middleware
jest.mock('../../../middleware/limitEnforcement', () => ({
  incrementUsage: jest.fn().mockResolvedValue(undefined)
}));

// ─── Constants ────────────────────────────────────────────────────────────────

const ORG_ID = 'org-test-123';
const ORDER_ID = 'order-test-abc';
const USER_ID = 'user-test-456';
const WAREHOUSE_ID = 'warehouse-test-789';
const PRODUCT_ID_A = 'product-a-111';
const PRODUCT_ID_B = 'product-b-222';
const CLIENT_ID = 'client-test-333';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeOrder(overrides = {}) {
  return {
    order_id: ORDER_ID,
    organization_id: ORG_ID,
    user_id: USER_ID,
    warehouse_id: WAREHOUSE_ID,
    status: 'pending',
    subtotal: 100,
    discount_amount: 0,
    tax_amount: 0,
    total_price: 100,
    total: 100,
    notes: null,
    order_date: '2026-03-20T00:00:00.000Z',
    order_details: null,
    ...overrides
  };
}

function makeOrderDetail(overrides = {}) {
  return {
    order_detail_id: 'detail-001',
    order_id: ORDER_ID,
    organization_id: ORG_ID,
    product_id: PRODUCT_ID_A,
    quantity: 2,
    price: 50,
    line_total: 100,
    discount_amount: 0,
    tax_amount: 0,
    ...overrides
  };
}

function makeProduct(overrides = {}) {
  return {
    product_id: PRODUCT_ID_A,
    organization_id: ORG_ID,
    name: 'Test Product A',
    price: 50,
    ...overrides
  };
}

function makePricingResult(overrides = {}) {
  return {
    subtotal: 100,
    discount_amount: 0,
    tax_amount: 0,
    total: 100,
    applied_discounts: [],
    tax_breakdown: [],
    line_items: [
      {
        product_id: PRODUCT_ID_A,
        quantity: 2,
        unit_price: 50,
        line_total: 100,
        line_discount: 0
      }
    ],
    ...overrides
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('OrderService Unit Tests', () => {
  let orderService;
  let mockOrderRepository;
  let mockOrderDetailRepository;
  let mockProductRepository;
  let mockWarehouseRepository;
  let mockStockMovementRepository;
  let mockStockReservationRepository;
  let mockClientRepository;
  let mockPricingService;
  let mockLogger;

  beforeEach(() => {
    mockOrderRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByOrganization: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
      hardDelete: jest.fn(),
      getOrdersStats: jest.fn()
    };

    mockOrderDetailRepository = {
      createBulk: jest.fn(),
      findByOrderId: jest.fn(),
      replaceOrderDetails: jest.fn()
    };

    mockProductRepository = {
      findById: jest.fn()
    };

    mockWarehouseRepository = {
      findById: jest.fn()
    };

    mockStockMovementRepository = {
      getCurrentStockBulk: jest.fn(),
      getCurrentStock: jest.fn(),
      createBulk: jest.fn()
    };

    mockStockReservationRepository = {
      getActiveReservationsByOrder: jest.fn(),
      getReservationsByOrder: jest.fn(),
      checkStockAvailability: jest.fn(),
      createBulkReservations: jest.fn(),
      releaseOrderReservations: jest.fn(),
      getAvailableStock: jest.fn()
    };

    mockClientRepository = {
      findById: jest.fn()
    };

    mockPricingService = {
      calculateOrderPricing: jest.fn(),
      saveAppliedDiscounts: jest.fn(),
      validateCouponCode: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    orderService = new OrderService(
      mockOrderRepository,
      mockOrderDetailRepository,
      mockProductRepository,
      mockWarehouseRepository,
      mockStockMovementRepository,
      mockStockReservationRepository,
      mockClientRepository,
      mockPricingService,
      mockLogger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── createOrder ────────────────────────────────────────────────────────────

  describe('createOrder', () => {
    const validOrderData = {
      items: [{ product_id: PRODUCT_ID_A, quantity: 2 }],
      user_id: USER_ID,
      warehouse_id: WAREHOUSE_ID
    };

    beforeEach(() => {
      mockPricingService.calculateOrderPricing.mockResolvedValue(makePricingResult());
      mockStockMovementRepository.getCurrentStockBulk.mockResolvedValue({
        [PRODUCT_ID_A]: 10
      });
      mockProductRepository.findById.mockResolvedValue(makeProduct());
      mockOrderRepository.create.mockResolvedValue(makeOrder());
      mockOrderDetailRepository.createBulk.mockResolvedValue([makeOrderDetail()]);
    });

    test('should create an order successfully with valid data', async () => {
      const result = await orderService.createOrder(validOrderData, ORG_ID);

      expect(result).toHaveProperty('order_id', ORDER_ID);
      expect(result).toHaveProperty('order_details');
      expect(result).toHaveProperty('pricing_breakdown');
      expect(mockOrderRepository.create).toHaveBeenCalledTimes(1);
      expect(mockOrderDetailRepository.createBulk).toHaveBeenCalledTimes(1);
      expect(mockPricingService.calculateOrderPricing).toHaveBeenCalledWith(validOrderData, ORG_ID);
    });

    test('should use "pending" as the default status when none is provided', async () => {
      await orderService.createOrder(validOrderData, ORG_ID);

      const createdOrderArg = mockOrderRepository.create.mock.calls[0][0];
      expect(createdOrderArg.status).toBe('pending');
    });

    test('should accept a valid explicit status', async () => {
      const orderData = { ...validOrderData, status: 'draft' };
      await orderService.createOrder(orderData, ORG_ID);

      const createdOrderArg = mockOrderRepository.create.mock.calls[0][0];
      expect(createdOrderArg.status).toBe('draft');
    });

    test('should fall back to "pending" when an invalid status is provided', async () => {
      const orderData = { ...validOrderData, status: 'invalid-status' };
      await orderService.createOrder(orderData, ORG_ID);

      const createdOrderArg = mockOrderRepository.create.mock.calls[0][0];
      expect(createdOrderArg.status).toBe('pending');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    test('should validate an existing client when client_id is provided', async () => {
      mockClientRepository.findById.mockResolvedValue({ client_id: CLIENT_ID });
      const orderData = { ...validOrderData, client_id: CLIENT_ID };

      await orderService.createOrder(orderData, ORG_ID);

      expect(mockClientRepository.findById).toHaveBeenCalledWith(CLIENT_ID, ORG_ID);
    });

    test('should throw when client_id is provided but the client does not exist', async () => {
      mockClientRepository.findById.mockResolvedValue(null);
      const orderData = { ...validOrderData, client_id: 'missing-client' };

      await expect(orderService.createOrder(orderData, ORG_ID)).rejects.toThrow(
        'Failed to create order: Client not found or access denied'
      );
    });

    test('should throw when items array is missing', async () => {
      const orderData = { user_id: USER_ID };

      await expect(orderService.createOrder(orderData, ORG_ID)).rejects.toThrow(
        'Failed to create order: Order must have at least one item'
      );
    });

    test('should throw when items array is empty', async () => {
      const orderData = { ...validOrderData, items: [] };

      await expect(orderService.createOrder(orderData, ORG_ID)).rejects.toThrow(
        'Failed to create order: Order must have at least one item'
      );
    });

    test('should throw when items is not an array', async () => {
      const orderData = { ...validOrderData, items: 'not-an-array' };

      await expect(orderService.createOrder(orderData, ORG_ID)).rejects.toThrow(
        'Failed to create order: Order must have at least one item'
      );
    });

    test('should throw when stock is insufficient for a product', async () => {
      // Stock is less than requested quantity (2)
      mockStockMovementRepository.getCurrentStockBulk.mockResolvedValue({
        [PRODUCT_ID_A]: 1
      });

      await expect(orderService.createOrder(validOrderData, ORG_ID)).rejects.toThrow(
        'Failed to create order: Insufficient stock for product'
      );
    });

    test('should throw when a product in the order does not exist', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(orderService.createOrder(validOrderData, ORG_ID)).rejects.toThrow(
        `Failed to create order: Product ${PRODUCT_ID_A} not found or access denied`
      );
    });

    test('should save applied discounts when pricing returns them', async () => {
      const pricingWithDiscounts = makePricingResult({
        applied_discounts: [{ discount_id: 'disc-1', amount: 10 }]
      });
      mockPricingService.calculateOrderPricing.mockResolvedValue(pricingWithDiscounts);
      mockPricingService.saveAppliedDiscounts.mockResolvedValue(undefined);

      await orderService.createOrder(validOrderData, ORG_ID);

      expect(mockPricingService.saveAppliedDiscounts).toHaveBeenCalledWith(
        ORDER_ID,
        pricingWithDiscounts.applied_discounts,
        ORG_ID
      );
    });

    test('should not call saveAppliedDiscounts when there are no discounts', async () => {
      await orderService.createOrder(validOrderData, ORG_ID);

      expect(mockPricingService.saveAppliedDiscounts).not.toHaveBeenCalled();
    });

    test('should include pricing breakdown in the returned order', async () => {
      const result = await orderService.createOrder(validOrderData, ORG_ID);

      expect(result.pricing_breakdown).toEqual({
        subtotal: 100,
        discount_amount: 0,
        tax_amount: 0,
        total: 100,
        applied_discounts: [],
        tax_breakdown: []
      });
    });
  });

  // ─── getOrderById ────────────────────────────────────────────────────────────

  describe('getOrderById', () => {
    test('should return the order with details and totals when found', async () => {
      const order = makeOrder();
      const details = [makeOrderDetail()];
      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderDetailRepository.findByOrderId.mockResolvedValue(details);

      const result = await orderService.getOrderById(ORDER_ID, ORG_ID);

      expect(result).toHaveProperty('order_id', ORDER_ID);
      expect(result.order_details).toEqual(details);
      expect(result).toHaveProperty('totals');
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(ORDER_ID, ORG_ID);
      expect(mockOrderDetailRepository.findByOrderId).toHaveBeenCalledWith(ORDER_ID, ORG_ID);
    });

    test('should not fetch order_details again if they are already embedded in the order', async () => {
      const details = [makeOrderDetail()];
      const order = makeOrder({ order_details: details });
      mockOrderRepository.findById.mockResolvedValue(order);

      await orderService.getOrderById(ORDER_ID, ORG_ID);

      expect(mockOrderDetailRepository.findByOrderId).not.toHaveBeenCalled();
    });

    test('should return null when the order does not exist', async () => {
      mockOrderRepository.findById.mockResolvedValue(null);

      const result = await orderService.getOrderById('nonexistent-id', ORG_ID);

      expect(result).toBeNull();
    });

    test('should throw a wrapped error when the repository fails', async () => {
      mockOrderRepository.findById.mockRejectedValue(new Error('DB connection lost'));

      await expect(orderService.getOrderById(ORDER_ID, ORG_ID)).rejects.toThrow(
        'Failed to get order: DB connection lost'
      );
    });
  });

  // ─── updateOrderStatus ───────────────────────────────────────────────────────

  describe('updateOrderStatus', () => {
    function setupStatusTransition(fromStatus, toStatus) {
      const current = makeOrder({ status: fromStatus });
      const updated = makeOrder({ status: toStatus });
      mockOrderRepository.findById.mockResolvedValue(current);
      mockOrderRepository.updateStatus.mockResolvedValue(updated);
      // Stub all side-effect repositories used by applyStatusChangeRules
      mockStockReservationRepository.getActiveReservationsByOrder.mockResolvedValue([]);
      mockStockReservationRepository.checkStockAvailability.mockResolvedValue({
        available: true,
        availableStock: 10
      });
      mockStockReservationRepository.createBulkReservations.mockResolvedValue([]);
      mockStockReservationRepository.releaseOrderReservations.mockResolvedValue([]);
      mockOrderDetailRepository.findByOrderId.mockResolvedValue([makeOrderDetail()]);
      mockStockMovementRepository.getCurrentStock.mockResolvedValue(10);
      mockStockMovementRepository.createBulk.mockResolvedValue([]);
      return { current, updated };
    }

    test('should transition from pending to processing', async () => {
      const { updated } = setupStatusTransition('pending', 'processing');
      // reserveStockForOrder needs getOrderById which needs findById
      const processingOrder = makeOrder({ status: 'processing' });
      mockOrderRepository.findById
        .mockResolvedValueOnce(makeOrder({ status: 'pending' })) // updateOrderStatus lookup
        .mockResolvedValue(processingOrder); // inner getOrderById calls

      const result = await orderService.updateOrderStatus(ORDER_ID, ORG_ID, 'processing');

      expect(result.status).toBe('processing');
      expect(mockOrderRepository.updateStatus).toHaveBeenCalledWith(ORDER_ID, ORG_ID, 'processing');
    });

    test('should transition from processing to shipped', async () => {
      const { updated } = setupStatusTransition('processing', 'shipped');
      mockOrderRepository.findById
        .mockResolvedValueOnce(makeOrder({ status: 'processing' }))
        .mockResolvedValue(makeOrder({ status: 'shipped' }));

      const result = await orderService.updateOrderStatus(ORDER_ID, ORG_ID, 'shipped');

      expect(result.status).toBe('shipped');
    });

    test('should transition from shipped to completed', async () => {
      setupStatusTransition('shipped', 'completed');
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'shipped' }));
      mockOrderRepository.updateStatus.mockResolvedValue(makeOrder({ status: 'completed' }));

      const result = await orderService.updateOrderStatus(ORDER_ID, ORG_ID, 'completed');

      expect(result.status).toBe('completed');
    });

    test('should transition from pending to cancelled', async () => {
      setupStatusTransition('pending', 'cancelled');
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'pending' }));
      mockOrderRepository.updateStatus.mockResolvedValue(makeOrder({ status: 'cancelled' }));

      const result = await orderService.updateOrderStatus(ORDER_ID, ORG_ID, 'cancelled');

      expect(result.status).toBe('cancelled');
    });

    test('should transition from draft to pending', async () => {
      setupStatusTransition('draft', 'pending');
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'draft' }));
      mockOrderRepository.updateStatus.mockResolvedValue(makeOrder({ status: 'pending' }));

      const result = await orderService.updateOrderStatus(ORDER_ID, ORG_ID, 'pending');

      expect(result.status).toBe('pending');
    });

    test('should throw when transitioning from pending to completed (invalid)', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'pending' }));

      await expect(
        orderService.updateOrderStatus(ORDER_ID, ORG_ID, 'completed')
      ).rejects.toThrow('Failed to update order status: Cannot transition from pending to completed');
    });

    test('should throw when transitioning from completed to any status (final state)', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'completed' }));

      await expect(
        orderService.updateOrderStatus(ORDER_ID, ORG_ID, 'cancelled')
      ).rejects.toThrow('Failed to update order status: Cannot transition from completed to cancelled');
    });

    test('should throw when transitioning from shipped to cancelled (invalid)', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'shipped' }));

      await expect(
        orderService.updateOrderStatus(ORDER_ID, ORG_ID, 'cancelled')
      ).rejects.toThrow('Failed to update order status: Cannot transition from shipped to cancelled');
    });

    test('should throw when transitioning from processing to pending (backwards)', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'processing' }));

      await expect(
        orderService.updateOrderStatus(ORDER_ID, ORG_ID, 'pending')
      ).rejects.toThrow('Failed to update order status: Cannot transition from processing to pending');
    });

    test('should throw when the order is not found', async () => {
      mockOrderRepository.findById.mockResolvedValue(null);

      await expect(
        orderService.updateOrderStatus('nonexistent', ORG_ID, 'processing')
      ).rejects.toThrow('Failed to update order status: Order not found or access denied');
    });
  });

  // ─── reserveStockForOrder ────────────────────────────────────────────────────

  describe('reserveStockForOrder', () => {
    const details = [
      makeOrderDetail({ product_id: PRODUCT_ID_A, quantity: 2 }),
      makeOrderDetail({ order_detail_id: 'detail-002', product_id: PRODUCT_ID_B, quantity: 1 })
    ];

    beforeEach(() => {
      // getOrderById chain
      mockOrderRepository.findById.mockResolvedValue(makeOrder());
      mockOrderDetailRepository.findByOrderId.mockResolvedValue(details);
      mockStockReservationRepository.getActiveReservationsByOrder.mockResolvedValue([]);
      mockStockReservationRepository.checkStockAvailability.mockResolvedValue({
        available: true,
        availableStock: 10
      });
      mockStockReservationRepository.createBulkReservations.mockResolvedValue([
        { reservation_id: 'res-001' },
        { reservation_id: 'res-002' }
      ]);
    });

    test('should create reservations for all order items', async () => {
      const result = await orderService.reserveStockForOrder(ORDER_ID, ORG_ID, USER_ID);

      expect(result).toHaveLength(2);
      expect(mockStockReservationRepository.createBulkReservations).toHaveBeenCalledTimes(1);

      const reservationsArg = mockStockReservationRepository.createBulkReservations.mock.calls[0][0];
      expect(reservationsArg).toHaveLength(2);
      expect(reservationsArg[0]).toMatchObject({
        organization_id: ORG_ID,
        order_id: ORDER_ID,
        product_id: PRODUCT_ID_A,
        quantity: 2,
        created_by: USER_ID
      });
    });

    test('should return existing reservations without creating new ones (idempotent)', async () => {
      const existingReservations = [{ reservation_id: 'res-existing-001' }];
      mockStockReservationRepository.getActiveReservationsByOrder.mockResolvedValue(
        existingReservations
      );

      const result = await orderService.reserveStockForOrder(ORDER_ID, ORG_ID, USER_ID);

      expect(result).toEqual(existingReservations);
      expect(mockStockReservationRepository.createBulkReservations).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Stock already reserved for this order',
        expect.objectContaining({ orderId: ORDER_ID })
      );
    });

    test('should return empty array and skip reservation for a cancelled order', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'cancelled' }));

      const result = await orderService.reserveStockForOrder(ORDER_ID, ORG_ID, USER_ID);

      expect(result).toEqual([]);
      expect(mockStockReservationRepository.createBulkReservations).not.toHaveBeenCalled();
    });

    test('should return empty array and skip reservation for a completed order', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'completed' }));

      const result = await orderService.reserveStockForOrder(ORDER_ID, ORG_ID, USER_ID);

      expect(result).toEqual([]);
      expect(mockStockReservationRepository.createBulkReservations).not.toHaveBeenCalled();
    });

    test('should return empty array and skip reservation for a shipped order', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'shipped' }));

      const result = await orderService.reserveStockForOrder(ORDER_ID, ORG_ID, USER_ID);

      expect(result).toEqual([]);
      expect(mockStockReservationRepository.createBulkReservations).not.toHaveBeenCalled();
    });

    test('should throw when the order is not found', async () => {
      mockOrderRepository.findById.mockResolvedValue(null);

      await expect(
        orderService.reserveStockForOrder('nonexistent', ORG_ID, USER_ID)
      ).rejects.toThrow('Failed to reserve stock: Order not found');
    });

    test('should throw when there are no order details', async () => {
      mockOrderDetailRepository.findByOrderId.mockResolvedValue([]);

      await expect(
        orderService.reserveStockForOrder(ORDER_ID, ORG_ID, USER_ID)
      ).rejects.toThrow('Failed to reserve stock: No order details found');
    });

    test('should throw when stock availability check fails for a product', async () => {
      mockStockReservationRepository.checkStockAvailability.mockResolvedValue({
        available: false,
        availableStock: 0
      });

      await expect(
        orderService.reserveStockForOrder(ORDER_ID, ORG_ID, USER_ID)
      ).rejects.toThrow('Failed to reserve stock: Insufficient stock for product');
    });
  });

  // ─── deleteOrder ─────────────────────────────────────────────────────────────

  describe('deleteOrder', () => {
    test('should hard delete a pending order successfully', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'pending' }));
      mockOrderRepository.hardDelete.mockResolvedValue(true);

      const result = await orderService.deleteOrder(ORDER_ID, ORG_ID, true);

      expect(result).toBe(true);
      expect(mockOrderRepository.hardDelete).toHaveBeenCalledWith(ORDER_ID, ORG_ID);
      expect(mockOrderRepository.delete).not.toHaveBeenCalled();
    });

    test('should hard delete a processing order successfully', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'processing' }));
      mockOrderRepository.hardDelete.mockResolvedValue(true);

      const result = await orderService.deleteOrder(ORDER_ID, ORG_ID, true);

      expect(result).toBe(true);
      expect(mockOrderRepository.hardDelete).toHaveBeenCalledWith(ORDER_ID, ORG_ID);
    });

    test('should throw when hard-deleting a shipped order', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'shipped' }));

      await expect(orderService.deleteOrder(ORDER_ID, ORG_ID, true)).rejects.toThrow(
        'Failed to delete order: Cannot permanently delete shipped or completed orders'
      );
      expect(mockOrderRepository.hardDelete).not.toHaveBeenCalled();
    });

    test('should throw when hard-deleting a completed order', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'completed' }));

      await expect(orderService.deleteOrder(ORDER_ID, ORG_ID, true)).rejects.toThrow(
        'Failed to delete order: Cannot permanently delete shipped or completed orders'
      );
    });

    test('should soft-delete (cancel) a pending order successfully', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'pending' }));
      mockOrderRepository.delete.mockResolvedValue(true);

      const result = await orderService.deleteOrder(ORDER_ID, ORG_ID, false);

      expect(result).toBe(true);
      expect(mockOrderRepository.delete).toHaveBeenCalledWith(ORDER_ID, ORG_ID);
      expect(mockOrderRepository.hardDelete).not.toHaveBeenCalled();
    });

    test('should soft-delete (cancel) a processing order successfully', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'processing' }));
      mockOrderRepository.delete.mockResolvedValue(true);

      const result = await orderService.deleteOrder(ORDER_ID, ORG_ID, false);

      expect(result).toBe(true);
      expect(mockOrderRepository.delete).toHaveBeenCalledWith(ORDER_ID, ORG_ID);
    });

    test('should throw when soft-deleting a completed order', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'completed' }));

      await expect(orderService.deleteOrder(ORDER_ID, ORG_ID, false)).rejects.toThrow(
        'Failed to delete order: Cannot cancel completed or shipped orders'
      );
      expect(mockOrderRepository.delete).not.toHaveBeenCalled();
    });

    test('should throw when soft-deleting a shipped order', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'shipped' }));

      await expect(orderService.deleteOrder(ORDER_ID, ORG_ID, false)).rejects.toThrow(
        'Failed to delete order: Cannot cancel completed or shipped orders'
      );
    });

    test('should default to hard delete when no third argument is provided', async () => {
      mockOrderRepository.findById.mockResolvedValue(makeOrder({ status: 'draft' }));
      mockOrderRepository.hardDelete.mockResolvedValue(true);

      const result = await orderService.deleteOrder(ORDER_ID, ORG_ID);

      expect(result).toBe(true);
      expect(mockOrderRepository.hardDelete).toHaveBeenCalled();
    });

    test('should throw when the order is not found', async () => {
      mockOrderRepository.findById.mockResolvedValue(null);

      await expect(orderService.deleteOrder(ORDER_ID, ORG_ID, true)).rejects.toThrow(
        'Failed to delete order: Order not found or access denied'
      );
    });
  });

  // ─── getOrders ───────────────────────────────────────────────────────────────

  describe('getOrders', () => {
    test('should return orders with pagination and stats', async () => {
      const orders = [makeOrder(), makeOrder({ order_id: 'order-2' })];
      const stats = { total_orders: 2, total_revenue: 200 };
      mockOrderRepository.findByOrganization.mockResolvedValue(orders);
      mockOrderRepository.getOrdersStats.mockResolvedValue(stats);

      const result = await orderService.getOrders(ORG_ID);

      expect(result.orders).toEqual(orders);
      expect(result.stats).toEqual(stats);
      expect(result.pagination).toMatchObject({ limit: 50, offset: 0 });
    });

    test('should forward custom pagination and sort options to the repository', async () => {
      mockOrderRepository.findByOrganization.mockResolvedValue([]);
      mockOrderRepository.getOrdersStats.mockResolvedValue({ total_orders: 0 });

      await orderService.getOrders(ORG_ID, {
        filters: { status: 'pending' },
        pagination: { limit: 10, offset: 20 },
        sort: { orderBy: { column: 'total', ascending: true } }
      });

      expect(mockOrderRepository.findByOrganization).toHaveBeenCalledWith(
        ORG_ID,
        { status: 'pending' },
        { limit: 10, offset: 20, orderBy: { column: 'total', ascending: true } }
      );
    });

    test('should throw a wrapped error when the repository fails', async () => {
      mockOrderRepository.findByOrganization.mockRejectedValue(new Error('Query timeout'));

      await expect(orderService.getOrders(ORG_ID)).rejects.toThrow(
        'Failed to get orders: Query timeout'
      );
    });
  });

  // ─── getOrderStats ───────────────────────────────────────────────────────────

  describe('getOrderStats', () => {
    test('should return order statistics', async () => {
      const stats = { total_orders: 5, total_revenue: 500 };
      mockOrderRepository.getOrdersStats.mockResolvedValue(stats);

      const result = await orderService.getOrderStats(ORG_ID);

      expect(result).toEqual(stats);
      expect(mockOrderRepository.getOrdersStats).toHaveBeenCalledWith(ORG_ID);
    });

    test('should throw a wrapped error when the repository fails', async () => {
      mockOrderRepository.getOrdersStats.mockRejectedValue(new Error('Stats query failed'));

      await expect(orderService.getOrderStats(ORG_ID)).rejects.toThrow(
        'Failed to get order statistics: Stats query failed'
      );
    });
  });

  // ─── calculateOrderTotals (private helper via observable output) ──────────────

  describe('calculateOrderTotals (internal via getOrderById)', () => {
    test('should compute correct totals from order details', async () => {
      const details = [
        makeOrderDetail({ quantity: 3, price: 10 }),
        makeOrderDetail({ order_detail_id: 'detail-002', quantity: 2, price: 25 })
      ];
      mockOrderRepository.findById.mockResolvedValue(makeOrder());
      mockOrderDetailRepository.findByOrderId.mockResolvedValue(details);

      const result = await orderService.getOrderById(ORDER_ID, ORG_ID);

      // 3*10 + 2*25 = 30 + 50 = 80
      expect(result.totals.subtotal).toBe(80);
      expect(result.totals.total).toBe(80);
      expect(result.totals.total_items).toBe(5);
      expect(result.totals.line_items_count).toBe(2);
    });
  });

  // ─── releaseStockReservations ────────────────────────────────────────────────

  describe('releaseStockReservations', () => {
    test('should release reservations with the provided reason', async () => {
      const released = [{ reservation_id: 'res-001', status: 'cancelled' }];
      mockStockReservationRepository.releaseOrderReservations.mockResolvedValue(released);

      const result = await orderService.releaseStockReservations(ORDER_ID, ORG_ID, 'cancelled');

      expect(result).toEqual(released);
      expect(mockStockReservationRepository.releaseOrderReservations).toHaveBeenCalledWith(
        ORDER_ID,
        ORG_ID,
        'cancelled'
      );
    });

    test('should default to "cancelled" reason when none is provided', async () => {
      mockStockReservationRepository.releaseOrderReservations.mockResolvedValue([]);

      await orderService.releaseStockReservations(ORDER_ID, ORG_ID);

      expect(mockStockReservationRepository.releaseOrderReservations).toHaveBeenCalledWith(
        ORDER_ID,
        ORG_ID,
        'cancelled'
      );
    });

    test('should throw a wrapped error when the repository fails', async () => {
      mockStockReservationRepository.releaseOrderReservations.mockRejectedValue(
        new Error('Release failed')
      );

      await expect(orderService.releaseStockReservations(ORDER_ID, ORG_ID)).rejects.toThrow(
        'Failed to release stock reservations: Release failed'
      );
    });
  });

  // ─── validateCouponCode ──────────────────────────────────────────────────────

  describe('validateCouponCode', () => {
    test('should delegate to pricingService and return the result', async () => {
      const couponResult = { valid: true, discount: 15 };
      mockPricingService.validateCouponCode.mockResolvedValue(couponResult);

      const result = await orderService.validateCouponCode('SAVE15', { items: [] }, ORG_ID);

      expect(result).toEqual(couponResult);
      expect(mockPricingService.validateCouponCode).toHaveBeenCalledWith(
        'SAVE15',
        { items: [] },
        ORG_ID
      );
    });

    test('should throw a wrapped error when pricingService fails', async () => {
      mockPricingService.validateCouponCode.mockRejectedValue(new Error('Coupon not found'));

      await expect(
        orderService.validateCouponCode('BAD-CODE', {}, ORG_ID)
      ).rejects.toThrow('Failed to validate coupon code: Coupon not found');
    });
  });

  // ─── calculateOrderPricing ───────────────────────────────────────────────────

  describe('calculateOrderPricing', () => {
    test('should delegate to pricingService and return the pricing result', async () => {
      const pricingResult = makePricingResult();
      mockPricingService.calculateOrderPricing.mockResolvedValue(pricingResult);

      const result = await orderService.calculateOrderPricing({ items: [] }, ORG_ID);

      expect(result).toEqual(pricingResult);
      expect(mockPricingService.calculateOrderPricing).toHaveBeenCalledWith({ items: [] }, ORG_ID);
    });

    test('should throw a wrapped error when pricingService fails', async () => {
      mockPricingService.calculateOrderPricing.mockRejectedValue(
        new Error('Pricing engine error')
      );

      await expect(orderService.calculateOrderPricing({}, ORG_ID)).rejects.toThrow(
        'Failed to calculate order pricing: Pricing engine error'
      );
    });
  });

  // ─── getAvailableStock ───────────────────────────────────────────────────────

  describe('getAvailableStock', () => {
    test('should return the available stock quantity', async () => {
      mockStockReservationRepository.getAvailableStock.mockResolvedValue(42);

      const result = await orderService.getAvailableStock(PRODUCT_ID_A, WAREHOUSE_ID, ORG_ID);

      expect(result).toBe(42);
      expect(mockStockReservationRepository.getAvailableStock).toHaveBeenCalledWith(
        PRODUCT_ID_A,
        WAREHOUSE_ID,
        ORG_ID
      );
    });

    test('should throw a wrapped error when the repository fails', async () => {
      mockStockReservationRepository.getAvailableStock.mockRejectedValue(
        new Error('Stock lookup failed')
      );

      await expect(
        orderService.getAvailableStock(PRODUCT_ID_A, WAREHOUSE_ID, ORG_ID)
      ).rejects.toThrow('Failed to get available stock: Stock lookup failed');
    });
  });

  // ─── getOrderReservations ────────────────────────────────────────────────────

  describe('getOrderReservations', () => {
    test('should return reservations for an order', async () => {
      const reservations = [{ reservation_id: 'res-001' }];
      mockStockReservationRepository.getReservationsByOrder.mockResolvedValue(reservations);

      const result = await orderService.getOrderReservations(ORDER_ID, ORG_ID);

      expect(result).toEqual(reservations);
      expect(mockStockReservationRepository.getReservationsByOrder).toHaveBeenCalledWith(
        ORDER_ID,
        ORG_ID
      );
    });

    test('should throw a wrapped error when the repository fails', async () => {
      mockStockReservationRepository.getReservationsByOrder.mockRejectedValue(
        new Error('Reservation lookup failed')
      );

      await expect(orderService.getOrderReservations(ORDER_ID, ORG_ID)).rejects.toThrow(
        'Failed to get order reservations: Reservation lookup failed'
      );
    });
  });
});
