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
   * Get plans (proxy to keep API consistent if needed, but SubscriptionPlanController handles it better)
   * GET /api/subscriptions/plans
   */
   async getPlans(req, res, next) {
     // This is just a redirect/proxy if we wanted to support the old route
     // But better to fix frontend. However, user asked to fix the 404.
     // Let's implement it to redirect or return plans.
     try {
       // We can return void here and let the specific controller handle it?
       // No, I'll just not implement it here and rely on frontend fix.
       // But wait, the frontend DOES call /api/subscriptions/plans in one method?
       // No, I fixed frontend to call /api/subscription-plans.
       
       // So this controller doesn't need getPlans.
       res.status(404).json({ error: 'Use /api/subscription-plans' });
     } catch (error) {
       next(error);
     }
   }
}

module.exports = { SubscriptionController };
