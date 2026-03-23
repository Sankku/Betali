const { DashboardController } = require('./DashboardController');
const { dashboardService } = require('../services/dashboardService');

jest.mock('../services/dashboardService');

describe('DashboardController', () => {
  let dashboardController;

  beforeEach(() => {
    dashboardController = new DashboardController(dashboardService);
  });

  describe('getDashboardData', () => {
    it('should return dashboard data for a valid organization', async () => {
      const mockReq = { user: { currentOrganizationId: '123' } };
      const mockRes = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await dashboardController.getDashboardData(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        data: {},
        timestamp: expect.any(String),
      });
    });

    it('should return error for invalid organization', async () => {
      const mockReq = { user: {} };
      const mockRes = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await dashboardController.getDashboardData(mockReq, mockRes);<｜begin▁of▁sentence｜>

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No organization context found. Please select an organization.',
      });
    });
  });

  // Add similar tests for other methods...
});