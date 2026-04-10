const { Logger } = require('../utils/Logger');

/**
 * Organization service handling business logic
 * Orchestrates operations between repositories
 */
class OrganizationService {
  constructor(organizationRepository, userOrganizationRepository, userRepository, productTypeRepository, warehouseRepository, stockMovementRepository) {
    this.organizationRepository = organizationRepository;
    this.userOrganizationRepository = userOrganizationRepository;
    this.userRepository = userRepository;
    this.productTypeRepository = productTypeRepository;
    this.warehouseRepository = warehouseRepository;
    this.stockMovementRepository = stockMovementRepository;
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
   * Create organization for user (SaaS signup)
   * @param {Object} organizationData - Organization data  
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created organization with relationship
   */
  async createOrganizationForUser(organizationData, userId) {
    try {
      this.logger.info('Creating organization for user', {
        organizationName: organizationData.name,
        userId
      });

      const organization = await this.organizationRepository.create(organizationData);
      
      // Add user as owner of the organization
      const ownerRelationship = await this.userOrganizationRepository.create({
        user_id: userId,
        organization_id: organization.organization_id,
        role: 'super_admin', // Use super_admin as owner role
        permissions: ['*'] // Owner has all permissions
      });
      
      this.logger.info('Organization created for user with owner relationship', {
        organizationId: organization.organization_id,
        name: organization.name,
        relationshipId: ownerRelationship.user_organization_id
      });

      return {
        organization,
        ownerRelationship
      };
    } catch (error) {
      this.logger.error('Error creating organization for user', {
        error: error.message,
        organizationData,
        userId
      });
      throw error;
    }
  }

  /**
   * Add user to organization (SaaS signup)
   * @param {Object} userOrgData - User organization relationship data
   * @returns {Promise<Object>} Created relationship
   */
  async addUserToOrganization(userOrgData) {
    try {
      this.logger.info('Adding user to organization', {
        userId: userOrgData.user_id,
        organizationId: userOrgData.organization_id,
        role: userOrgData.role
      });

      const relationship = await this.userOrganizationRepository.create(userOrgData);
      
      this.logger.info('User added to organization', {
        relationshipId: relationship.user_organization_id
      });

      return relationship;
    } catch (error) {
      this.logger.error('Error adding user to organization', {
        error: error.message,
        userOrgData
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
        role: 'super_admin', // Use super_admin as owner role
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
        user_organization_id: userOrg.user_organization_id,
        user_id: userOrg.user_id,
        organization_id: userOrg.organization_id,
        branch_id: userOrg.branch_id,
        role: userOrg.role,
        permissions: userOrg.permissions,
        is_active: userOrg.is_active,
        joined_at: userOrg.joined_at,
        organization: userOrg.organization,
        branch: userOrg.branch,
        userRole: userOrg.role,
        userPermissions: userOrg.permissions,
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
      if (!inviterRole || !['super_admin', 'admin'].includes(inviterRole.role)) {
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
      if (!updaterRole || !['super_admin', 'admin'].includes(updaterRole.role)) {
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
      if (!removerRole || !['super_admin', 'admin'].includes(removerRole.role)) {
        throw new Error('Insufficient permissions to remove members');
      }

      // Don't allow removing the organization owner (super_admin who is also the owner_user_id)
      if (relationship.role === 'super_admin') {
        // Check if this user is the organization owner
        const org = await this.organizationRepository.getById(relationship.organization_id);
        if (org && org.owner_user_id === relationship.user_id) {
          throw new Error('Cannot remove organization owner');
        }
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
      if (!updaterRole || !['super_admin'].includes(updaterRole.role)) {
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
   * Delete organization with cascade deletion of all related data
   * @param {string} organizationId - Organization ID
   * @param {string} deleterId - ID of user performing deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteOrganization(organizationId, deleterId) {
    try {
      this.logger.info('Starting cascade deletion of organization', {
        organizationId,
        deleterId
      });

      // Check if deleter has permission (only super_admin users can delete organizations)
      const deleterRole = await this.userOrganizationRepository.getUserRole(deleterId, organizationId);
      
      this.logger.info('Checking deletion permissions', {
        organizationId,
        deleterId,
        deleterRole: deleterRole ? deleterRole.role : 'NO_ROLE_FOUND',
        hasRole: !!deleterRole
      });
      
      if (!deleterRole || deleterRole.role !== 'super_admin') {
        throw new Error('Insufficient permissions to delete organization');
      }
      
      // Verify the organization exists
      const org = await this.organizationRepository.getById(organizationId);
      if (!org) {
        throw new Error('Organization not found');
      }

      const supabase = this.organizationRepository.client;

      // CASCADE DELETION - Delete all related data in correct order
      // 1. Delete stock movements (they reference warehouses)
      const warehouses = await this.warehouseRepository.findAll({ organization_id: organizationId });
      const warehouseIds = warehouses.map(w => w.warehouse_id);

      const deletionResults = await Promise.all(
        warehouseIds.map(wId => this.stockMovementRepository.deleteByFilter({ warehouse_id: wId }))
      );
      const deletedMovements = deletionResults.reduce((sum, n) => sum + n, 0);

      // 2. Get product IDs for this org (needed to clean up FK references before deleting products)
      const { data: orgProducts } = await supabase
        .from('products')
        .select('product_id')
        .eq('organization_id', organizationId);
      const productIds = (orgProducts || []).map(p => p.product_id);

      if (productIds.length > 0) {
        // 3. Delete order_details (FK → products and orders)
        await supabase.from('order_details').delete().in('product_id', productIds);

        // 4. Delete purchase_order_details (FK → products)
        await supabase.from('purchase_order_details').delete().in('product_id', productIds);
      }

      // 5. Delete orders linked to this org's warehouses (FK → warehouses)
      if (warehouseIds.length > 0) {
        const { data: orgOrders } = await supabase
          .from('orders')
          .select('order_id')
          .in('warehouse_id', warehouseIds);
        const orderIds = (orgOrders || []).map(o => o.order_id);

        if (orderIds.length > 0) {
          await supabase.from('order_details').delete().in('order_id', orderIds);
          await supabase.from('orders').delete().in('order_id', orderIds);
        }
      }

      // 6. Delete product_types by organization_id (correct tenant isolation)
      const deletedProducts = productIds.length > 0
        ? await this.productTypeRepository.deleteByFilter({ organization_id: organizationId })
        : 0;

      // 7. Delete warehouses (they reference organization)
      const deletedWarehouses = await this.warehouseRepository.deleteByFilter({ organization_id: organizationId });

      // 6. Delete user-organization relationships
      const deletedUserOrgs = await this.userOrganizationRepository.deleteByFilter({ organization_id: organizationId });

      // 7. Delete branches (they reference organization)
      // Note: We would need BranchRepository for this, but we can use direct delete for now
      try {
        const { error: branchError } = await this.organizationRepository.client
          .from('branches')
          .delete()
          .eq('organization_id', organizationId);
        if (branchError) this.logger.warn('Error deleting branches:', branchError);
      } catch (err) {
        this.logger.warn('Could not delete branches:', err.message);
      }

      // 8. Finally, delete the organization itself
      await this.organizationRepository.delete(organizationId, 'organization_id');

      this.logger.info('Organization cascade deletion completed successfully', {
        organizationId,
        deleterId,
        summary: {
          stockMovements: deletedMovements,
          products: deletedProducts,
          warehouses: deletedWarehouses,
          userOrganizations: deletedUserOrgs
        }
      });

      return true;
    } catch (error) {
      this.logger.error('Error during cascade deletion of organization', {
        error: error.message,
        stack: error.stack,
        organizationId,
        deleterId
      });
      throw error;
    }
  }
}

module.exports = OrganizationService;