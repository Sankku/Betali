const { Logger } = require('../utils/Logger');

/**
 * Service for managing table configurations
 * Implements business logic for table configuration operations
 */
class TableConfigService {
  constructor(tableConfigRepository) {
    this.repository = tableConfigRepository;
    this.logger = new Logger('TableConfigService');
  }

  /**
   * Get table configuration by ID
   * @param {string} tableId - Table identifier
   * @param {string} userId - User ID for permission checking
   * @returns {Promise<Object>} Table configuration with user permissions applied
   */
  async getTableConfiguration(tableId, userId = null) {
    try {
      this.logger.info('Getting table configuration', { tableId, userId });

      const config = await this.repository.getByTableId(tableId);
      
      if (!config) {
        const error = new Error('Table configuration not found');
        error.status = 404;
        throw error;
      }

      // Apply user permissions if needed
      const processedConfig = this.applyUserPermissions(config, userId);

      this.logger.info('Table configuration retrieved successfully', { tableId });
      return processedConfig;

    } catch (error) {
      if (error.status === 404) {
        this.logger.warn('Table configuration not found', { tableId });
      } else {
        this.logger.error('Error getting table configuration', { 
          error: error.message, 
          tableId 
        });
      }
      throw error;
    }
  }

  /**
   * Get all available table configurations for a user
   * @param {string} userId - User ID for permission filtering
   * @returns {Promise<Array>} Array of available table configurations
   */
  async getAvailableConfigurations(userId = null) {
    try {
      this.logger.info('Getting available table configurations', { userId });

      const configs = await this.repository.getAllConfigurations();
      
      // Filter configurations based on user permissions
      const filteredConfigs = configs.filter(config => 
        this.userHasAccessToTable(config, userId)
      );

      this.logger.info('Available configurations retrieved', { 
        totalConfigs: configs.length,
        availableToUser: filteredConfigs.length,
        userId 
      });

      return filteredConfigs;

    } catch (error) {
      this.logger.error('Error getting available configurations', { 
        error: error.message, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Create or update table configuration
   * @param {Object} configData - Configuration data
   * @param {string} adminUserId - Admin user ID for authorization
   * @returns {Promise<Object>} Created/updated configuration
   */
  async saveTableConfiguration(configData, adminUserId) {
    try {
      this.logger.info('Saving table configuration', { 
        configId: configData.id,
        adminUserId 
      });

      // Validate configuration structure
      this.validateConfigurationStructure(configData);

      // Add timestamps
      const timestamp = new Date().toISOString();
      const dataToSave = {
        ...configData,
        updated_at: timestamp,
        created_at: configData.created_at || timestamp
      };

      const savedConfig = await this.repository.upsertConfiguration(dataToSave);

      this.logger.info('Table configuration saved successfully', { 
        configId: savedConfig.id 
      });

      return savedConfig;

    } catch (error) {
      this.logger.error('Error saving table configuration', { 
        error: error.message,
        configId: configData?.id
      });
      throw error;
    }
  }

  /**
   * Delete table configuration
   * @param {string} tableId - Table identifier
   * @param {string} adminUserId - Admin user ID for authorization
   * @returns {Promise<boolean>} Success status
   */
  async deleteTableConfiguration(tableId, adminUserId) {
    try {
      this.logger.info('Deleting table configuration', { tableId, adminUserId });

      const success = await this.repository.deleteConfiguration(tableId);

      this.logger.info('Table configuration deleted successfully', { tableId });
      return success;

    } catch (error) {
      this.logger.error('Error deleting table configuration', { 
        error: error.message,
        tableId
      });
      throw error;
    }
  }

  /**
   * Apply user permissions to configuration
   * @param {Object} config - Base configuration
   * @param {string} userId - User ID
   * @returns {Object} Configuration with user permissions applied
   */
  applyUserPermissions(config, userId) {
    // In a real implementation, you would check user roles/permissions here
    // For now, we'll return the config as-is
    // You could implement role-based column visibility, action permissions, etc.
    
    return {
      ...config,
      meta: {
        ...config.meta,
        userId,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Check if user has access to a table configuration
   * @param {Object} config - Table configuration
   * @param {string} userId - User ID
   * @returns {boolean} Access status
   */
  userHasAccessToTable(config, userId) {
    // In a real implementation, check user permissions here
    // For now, allow access to all configurations
    return true;
  }

  /**
   * Validate configuration structure
   * @param {Object} configData - Configuration data to validate
   * @throws {Error} If configuration is invalid
   */
  validateConfigurationStructure(configData) {
    const requiredFields = ['id', 'name', 'entity', 'config'];
    
    for (const field of requiredFields) {
      if (!configData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!configData.config.columns || !Array.isArray(configData.config.columns)) {
      throw new Error('Configuration must have a columns array');
    }

    // Validate each column configuration
    configData.config.columns.forEach((column, index) => {
      if (!column.key || !column.header || !column.dataType) {
        throw new Error(`Column ${index} is missing required fields (key, header, dataType)`);
      }
    });
  }
}

module.exports = { TableConfigService };