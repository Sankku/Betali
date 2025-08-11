const { Logger } = require('../utils/Logger');
const bcrypt = require('bcryptjs');

/**
 * User controller handling HTTP requests
 * Follows the separation of concerns principle
 */
class UserController {
  constructor(userService) {
    this.userService = userService;
    this.logger = new Logger('UserController');
  }

  /**
   * Get all users (admin only)
   * GET /api/users
   */
  async getUsers(req, res, next) {
    try {
      const options = this.buildQueryOptions(req.query);
      
      const users = await this.userService.getAllUsers(options);
      
      // Transform users data to include organization_name and format data
      const transformedUsers = users.map(user => {
        const { organizations, password_hash, ...userWithoutSensitive } = user;
        return {
          ...userWithoutSensitive,
          organization_name: organizations?.name || 'No Organization',
          // Add last_login field if it doesn't exist
          last_login: user.last_login || null
        };
      });
      
      res.json({
        data: transformedUsers,
        meta: {
          total: transformedUsers.length,
          ...options
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * GET /api/users/profile
   */
  async getCurrentUserProfile(req, res, next) {
    try {
      const userId = req.user.id;
      
      const user = await this.userService.getUserById(userId);
      
      // Remove sensitive information
      const { password_hash, ...userProfile } = user;
      
      res.json({ data: userProfile });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single user by ID
   * GET /api/users/:id
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      
      const user = await this.userService.getUserById(id);
      
      // Remove sensitive information
      const { password_hash, ...userProfile } = user;
      
      res.json({ data: userProfile });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new user
   * POST /api/users
   */
  async createUser(req, res, next) {
    try {
      const userData = req.body;
      const currentUserId = req.user.id;
      
      // Hash password before creating user
      if (userData.password) {
        userData.password_hash = await bcrypt.hash(userData.password, 12);
        delete userData.password;
      }

      // Add creation metadata
      userData.created_by = currentUserId;
      userData.created_at = new Date().toISOString();
      userData.updated_at = new Date().toISOString();

      const newUser = await this.userService.createUser(userData);
      
      // Remove sensitive information from response
      const { password_hash, ...userResponse } = newUser;
      
      this.logger.info('User created successfully', {
        userId: newUser.user_id,
        createdBy: currentUserId,
        email: newUser.email,
        role: newUser.role
      });

      res.status(201).json({ data: userResponse });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user
   * PUT /api/users/:id
   */
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const userData = req.body;
      const currentUserId = req.user.id;

      // Hash password if provided
      if (userData.password) {
        userData.password_hash = await bcrypt.hash(userData.password, 12);
        delete userData.password;
      }

      // Add update metadata
      userData.updated_at = new Date().toISOString();
      userData.updated_by = currentUserId;

      const updatedUser = await this.userService.updateUser(id, userData);
      
      // Remove sensitive information from response
      const { password_hash, ...userResponse } = updatedUser;

      this.logger.info('User updated successfully', {
        userId: id,
        updatedBy: currentUserId,
        fieldsUpdated: Object.keys(userData)
      });

      res.json({ data: userResponse });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user profile
   * PUT /api/users/profile/update
   */
  async updateCurrentUserProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const userData = req.body;

      // Users can only update limited fields on their own profile
      const allowedFields = ['name', 'email'];
      const filteredData = {};
      
      allowedFields.forEach(field => {
        if (userData[field] !== undefined) {
          filteredData[field] = userData[field];
        }
      });

      // Add update metadata
      filteredData.updated_at = new Date().toISOString();

      const updatedUser = await this.userService.updateUser(userId, filteredData);
      
      // Remove sensitive information from response
      const { password_hash, ...userResponse } = updatedUser;

      this.logger.info('User profile updated', {
        userId,
        fieldsUpdated: Object.keys(filteredData)
      });

      res.json({ data: userResponse });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * PUT /api/users/profile/password
   */
  async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { current_password, new_password } = req.body;

      // Get current user to verify password
      const user = await this.userService.getUserById(userId);
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          error: 'Invalid current password',
          message: 'The current password you provided is incorrect',
          timestamp: new Date().toISOString()
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(new_password, 12);

      // Update password
      await this.userService.updateUser(userId, {
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      });

      this.logger.info('User password changed', { userId });

      res.json({
        message: 'Password changed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate user (soft delete)
   * DELETE /api/users/:id
   */
  async deactivateUser(req, res, next) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;

      // Prevent self-deactivation
      if (id === currentUserId) {
        return res.status(400).json({
          error: 'Cannot deactivate own account',
          message: 'You cannot deactivate your own account',
          timestamp: new Date().toISOString()
        });
      }

      await this.userService.updateUser(id, {
        is_active: false,
        updated_at: new Date().toISOString(),
        deactivated_by: currentUserId,
        deactivated_at: new Date().toISOString()
      });

      this.logger.info('User deactivated', {
        userId: id,
        deactivatedBy: currentUserId
      });

      res.json({
        message: 'User deactivated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Build query options from request query parameters
   * @private
   */
  buildQueryOptions(query) {
    const options = {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10,
      search: query.search || '',
      role: query.role || '',
      is_active: query.is_active !== undefined ? query.is_active === 'true' : undefined,
      organization_id: query.organization_id || ''
    };

    // Calculate offset for pagination
    options.offset = (options.page - 1) * options.limit;

    return options;
  }
}

module.exports = UserController;