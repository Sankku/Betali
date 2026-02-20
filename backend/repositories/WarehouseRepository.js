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
   * Find warehouses by organization ID
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByOrganizationId(organizationId, options = {}) {
    try {
      let query = this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId);

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
      throw new Error(`Error finding warehouses by organization ID: ${error.message}`);
    }
  }

  /**
   * Find active warehouses by organization ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async findActiveByOrganizationId(organizationId) {
    return this.findByOrganizationId(organizationId).then(warehouses => 
      warehouses.filter(w => w.is_active !== false)
    );
  }

  /**
   * Find warehouses by user ID scoped to an organization (legacy method for backward compatibility)
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID (required for tenant isolation)
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByUserId(userId, organizationId, options = {}) {
    if (!organizationId) {
      throw new Error('organizationId is required to ensure tenant data isolation');
    }
    try {
      let query = this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId)
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
}

module.exports = { WarehouseRepository };