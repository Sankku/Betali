/**
 * Base repository pattern implementation
 * Provides common CRUD operations for all entities
 */
class BaseRepository {
    constructor(supabaseClient, tableName) {
      this.client = supabaseClient;
      this.table = tableName;
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
        throw new Error(`Error finding ${this.table} by ID: ${error.message}`);
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
        throw new Error(`Error finding ${this.table}: ${error.message}`);
      }
    }
  
    /**
     * Create new entity
     * @param {Object} entityData - Entity data to create
     * @returns {Promise<Object>}
     */
    async create(entityData) {
      try {
        const { data, error } = await this.client
          .from(this.table)
          .insert(entityData)
          .select()
          .single();
  
        if (error) throw error;
        return data;
      } catch (error) {
        throw new Error(`Error creating ${this.table}: ${error.message}`);
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
        throw new Error(`Error updating ${this.table}: ${error.message}`);
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
        throw new Error(`Error deleting ${this.table}: ${error.message}`);
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
        throw new Error(`Error counting ${this.table}: ${error.message}`);
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
        throw new Error(`Error deleting ${this.table} by filter: ${error.message}`);
      }
    }
  }
  
module.exports = { BaseRepository };