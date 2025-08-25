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
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      this.logger.info(`Fetching dashboard data for organization: ${organizationId}`);
      
      const dashboardData = await this.dashboardService.getDashboardOverview(organizationId);
      
      res.json({
        data: dashboardData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error(`Error fetching dashboard data: ${error.message}`, {
        organizationId: req.user?.currentOrganizationId,
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
      const organizationId = req.user.currentOrganizationId;
      const { limit = 10 } = req.query;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      this.logger.info(`Fetching recent activity for organization: ${organizationId}`, { limit });
      
      const activities = await this.dashboardService.getRecentActivity(organizationId, parseInt(limit));
      
      res.json({
        data: activities,
        meta: {
          limit: parseInt(limit),
          total: activities.length
        }
      });
    } catch (error) {
      this.logger.error(`Error fetching recent activity: ${error.message}`, {
        organizationId: req.user?.currentOrganizationId,
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
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      this.logger.info(`Fetching stats for organization: ${organizationId}`);
      
      const stats = await this.dashboardService.getOrganizationStats(organizationId);
      
      res.json({
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error(`Error fetching organization stats: ${error.message}`, {
        organizationId: req.user?.currentOrganizationId,
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
      const organizationId = req.user.currentOrganizationId;
      const { days = 30 } = req.query;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      this.logger.info(`Fetching expiring products for organization: ${organizationId}`, { days });
      
      const expiringProducts = await this.dashboardService.getExpiringProducts(organizationId, parseInt(days));
      
      res.json({
        data: expiringProducts,
        meta: {
          days: parseInt(days),
          total: expiringProducts.length
        }
      });
    } catch (error) {
      this.logger.error(`Error fetching expiring products: ${error.message}`, {
        organizationId: req.user?.currentOrganizationId,
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
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      this.logger.info(`Fetching low stock alerts for organization: ${organizationId}`);
      
      const lowStockAlerts = await this.dashboardService.getLowStockAlerts(organizationId);
      
      res.json({
        data: lowStockAlerts,
        meta: {
          total: lowStockAlerts.length
        }
      });
    } catch (error) {
      this.logger.error(`Error fetching low stock alerts: ${error.message}`, {
        organizationId: req.user?.currentOrganizationId,
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
      const organizationId = req.user.currentOrganizationId;
      const { period = '30d', type = 'overview' } = req.query;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      this.logger.info(`Fetching analytics for organization: ${organizationId}`, { period, type });
      
      const analytics = await this.dashboardService.getAnalytics(organizationId, period, type);
      
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
        organizationId: req.user?.currentOrganizationId,
        error: error.message
      });
      next(error);
    }
  }}

  module.exports = { DashboardController };