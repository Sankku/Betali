const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { validateRequest } = require('../middleware/validation');
const { createLimiter, searchLimiter } = require('../middleware/rateLimiting');

/**
 * Organization routes
 * Handles HTTP routing for organization-related operations
 */
function createOrganizationRoutes(container) {
  const router = express.Router();
  const organizationController = container.get('organizationController');

  // Apply authentication to all routes
  router.use(authenticateUser);

  // Organization validation schemas
  const createOrganizationSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      description: { type: 'string', maxLength: 1000 }
    },
    required: ['name'],
    additionalProperties: false
  };

  const updateOrganizationSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      description: { type: 'string', maxLength: 1000 }
    },
    additionalProperties: false
  };

  const inviteUserSchema = {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      name: { type: 'string', minLength: 1, maxLength: 255 },
      role: { 
        type: 'string', 
        enum: ['super_admin', 'admin', 'manager', 'employee', 'viewer'] 
      },
      branch_id: { type: 'string', format: 'uuid' },
      permissions: { 
        type: 'array',
        items: { type: 'string' }
      }
    },
    required: ['email', 'name', 'role'],
    additionalProperties: false
  };

  const updateMemberSchema = {
    type: 'object',
    properties: {
      role: { 
        type: 'string', 
        enum: ['super_admin', 'admin', 'manager', 'employee', 'viewer'] 
      },
      branch_id: { type: 'string', format: 'uuid' },
      permissions: { 
        type: 'array',
        items: { type: 'string' }
      }
    },
    additionalProperties: false
  };

  // Routes

  /**
   * GET /api/organizations
   * Get all organizations (admin only)
   */
  router.get('/',
    searchLimiter,
    requirePermission(PERMISSIONS.ORGANIZATIONS_READ),
    organizationController.getAllOrganizations.bind(organizationController)
  );

  /**
   * GET /api/organizations/my
   * Get user's organizations
   */
  router.get('/my', 
    searchLimiter,
    organizationController.getUserOrganizations.bind(organizationController)
  );

  /**
   * POST /api/organizations
   * Create new organization
   */
  router.post('/',
    createLimiter,
    organizationController.createOrganization.bind(organizationController)
  );

  /**
   * GET /api/organizations/:id
   * Get organization by ID
   */
  router.get('/:id',
    searchLimiter,
    organizationController.getOrganizationById.bind(organizationController)
  );

  /**
   * PUT /api/organizations/:id
   * Update organization
   */
  router.put('/:id',
    createLimiter,
    requirePermission(PERMISSIONS.ORGANIZATIONS_UPDATE),
    organizationController.updateOrganization.bind(organizationController)
  );

  /**
   * DELETE /api/organizations/:id
   * Delete organization
   */
  router.delete('/:id',
    createLimiter,
    requirePermission(PERMISSIONS.ORGANIZATIONS_DELETE),
    organizationController.deleteOrganization.bind(organizationController)
  );

  /**
   * GET /api/organizations/:id/members
   * Get organization members
   */
  router.get('/:id/members',
    searchLimiter,
    organizationController.getOrganizationMembers.bind(organizationController)
  );

  /**
   * POST /api/organizations/:id/invite
   * Invite user to organization
   */
  router.post('/:id/invite',
    createLimiter,
    organizationController.inviteUser.bind(organizationController)
  );

  /**
   * PUT /api/organizations/:id/members/:memberId
   * Update member role/permissions
   */
  router.put('/:id/members/:memberId',
    createLimiter,
    organizationController.updateMemberRole.bind(organizationController)
  );

  /**
   * DELETE /api/organizations/:id/members/:memberId
   * Remove member from organization
   */
  router.delete('/:id/members/:memberId',
    createLimiter,
    organizationController.removeMember.bind(organizationController)
  );

  /**
   * POST /api/organizations/:id/switch
   * Switch to organization context
   */
  router.post('/:id/switch',
    searchLimiter,
    organizationController.switchContext.bind(organizationController)
  );

  return router;
}

module.exports = { createOrganizationRoutes };