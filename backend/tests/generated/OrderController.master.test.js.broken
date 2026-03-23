const request = require('supertest');
const express = require('express');

// We bypass ServiceFactory and complex setup for this unit test
const OrderController = require('../../controllers/OrderController');

describe('OrderController (Independent Unit Test)', () => {
  let app;
  let orderServiceMock;
  let orderController;

  beforeEach(() => {
    // 1. Create a clean mock of the service
    orderServiceMock = {
      createOrder: jest.fn(),
      getOrders: jest.fn(),
      getOrderById: jest.fn(),
      updateOrder: jest.fn(),
      updateOrderStatus: jest.fn(),
      deleteOrder: jest.fn(),
      getOrderStats: jest.fn()
    };

    // 2. Initialize controller with mock
    orderController = new OrderController(orderServiceMock);

    // 3. Setup express just for this test
    app = express();
    app.use(express.json());

    // Mock Auth Middleware inline
    const mockAuth = (req, res, next) => {
      req.user = { id: 'test-user', currentOrganizationId: 'test-org' };
      next();
    };

    // Define routes using the controller
    app.post('/api/orders', mockAuth, (req, res, next) => orderController.createOrder(req, res, next));
    app.get('/api/orders/:id', mockAuth, (req, res, next) => orderController.getOrderById(req, res, next));
  });

  describe('POST /api/orders', () => {
    it('should create order and return 201', async () => {
      const mockResult = { order_id: '123' };
      orderServiceMock.createOrder.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/orders')
        .send({ client_id: 'cli_1' });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(mockResult);
      expect(orderServiceMock.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ client_id: 'cli_1', user_id: 'test-user' }),
        'test-org'
      );
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return 404 if not found', async () => {
      orderServiceMock.getOrderById.mockResolvedValue(null);
      const response = await request(app).get('/api/orders/999');
      expect(response.status).toBe(404);
    });
  });
});
