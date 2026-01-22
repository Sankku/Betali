const { Logger } = require('../utils/Logger');

/**
 * Base repository pattern implementation
 * Provides common CRUD operations for all entities
 */
class BaseRepository {
    constructor(supabaseClient, tableName) {
      this.client = supabaseClient;
      this.table = tableName;
      this.logger = new Logger(`BaseRepository:${tableName}`);
    }
  
    /**
     * Find entity by ID
     * @param {string} id - Entity ID
     * @param {string} idColumn - ID column name (default: 'id')
     * @returns {Promise<Object|null>}
     */
    async findById(id, idColumn = 'id') {
      try {
        const { data, error } = await this.client
          .from(this.table)
          .select('*')
          .eq(idColumn, id)
          .single();
  
        if (error && error.code !== 'PGRST116') throw error;
        return data;
      } catch (error) {
        throw new Error(`Error finding ${this.table} by ID: ${error?.message || String(error)}`);
      }
    }
  
    /**
     * Find all entities with optional filters
     * @param {Object} filters - Filter conditions
     * @param {Object} options - Query options (limit, offset, orderBy)
     * @returns {Promise<Array>}
     */
    async findAll(filters = {}, options = {}) {
      try {
        let query = this.client.from(this.table).select('*');
  
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
  
        if (options.orderBy) {
          const { column, ascending = true } = options.orderBy;
          query = query.order(column, { ascending });
        }
  
        if (options.limit) {
          query = query.limit(options.limit);
        }
        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }
  
        const { data, error } = await query;
        if (error) throw error;
  
        return data || [];
      } catch (error) {
        throw new Error(`Error finding ${this.table}: ${error?.message || String(error)}`);
      }
    }
  
    /**
     * Create new entity
     * @param {Object} entityData - Entity data to create
     * @returns {Promise<Object>}
     */
    async create(entityData) {
      try {
        this.logger.debug('Attempting to create entity', { table: this.table, entityData });

        const response = await this.client
          .from(this.table)
          .insert(entityData)
          .select()
          .single();

        this.logger.debug('Full Supabase response', { table: this.table, response });

        const { data, error } = response;

        this.logger.debug('Destructured response', { table: this.table, hasData: !!data, hasError: !!error });

        if (error) {
          // Log the full error for debugging
          this.logger.error('Supabase error creating entity', {
            table: this.table,
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            status: error.status,
            statusText: error.statusText
          });
          throw error;
        }

        this.logger.info('Successfully created entity', { table: this.table, id: data?.id });
        return data;
      } catch (error) {
        // If it's a Supabase error object, extract useful info
        if (error.code || error.details || error.hint) {
          const errorMsg = `Error creating ${this.table}: ${error.message || error.code} - ${error.details || ''} ${error.hint || ''}`;
          throw new Error(errorMsg);
        }
        throw new Error(`Error creating ${this.table}: ${error?.message || JSON.stringify(error)}`);
      }
    }
  
    /**
     * Update entity by ID
     * @param {string} id - Entity ID
     * @param {Object} updates - Update data
     * @param {string} idColumn - ID column name
     * @returns {Promise<Object>}
     */
    async update(id, updates, idColumn = 'id') {
      try {
        const { data, error } = await this.client
          .from(this.table)
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq(idColumn, id)
          .select()
          .single();
  
        if (error) throw error;
        return data;
      } catch (error) {
        throw new Error(`Error updating ${this.table}: ${error?.message || String(error)}`);
      }
    }
  
    /**
     * Delete entity by ID
     * @param {string} id - Entity ID
     * @param {string} idColumn - ID column name
     * @returns {Promise<boolean>}
     */
    async delete(id, idColumn = 'id') {
      try {
        const { error } = await this.client
          .from(this.table)
          .delete()
          .eq(idColumn, id);
  
        if (error) throw error;
        return true;
      } catch (error) {
        throw new Error(`Error deleting ${this.table}: ${error?.message || String(error)}`);
      }
    }
  
    /**
     * Count entities with optional filters
     * @param {Object} filters - Filter conditions
     * @returns {Promise<number>}
     */
    async count(filters = {}) {
      try {
        let query = this.client
          .from(this.table)
          .select('*', { count: 'exact', head: true });
  
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
  
        const { count, error } = await query;
        if (error) throw error;
  
        return count || 0;
      } catch (error) {
        throw new Error(`Error counting ${this.table}: ${error?.message || String(error)}`);
      }
    }

    /**
     * Delete entities by filter conditions
     * @param {Object} filters - Filter conditions for deletion
     * @returns {Promise<number>} Number of deleted entities
     */
    async deleteByFilter(filters = {}) {
      try {
        let query = this.client.from(this.table).delete();

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });

        const { data, error, count } = await query.select('*');
        if (error) throw error;

        return count || (data ? data.length : 0);
      } catch (error) {
        throw new Error(`Error deleting ${this.table} by filter: ${error?.message || String(error)}`);
      }
    }
  }
  
module.exports = { BaseRepository };