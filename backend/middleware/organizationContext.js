const { Logger } = require('../utils/Logger');

const logger = new Logger('OrganizationContext');

/**
 * Middleware to ensure user has a valid organization context
 * Verifies that the user has access to the requested organization
 */
const requireOrganizationContext = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_AUTH'
      });
    }

    const requestedOrgId = req.headers['x-organization-id'];
    
    if (!requestedOrgId) {
      return res.status(400).json({
        error: 'Organization context required',
        message: 'Please provide x-organization-id header',
        code: 'MISSING_ORG_CONTEXT'
      });
    }

    // Check if user has access to the requested organization
    const hasAccess = req.user.organizationRoles?.some(
      org => org.organization_id === requestedOrgId && org.is_active !== false
    );

    if (!hasAccess) {
      logger.warn('User attempted to access unauthorized organization', {
        userId: req.user.id,
        requestedOrganizationId: requestedOrgId,
        userOrganizations: req.user.organizationRoles?.map(org => org.organization_id)
      });

      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this organization',
        code: 'ORG_ACCESS_DENIED'
      });
    }

    // Update the current organization context in the request
    const orgContext = req.user.organizationRoles.find(
      org => org.organization_id === requestedOrgId
    );

    req.user.currentOrganizationId = requestedOrgId;
    req.user.currentOrganization = orgContext.organization;
    req.user.currentOrganizationRole = orgContext.role.toUpperCase();
    req.user.currentOrganizationPermissions = orgContext.permissions || [];

    next();
  } catch (error) {
    logger.error('Organization context middleware error', {
      error: error.message,
      userId: req.user?.id,
      requestedOrganizationId: req.headers['x-organization-id']
    });

    return res.status(500).json({
      error: 'Internal server error',
      code: 'ORG_CONTEXT_ERROR'
    });
  }
};

/**
 * Optional organization context middleware
 * Sets organization context if provided, but doesn't require it
 */
const optionalOrganizationContext = (req, res, next) => {
  try {
    if (req.user && req.headers['x-organization-id']) {
      const requestedOrgId = req.headers['x-organization-id'];
      
      // Check if user has access to the requested organization AND the org itself is active.
      const orgContext = req.user.organizationRoles?.find(
        org => org.organization_id === requestedOrgId && org.is_active !== false
      );

      if (orgContext && orgContext.organization?.is_active !== false) {
        req.user.currentOrganizationId = requestedOrgId;
        req.user.currentOrganization = orgContext.organization;
        req.user.currentOrganizationRole = orgContext.role.toUpperCase();
        req.user.currentOrganizationPermissions = orgContext.permissions || [];
      } else {
        logger.warn('User attempted to set invalid organization context', {
          userId: req.user.id,
          requestedOrganizationId: requestedOrgId
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Optional organization context middleware error', {
      error: error.message,
      userId: req.user?.id
    });
    
    // Don't fail the request for optional context errors
    next();
  }
};

module.exports = {
  requireOrganizationContext,
  optionalOrganizationContext
};