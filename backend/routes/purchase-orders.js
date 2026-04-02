const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { createLimiter } = require('../middleware/rateLimiting');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { Logger } = require('../utils/Logger');
const orderPdfService = require('../services/OrderPdfService');

const logger = new Logger('PurchaseOrderRoutes');
const router = express.Router();

// Get purchase order controller from service factory
const getPurchaseOrderController = () => {
  try {
    return ServiceFactory.createPurchaseOrderController();
  } catch (error) {
    logger.error('Error creating PurchaseOrderController:', { error: error.message });
    throw error;
  }
};

// Apply authentication and organization context to all routes
router.use(authenticateUser);
router.use(requireOrganizationContext);

/**
 * POST /api/purchase-orders/batch-pdf
 * Generate combined PDF for multiple purchase orders
 */
router.post(
  '/batch-pdf',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ || PERMISSIONS.PRODUCTS_READ),
  createLimiter,
  async (req, res, next) => {
    try {
      const { orderIds } = req.body;
      const organizationId = req.user.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization context required' });
      }

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ error: 'orderIds array is required' });
      }

      if (orderIds.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 orders per batch' });
      }

      const pdfBuffer = await orderPdfService.generateBatchPurchaseOrderPdf(orderIds, organizationId);

      const fileName = `ordenes-compra-${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      console.error('Batch PDF generation error:', error);
      next(error);
    }
  }
);

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
 * PUT /api/purchase-orders/:id
 * Update purchase order (full edit: header + items)
 */
router.put(
  '/:id',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE || PERMISSIONS.PRODUCTS_UPDATE),
  async (req, res, next) => {
    try {
      const controller = getPurchaseOrderController();
      await controller.updatePurchaseOrder(req, res, next);
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

/**
 * POST /api/purchase-orders/:id/duplicate
 * Duplicate a purchase order as a new draft
 */
router.post(
  '/:id/duplicate',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_CREATE || PERMISSIONS.PRODUCTS_CREATE),
  createLimiter,
  async (req, res, next) => {
    try {
      const controller = getPurchaseOrderController();
      await controller.duplicatePurchaseOrder(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/purchase-orders/:id/receive
 * Receive purchase order with lot assignment per line
 */
router.post(
  '/:id/receive',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE || PERMISSIONS.PRODUCTS_UPDATE),
  async (req, res, next) => {
    try {
      const controller = getPurchaseOrderController();
      await controller.receivePurchaseOrder(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/purchase-orders/:id/pdf
 * Download purchase order as PDF
 */
router.get(
  '/:id/pdf',
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ || PERMISSIONS.PRODUCTS_READ),
  async (req, res, next) => {
    try {
      const purchaseOrderId = req.params.id;
      const organizationId = req.user.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization context required' });
      }

      const pdfBuffer = await orderPdfService.generatePurchaseOrderPdf(purchaseOrderId, organizationId);

      const fileName = `orden-compra-${purchaseOrderId.substring(0, 8)}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      console.error('PDF generation error:', error);
      next(error);
    }
  }
);

module.exports = router;
