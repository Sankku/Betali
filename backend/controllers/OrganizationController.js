const { Logger } = require('../utils/Logger');

/**
 * Organization controller handling HTTP requests
 * Follows the separation of concerns principle
 */
class OrganizationController {
  constructor(organizationService) {
    this.organizationService = organizationService;
    this.logger = new Logger('OrganizationController');
  }

  /**
   * Get all organizations (admin only)
   * GET /api/organizations
   */
  async getAllOrganizations(req, res, next) {
    try {
      const options = this.buildQueryOptions(req.query);
      
      const organizations = await this.organizationService.getAllOrganizations(options);
      
      res.json({
        data: organizations,
        meta: {
          total: organizations.length,
          ...options
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user organizations
   * GET /api/organizations/my
   */
  async getUserOrganizations(req, res, next) {
    try {
      const userId = req.user.id;
      
      const organizations = await this.organizationService.getUserOrganizations(userId);
      
      res.json({
        data: organizations,
        meta: {
          total: organizations.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create organization
   * POST /api/organizations
   */
  async createOrganization(req, res, next) {
    try {
      const organizationData = req.body;
      const ownerId = req.user.id;
      
      const result = await this.organizationService.createWithOwner(organizationData, ownerId);
      
      this.logger.info('Organization created successfully', {
        organizationId: result.organization.organization_id,
        ownerId,
        name: result.organization.name
      });

      res.status(201).json({ 
        data: result.organization,
        meta: {
          ownerRelationship: result.ownerRelationship
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization by ID
   * GET /api/organizations/:id
   */
  async getOrganizationById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Check if user has access to this organization
      const userRole = await this.organizationService.userOrganizationRepository.getUserRole(userId, id);
      if (!userRole) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this organization'
        });
      }
      
      const organization = await this.organizationService.getById(id);
      
      res.json({ 
        data: {
          ...organization,
          userRole: userRole.role,
          userPermissions: userRole.permissions
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization
   * PUT /api/organizations/:id
   */
  async updateOrganization(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updaterId = req.user.id;
      
      const updatedOrganization = await this.organizationService.update(id, updateData, updaterId);
      
      this.logger.info('Organization updated successfully', {
        organizationId: id,
        updaterId,
        fieldsUpdated: Object.keys(updateData)
      });

      res.json({ data: updatedOrganization });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization members
   * GET /api/organizations/:id/members
   */
  async getOrganizationMembers(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const options = this.buildQueryOptions(req.query);
      
      // Check if user has access to this organization
      const userRole = await this.organizationService.userOrganizationRepository.getUserRole(userId, id);
      if (!userRole) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this organization'
        });
      }
      
      const members = await this.organizationService.getMembers(id, options);
      
      res.json({
        data: members,
        meta: {
          total: members.length,
          ...options
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invite user to organization
   * POST /api/organizations/:id/invite
   */
  async inviteUser(req, res, next) {
    try {
      const { id } = req.params;
      const inviteData = {
        ...req.body,
        organization_id: id
      };
      const inviterId = req.user.id;
      
      const result = await this.organizationService.inviteUser(inviteData, inviterId);
      
      this.logger.info('User invited to organization successfully', {
        organizationId: id,
        invitedEmail: inviteData.email,
        role: inviteData.role,
        inviterId
      });

      res.status(201).json({ 
        data: {
          user: result.user,
          relationship: result.relationship
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update member role
   * PUT /api/organizations/:id/members/:memberId
   */
  async updateMemberRole(req, res, next) {
    try {
      const { memberId } = req.params;
      const updateData = req.body;
      const updaterId = req.user.id;
      
      const updatedRelationship = await this.organizationService.updateMemberRole(
        memberId,
        updateData,
        updaterId
      );
      
      this.logger.info('Member role updated successfully', {
        userOrganizationId: memberId,
        updaterId,
        fieldsUpdated: Object.keys(updateData)
      });

      res.json({ data: updatedRelationship });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove member from organization
   * DELETE /api/organizations/:id/members/:memberId
   */
  async removeMember(req, res, next) {
    try {
      const { memberId } = req.params;
      const removerId = req.user.id;
      
      await this.organizationService.removeMember(memberId, removerId);
      
      this.logger.info('Member removed from organization successfully', {
        userOrganizationId: memberId,
        removerId
      });

      res.json({
        message: 'Member removed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Switch organization context
   * POST /api/organizations/:id/switch
   */
  async switchContext(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Check if user has access to this organization
      const userRole = await this.organizationService.userOrganizationRepository.getUserRole(userId, id);
      if (!userRole) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this organization'
        });
      }

      const organization = await this.organizationService.getById(id);
      
      // Return organization context
      res.json({
        data: {
          organization,
          userRole: userRole.role,
          permissions: userRole.permissions,
          branch: userRole.branch_id ? await this.getBranchById(userRole.branch_id) : null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete organization
   * DELETE /api/organizations/:id
   */
  async deleteOrganization(req, res, next) {
    try {
      const { id } = req.params;
      const deleterId = req.user.id;
      
      await this.organizationService.deleteOrganization(id, deleterId);
      
      this.logger.info('Organization deleted successfully', {
        organizationId: id,
        deleterId
      });

      res.json({
        message: 'Organization deleted successfully',
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
    return {
      branchId: query.branch_id || '',
      role: query.role || '',
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10
    };
  }

  /**
   * Get branch by ID (helper method)
   * @private
   */
  async getBranchById(branchId) {
    // This would be implemented when we create the BranchService
    // For now, return null
    return null;
  }
}

module.exports = OrganizationController;