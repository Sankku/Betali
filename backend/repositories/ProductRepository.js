const { BaseRepository } = require('./BaseRepository');

/**
 * Product repository with specific business logic
 */
class ProductRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'products');
  }

  /**
   * Find product by ID scoped to an organization
   * @param {string} id - Product ID
   * @param {string} organizationId - Organization ID (required for tenant isolation)
   * @returns {Promise<Object|null>}
   */
  async findById(id, organizationId) {
    if (!organizationId) {
      throw new Error('organizationId is required to ensure tenant data isolation');
    }
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('product_id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      throw new Error(`Error finding product by ID: ${error?.message || String(error)}`);
    }
  }

  /**
   * Find products by organization ID
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByOrganizationId(organizationId, options = {}) {
    return this.findAll({ organization_id: organizationId }, options);
  }

  /**
   * Find products expiring soon
   * @param {number} days - Days ahead to check
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<Array>}
   */
  async findExpiringSoon(days = 30, organizationId = null) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      let query = this.client
        .from(this.table)
        .select('*')
        .lte('expiration_date', futureDate.toISOString());

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      throw new Error(`Error finding expiring products: ${error.message}`);
    }
  }

  /**
   * Find products by batch number within organization
   * @param {string} batchNumber - Batch number
   * @param {string} organizationId - Organization ID (required for tenant isolation)
   * @returns {Promise<Array>}
   */
  async findByBatchNumber(batchNumber, organizationId) {
    if (!organizationId) {
      throw new Error('organizationId is required to ensure tenant data isolation');
    }
    const filters = { batch_number: batchNumber, organization_id: organizationId };
    return this.findAll(filters);
  }

  /**
   * Search products by name or description within organization
   * @param {string} searchTerm - Search term
   * @param {string} organizationId - Organization ID (required for tenant isolation)
   * @returns {Promise<Array>}
   */
  async search(searchTerm, organizationId) {
    if (!organizationId) {
      throw new Error('organizationId is required to ensure tenant data isolation');
    }
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

      if (error) throw error;

      return data || [];
    } catch (error) {
      throw new Error(`Error searching products: ${error.message}`);
    }
  }
}

module.exports = { ProductRepository };