const express = require('express');
const PricingController = require('../controllers/PricingController');
const { validateRequest } = require('../middleware/validation');
const { createLimiter } = require('../middleware/rateLimiting');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('../middleware/sanitization');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');

const {
  calculatePricingSchema,
  validateCouponSchema,
  createPricingTierSchema,
  createCustomerPricingSchema,
  createTaxRateSchema,
  createDiscountRuleSchema
} = require('../validations/pricingValidation');

/**
 * Pricing routes - RESTful API endpoints for pricing management
 * All routes require authentication and organization context
 */
function createPricingRoutes(container) {
  const router = express.Router();
  
  // Apply authentication and organization middleware to all routes
  router.use(authenticateUser);
  router.use(requireOrganizationContext);
  
  // Get controller from container
  const pricingController = container.get('pricingController');

  // =================== PRICING CALCULATIONS ===================

  // POST /api/pricing/calculate - Calculate order pricing preview
  router.post(
    '/calculate',
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.general),
    validateRequest(calculatePricingSchema),
    async (req, res, next) => {
      try {
        await pricingController.calculateOrderPricing(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/pricing/validate-coupon - Validate coupon code
  router.post(
    '/validate-coupon',
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.general),
    validateRequest(validateCouponSchema),
    async (req, res, next) => {
      try {
        await pricingController.validateCouponCode(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // =================== PRICING TIERS ===================

  // GET /api/pricing/products/:productId/tiers - Get pricing tiers for product
  router.get(
    '/products/:productId/tiers',
    async (req, res, next) => {
      try {
        await pricingController.getProductPricingTiers(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/pricing/products/:productId/tiers - Create pricing tier
  router.post(
    '/products/:productId/tiers',
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.general),
    validateRequest(createPricingTierSchema),
    async (req, res, next) => {
      try {
        await pricingController.createPricingTier(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // PUT /api/pricing/tiers/:tierId - Update pricing tier
  router.put(
    '/tiers/:tierId',
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.general),
    async (req, res, next) => {
      try {
        await pricingController.updatePricingTier(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /api/pricing/tiers/:tierId - Delete pricing tier
  router.delete(
    '/tiers/:tierId',
    createLimiter,
    async (req, res, next) => {
      try {
        await pricingController.deletePricingTier(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // =================== CUSTOMER PRICING ===================

  // GET /api/pricing/customers/:clientId - Get customer pricing
  router.get(
    '/customers/:clientId',
    async (req, res, next) => {
      try {
        await pricingController.getCustomerPricing(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/pricing/customers/:clientId - Create customer pricing
  router.post(
    '/customers/:clientId',
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.general),
    validateRequest(createCustomerPricingSchema),
    async (req, res, next) => {
      try {
        await pricingController.createCustomerPricing(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // PUT /api/pricing/customers/:pricingId - Update customer pricing
  router.put(
    '/customers/:pricingId',
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.general),
    async (req, res, next) => {
      try {
        await pricingController.updateCustomerPricing(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // =================== TAX RATES ===================

  // GET /api/pricing/taxes/rates - Get tax rates
  router.get(
    '/taxes/rates',
    async (req, res, next) => {
      try {
        await pricingController.getTaxRates(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/pricing/taxes/rates - Create tax rate
  router.post(
    '/taxes/rates',
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.general),
    validateRequest(createTaxRateSchema),
    async (req, res, next) => {
      try {
        await pricingController.createTaxRate(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // PUT /api/pricing/taxes/rates/:taxRateId - Update tax rate
  router.put(
    '/taxes/rates/:taxRateId',
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.general),
    async (req, res, next) => {
      try {
        await pricingController.updateTaxRate(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // =================== DISCOUNT RULES ===================

  // GET /api/pricing/discounts/rules - Get discount rules
  router.get(
    '/discounts/rules',
    async (req, res, next) => {
      try {
        await pricingController.getDiscountRules(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/pricing/discounts/rules - Create discount rule
  router.post(
    '/discounts/rules',
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.general),
    validateRequest(createDiscountRuleSchema),
    async (req, res, next) => {
      try {
        await pricingController.createDiscountRule(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // PUT /api/pricing/discounts/rules/:ruleId - Update discount rule
  router.put(
    '/discounts/rules/:ruleId',
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.general),
    async (req, res, next) => {
      try {
        await pricingController.updateDiscountRule(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /api/pricing/discounts/rules/:ruleId - Delete discount rule
  router.delete(
    '/discounts/rules/:ruleId',
    createLimiter,
    async (req, res, next) => {
      try {
        await pricingController.deleteDiscountRule(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // =================== OVERVIEW ===================

  // GET /api/pricing/overview - Get pricing overview
  router.get(
    '/overview',
    async (req, res, next) => {
      try {
        await pricingController.getPricingOverview(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

module.exports = { createPricingRoutes };