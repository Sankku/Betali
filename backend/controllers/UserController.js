const { Logger } = require('../utils/Logger');
const { getUserPermissions } = require('../middleware/permissions');
const { validateRoleAssignment } = require('../utils/roleValidation');
const bcrypt = require('bcryptjs');

/**
 * User controller handling HTTP requests
 * Follows the separation of concerns principle
 */
class UserController {
  constructor(userService, organizationService) {
    this.userService = userService;
    this.organizationService = organizationService;
    this.logger = new Logger('UserController');
  }

  /**
   * Get all users for organization (admin only)
   * GET /api/users
   */
  async getUsers(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const options = this.buildQueryOptions(req.query);
      
      const users = await this.userService.getOrganizationUsers(organizationId, options);
      
      // Transform users data to remove sensitive information
      const transformedUsers = users.map(user => {
        const { password_hash, ...userWithoutSensitive } = user; // eslint-disable-line no-unused-vars
        return {
          ...userWithoutSensitive,
          // Add last_login field if it doesn't exist
          last_login: user.last_login || null
        };
      });
      
      res.json({
        data: transformedUsers,
        meta: {
          total: transformedUsers.length,
          organizationId,
          ...options
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create user from authentication (for SaaS signup)
   * Used when user signs up via Supabase Auth
   */
  async createUserFromAuth(userData) {
    try {
      const user = await this.userService.createUserFromAuth(userData);
      return user;
    } catch (error) {
      this.logger.error('Error creating user from auth', { error: error.message });
      throw error;
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
      const { password_hash, ...userProfile } = user; // eslint-disable-line no-unused-vars
      
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
      const { password_hash, ...userProfile } = user; // eslint-disable-line no-unused-vars
      
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
      const currentUserRole = req.user.role;
      const currentUserOrganizationId = req.user.currentOrganizationId;
      
      // Validate role assignment permissions
      if (userData.role) {
        const roleValidation = validateRoleAssignment(currentUserRole, userData.role);
        
        if (!roleValidation.success) {
          this.logger.warn('Role assignment blocked', {
            currentUser: currentUserId,
            currentUserRole,
            attemptedRole: userData.role,
            reason: roleValidation.error,
            details: roleValidation.details
          });
          
          return res.status(403).json({
            error: 'Role Assignment Not Allowed',
            message: roleValidation.error,
            code: roleValidation.code,
            details: {
              yourRole: currentUserRole,
              attemptedRole: userData.role,
              allowedRoles: roleValidation.details?.assignableRoles || []
            }
          });
        }
        
        this.logger.info('Role assignment validated', {
          currentUserRole,
          assignedRole: userData.role,
          assignedBy: currentUserId
        });
      }
      
      // Auto-assign current organization if user is not super_admin
      if (userData.role !== 'super_admin' && !userData.organization_id && currentUserOrganizationId) {
        userData.organization_id = currentUserOrganizationId;
        this.logger.info('Auto-assigned organization to new user', {
          organizationId: currentUserOrganizationId,
          userRole: userData.role
        });
      }
      
      // Store original password for Supabase Auth creation
      const plainPassword = userData.password;
      
      // Hash password before creating user in database
      if (userData.password) {
        userData.password_hash = await bcrypt.hash(userData.password, 12);
        delete userData.password;
      }

      // Create user in database first to validate business rules
      let newUser;
      let supabaseUser = null;
      
      try {
        // First, validate user can be created (checks email uniqueness, etc.)
        newUser = await this.userService.createUser(userData);
        
        // If user has organization_id, create the user-organization relationship
        if (newUser.organization_id) {
          await this.userService.createUserOrganizationRelationship(newUser.user_id, newUser.organization_id);
          this.logger.info('Created user-organization relationship', {
            userId: newUser.user_id,
            organizationId: newUser.organization_id
          });
        }
        
        // Then create in Supabase Auth if password is provided
        if (plainPassword) {
          try {
            const { data: authData, error: authError } = await this.userService.createSupabaseAuthUser({
              email: userData.email,
              password: plainPassword,
              user_metadata: {
                name: userData.name,
                role: userData.role
              }
            });
            
            if (authError) {
              // If Supabase Auth fails, we need to rollback the database user
              await this.userService.hardDeleteUser(newUser.user_id);
              throw new Error(`Authentication setup failed: ${authError.message}`);
            }
            
            supabaseUser = authData.user;
            
            // Update the user with the Supabase Auth ID
            if (supabaseUser && supabaseUser.id !== newUser.user_id) {
              newUser = await this.userService.updateUser(newUser.user_id, {
                user_id: supabaseUser.id
              });
            }
            
            this.logger.info('User created in both database and Supabase Auth', {
              userId: supabaseUser.id,
              email: userData.email
            });
          } catch (authError) {
            // If Supabase Auth fails, delete the database user and propagate the error
            this.logger.error('Supabase Auth creation failed, rolling back database user', {
              error: authError.message,
              email: userData.email,
              dbUserId: newUser.user_id
            });
            
            await this.userService.hardDeleteUser(newUser.user_id);
            throw authError;
          }
        }
      } catch (dbError) {
        // Database creation failed, just propagate the error
        this.logger.error('Database user creation failed', {
          error: dbError.message,
          email: userData.email
        });
        throw dbError;
      }
      
      // Remove sensitive information from response
      const { password_hash, ...userResponse } = newUser; // eslint-disable-line no-unused-vars
      
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
      const currentUserRole = req.user.role;

      // Validate role assignment permissions if role is being changed
      if (userData.role) {
        const roleValidation = validateRoleAssignment(currentUserRole, userData.role);
        
        if (!roleValidation.success) {
          this.logger.warn('Role update blocked', {
            currentUser: currentUserId,
            currentUserRole,
            targetUserId: id,
            attemptedRole: userData.role,
            reason: roleValidation.error,
            details: roleValidation.details
          });
          
          return res.status(403).json({
            error: 'Role Update Not Allowed',
            message: roleValidation.error,
            code: roleValidation.code,
            details: {
              yourRole: currentUserRole,
              attemptedRole: userData.role,
              allowedRoles: roleValidation.details?.assignableRoles || []
            }
          });
        }
        
        this.logger.info('Role update validated', {
          currentUserRole,
          targetUserId: id,
          updatedRole: userData.role,
          updatedBy: currentUserId
        });
      }

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
      const { password_hash, ...userResponse } = updatedUser; // eslint-disable-line no-unused-vars

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

      this.logger.info('Updating current user profile', {
        userId,
        filteredData
      });

      let updatedUser;
      try {
        updatedUser = await this.userService.updateUser(userId, filteredData);
      } catch (updateError) {
        this.logger.error('Error in userService.updateUser', {
          error: updateError.message,
          stack: updateError.stack,
          userId
        });
        throw updateError;
      }
      
      // Remove sensitive information from response
      const { password_hash, ...userResponse } = updatedUser; // eslint-disable-line no-unused-vars

      this.logger.info('User profile updated', {
        userId,
        fieldsUpdated: Object.keys(filteredData)
      });

      res.json({ data: userResponse });
    } catch (error) {
      this.logger.error('Error in updateCurrentUserProfile controller', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
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
   * Hard delete user (permanent removal)
   * DELETE /api/users/:id/hard-delete
   */
  async hardDeleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;

      // Prevent self-deletion
      if (id === currentUserId) {
        return res.status(400).json({
          error: 'Cannot delete own account',
          message: 'You cannot delete your own account',
          timestamp: new Date().toISOString()
        });
      }

      // Get user before deletion for logging
      const user = await this.userService.getUserById(id);

      await this.userService.hardDeleteUser(id);

      this.logger.info('User permanently deleted', {
        userId: id,
        deletedUserEmail: user.email,
        deletedBy: currentUserId
      });

      res.json({
        message: 'User permanently deleted',
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

  /**
   * Get current user context with permissions and organization details
   * GET /api/users/me/context
   */
  async getUserContext(req, res, next) {
    try {
      const userId = req.user.id;
      // Fetch fresh user data from database to ensure up-to-date profile info (name, role, etc.)
      // ignoring stale data that might be in the JWT token (req.user)
      const user = await this.userService.getUserById(userId);
      
      // Use organization ID from request context (middleware)
      const currentOrganizationId = req.user.currentOrganizationId;

      // Get user permissions based on role
      const userPermissions = getUserPermissions(user.role);
      
      // Get current organization details if set
      let currentOrganization = null;
      if (currentOrganizationId && this.organizationService) {
        try {
          currentOrganization = await this.organizationService.getById(currentOrganizationId);
        } catch (error) {
          this.logger.warn('Error fetching current organization', {
            organizationId: currentOrganizationId,
            error: error.message
          });
        }
      }
      
      const userContext = {
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url,
          is_active: user.is_active,
          created_at: user.created_at
        },
        permissions: userPermissions,
        currentOrganization,
        hasOrganizationContext: !!currentOrganizationId
      };
      
      this.logger.info('User context retrieved', {
        userId,
        role: user.role,
        hasOrganization: !!currentOrganization,
        organizationId: currentOrganizationId
      });
      
      res.json({ data: userContext });
    } catch (error) {
      this.logger.error('Error getting user context', {
        error: error.message,
        userId: req.user?.id
      });
      next(error);
    }
  }
}

module.exports = UserController;