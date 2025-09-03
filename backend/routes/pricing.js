const express = require('express');
const PricingController = require('../controllers/PricingController');
const { validateRequest } = require('../middleware/validation');
const { createLimiter } = require('../middleware/rateLimiting');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('../middleware/sanitization');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');

// Validation schemas (placeholder - you would define these in validations/pricingValidation.js)
const pricingValidationSchemas = {
  calculatePricing: {
    type: 'object',
    properties: {
      client_id: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            product_id: { type: 'string' },
            quantity: { type: 'number', minimum: 0.001 },
            price: { type: 'number', minimum: 0 }
          },
          required: ['product_id', 'quantity']
        },
        minItems: 1
      }
    },
    required: ['items']
  },
  validateCoupon: {
    type: 'object',
    properties: {
      coupon_code: { type: 'string', minLength: 1 },
      order_data: { type: 'object' }
    },
    required: ['coupon_code']
  },
  createPricingTier: {
    type: 'object',
    properties: {
      tier_name: { type: 'string', minLength: 1, maxLength: 100 },
      min_quantity: { type: 'number', minimum: 0.001 },
      max_quantity: { type: 'number', minimum: 0.001 },
      price: { type: 'number', minimum: 0 },
      is_active: { type: 'boolean' },
      valid_from: { type: 'string' },
      valid_to: { type: 'string' }
    },
    required: ['tier_name', 'min_quantity', 'price']
  },
  createCustomerPricing: {
    type: 'object',
    properties: {
      product_id: { type: 'string' },
      price: { type: 'number', minimum: 0 },
      is_active: { type: 'boolean' },
      valid_from: { type: 'string' },
      valid_to: { type: 'string' },
      notes: { type: 'string', maxLength: 1000 }
    },
    required: ['product_id', 'price']
  },
  createTaxRate: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      rate: { type: 'number', minimum: 0, maximum: 1 },
      is_inclusive: { type: 'boolean' },
      is_active: { type: 'boolean' }
    },
    required: ['name', 'rate']
  },
  createDiscountRule: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      type: { type: 'string', enum: ['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping'] },
      value: { type: 'number', minimum: 0 },
      applies_to: { type: 'string', enum: ['order', 'line_item', 'shipping'] },
      min_order_amount: { type: 'number', minimum: 0 },
      max_discount_amount: { type: 'number', minimum: 0 },
      coupon_code: { type: 'string', maxLength: 50 },
      max_uses: { type: 'integer', minimum: 1 },
      is_active: { type: 'boolean' },
      valid_from: { type: 'string' },
      valid_to: { type: 'string' }
    },
    required: ['name', 'type', 'value']
  }
};

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
    validateRequest(pricingValidationSchemas.calculatePricing),
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
    validateRequest(pricingValidationSchemas.validateCoupon),
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
    validateRequest(pricingValidationSchemas.createPricingTier),
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
    validateRequest(pricingValidationSchemas.createCustomerPricing),
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
    validateRequest(pricingValidationSchemas.createTaxRate),
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
    validateRequest(pricingValidationSchemas.createDiscountRule),
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