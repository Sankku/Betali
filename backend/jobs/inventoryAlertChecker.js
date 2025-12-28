const supabase = require('../lib/supabaseClient');
const { Logger } = require('../utils/Logger');
const { InventoryAlertRepository } = require('../repositories/InventoryAlertRepository');

/**
 * Background job to check inventory levels and create alerts
 * Runs periodically to check all organizations
 */
class InventoryAlertChecker {
  constructor() {
    this.logger = new Logger('InventoryAlertChecker');
    this.isRunning = false;
    this.interval = null;
    this.checkIntervalMinutes = parseInt(process.env.ALERT_CHECK_INTERVAL_MINUTES) || 60;
  }

  /**
   * Start the background job
   */
  start() {
    if (this.isRunning) {
      this.logger.warn('Alert checker is already running');
      return;
    }

    this.logger.info(`Starting inventory alert checker (interval: ${this.checkIntervalMinutes} minutes)`);
    this.isRunning = true;

    // Run immediately on start
    this.checkAllOrganizations();

    // Then run at intervals
    this.interval = setInterval(
      () => this.checkAllOrganizations(),
      this.checkIntervalMinutes * 60 * 1000
    );

    this.logger.info('Alert checker started successfully');
  }

  /**
   * Stop the background job
   */
  stop() {
    if (!this.isRunning) {
      this.logger.warn('Alert checker is not running');
      return;
    }

    this.logger.info('Stopping inventory alert checker');

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isRunning = false;
    this.logger.info('Alert checker stopped successfully');
  }

  /**
   * Check inventory for all organizations
   */
  async checkAllOrganizations() {
    const startTime = Date.now();
    this.logger.info('Starting inventory alert check for all organizations');

    try {
      // Use service role key for background jobs (already configured in supabaseClient)

      // Get all active organizations
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('organization_id, name')
        .eq('is_active', true);

      if (orgError) {
        throw orgError;
      }

      if (!organizations || organizations.length === 0) {
        this.logger.info('No active organizations found');
        return;
      }

      this.logger.info(`Checking alerts for ${organizations.length} organization(s)`);

      let totalAlertsCreated = 0;
      let totalErrors = 0;

      // Check each organization
      for (const org of organizations) {
        try {
          const alertsCreated = await this.checkOrganization(supabase, org.organization_id);
          totalAlertsCreated += alertsCreated;

          if (alertsCreated > 0) {
            this.logger.info(`Created ${alertsCreated} alert(s) for organization: ${org.name}`);
          }
        } catch (error) {
          totalErrors++;
          this.logger.error(`Error checking organization ${org.name}:`, {
            organizationId: org.organization_id,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;
      this.logger.info('Inventory alert check completed', {
        organizations: organizations.length,
        totalAlertsCreated,
        totalErrors,
        durationMs: duration
      });

    } catch (error) {
      this.logger.error('Error in checkAllOrganizations:', {
        error: error.message,
        stack: error.stack
      });
    }
  }



  /**
   * Check inventory for a single organization
   * @param {Object} supabase - Supabase client
   * @param {string} organizationId - Organization ID
   * @returns {Promise<number>} Number of alerts created
   */
  async checkOrganization(supabase, organizationId) {
    try {
        // Use the Repository JS logic instead of the buggy RPC function
        const repository = new InventoryAlertRepository(supabase);
        const newAlerts = await repository.checkAndCreateAlerts(organizationId);
        
        return newAlerts ? newAlerts.length : 0;
    } catch (error) {
      throw new Error(`Error checking organization inventory: ${error.message}`);
    }
  }

  /**
   * Run a manual check (useful for testing)
   * @param {string} organizationId - Optional organization ID to check specific org
   */
  async runManualCheck(organizationId = null) {
    this.logger.info('Running manual inventory alert check', { organizationId });

    try {
      if (organizationId) {
        const alertsCreated = await this.checkOrganization(supabase, organizationId);
        this.logger.info(`Manual check completed`, {
          organizationId,
          alertsCreated
        });
        return { organizationId, alertsCreated };
      } else {
        await this.checkAllOrganizations();
        return { message: 'Checked all organizations' };
      }
    } catch (error) {
      this.logger.error('Error in manual check:', {
        error: error.message,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Get the current status of the checker
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkIntervalMinutes: this.checkIntervalMinutes,
      nextCheckIn: this.isRunning ? `${this.checkIntervalMinutes} minutes` : 'Not scheduled'
    };
  }
}

// Create singleton instance
const alertChecker = new InventoryAlertChecker();

module.exports = {
  InventoryAlertChecker,
  alertChecker
};
