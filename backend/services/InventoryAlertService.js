const { InventoryAlertRepository } = require('../repositories/InventoryAlertRepository');

/**
 * Service layer for inventory alerts business logic
 */
class InventoryAlertService {
  constructor(supabaseClient) {
    this.alertRepository = new InventoryAlertRepository(supabaseClient);
  }

  /**
   * Get all active alerts for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async getActiveAlerts(organizationId) {
    try {
      return await this.alertRepository.findActiveByOrganization(organizationId);
    } catch (error) {
      throw new Error(`Error getting active alerts: ${error.message}`);
    }
  }

  /**
   * Get alert by ID
   * @param {string} alertId - Alert ID
   * @returns {Promise<Object>}
   */
  async getAlertById(alertId) {
    try {
      const alert = await this.alertRepository.findById(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }
      return alert;
    } catch (error) {
      throw new Error(`Error getting alert: ${error.message}`);
    }
  }

  /**
   * Get alerts by product
   * @param {string} productId - Product ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>}
   */
  async getAlertsByProduct(productId, status = null) {
    try {
      return await this.alertRepository.findByProduct(productId, status);
    } catch (error) {
      throw new Error(`Error getting alerts by product: ${error.message}`);
    }
  }

  /**
   * Get alerts by warehouse
   * @param {string} warehouseId - Warehouse ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>}
   */
  async getAlertsByWarehouse(warehouseId, status = null) {
    try {
      return await this.alertRepository.findByWarehouse(warehouseId, status);
    } catch (error) {
      throw new Error(`Error getting alerts by warehouse: ${error.message}`);
    }
  }

  /**
   * Get alert statistics for organization dashboard
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getAlertStatistics(organizationId) {
    try {
      return await this.alertRepository.getAlertStatistics(organizationId);
    } catch (error) {
      throw new Error(`Error getting alert statistics: ${error.message}`);
    }
  }

  /**
   * Dismiss an alert
   * @param {string} alertId - Alert ID
   * @param {string} userId - User ID who is dismissing
   * @returns {Promise<Object>}
   */
  async dismissAlert(alertId, userId) {
    try {
      // Verify alert exists
      await this.getAlertById(alertId);

      // Dismiss it
      return await this.alertRepository.dismissAlert(alertId, userId);
    } catch (error) {
      throw new Error(`Error dismissing alert: ${error.message}`);
    }
  }

  /**
   * Resolve an alert manually
   * @param {string} alertId - Alert ID
   * @returns {Promise<Object>}
   */
  async resolveAlert(alertId) {
    try {
      // Verify alert exists
      await this.getAlertById(alertId);

      // Resolve it
      return await this.alertRepository.resolveAlert(alertId);
    } catch (error) {
      throw new Error(`Error resolving alert: ${error.message}`);
    }
  }

  /**
   * Check inventory and create alerts for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async checkInventoryAlerts(organizationId) {
    try {
      const newAlerts = await this.alertRepository.checkAndCreateAlerts(organizationId);

      return {
        success: true,
        alertsCreated: newAlerts.length,
        alerts: newAlerts
      };
    } catch (error) {
      throw new Error(`Error checking inventory alerts: ${error.message}`);
    }
  }

  /**
   * Bulk dismiss alerts
   * @param {Array<string>} alertIds - Array of alert IDs
   * @param {string} userId - User ID who is dismissing
   * @returns {Promise<Object>}
   */
  async bulkDismissAlerts(alertIds, userId) {
    try {
      const results = await Promise.allSettled(
        alertIds.map(id => this.dismissAlert(id, userId))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: failed === 0,
        total: alertIds.length,
        successful,
        failed,
        errors: results
          .filter(r => r.status === 'rejected')
          .map(r => r.reason.message)
      };
    } catch (error) {
      throw new Error(`Error bulk dismissing alerts: ${error.message}`);
    }
  }

  /**
   * Auto-resolve alerts after stock replenishment
   * This should be called after stock movements
   * @param {string} productId - Product ID
   * @param {string} warehouseId - Warehouse ID
   * @param {number} currentStock - Current stock level
   * @param {number} minStock - Minimum stock level
   * @returns {Promise<void>}
   */
  async autoResolveAlertsAfterStockMovement(productId, warehouseId, currentStock, minStock) {
    try {
      await this.alertRepository.autoResolveAlerts(productId, warehouseId, currentStock, minStock);
    } catch (error) {
      // Log error but don't throw - this is a background operation
      console.error('Error auto-resolving alerts:', error.message);
    }
  }
}

module.exports = { InventoryAlertService };
