const { BaseRepository } = require('./BaseRepository');

/**
 * Stock movement repository with specific business logic
 */
class StockMovementRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'stock_movements');
  }

  /**
   * Find movements by product ID
   * @param {string} productId - Product ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByProductId(productId, options = {}) {
    return this.findAll({ product_id: productId }, options);
  }

  /**
   * Find movements by warehouse ID
   * @param {string} warehouseId - Warehouse ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByWarehouseId(warehouseId, options = {}) {
    return this.findAll({ warehouse_id: warehouseId }, options);
  }

  /**
   * Find all movements with related product and warehouse data
   * @param {Object} filters - Filter conditions
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAllWithRelations(filters = {}, options = {}) {
    try {
      let query = this.client
        .from(this.table)
        .select(`
          *,
          product_id(product_id, name),
          warehouse_id(warehouse_id, name, location)
        `); 

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      if (options.orderBy) {
        const { column, ascending = true } = options.orderBy;
        query = query.order(column, { ascending });
      } else {
        query = query.order('created_at', { ascending: false });
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
      throw new Error(`Error finding movements with relations: ${error.message}`);
    }
  }

  /**
   * Find movements by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByDateRange(startDate, endDate, options = {}) {
    try {
      let query = this.client
        .from(this.table)
        .select('*')
        .gte('movement_date', startDate.toISOString())
        .lte('movement_date', endDate.toISOString());

      if (options.orderBy) {
        const { column, ascending = true } = options.orderBy;
        query = query.order(column, { ascending });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      throw new Error(`Error finding movements by date range: ${error.message}`);
    }
  }

  /**
   * Update movement by ID (override to not add updated_at)
   * @param {string} id - Movement ID
   * @param {Object} updates - Update data
   * @param {string} idColumn - ID column name
   * @returns {Promise<Object>}
   */
  async update(id, updates, idColumn = 'movement_id') {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .update(updates) 
        .eq(idColumn, id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating ${this.table}: ${error.message}`);
    }
  }
}

module.exports = { StockMovementRepository };