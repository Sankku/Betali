const { Logger } = require('../utils/Logger');

/**
 * Subscription Controller - HTTP handlers for subscription management
 */
class SubscriptionController {
  constructor(subscriptionService) {
    this.subscriptionService = subscriptionService;
    this.logger = new Logger('SubscriptionController');
  }

  /**
   * GET /api/subscriptions/plans
   * Get all available subscription plans
   */
  async getPlans(req, res, next) {
    try {
      const plans = await this.subscriptionService.getPlans();

      res.json({
        data: plans,
        message: 'Plans retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/subscriptions/current
   * Get current organization's subscription
   */
  async getCurrentSubscription(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found'
        });
      }

      const subscription = await this.subscriptionService.getOrganizationSubscription(organizationId);

      res.json({
        data: subscription,
        message: 'Subscription retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/subscriptions/request-change
   * Request plan change
   */
  async requestPlanChange(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const userId = req.user.id;
      const { plan_id, currency } = req.body;

      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found'
        });
      }

      if (!plan_id) {
        return res.status(400).json({
          error: 'Plan ID is required'
        });
      }

      const subscription = await this.subscriptionService.requestPlanChange(
        organizationId,
        plan_id,
        currency || 'USD',
        userId
      );

      res.json({
        data: subscription,
        message: 'Plan change requested successfully. Our team will contact you with payment instructions.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/subscriptions/:id/activate
   * Activate subscription (admin only)
   */
  async activateSubscription(req, res, next) {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;

      const subscription = await this.subscriptionService.activateSubscription(id, adminUserId);

      res.json({
        data: subscription,
        message: 'Subscription activated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/subscriptions/:id/cancel
   * Cancel subscription
   */
  async cancelSubscription(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { reason } = req.body;

      const subscription = await this.subscriptionService.cancelSubscription(id, userId, reason);

      res.json({
        data: subscription,
        message: 'Subscription cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/subscriptions/payments
   * Record manual payment
   */
  async recordPayment(req, res, next) {
    try {
      const userId = req.user.id;
      const paymentData = req.body;

      const payment = await this.subscriptionService.recordPayment(paymentData, userId);

      res.status(201).json({
        data: payment,
        message: 'Payment recorded successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/subscriptions/payments/:id/confirm
   * Confirm payment (admin only)
   */
  async confirmPayment(req, res, next) {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;

      const payment = await this.subscriptionService.confirmPayment(id, adminUserId);

      res.json({
        data: payment,
        message: 'Payment confirmed and subscription activated'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/subscriptions/payments
   * Get organization's payments
   */
  async getPayments(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found'
        });
      }

      const payments = await this.subscriptionService.getOrganizationPayments(organizationId);

      res.json({
        data: payments,
        message: 'Payments retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/subscriptions/admin/pending
   * Get all pending subscriptions (admin only)
   */
  async getPendingSubscriptions(req, res, next) {
    try {
      const subscriptions = await this.subscriptionService.getPendingSubscriptions();

      res.json({
        data: subscriptions,
        meta: {
          total: subscriptions.length
        },
        message: 'Pending subscriptions retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/subscriptions/admin/pending-payments
   * Get all pending payments (admin only)
   */
  async getPendingPayments(req, res, next) {
    try {
      const payments = await this.subscriptionService.getPendingPayments();

      res.json({
        data: payments,
        meta: {
          total: payments.length
        },
        message: 'Pending payments retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/subscriptions/limits
   * Get current plan limits for organization
   */
  async getPlanLimits(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found'
        });
      }

      const limits = await this.subscriptionService.getPlanLimits(organizationId);

      res.json({
        data: limits,
        message: 'Plan limits retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SubscriptionController;
