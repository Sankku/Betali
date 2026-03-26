const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { validateRequest, validateQuery } = require('../middleware/validation');
const { createLimiter, searchLimiter, bulkImportLimiter } = require('../middleware/rateLimiting');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('../middleware/sanitization');
const { checkOrganizationLimit } = require('../middleware/limitEnforcement');
const {
  createProductSchema,
  updateProductSchema, 
  queryParamsSchema 
} = require('../validations/productValidation');

const router = express.Router();

const productController = ServiceFactory.createProductController();

router.use(authenticateUser);
router.use(requireOrganizationContext);

router.get(
  '/',
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  validateQuery(queryParamsSchema),
  async (req, res, next) => {
    try {
      await productController.getProducts(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/search',
  requirePermission(PERMISSIONS.PRODUCTS_SEARCH),
  searchLimiter, // Apply search-specific rate limiting
  validateQuery(queryParamsSchema),
  async (req, res, next) => {
    try {
      await productController.searchProducts(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/expiring',
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  validateQuery(queryParamsSchema),
  async (req, res, next) => {
    try {
      await productController.getExpiringProducts(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id/available-stock',
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  async (req, res, next) => {
    try {
      await productController.getAvailableStock(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  async (req, res, next) => {
    try {
      await productController.getProductById(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/bulk-import',
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  checkOrganizationLimit('products'),
  bulkImportLimiter,
  async (req, res, next) => {
    try {
      await productController.bulkImport(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  checkOrganizationLimit('products'),
  createLimiter, // Apply create-specific rate limiting
  sanitizeMiddleware(SANITIZATION_RULES.product), // Sanitize product inputs
  validateRequest(createProductSchema),
  async (req, res, next) => {
    try {
      await productController.createProduct(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  createLimiter, // Apply update-specific rate limiting
  sanitizeMiddleware(SANITIZATION_RULES.product), // Sanitize product inputs
  validateRequest(updateProductSchema),
  async (req, res, next) => {
    try {
      await productController.updateProduct(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  async (req, res, next) => {
    try {
      await productController.deleteProduct(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;