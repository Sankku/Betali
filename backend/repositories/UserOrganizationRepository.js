const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Repository for user_organizations data access
 * Manages the many-to-many relationship between users and organizations
 */
class UserOrganizationRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'user_organizations');
    this.supabase = supabaseClient;
    this.logger = new Logger('UserOrganizationRepository');
  }

  /**
   * Add user to organization
   * @param {Object} relationshipData - User-organization relationship data
   * @returns {Promise<Object>} Created relationship
   */
  async create(relationshipData) {
    try {
      const { data, error } = await this.supabase
        .from(this.table)
        .insert({
          ...relationshipData,
          joined_at: new Date().toISOString(),
          is_active: true,
          permissions: relationshipData.permissions || []
        })
        .select()
        .single();

      if (error) throw error;

      this.logger.info('User added to organization successfully', {
        userId: data.user_id,
        organizationId: data.organization_id,
        role: data.role
      });

      return data;
    } catch (error) {
      this.logger.error('Error adding user to organization', {
        error: error.message,
        relationshipData
      });
      throw error;
    }
  }

  /**
   * Get user organizations with full details
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of user organizations with details
   */
  async getUserOrganizations(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.table)
        .select(`
          *,
          organization:organizations(*),
          branch:branches(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false });

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

  /**
   * Get organization members
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of organization members
   */
  async getOrganizationMembers(organizationId, options = {}) {
    try {
      let query = this.supabase
        .from(this.table)
        .select(`
          *,
          user:users(user_id, email, name, is_active),
          branch:branches(*)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (options.branchId) {
        query = query.eq('branch_id', options.branchId);
      }

      if (options.role) {
        query = query.eq('role', options.role);
      }

      const { data, error } = await query.order('joined_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.logger.error('Error fetching organization members', {
        error: error.message,
        organizationId,
        options
      });
      throw error;
    }
  }

  /**
   * Update user role/permissions in organization
   * @param {string} userOrganizationId - User organization ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated relationship
   */
  async update(userOrganizationId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from(this.table)
        .update(updateData)
        .eq('user_organization_id', userOrganizationId)
        .select()
        .single();

      if (error) throw error;

      this.logger.info('User organization relationship updated', {
        userOrganizationId,
        fieldsUpdated: Object.keys(updateData)
      });

      return data;
    } catch (error) {
      this.logger.error('Error updating user organization relationship', {
        error: error.message,
        userOrganizationId,
        updateData
      });
      throw error;
    }
  }

  /**
   * Remove user from organization (soft delete)
   * @param {string} userOrganizationId - User organization ID
   * @returns {Promise<boolean>} Success status
   */
  async remove(userOrganizationId) {
    try {
      const { error } = await this.supabase
        .from(this.table)
        .update({ is_active: false })
        .eq('user_organization_id', userOrganizationId);

      if (error) throw error;

      this.logger.info('User removed from organization', {
        userOrganizationId
      });

      return true;
    } catch (error) {
      this.logger.error('Error removing user from organization', {
        error: error.message,
        userOrganizationId
      });
      throw error;
    }
  }

  /**
   * Check if user has specific role in organization
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @param {string} role - Role to check
   * @returns {Promise<boolean>} Whether user has the role
   */
  async hasRole(userId, organizationId, role) {
    try {
      const { data, error } = await this.supabase
        .from(this.table)
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('role', role)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      this.logger.error('Error checking user role', {
        error: error.message,
        userId,
        organizationId,
        role
      });
      throw error;
    }
  }

  /**
   * Get user role in organization
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>} User organization data or null
   */
  async getUserRole(userId, organizationId) {
    try {
      const { data, error } = await this.supabase
        .from(this.table)
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      this.logger.error('Error fetching user role in organization', {
        error: error.message,
        userId,
        organizationId
      });
      throw error;
    }
  }
}

module.exports = UserOrganizationRepository;