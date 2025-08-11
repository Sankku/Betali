const { Logger } = require('../utils/Logger');

/**
 * Organization service handling business logic
 * Orchestrates operations between repositories
 */
class OrganizationService {
  constructor(organizationRepository, userOrganizationRepository, userRepository) {
    this.organizationRepository = organizationRepository;
    this.userOrganizationRepository = userOrganizationRepository;
    this.userRepository = userRepository;
    this.logger = new Logger('OrganizationService');
  }

  /**
   * Get all organizations (admin only)
   * @param {Object} options - Query options (filters, pagination, etc.)
   * @returns {Promise<Array>} Array of organizations
   */
  async getAllOrganizations(options = {}) {
    try {
      this.logger.info('Fetching all organizations', { options });

      // Use the organization repository to get all organizations
      const organizations = await this.organizationRepository.getAll(options);
      
      return organizations;
    } catch (error) {
      this.logger.error('Error fetching all organizations', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create organization with owner
   * @param {Object} organizationData - Organization data
   * @param {string} ownerId - Owner user ID
   * @returns {Promise<Object>} Created organization with relationship
   */
  async createWithOwner(organizationData, ownerId) {
    try {
      this.logger.info('Creating organization with owner', {
        organizationName: organizationData.name,
        ownerId
      });

      // Create organization
      const organization = await this.organizationRepository.create(organizationData);

      // Add owner to organization
      const ownerRelationship = await this.userOrganizationRepository.create({
        user_id: ownerId,
        organization_id: organization.organization_id,
        role: 'owner',
        permissions: ['*'] // Owner has all permissions
      });

      return {
        organization,
        ownerRelationship
      };
    } catch (error) {
      this.logger.error('Error creating organization with owner', {
        error: error.message,
        organizationData,
        ownerId
      });
      throw error;
    }
  }

  /**
   * Get user organizations with context
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of organizations with user context
   */
  async getUserOrganizations(userId) {
    try {
      const userOrganizations = await this.userOrganizationRepository.getUserOrganizations(userId);
      
      return userOrganizations.map(userOrg => ({
        ...userOrg.organization,
        userRole: userOrg.role,
        userPermissions: userOrg.permissions,
        branch: userOrg.branch,
        joinedAt: userOrg.joined_at,
        userOrganizationId: userOrg.user_organization_id
      }));
    } catch (error) {
      this.logger.error('Error fetching user organizations', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Invite user to organization
   * @param {Object} inviteData - Invitation data
   * @param {string} inviterId - ID of user sending invitation
   * @returns {Promise<Object>} Created user and relationship
   */
  async inviteUser(inviteData, inviterId) {
    try {
      const { email, name, organization_id, branch_id, role, permissions } = inviteData;

      this.logger.info('Inviting user to organization', {
        email,
        organizationId: organization_id,
        role,
        inviterId
      });

      // Check if inviter has permission to invite
      const inviterRole = await this.userOrganizationRepository.getUserRole(inviterId, organization_id);
      if (!inviterRole || !['owner', 'super_admin', 'admin'].includes(inviterRole.role)) {
        throw new Error('Insufficient permissions to invite users');
      }

      // Check if user already exists
      let user;
      try {
        const existingUsers = await this.userRepository.getAll({ search: email });
        user = existingUsers.find(u => u.email === email);
      } catch (error) {
        // User doesn't exist, we'll create them
      }

      // If user doesn't exist, create them
      if (!user) {
        // Generate temporary password - in production, send invitation email
        const tempPassword = 'temp_' + Math.random().toString(36).slice(-8);
        
        user = await this.userRepository.create({
          email,
          name,
          password_hash: tempPassword, // This should be properly hashed
          role: 'employee', // Base role in users table
          is_active: true
        });
      }

      // Add user to organization
      const relationship = await this.userOrganizationRepository.create({
        user_id: user.user_id,
        organization_id,
        branch_id,
        role,
        permissions: permissions || []
      });

      return {
        user,
        relationship
      };
    } catch (error) {
      this.logger.error('Error inviting user to organization', {
        error: error.message,
        inviteData,
        inviterId
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
  async getMembers(organizationId, options = {}) {
    try {
      const members = await this.userOrganizationRepository.getOrganizationMembers(organizationId, options);
      
      return members.map(member => ({
        userOrganizationId: member.user_organization_id,
        userId: member.user_id,
        userName: member.user.name,
        userEmail: member.user.email,
        role: member.role,
        permissions: member.permissions,
        branch: member.branch,
        isActive: member.is_active,
        joinedAt: member.joined_at
      }));
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
   * Update user role in organization
   * @param {string} userOrganizationId - User organization ID
   * @param {Object} updateData - Data to update
   * @param {string} updaterId - ID of user making the update
   * @returns {Promise<Object>} Updated relationship
   */
  async updateMemberRole(userOrganizationId, updateData, updaterId) {
    try {
      // Get the relationship to check organization
      const relationship = await this.userOrganizationRepository.getById(userOrganizationId);
      if (!relationship) {
        throw new Error('User organization relationship not found');
      }

      // Check if updater has permission
      const updaterRole = await this.userOrganizationRepository.getUserRole(updaterId, relationship.organization_id);
      if (!updaterRole || !['owner', 'super_admin', 'admin'].includes(updaterRole.role)) {
        throw new Error('Insufficient permissions to update member roles');
      }

      return await this.userOrganizationRepository.update(userOrganizationId, updateData);
    } catch (error) {
      this.logger.error('Error updating member role', {
        error: error.message,
        userOrganizationId,
        updateData,
        updaterId
      });
      throw error;
    }
  }

  /**
   * Remove user from organization
   * @param {string} userOrganizationId - User organization ID
   * @param {string} removerId - ID of user removing the member
   * @returns {Promise<boolean>} Success status
   */
  async removeMember(userOrganizationId, removerId) {
    try {
      // Get the relationship to check organization
      const relationship = await this.userOrganizationRepository.getById(userOrganizationId);
      if (!relationship) {
        throw new Error('User organization relationship not found');
      }

      // Check if remover has permission
      const removerRole = await this.userOrganizationRepository.getUserRole(removerId, relationship.organization_id);
      if (!removerRole || !['owner', 'super_admin', 'admin'].includes(removerRole.role)) {
        throw new Error('Insufficient permissions to remove members');
      }

      // Don't allow removing the owner
      if (relationship.role === 'owner') {
        throw new Error('Cannot remove organization owner');
      }

      return await this.userOrganizationRepository.remove(userOrganizationId);
    } catch (error) {
      this.logger.error('Error removing member from organization', {
        error: error.message,
        userOrganizationId,
        removerId
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
      return await this.organizationRepository.getById(organizationId);
    } catch (error) {
      this.logger.error('Error fetching organization by ID', {
        error: error.message,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Update organization
   * @param {string} organizationId - Organization ID
   * @param {Object} updateData - Data to update
   * @param {string} updaterId - ID of user making the update
   * @returns {Promise<Object>} Updated organization
   */
  async update(organizationId, updateData, updaterId) {
    try {
      // Check if updater has permission
      const updaterRole = await this.userOrganizationRepository.getUserRole(updaterId, organizationId);
      if (!updaterRole || !['owner', 'super_admin'].includes(updaterRole.role)) {
        throw new Error('Insufficient permissions to update organization');
      }

      return await this.organizationRepository.update(organizationId, updateData);
    } catch (error) {
      this.logger.error('Error updating organization', {
        error: error.message,
        organizationId,
        updateData,
        updaterId
      });
      throw error;
    }
  }

  /**
   * Delete organization
   * @param {string} organizationId - Organization ID
   * @param {string} deleterId - ID of user performing deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteOrganization(organizationId, deleterId) {
    try {
      this.logger.info('Deleting organization', {
        organizationId,
        deleterId
      });

      // Check if deleter has permission (only super_admin can delete organizations)
      const deleterRole = await this.userOrganizationRepository.getUserRole(deleterId, organizationId);
      if (!deleterRole || deleterRole.role !== 'owner') {
        // Also check if user is super_admin globally
        const deleter = await this.userRepository.getById(deleterId);
        if (!deleter || deleter.role !== 'super_admin') {
          throw new Error('Insufficient permissions to delete organization');
        }
      }

      // Soft delete - set is_active to false instead of hard delete
      await this.organizationRepository.update(organizationId, { 
        is_active: false,
        deleted_at: new Date().toISOString()
      });

      this.logger.info('Organization deleted successfully', {
        organizationId,
        deleterId
      });

      return true;
    } catch (error) {
      this.logger.error('Error deleting organization', {
        error: error.message,
        organizationId,
        deleterId
      });
      throw error;
    }
  }
}

module.exports = OrganizationService;