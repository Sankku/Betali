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

      // Apply ordering
      if (options.orderBy) {
        const { column, ascending = true } = options.orderBy;
        query = query.order(column, { ascending });
      }

      // Apply pagination
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
}

module.exports = { StockMovementRepository };