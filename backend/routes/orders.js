const express = require('express');
const OrderController = require('../controllers/OrderController');
const { validateRequest } = require('../middleware/validation');
const { createLimiter } = require('../middleware/rateLimiting');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('../middleware/sanitization');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { ServiceFactory } = require('../config/container');

const {
  createOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
  orderIdSchema,
  calculatePricingSchema,
  validateCouponSchema
} = require('../validations/orderValidation');

/**
 * Order routes - RESTful API endpoints for order management
 * All routes require authentication and organization context
 */
function createOrderRoutes(container) {
  const router = express.Router();
  
  // Apply authentication and organization middleware to all routes
  router.use(authenticateUser);
  router.use(requireOrganizationContext);
  
  // Get controller from container
  const orderController = container.get('orderController');

  // GET /api/orders/stats - Get order statistics
  router.get('/stats', async (req, res, next) => {
    try {
      await orderController.getOrderStats(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/orders/calculate-pricing - Calculate order pricing preview
  router.post(
    '/calculate-pricing',
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.product),
    validateRequest(calculatePricingSchema),
    async (req, res, next) => {
      try {
        await orderController.calculateOrderPricing(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/orders/validate-coupon - Validate coupon code
  router.post(
    '/validate-coupon',
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.general),
    validateRequest(validateCouponSchema),
    async (req, res, next) => {
      try {
        await orderController.validateOrderCoupon(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/orders - Get all orders with filtering and pagination
  router.get(
    '/',
    validateRequest(orderQuerySchema, 'query'),
    async (req, res, next) => {
      try {
        await orderController.getOrders(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/orders/:id - Get specific order by ID
  router.get(
    '/:id',
    validateRequest(orderIdSchema, 'params'),
    async (req, res, next) => {
      try {
        await orderController.getOrderById(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/orders - Create new order
  router.post(
    '/',
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.product), // Reuse product sanitization rules
    validateRequest(createOrderSchema),
    async (req, res, next) => {
      try {
        await orderController.createOrder(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // PUT /api/orders/:id - Update order
  router.put(
    '/:id',
    validateRequest(orderIdSchema, 'params'),
    createLimiter,
    sanitizeMiddleware(SANITIZATION_RULES.product),
    validateRequest(updateOrderSchema),
    async (req, res, next) => {
      try {
        await orderController.updateOrder(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // PATCH /api/orders/:id/status - Update order status
  router.patch(
    '/:id/status',
    validateRequest(orderIdSchema, 'params'),
    createLimiter,
    validateRequest(updateOrderStatusSchema),
    async (req, res, next) => {
      try {
        await orderController.updateOrderStatus(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /api/orders/:id - Delete (cancel) order
  router.delete(
    '/:id',
    validateRequest(orderIdSchema, 'params'),
    createLimiter,
    async (req, res, next) => {
      try {
        await orderController.deleteOrder(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/orders/:id/duplicate - Duplicate an existing order
  router.post(
    '/:id/duplicate',
    validateRequest(orderIdSchema, 'params'),
    createLimiter,
    async (req, res, next) => {
      try {
        await orderController.duplicateOrder(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/orders/:id/process - Mark order as processing
  router.post(
    '/:id/process',
    validateRequest(orderIdSchema, 'params'),
    createLimiter,
    async (req, res, next) => {
      try {
        await orderController.processOrder(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/orders/:id/fulfill - Fulfill order (ship and deduct stock)
  router.post(
    '/:id/fulfill',
    validateRequest(orderIdSchema, 'params'),
    createLimiter,
    async (req, res, next) => {
      try {
        await orderController.fulfillOrder(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/orders/:id/complete - Mark order as completed
  router.post(
    '/:id/complete',
    validateRequest(orderIdSchema, 'params'),
    createLimiter,
    async (req, res, next) => {
      try {
        await orderController.completeOrder(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/orders/:id/history - Get order history
  router.get(
    '/:id/history',
    validateRequest(orderIdSchema, 'params'),
    async (req, res, next) => {
      try {
        await orderController.getOrderHistory(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/orders/:id/reserve-stock - Reserve stock for order
  router.post(
    '/:id/reserve-stock',
    validateRequest(orderIdSchema, 'params'),
    createLimiter,
    async (req, res, next) => {
      try {
        await orderController.reserveStockForOrder(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/orders/:id/release-stock - Release stock reservations
  router.post(
    '/:id/release-stock',
    validateRequest(orderIdSchema, 'params'),
    createLimiter,
    async (req, res, next) => {
      try {
        await orderController.releaseStockReservations(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/orders/:id/reservations - Get order stock reservations
  router.get(
    '/:id/reservations',
    validateRequest(orderIdSchema, 'params'),
    async (req, res, next) => {
      try {
        await orderController.getOrderReservations(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

module.exports = { createOrderRoutes };