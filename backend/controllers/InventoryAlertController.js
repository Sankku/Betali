const { Logger } = require('../utils/Logger');

/**
 * Controller for inventory alert endpoints
 */
class InventoryAlertController {
  constructor(alertService) {
    this.alertService = alertService;
    this.logger = new Logger('InventoryAlertController');
  }

  /**
   * Get all active alerts for the organization
   * GET /api/alerts/active
   */
  async getActiveAlerts(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      const alerts = await this.alertService.getActiveAlerts(organizationId);

      res.status(200).json({
        success: true,
        data: alerts
      });
    } catch (error) {
      this.logger.error('Error getting active alerts:', error);
      next(error);
    }
  }

  /**
   * Get alert by ID
   * GET /api/alerts/:id
   */
  async getAlertById(req, res, next) {
    try {
      const { id } = req.params;
      const alert = await this.alertService.getAlertById(id);

      res.status(200).json({
        success: true,
        data: alert
      });
    } catch (error) {
      this.logger.error('Error getting alert:', error);
      next(error);
    }
  }

  /**
   * Get alerts by product
   * GET /api/alerts/product/:productId
   */
  async getAlertsByProduct(req, res, next) {
    try {
      const { productId } = req.params;
      const { status } = req.query;
      const alerts = await this.alertService.getAlertsByProduct(productId, status);

      res.status(200).json({
        success: true,
        data: alerts
      });
    } catch (error) {
      this.logger.error('Error getting alerts by product:', error);
      next(error);
    }
  }

  /**
   * Get alerts by warehouse
   * GET /api/alerts/warehouse/:warehouseId
   */
  async getAlertsByWarehouse(req, res, next) {
    try {
      const { warehouseId } = req.params;
      const { status } = req.query;
      const alerts = await this.alertService.getAlertsByWarehouse(warehouseId, status);

      res.status(200).json({
        success: true,
        data: alerts
      });
    } catch (error) {
      this.logger.error('Error getting alerts by warehouse:', error);
      next(error);
    }
  }

  /**
   * Get alert statistics for dashboard
   * GET /api/alerts/statistics
   */
  async getAlertStatistics(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      const statistics = await this.alertService.getAlertStatistics(organizationId);

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      this.logger.error('Error getting alert statistics:', error);
      next(error);
    }
  }

  /**
   * Dismiss an alert
   * PATCH /api/alerts/:id/dismiss
   */
  async dismissAlert(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const alert = await this.alertService.dismissAlert(id, userId);

      res.status(200).json({
        success: true,
        message: 'Alert dismissed successfully',
        data: alert
      });
    } catch (error) {
      this.logger.error('Error dismissing alert:', error);
      next(error);
    }
  }

  /**
   * Resolve an alert
   * PATCH /api/alerts/:id/resolve
   */
  async resolveAlert(req, res, next) {
    try {
      const { id } = req.params;
      const alert = await this.alertService.resolveAlert(id);

      res.status(200).json({
        success: true,
        message: 'Alert resolved successfully',
        data: alert
      });
    } catch (error) {
      this.logger.error('Error resolving alert:', error);
      next(error);
    }
  }

  /**
   * Check inventory and create new alerts
   * POST /api/alerts/check
   */
  async checkInventoryAlerts(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      const result = await this.alertService.checkInventoryAlerts(organizationId);

      res.status(200).json({
        success: true,
        message: `Created ${result.alertsCreated} new alert(s)`,
        data: result
      });
    } catch (error) {
      this.logger.error('Error checking inventory alerts:', error);
      next(error);
    }
  }

  /**
   * Bulk dismiss alerts
   * POST /api/alerts/bulk-dismiss
   */
  async bulkDismissAlerts(req, res, next) {
    try {
      const { alertIds } = req.body;
      const userId = req.user.userId;

      if (!Array.isArray(alertIds) || alertIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'alertIds must be a non-empty array'
        });
      }

      const result = await this.alertService.bulkDismissAlerts(alertIds, userId);

      res.status(200).json({
        success: true,
        message: `Dismissed ${result.successful} of ${result.total} alerts`,
        data: result
      });
    } catch (error) {
      this.logger.error('Error bulk dismissing alerts:', error);
      next(error);
    }
  }
}

module.exports = { InventoryAlertController };
