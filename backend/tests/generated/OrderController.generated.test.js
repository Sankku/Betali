const OrderController = require('../../controllers/OrderController');

describe('OrderController', () => {
  let controller;
  let mockService;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockService = {
      getOrders: jest.fn(),
      getOrderById: jest.fn(),
      createOrder: jest.fn(),
      updateOrder: jest.fn(),
      deleteOrder: jest.fn(),
    };
    controller = new OrderController(mockService);
    mockReq = { user: { currentOrganizationId: 'org-1', id: 'user-1' }, query: {}, body: {}, params: {} };
    mockRes = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    mockNext = jest.fn();
  });

  test('constructor sets orderService', () => {
    expect(controller.orderService).toBe(mockService);
  });

  test('getOrders calls next on service error', async () => {
    const err = new Error('db error');
    mockService.getOrders.mockRejectedValue(err);
    await controller.getOrders(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(err);
  });
});
