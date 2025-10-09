const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { validateRequest } = require('../middleware/validation');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('../middleware/sanitization');
const { createLimiter } = require('../middleware/rateLimiting');
const { 
  createDiscountRuleSchema, 
  updateDiscountRuleSchema, 
  validateCouponSchema 
} = require('../validations/discountRuleValidation');

/**
 * Discount Rules routes for multi-tenant discount management
 * Handles CRUD operations for discount rules within organizations
 */
const router = express.Router();

// Apply authentication and organization middleware to all routes
router.use(authenticateUser);
router.use(requireOrganizationContext);

const discountRuleController = ServiceFactory.createDiscountRuleController();

// Schemas are imported from validations/discountRuleValidation.js

const discountRuleSanitizationRules = {
  body: {
    name: { type: 'string', maxLength: 255, normalizeWhitespace: true },
    type: { type: 'string', maxLength: 50 },
    value: { type: 'number' },
    description: { type: 'string', maxLength: 500, normalizeWhitespace: true },
    coupon_code: { type: 'string', maxLength: 50, normalizeWhitespace: true },
    min_order_amount: { type: 'number' },
    max_uses: { type: 'number' },
    valid_from: { type: 'string', maxLength: 30 },
    valid_to: { type: 'string', maxLength: 30 },
    is_active: { type: 'boolean' }
  }
};

/**
 * GET /api/discount-rules
 * Get all discount rules for the organization
 */
router.get(
  '/',
  createLimiter,
  discountRuleController.getDiscountRules.bind(discountRuleController)
);

/**
 * GET /api/discount-rules/active
 * Get all active discount rules for the organization
 */
router.get(
  '/active',
  createLimiter,
  discountRuleController.getActiveDiscountRules.bind(discountRuleController)
);

/**
 * GET /api/discount-rules/stats
 * Get discount statistics for the organization
 */
router.get(
  '/stats',
  createLimiter,
  discountRuleController.getDiscountStats.bind(discountRuleController)
);

/**
 * POST /api/discount-rules/validate-coupon
 * Validate a coupon code
 */
router.post(
  '/validate-coupon',
  createLimiter,
  sanitizeMiddleware({
    body: {
      coupon_code: { type: 'string', maxLength: 50, normalizeWhitespace: true }
    }
  }),
  validateRequest(validateCouponSchema),
  discountRuleController.validateCoupon.bind(discountRuleController)
);

/**
 * GET /api/discount-rules/:id
 * Get discount rule by ID
 */
router.get(
  '/:id',
  createLimiter,
  discountRuleController.getDiscountRuleById.bind(discountRuleController)
);

/**
 * POST /api/discount-rules
 * Create a new discount rule
 */
router.post(
  '/',
  createLimiter,
  sanitizeMiddleware(discountRuleSanitizationRules),
  validateRequest(createDiscountRuleSchema),
  discountRuleController.createDiscountRule.bind(discountRuleController)
);

/**
 * PUT /api/discount-rules/:id
 * Update a discount rule
 */
router.put(
  '/:id',
  createLimiter,
  sanitizeMiddleware(discountRuleSanitizationRules),
  validateRequest(updateDiscountRuleSchema),
  discountRuleController.updateDiscountRule.bind(discountRuleController)
);

/**
 * DELETE /api/discount-rules/:id
 * Delete a discount rule
 */
router.delete(
  '/:id',
  createLimiter,
  discountRuleController.deleteDiscountRule.bind(discountRuleController)
);

/**
 * POST /api/discount-rules/:id/increment-usage
 * Increment usage count for a discount rule (for order processing)
 */
router.post(
  '/:id/increment-usage',
  createLimiter,
  discountRuleController.incrementUsageCount.bind(discountRuleController)
);

module.exports = router;