const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { createLimiter } = require('../middleware/rateLimiting');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');

const router = express.Router();

// Get purchase order controller from service factory
const getPurchaseOrderController = () => {
  try {
    return ServiceFactory.createPurchaseOrderController();
  } catch (error) {
    console.error('Error creating PurchaseOrderController:', error.message);
    throw error;
  }
};

// Apply authentication and organization context to all routes
router.use(authenticateUser);
router.use(requireOrganizationContext);

/**
 * GET /api/purchase-orders
 * Get all purchase orders for the authenticated user's organization
 */
router.get(
  '/',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ || PERMISSIONS.PRODUCTS_READ),
  async (req, res, next) => {
    try {
      const controller = getPurchaseOrderController();
      await controller.getPurchaseOrders(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/purchase-orders/:id
 * Get single purchase order by ID
 */
router.get(
  '/:id',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ || PERMISSIONS.PRODUCTS_READ),
  async (req, res, next) => {
    try {
      const controller = getPurchaseOrderController();
      await controller.getPurchaseOrderById(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/purchase-orders
 * Create a new purchase order
 */
router.post(
  '/',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_CREATE || PERMISSIONS.PRODUCTS_CREATE),
  createLimiter,
  async (req, res, next) => {
    try {
      const controller = getPurchaseOrderController();
      await controller.createPurchaseOrder(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/purchase-orders/:id/status
 * Update purchase order status
 */
router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE || PERMISSIONS.PRODUCTS_UPDATE),
  async (req, res, next) => {
    try {
      const controller = getPurchaseOrderController();
      await controller.updatePurchaseOrderStatus(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/purchase-orders/:id
 * Cancel/delete purchase order
 */
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_DELETE || PERMISSIONS.PRODUCTS_DELETE),
  async (req, res, next) => {
    try {
      const controller = getPurchaseOrderController();
      await controller.deletePurchaseOrder(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
