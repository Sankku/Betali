const { BaseRepository } = require('./BaseRepository');

/**
 * User repository extending BaseRepository
 * Handles user-specific database operations
 */
class UserRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'users');
  }

  /**
   * Find user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>}
   */
  async findById(userId) {
    return super.findById(userId, 'user_id');
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  /**
   * Create user from authentication (for SaaS signup)
   * @param {Object} userData - User data from Supabase Auth
   * @returns {Promise<Object>}
   */
  async createFromAuth(userData) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .insert(userData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // Handle duplicate user gracefully
      if (error.code === '23505') {
        throw new Error('User already exists');
      }
      throw new Error(`Error creating user from auth: ${error.message}`);
    }
  }

  /**
   * Find all users with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAll(options = {}) {
    try {
      let query = this.client
        .from(this.table)
        .select('*');

      // Apply filters
      if (options.role) {
        query = query.eq('role', options.role);
      }

      if (options.is_active !== undefined) {
        query = query.eq('is_active', options.is_active);
      }

      if (options.organization_id) {
        query = query.eq('organization_id', options.organization_id);
      }

      if (options.branch_id) {
        query = query.eq('branch_id', options.branch_id);
      }

      // Apply search
      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
      }

      // Apply ordering
      query = query.order('created_at', { ascending: false });

      // Apply pagination
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
      throw new Error(`Error finding users: ${error.message}`);
    }
  }

  /**
   * Find users by role
   * @param {string} role - User role
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async findByRole(role, options = {}) {
    return this.findAll({ ...options, role });
  }

  /**
   * Find users by organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async findByOrganization(organizationId, options = {}) {
    return this.findAll({ ...options, organization_id: organizationId });
  }

  /**
   * Search users by name or email
   * @param {string} query - Search query
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async search(query, options = {}) {
    return this.findAll({ ...options, search: query });
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>}
   */
  async create(userData) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        if (error.message.includes('email')) {
          throw new Error('A user with this email already exists');
        }
        throw new Error('User data violates unique constraint');
      }
      
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid organization or branch reference');
      }

      if (error.code === '23514') { // Check constraint violation
        if (error.message.includes('check_organization_required') || error.message.includes('check_organization_flexible')) {
          throw new Error('Organization is required for non-super admin users');
        }
        throw new Error('User data violates database constraints');
      }

      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>}
   */
  async update(userId, userData) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .update(userData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        if (error.message.includes('email')) {
          throw new Error('A user with this email already exists');
        }
        throw new Error('User data violates unique constraint');
      }
      
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid organization or branch reference');
      }

      if (error.code === '23514') { // Check constraint violation
        if (error.message.includes('check_organization_required') || error.message.includes('check_organization_flexible')) {
          throw new Error('Organization is required for non-super admin users');
        }
        throw new Error('User data violates database constraints');
      }

      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  /**
   * Delete user (hard delete - use with caution)
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async delete(userId) {
    try {
      const { error } = await this.client
        .from(this.table)
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  /**
   * Count users with optional filters
   * @param {Object} filters - Filter conditions
   * @returns {Promise<number>}
   */
  async count(filters = {}) {
    try {
      let query = this.client
        .from(this.table)
        .select('*', { count: 'exact', head: true });

      // Apply filters
      if (filters.role) {
        query = query.eq('role', filters.role);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters.organization_id) {
        query = query.eq('organization_id', filters.organization_id);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw new Error(`Error counting users: ${error.message}`);
    }
  }

  /**
   * Check if user exists by email
   * @param {string} email - User email
   * @returns {Promise<boolean>}
   */
  async existsByEmail(email) {
    try {
      const user = await this.findByEmail(email);
      return user !== null;
    } catch (error) {
      throw new Error(`Error checking user existence: ${error.message}`);
    }
  }

  /**
   * Get active users count by role
   * @returns {Promise<Object>}
   */
  async getActiveUserCountByRole() {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('role')
        .eq('is_active', true);

      if (error) throw error;

      const roleCounts = {};
      data.forEach(user => {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
      });

      return roleCounts;
    } catch (error) {
      throw new Error(`Error getting user count by role: ${error.message}`);
    }
  }
}

module.exports = UserRepository;