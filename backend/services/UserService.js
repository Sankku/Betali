/**
 * User business logic service
 * Handles business rules and validation
 */
class UserService {
  constructor(userRepository, logger) {
    this.repository = userRepository;
    this.logger = logger;
  }

  /**
   * Get all users for an organization with filtering and pagination
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getOrganizationUsers(organizationId, options = {}) {
    try {
      this.logger.info('Fetching organization users', { organizationId, options });
      return await this.repository.findByOrganization(organizationId, options);
    } catch (error) {
      this.logger.error(`Error fetching organization users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getUserById(userId) {
    try {
      this.logger.info(`Fetching user: ${userId}`);
      const user = await this.repository.findById(userId);
      
      if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }
      
      return user;
    } catch (error) {
      this.logger.error(`Error fetching user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>}
   */
  async getUserByEmail(email) {
    try {
      this.logger.info(`Fetching user by email: ${email}`);
      return await this.repository.findByEmail(email);
    } catch (error) {
      this.logger.error(`Error fetching user by email ${email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create user in Supabase Auth
   * @param {Object} authData - Authentication data
   * @returns {Promise<Object>}
   */
  async createSupabaseAuthUser(authData) {
    try {
      this.logger.info('Creating user in Supabase Auth', { 
        email: authData.email 
      });
      
      // Use admin client to create user
      const { DatabaseConfig } = require('../config/database');
      const dbConfig = new DatabaseConfig();
      const supabase = dbConfig.getClient();
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: authData.email,
        password: authData.password,
        email_confirm: true, // Auto-confirm email for admin-created users
        user_metadata: authData.user_metadata || {}
      });
      
      return { data, error };
    } catch (error) {
      this.logger.error(`Error creating user in Supabase Auth: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create user from authentication (for SaaS signup)
   * @param {Object} userData - User data from Supabase Auth
   * @returns {Promise<Object>}
   */
  async createUserFromAuth(userData) {
    try {
      this.logger.info('Creating user from authentication', { 
        user_id: userData.user_id,
        email: userData.email 
      });
      
      // For SaaS, we don't need password validation since it's handled by Supabase
      const userToCreate = {
        user_id: userData.user_id,
        email: userData.email,
        name: userData.name,
        is_active: true,
        // Set placeholder for password_hash since Supabase handles authentication
        password_hash: 'SUPABASE_AUTH', // Placeholder for SaaS users
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const newUser = await this.repository.createFromAuth(userToCreate);
      
      this.logger.info('User created from auth successfully', { 
        userId: newUser.user_id,
        email: newUser.email 
      });
      
      return newUser;
    } catch (error) {
      this.logger.error(`Error creating user from auth: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>}
   */
  async createUser(userData) {
    try {
      // Validate business rules
      await this.validateUserCreation(userData);
      
      this.logger.info('Creating new user', { 
        email: userData.email, 
        role: userData.role 
      });
      
      const newUser = await this.repository.create(userData);
      
      this.logger.info('User created successfully', { 
        userId: newUser.user_id,
        email: newUser.email 
      });
      
      return newUser;
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create user-organization relationship
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<void>}
   */
  async createUserOrganizationRelationship(userId, organizationId) {
    try {
      this.logger.info('Creating user-organization relationship', { 
        userId, 
        organizationId 
      });
      
      // Use the database client to insert into user_organizations table
      const { DatabaseConfig } = require('../config/database');
      const dbConfig = new DatabaseConfig();
      const supabase = dbConfig.getClient();
      
      const { data, error } = await supabase
        .from('user_organizations')
        .insert({
          user_id: userId,
          organization_id: organizationId
        })
        .select()
        .single();
      
      if (error) {
        this.logger.error('Error creating user-organization relationship', {
          userId,
          organizationId,
          error: error.message
        });
        throw error;
      }
      
      this.logger.info('User-organization relationship created successfully', { 
        userId, 
        organizationId 
      });
      
      return data;
    } catch (error) {
      this.logger.error(`Error creating user-organization relationship: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>}
   */
  async updateUser(userId, userData) {
    try {
      // Check if user exists
      const existingUser = await this.getUserById(userId);
      
      // Validate business rules for update
      await this.validateUserUpdate(existingUser, userData);
      
      this.logger.info(`Updating user: ${userId}`, { 
        fieldsToUpdate: Object.keys(userData) 
      });
      
      const updatedUser = await this.repository.update(userId, userData);
      
      this.logger.info('User updated successfully', { userId });
      
      return updatedUser;
    } catch (error) {
      this.logger.error(`Error updating user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete user (soft delete by deactivating)
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteUser(userId) {
    try {
      // Check if user exists
      await this.getUserById(userId);
      
      this.logger.info(`Deactivating user: ${userId}`);
      
      await this.repository.update(userId, {
        is_active: false,
        updated_at: new Date().toISOString()
      });
      
      this.logger.info('User deactivated successfully', { userId });
    } catch (error) {
      this.logger.error(`Error deactivating user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete user from Supabase Auth
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteSupabaseAuthUser(userId) {
    try {
      this.logger.info('Deleting user from Supabase Auth', { 
        userId 
      });
      
      // Use admin client to delete user
      const { DatabaseConfig } = require('../config/database');
      const dbConfig = new DatabaseConfig();
      const supabase = dbConfig.getClient();
      
      const { data, error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) {
        this.logger.warn('Failed to delete user from Supabase Auth', {
          userId,
          error: error.message
        });
        // Don't throw error here as the user might not exist in Auth
        // or might have been created without Auth (old users)
      } else {
        this.logger.info('User deleted from Supabase Auth successfully', { 
          userId 
        });
      }
      
      return { data, error };
    } catch (error) {
      this.logger.error(`Error deleting user from Supabase Auth: ${error.message}`);
      throw error;
    }
  }

  /**
   * Hard delete user (for rollback scenarios and permanent deletion)
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async hardDeleteUser(userId) {
    try {
      this.logger.info(`Hard deleting user: ${userId}`);
      
      // First delete from Supabase Auth
      this.logger.info('Starting Supabase Auth deletion process', { userId });
      await this.deleteSupabaseAuthUser(userId);
      this.logger.info('Supabase Auth deletion process completed', { userId });
      
      // Then delete from our database
      this.logger.info('Starting database deletion process', { userId });
      await this.repository.delete(userId);
      this.logger.info('Database deletion process completed', { userId });
      
      this.logger.info('User hard deleted successfully', { userId });
    } catch (error) {
      this.logger.error(`Error hard deleting user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search users
   * @param {string} query - Search query
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async searchUsers(query, options = {}) {
    try {
      this.logger.info(`Searching users with query: ${query}`);
      return await this.repository.search(query, options);
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get users by role
   * @param {string} role - User role
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async getUsersByRole(role, options = {}) {
    try {
      this.logger.info(`Fetching users with role: ${role}`);
      return await this.repository.findByRole(role, options);
    } catch (error) {
      this.logger.error(`Error fetching users by role ${role}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get users by organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async getUsersByOrganization(organizationId, options = {}) {
    try {
      this.logger.info(`Fetching users for organization: ${organizationId}`);
      return await this.repository.findByOrganization(organizationId, options);
    } catch (error) {
      this.logger.error(`Error fetching users by organization ${organizationId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate user creation business rules
   * @private
   */
  async validateUserCreation(userData) {
    // Check if email already exists
    const existingUser = await this.repository.findByEmail(userData.email);
    if (existingUser) {
      const error = new Error('A user with this email already exists');
      error.status = 409;
      throw error;
    }

    // Validate role-specific rules
    if (userData.role === 'super_admin') {
      if (userData.organization_id) {
        const error = new Error('Super admin users cannot belong to an organization');
        error.status = 400;
        throw error;
      }
    } else {
      if (!userData.organization_id) {
        const error = new Error('Non-super admin users must belong to an organization');
        error.status = 400;
        throw error;
      }
    }

    // Validate required fields
    if (!userData.name || !userData.email || !userData.password_hash) {
      const error = new Error('Name, email, and password are required');
      error.status = 400;
      throw error;
    }
  }

  /**
   * Validate user update business rules
   * @private
   */
  async validateUserUpdate(existingUser, userData) {
    // Check if email is being changed and if it conflicts
    if (userData.email && userData.email !== existingUser.email) {
      const userWithEmail = await this.repository.findByEmail(userData.email);
      if (userWithEmail && userWithEmail.user_id !== existingUser.user_id) {
        const error = new Error('A user with this email already exists');
        error.status = 409;
        throw error;
      }
    }

    // Validate role change rules
    if (userData.role && userData.role !== existingUser.role) {
      // Super admin role changes have special rules
      if (userData.role === 'super_admin') {
        if (userData.organization_id || existingUser.organization_id) {
          const error = new Error('Super admin users cannot belong to an organization');
          error.status = 400;
          throw error;
        }
      } else if (existingUser.role === 'super_admin') {
        if (!userData.organization_id) {
          const error = new Error('Non-super admin users must belong to an organization');
          error.status = 400;
          throw error;
        }
      }
    }
  }
}

module.exports = UserService;