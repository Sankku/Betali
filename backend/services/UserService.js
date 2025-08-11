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
   * Get all users with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getAllUsers(options = {}) {
    try {
      this.logger.info('Fetching all users', { options });
      return await this.repository.findAll(options);
    } catch (error) {
      this.logger.error(`Error fetching users: ${error.message}`);
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