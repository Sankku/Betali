const { Logger } = require('../utils/Logger');

/**
 * Controller for table configuration endpoints
 * Handles HTTP requests and responses for table configurations
 */
class TableConfigController {
  constructor(tableConfigService) {
    this.service = tableConfigService;
    this.logger = new Logger('TableConfigController');
  }

  /**
   * GET /api/tables/:tableId/config
   * Get configuration for a specific table
   */
  async getTableConfig(req, res) {
    try {
      const { tableId } = req.params;
      const userId = req.user?.user_id; // From auth middleware

      this.logger.info('Getting table configuration', { tableId, userId });

      const config = await this.service.getTableConfiguration(tableId, userId);

      res.json({
        success: true,
        data: config,
        meta: {
          tableId,
          userId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      this.logger.error('Error in getTableConfig', { 
        error: error.message,
        tableId: req.params.tableId
      });

      const statusCode = error.status || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        code: statusCode,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/tables/available
   * Get all available table configurations for the user
   */
  async getAvailableConfigs(req, res) {
    try {
      const userId = req.user?.user_id;

      this.logger.info('Getting available table configurations', { userId });

      const configs = await this.service.getAvailableConfigurations(userId);

      res.json({
        success: true,
        data: configs,
        meta: {
          userId,
          count: configs.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      this.logger.error('Error in getAvailableConfigs', { 
        error: error.message 
      });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/tables
   * Create a new table configuration
   */
  async createTableConfig(req, res) {
    try {
      const configData = req.body;
      const adminUserId = req.user?.user_id;

      this.logger.info('Creating table configuration', { 
        configId: configData.id,
        adminUserId 
      });

      const savedConfig = await this.service.saveTableConfiguration(configData, adminUserId);

      res.status(201).json({
        success: true,
        data: savedConfig,
        message: 'Table configuration created successfully',
        meta: {
          configId: savedConfig.id,
          adminUserId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      this.logger.error('Error in createTableConfig', { 
        error: error.message 
      });

      const statusCode = error.message.includes('Missing required field') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        code: statusCode,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * PUT /api/tables/:tableId
   * Update an existing table configuration
   */
  async updateTableConfig(req, res) {
    try {
      const { tableId } = req.params;
      const configData = { ...req.body, id: tableId };
      const adminUserId = req.user?.user_id;

      this.logger.info('Updating table configuration', { 
        tableId,
        adminUserId 
      });

      const updatedConfig = await this.service.saveTableConfiguration(configData, adminUserId);

      res.json({
        success: true,
        data: updatedConfig,
        message: 'Table configuration updated successfully',
        meta: {
          tableId,
          adminUserId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      this.logger.error('Error in updateTableConfig', { 
        error: error.message,
        tableId: req.params.tableId
      });

      const statusCode = error.status || (error.message.includes('not found') ? 404 : 500);
      res.status(statusCode).json({
        success: false,
        error: error.message,
        code: statusCode,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * DELETE /api/tables/:tableId
   * Delete a table configuration
   */
  async deleteTableConfig(req, res) {
    try {
      const { tableId } = req.params;
      const adminUserId = req.user?.user_id;

      this.logger.info('Deleting table configuration', { 
        tableId,
        adminUserId 
      });

      await this.service.deleteTableConfiguration(tableId, adminUserId);

      res.json({
        success: true,
        message: 'Table configuration deleted successfully',
        meta: {
          tableId,
          adminUserId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      this.logger.error('Error in deleteTableConfig', { 
        error: error.message,
        tableId: req.params.tableId
      });

      const statusCode = error.status || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        code: statusCode,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = { TableConfigController };