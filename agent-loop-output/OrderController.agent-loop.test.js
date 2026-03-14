const OrderController = require('../OrderController');
const orderServiceMock = require('../../services/orderService');
const Logger = require('../utils/Logger');

jest.mock('../utils/Logger');

let orderController;

beforeEach(() => {
  orderController = new OrderController(orderServiceMock);
});

describe('OrderController', () => {
  it('should create an instance of OrderController', () => {
    expect(orderController).toBeInstanceOf(OrderController);
  });

  describe('getOrders', () => {
    it('should call orderService.getOrders with correct arguments', async () => {
      const req = {
        user: {
          currentOrganizationId: 'testOrgId',
        },
        query: {
          status: 'testStatus',
          client_id: 'testClientId',
          search: 'testSearch',
          limit: '50',
          offset: '0',
          sort_by: 'created_at',
          sort_order: 'desc',
        },
      };
      const res = {
        json: jest.fn(),
      };
      const next = jest.fn();

      await orderController.getOrders(req, res, next);

      expect(orderServiceMock.getOrders).toHaveBeenCalledWith(
        'testOrgId',
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'testStatus',
            client_id: 'testClientId',
            search: 'testSearch',
          }),
          pagination: expect.objectContaining({
            limit: 50,
            offset: 0,
          }),
          sort: expect.objectContaining({
            orderBy: expect.objectContaining({
              column: 'created_at',
              ascending: true,
            }),
          }),
        })
      );
    });
  });

  describe('getOrderById', () => {
    it('should call orderService.getOrderById with correct arguments', async () => {
      const req = {
        params: {
          id: 'testOrderId',
        },
        user: {
          currentOrganizationId: 'testOrgId',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnValue({
          json: jest.fn(),
        }),
      };
      const next = jest.fn();

      await orderController.getOrderById(req, res, next);

      expect(orderServiceMock.getOrderById).toHaveBeenCalledWith('testOrderId', 'testOrgId');
    });
  });

  describe('createOrder', () => {
    it('should call orderService.createOrder with correct arguments', async () => {
      const req = {
        user: {
          currentOrganizationId: 'testOrgId',
          id: 'testUserId',
        },
        body: {
          test: 'testData',
        },
      };
      const res = {
        status: jest.fn().mockReturnValue({
          json: jest.fn(),
        }),
      };
      const next = jest.fn();

      await orderController.createOrder(req, res, next);

      expect(orderServiceMock.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'testUserId',
          test: 'testData',
        }),
        'testOrgId'
      );
    });
  });

  describe('updateOrder', () => {
    it('should call orderService.updateOrder with correct arguments', async () => {
      const req = {
        params: {
          id: 'testOrderId',
        },
        user: {
          currentOrganizationId: 'testOrgId',
        },
        body: {
          test: 'testData',
        },
      };
      const res = {
        json: jest.fn(),
      };
      const next = jest.fn();

      await orderController.updateOrder(req, res, next);

      expect(orderServiceMock.updateOrder).toHaveBeenCalledWith('testOrderId', 'testOrgId', {
        test: 'testData',
      });
    });
  });
});