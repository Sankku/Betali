const { Logger } = require('../utils/Logger');

/**
 * Debug controller for troubleshooting
 */
class DebugController {
  constructor() {
    this.logger = new Logger('DebugController');
  }

  /**
   * Debug current user authentication data
   * GET /api/debug/auth
   */
  async debugAuthData(req, res, next) {
    try {
      this.logger.info('Debug auth data requested', {
        userId: req.user?.id,
        ip: req.ip
      });

      const debugData = {
        timestamp: new Date().toISOString(),
        user: {
          id: req.user?.id,
          email: req.user?.email,
          role: req.user?.role,
          currentOrganizationId: req.user?.currentOrganizationId,
          currentOrganizationRole: req.user?.currentOrganizationRole,
          organizationRoles: req.user?.organizationRoles,
          isActive: req.user?.isActive,
          profile: req.user?.profile
        },
        headers: {
          authorization: req.headers.authorization ? 'Bearer [REDACTED]' : 'None',
          'x-organization-id': req.headers['x-organization-id'] || 'None'
        }
      };

      res.json({ 
        message: 'Authentication debug data',
        data: debugData 
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DebugController;