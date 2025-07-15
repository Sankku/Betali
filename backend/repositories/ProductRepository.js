const { BaseRepository } = require('./BaseRepository');

/**
 * Product repository with specific business logic
 */
class ProductRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'products');
  }

  /**
   * Find product by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return super.findById(id, 'product_id');
  }

  /**
   * Find products by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByUserId(userId, options = {}) {
    return this.findAll({ owner_id: userId }, options);
  }

  /**
   * Find products expiring soon
   * @param {number} days - Days ahead to check
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Array>}
   */
  async findExpiringSoon(days = 30, userId = null) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      let query = this.client
        .from(this.table)
        .select('*')
        .lte('expiration_date', futureDate.toISOString());

      if (userId) {
        query = query.eq('owner_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      throw new Error(`Error finding expiring products: ${error.message}`);
    }
  }

  /**
   * Find products by batch number
   * @param {string} batchNumber - Batch number
   * @returns {Promise<Array>}
   */
  async findByBatchNumber(batchNumber) {
    return this.findAll({ batch_number: batchNumber });
  }

  /**
   * Search products by name or description
   * @param {string} searchTerm - Search term
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Array>}
   */
  async search(searchTerm, userId = null) {
    try {
      let query = this.client
        .from(this.table)
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

      if (userId) {
        query = query.eq('owner_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      throw new Error(`Error searching products: ${error.message}`);
    }
  }
}

module.exports = { ProductRepository };