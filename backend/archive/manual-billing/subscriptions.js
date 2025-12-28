const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');

const router = express.Router();

// Get subscription controller from service factory
const getSubscriptionController = () => {
  try {
    return ServiceFactory.createSubscriptionController();
  } catch (error) {
    console.error('Error creating SubscriptionController:', error.message);
    throw error;
  }
};

// ============================================================================
// PUBLIC ROUTES (no auth required)
// ============================================================================

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans
 */
router.get('/plans', async (req, res, next) => {
  try {
    const controller = getSubscriptionController();
    await controller.getPlans(req, res, next);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================

router.use(authenticateUser);
router.use(requireOrganizationContext);

/**
 * GET /api/subscriptions/current
 * Get current organization's subscription
 */
router.get('/current', async (req, res, next) => {
  try {
    const controller = getSubscriptionController();
    await controller.getCurrentSubscription(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subscriptions/limits
 * Get current plan limits
 */
router.get('/limits', async (req, res, next) => {
  try {
    const controller = getSubscriptionController();
    await controller.getPlanLimits(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions/request-change
 * Request plan change
 */
router.post('/request-change', async (req, res, next) => {
  try {
    const controller = getSubscriptionController();
    await controller.requestPlanChange(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions/:id/cancel
 * Cancel subscription (owner/admin only)
 */
router.post(
  '/:id/cancel',
  requirePermission(PERMISSIONS.ORGANIZATION_MANAGE),
  async (req, res, next) => {
    try {
      const controller = getSubscriptionController();
      await controller.cancelSubscription(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/subscriptions/payments
 * Get organization's payments
 */
router.get('/payments', async (req, res, next) => {
  try {
    const controller = getSubscriptionController();
    await controller.getPayments(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions/payments
 * Record manual payment
 */
router.post('/payments', async (req, res, next) => {
  try {
    const controller = getSubscriptionController();
    await controller.recordPayment(req, res, next);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ADMIN ROUTES (owner/admin only)
// ============================================================================

/**
 * GET /api/subscriptions/admin/pending
 * Get all pending subscriptions (admin)
 */
router.get(
  '/admin/pending',
  requirePermission(PERMISSIONS.ORGANIZATION_MANAGE),
  async (req, res, next) => {
    try {
      const controller = getSubscriptionController();
      await controller.getPendingSubscriptions(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/subscriptions/admin/pending-payments
 * Get all pending payments (admin)
 */
router.get(
  '/admin/pending-payments',
  requirePermission(PERMISSIONS.ORGANIZATION_MANAGE),
  async (req, res, next) => {
    try {
      const controller = getSubscriptionController();
      await controller.getPendingPayments(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/subscriptions/:id/activate
 * Activate subscription (admin only)
 */
router.post(
  '/:id/activate',
  requirePermission(PERMISSIONS.ORGANIZATION_MANAGE),
  async (req, res, next) => {
    try {
      const controller = getSubscriptionController();
      await controller.activateSubscription(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/subscriptions/payments/:id/confirm
 * Confirm payment (admin only)
 */
router.post(
  '/payments/:id/confirm',
  requirePermission(PERMISSIONS.ORGANIZATION_MANAGE),
  async (req, res, next) => {
    try {
      const controller = getSubscriptionController();
      await controller.confirmPayment(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
