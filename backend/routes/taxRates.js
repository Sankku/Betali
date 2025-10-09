const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { validateRequest } = require('../middleware/validation');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('../middleware/sanitization');
const { createLimiter } = require('../middleware/rateLimiting');
const { createTaxRateSchema, updateTaxRateSchema } = require('../validations/taxRateValidation');

/**
 * Tax Rates routes for multi-tenant tax management
 * Handles CRUD operations for tax rates within organizations
 */
const router = express.Router();

// Apply authentication and organization middleware to all routes
router.use(authenticateUser);
router.use(requireOrganizationContext);

const taxRateController = ServiceFactory.createTaxRateController();

// Schemas are imported from validations/taxRateValidation.js

const taxRateSanitizationRules = {
  body: {
    name: { type: 'string', maxLength: 255, normalizeWhitespace: true },
    rate: { type: 'number' },
    description: { type: 'string', maxLength: 500, normalizeWhitespace: true },
    is_active: { type: 'boolean' }
  }
};

/**
 * GET /api/tax-rates
 * Get all tax rates for the organization
 */
router.get(
  '/',
  createLimiter,
  taxRateController.getTaxRates.bind(taxRateController)
);

/**
 * GET /api/tax-rates/active
 * Get all active tax rates for the organization
 */
router.get(
  '/active',
  createLimiter,
  taxRateController.getActiveTaxRates.bind(taxRateController)
);

/**
 * GET /api/tax-rates/default
 * Get the default tax rate for the organization
 */
router.get(
  '/default',
  createLimiter,
  taxRateController.getDefaultTaxRate.bind(taxRateController)
);

/**
 * GET /api/tax-rates/:id
 * Get tax rate by ID
 */
router.get(
  '/:id',
  createLimiter,
  taxRateController.getTaxRateById.bind(taxRateController)
);

/**
 * POST /api/tax-rates
 * Create a new tax rate
 */
router.post(
  '/',
  createLimiter,
  sanitizeMiddleware(taxRateSanitizationRules),
  validateRequest(createTaxRateSchema),
  taxRateController.createTaxRate.bind(taxRateController)
);

/**
 * PUT /api/tax-rates/:id
 * Update a tax rate
 */
router.put(
  '/:id',
  createLimiter,
  sanitizeMiddleware(taxRateSanitizationRules),
  validateRequest(updateTaxRateSchema),
  taxRateController.updateTaxRate.bind(taxRateController)
);

/**
 * DELETE /api/tax-rates/:id
 * Delete a tax rate
 */
router.delete(
  '/:id',
  createLimiter,
  taxRateController.deleteTaxRate.bind(taxRateController)
);

module.exports = router;