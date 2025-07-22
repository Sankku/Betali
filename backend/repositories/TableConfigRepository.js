const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Repository for table configurations
 * Handles CRUD operations for table_configurations table
 */
class TableConfigRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'table_configurations');
    this.supabase = supabaseClient;
    this.tableName = 'table_configurations';
    this.logger = new Logger('TableConfigRepository');
  }

  /**
   * Get table configuration by table ID
   * @param {string} tableId - The table identifier
   * @returns {Promise<Object|null>} Table configuration or null if not found
   */
  async getByTableId(tableId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', tableId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error('Error getting table config by ID', { 
        error: error.message, 
        tableId 
      });
      throw error;
    }
  }

  /**
   * Get all available table configurations
   * @returns {Promise<Array>} Array of table configurations
   */
  async getAllConfigurations() {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('id, name, entity, created_at')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      this.logger.error('Error getting all table configurations', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Create or update table configuration
   * @param {Object} configData - Configuration data
   * @returns {Promise<Object>} Created/updated configuration
   */
  async upsertConfiguration(configData) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(configData, { 
          onConflict: 'id',
          returning: 'representation'
        })
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error('Error upserting table configuration', { 
        error: error.message,
        configId: configData?.id
      });
      throw error;
    }
  }

  /**
   * Delete table configuration
   * @param {string} tableId - The table identifier
   * @returns {Promise<boolean>} Success status
   */
  async deleteConfiguration(tableId) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', tableId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      this.logger.error('Error deleting table configuration', { 
        error: error.message,
        tableId
      });
      throw error;
    }
  }

  /**
   * Search configurations by entity type
   * @param {string} entity - Entity name (e.g., 'products', 'warehouse')
   * @returns {Promise<Array>} Array of matching configurations
   */
  async getByEntity(entity) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('entity', entity);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      this.logger.error('Error getting configurations by entity', { 
        error: error.message,
        entity
      });
      throw error;
    }
  }
}

module.exports = { TableConfigRepository };