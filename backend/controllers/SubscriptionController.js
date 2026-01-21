const { Logger } = require('../utils/Logger');

class SubscriptionController {
  constructor(subscriptionService) {
    this.subscriptionService = subscriptionService;
    this.logger = new Logger('SubscriptionController');
  }

  /**
   * Get current subscription
   * GET /api/subscriptions/current
   */
  async getCurrentSubscription(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({
          error: 'Organization context required'
        });
      }

      const subscription = await this.subscriptionService.getCurrentSubscription(organizationId);

      res.json({
        subscription
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request a plan change - creates a pending subscription
   * POST /api/subscriptions/request-change
   */
  async requestPlanChange(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const { planId, currency } = req.body;

      if (!organizationId) {
        return res.status(400).json({
          error: 'Organization context required'
        });
      }

      if (!planId) {
        return res.status(400).json({
          error: 'planId is required'
        });
      }

      const subscription = await this.subscriptionService.requestPlanChange(
        organizationId,
        planId,
        currency
      );

      res.status(201).json({
        subscription
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { SubscriptionController };
