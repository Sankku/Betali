const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Repository for organization data access
 * Implements the Repository pattern for organization operations
 */
class OrganizationRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'organizations');
    this.supabase = supabaseClient;
    this.logger = new Logger('OrganizationRepository');
  }

  /**
   * Create a new organization
   * @param {Object} organizationData - Organization data
   * @returns {Promise<Object>} Created organization
   */
  async create(organizationData) {
    try {
      const { data, error } = await this.supabase
        .from(this.table)
        .insert({
          ...organizationData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Organization created successfully', {
        organizationId: data.organization_id,
        name: data.name
      });

      return data;
    } catch (error) {
      this.logger.error('Error creating organization', {
        error: error.message,
        organizationData
      });
      throw error;
    }
  }

  /**
   * Get organization by ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Organization data
   */
  async getById(organizationId) {
    try {
      const { data, error } = await this.supabase
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.logger.error('Error fetching organization by ID', {
        error: error.message,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Get all organizations
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of organizations
   */
  async getAll(options = {}) {
    try {
      let query = this.supabase
        .from(this.table)
        .select('*')
        .eq('is_active', true);

      if (options.search) {
        query = query.ilike('name', `%${options.search}%`);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + options.limit - 1);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.logger.error('Error fetching organizations', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Update organization
   * @param {string} organizationId - Organization ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated organization
   */
  async update(organizationId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from(this.table)
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Organization updated successfully', {
        organizationId,
        fieldsUpdated: Object.keys(updateData)
      });

      return data;
    } catch (error) {
      this.logger.error('Error updating organization', {
        error: error.message,
        organizationId,
        updateData
      });
      throw error;
    }
  }

  /**
   * Delete organization (soft delete)
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(organizationId) {
    try {
      const { error } = await this.supabase
        .from(this.table)
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId);

      if (error) throw error;

      this.logger.info('Organization deactivated successfully', {
        organizationId
      });

      return true;
    } catch (error) {
      this.logger.error('Error deactivating organization', {
        error: error.message,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Get organizations for a specific user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of organizations with user role
   */
  async getByUserId(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_organizations')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      this.logger.error('Error fetching user organizations', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}

module.exports = OrganizationRepository;