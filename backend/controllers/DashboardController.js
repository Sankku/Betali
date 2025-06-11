const { Logger } = require('../utils/Logger');

/**
 * Dashboard controller for analytics and overview data
 */
class DashboardController {
  constructor(dashboardService) {
    this.dashboardService = dashboardService;
    this.logger = new Logger('DashboardController');
  }

  /**
   * Get dashboard statistics and overview data
   * GET /api/dashboard
   */
  async getDashboardData(req, res, next) {
    try {
      const userId = req.user.id;
      
      this.logger.info(`Fetching dashboard data for user: ${userId}`);
      
      const dashboardData = await this.dashboardService.getDashboardOverview(userId);
      
      res.json({
        data: dashboardData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error(`Error fetching dashboard data: ${error.message}`, {
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Get recent activity
   * GET /api/dashboard/activity
   */
  async getRecentActivity(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit = 10 } = req.query;
      
      this.logger.info(`Fetching recent activity for user: ${userId}`, { limit });
      
      const activities = await this.dashboardService.getRecentActivity(userId, parseInt(limit));
      
      res.json({
        data: activities,
        meta: {
          limit: parseInt(limit),
          total: activities.length
        }
      });
    } catch (error) {
      this.logger.error(`Error fetching recent activity: ${error.message}`, {
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Get user statistics
   * GET /api/dashboard/stats
   */
  async getStats(req, res, next) {
    try {
      const userId = req.user.id;
      
      this.logger.info(`Fetching stats for user: ${userId}`);
      
      const stats = await this.dashboardService.getUserStats(userId);
      
      res.json({
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error(`Error fetching user stats: ${error.message}`, {
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Get expiring products alert
   * GET /api/dashboard/alerts/expiring
   */
  async getExpiringProducts(req, res, next) {
    try {
      const userId = req.user.id;
      const { days = 30 } = req.query;
      
      this.logger.info(`Fetching expiring products for user: ${userId}`, { days });
      
      const expiringProducts = await this.dashboardService.getExpiringProducts(userId, parseInt(days));
      
      res.json({
        data: expiringProducts,
        meta: {
          days: parseInt(days),
          total: expiringProducts.length
        }
      });
    } catch (error) {
      this.logger.error(`Error fetching expiring products: ${error.message}`, {
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Get low stock alerts
   * GET /api/dashboard/alerts/low-stock
   */
  async getLowStockAlerts(req, res, next) {
    try {
      const userId = req.user.id;
      
      this.logger.info(`Fetching low stock alerts for user: ${userId}`);
      
      const lowStockAlerts = await this.dashboardService.getLowStockAlerts(userId);
      
      res.json({
        data: lowStockAlerts,
        meta: {
          total: lowStockAlerts.length
        }
      });
    } catch (error) {
      this.logger.error(`Error fetching low stock alerts: ${error.message}`, {
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Get analytics data for charts
   * GET /api/dashboard/analytics
   */
  async getAnalytics(req, res, next) {
    try {
      const userId = req.user.id;
      const { period = '30d', type = 'overview' } = req.query;
      
      this.logger.info(`Fetching analytics for user: ${userId}`, { period, type });
      
      const analytics = await this.dashboardService.getAnalytics(userId, period, type);
      
      res.json({
        data: analytics,
        meta: {
          period,
          type,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error(`Error fetching analytics: ${error.message}`, {
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }}

  module.exports = { DashboardController };