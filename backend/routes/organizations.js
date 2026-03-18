const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { validateRequest } = require('../middleware/validation');
const { createLimiter, searchLimiter } = require('../middleware/rateLimiting');
const { checkOrganizationLimit } = require('../middleware/limitEnforcement');
const {
  createOrganizationSchema, 
  updateOrganizationSchema, 
  inviteUserSchema 
} = require('../validations/organizationValidation');

/**
 * Organization routes
 * Handles HTTP routing for organization-related operations
 */
function createOrganizationRoutes(container) {
  const router = express.Router();
  const organizationController = container.get('organizationController');

  // Apply authentication to all routes
  router.use(authenticateUser);


  // const updateMemberSchema = {
  //   type: 'object',
  //   properties: {
  //     role: { 
  //       type: 'string', 
  //       enum: ['super_admin', 'admin', 'manager', 'employee', 'viewer'] 
  //     },
  //     branch_id: { type: 'string', format: 'uuid' },
  //     permissions: { 
  //       type: 'array',
  //       items: { type: 'string' }
  //     }
  //   },
  //   additionalProperties: false
  // };

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
   * POST /api/organizations/:id/switch
   * Switch organization context
   */
  router.post('/:id/switch',
    createLimiter,
    organizationController.switchOrganizationContext.bind(organizationController)
  );

  /**
   * POST /api/organizations
   * Create new organization
   */
  router.post('/',
    createLimiter,
    validateRequest(createOrganizationSchema),
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
    validateRequest(updateOrganizationSchema),
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
    checkOrganizationLimit('users'),
    validateRequest(inviteUserSchema),
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