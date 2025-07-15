const { BaseRepository } = require('./BaseRepository');

/**
 * Warehouse repository with specific business logic
 */
class WarehouseRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'warehouse');
  }

  /**
   * Find warehouse by ID
   * @param {string} id - Warehouse ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return super.findById(id, 'warehouse_id');
  }

  /**
   * Find warehouses by user ID (owner or assigned user)
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByUserId(userId, options = {}) {
    try {
      let query = this.client
        .from(this.table)
        .select('*')
        .or(`owner_id.eq.${userId},user_id.eq.${userId}`);

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
      throw new Error(`Error finding warehouses by user ID: ${error.message}`);
    }
  }

  /**
   * Find active warehouses by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async findActiveByUserId(userId) {
    return this.findByUserId(userId).then(warehouses => 
      warehouses.filter(w => w.is_active !== false)
    );
  }
}

module.exports = { WarehouseRepository };