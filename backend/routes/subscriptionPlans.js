const express = require('express');
const router = express.Router();
const SubscriptionPlanController = require('../controllers/SubscriptionPlanController');
const { authenticateUser } = require('../middleware/auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');

/**
 * Public Routes - No authentication required
 */

// Get all public subscription plans
router.get('/', SubscriptionPlanController.getPublicPlans);

// Get plans comparison data for pricing page
router.get('/comparison', SubscriptionPlanController.getPlansComparison);

// Get specific plan by ID
router.get('/:planId', SubscriptionPlanController.getPlanById);

// Get specific plan by name
router.get('/name/:planName', SubscriptionPlanController.getPlanByName);

// Get plan limits
router.get('/:planName/limits', SubscriptionPlanController.getPlanLimits);

// Check if plan has a feature
router.get('/:planName/features/:featureName', SubscriptionPlanController.checkFeature);

/**
 * Protected Routes - Require authentication
 */

// Check if user can upgrade
router.post(
  '/can-upgrade',
  authenticateUser,
  SubscriptionPlanController.canUpgrade
);

// Get recommended plan based on usage
router.post(
  '/recommend',
  authenticateUser,
  SubscriptionPlanController.getRecommendedPlan
);

// Calculate proration for plan change
router.post(
  '/calculate-proration',
  authenticateUser,
  SubscriptionPlanController.calculateProration
);

/**
 * Admin Routes - Require super_admin role
 */

// Get all plans (including inactive)
router.get(
  '/admin/all',
  authenticateUser,
  requirePermission(PERMISSIONS.ADMIN_SYSTEM),
  SubscriptionPlanController.getAllPlans
);

// Create a new plan
router.post(
  '/admin',
  authenticateUser,
  requirePermission(PERMISSIONS.ADMIN_SYSTEM),
  SubscriptionPlanController.createPlan
);

// Update a plan
router.put(
  '/admin/:planId',
  authenticateUser,
  requirePermission(PERMISSIONS.ADMIN_SYSTEM),
  SubscriptionPlanController.updatePlan
);

module.exports = router;
