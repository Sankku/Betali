const { Logger } = require('../utils/Logger');

/**
 * Order Controller - HTTP API endpoints for order management
 * Provides RESTful API for sales order operations
 */
class OrderController {
  constructor(orderService) {
    this.orderService = orderService;
    this.logger = new Logger('OrderController');
  }

  /**
   * GET /api/orders
   * Get all orders for the organization with filtering and pagination
   */
  async getOrders(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const {
        status,
        client_id,
        search,
        limit = 50,
        offset = 0,
        sort_by = 'created_at',
        sort_order = 'desc',
        date_from,
        date_to
      } = req.query;

      this.logger.info('Getting orders', { organizationId, query: req.query });

      // Build filters
      const filters = {};
      if (status) filters.status = status;
      if (client_id) filters.client_id = client_id;
      if (search) filters.search = search;
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;

      // Build pagination and sorting
      const options = {
        filters,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        },
        sort: {
          orderBy: {
            column: sort_by,
            ascending: sort_order === 'asc'
          }
        }
      };

      const result = await this.orderService.getOrders(organizationId, options);

      this.logger.info('Orders retrieved successfully', { 
        organizationId, 
        count: result.orders.length 
      });

      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination,
        stats: result.stats
      });
    } catch (error) {
      this.logger.error('Error getting orders', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/orders/:id
   * Get a specific order by ID
   */
  async getOrderById(req, res, next) {
    try {
      const { id: orderId } = req.params;
      const organizationId = req.user.currentOrganizationId;

      this.logger.info('Getting order by ID', { orderId, organizationId });

      const order = await this.orderService.getOrderById(orderId, organizationId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      this.logger.info('Order retrieved successfully', { orderId });

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      this.logger.error('Error getting order by ID', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/orders
   * Create a new order
   */
  async createOrder(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const userId = req.user.id;
      const orderData = {
        ...req.body,
        user_id: userId
      };

      this.logger.info('Creating new order', { organizationId });

      const order = await this.orderService.createOrder(orderData, organizationId);

      this.logger.info('Order created successfully', { 
        orderId: order.order_id,
        organizationId 
      });

      res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully'
      });
    } catch (error) {
      this.logger.error('Error creating order', { error: error.message });
      next(error);
    }
  }

  /**
   * PUT /api/orders/:id
   * Update an existing order
   */
  async updateOrder(req, res, next) {
    try {
      const { id: orderId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const updateData = req.body;

      this.logger.info('Updating order', { orderId, organizationId });

      const order = await this.orderService.updateOrder(orderId, organizationId, updateData);

      this.logger.info('Order updated successfully', { orderId });

      res.json({
        success: true,
        data: order,
        message: 'Order updated successfully'
      });
    } catch (error) {
      this.logger.error('Error updating order', { error: error.message });
      next(error);
    }
  }

  /**
   * PATCH /api/orders/:id/status
   * Update order status
   */
  async updateOrderStatus(req, res, next) {
    try {
      const { id: orderId } = req.params;
      const { status } = req.body;
      const organizationId = req.user.currentOrganizationId;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      this.logger.info('Updating order status', { orderId, status, organizationId });

      const order = await this.orderService.updateOrderStatus(orderId, organizationId, status);

      this.logger.info('Order status updated successfully', { orderId, status });

      res.json({
        success: true,
        data: order,
        message: `Order status updated to ${status}`
      });
    } catch (error) {
      this.logger.error('Error updating order status', { error: error.message });
      next(error);
    }
  }

  /**
   * DELETE /api/orders/:id
   * Delete (cancel) an order
   */
  async deleteOrder(req, res, next) {
    try {
      const { id: orderId } = req.params;
      const organizationId = req.user.currentOrganizationId;

      this.logger.info('Deleting order', { orderId, organizationId });

      const success = await this.orderService.deleteOrder(orderId, organizationId);

      if (success) {
        this.logger.info('Order deleted successfully', { orderId });

        res.json({
          success: true,
          message: 'Order cancelled successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to cancel order'
        });
      }
    } catch (error) {
      this.logger.error('Error deleting order', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/orders/stats
   * Get order statistics for dashboard
   */
  async getOrderStats(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;

      this.logger.info('Getting order statistics', { organizationId });

      const stats = await this.orderService.getOrderStats(organizationId);

      this.logger.info('Order statistics retrieved successfully', { organizationId });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      this.logger.error('Error getting order statistics', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/orders/:id/duplicate
   * Duplicate an existing order
   */
  async duplicateOrder(req, res, next) {
    try {
      const { id: orderId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const userId = req.user.id;

      this.logger.info('Duplicating order', { orderId, organizationId });

      // Get the original order
      const originalOrder = await this.orderService.getOrderById(orderId, organizationId);

      if (!originalOrder) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Prepare duplicate order data
      // Pass tax_rate_ids: [] when original had no tax so calculateTaxes skips the default org tax rate.
      // tax_rate_ids is not persisted on orders, so we infer intent from tax_amount.
      const duplicateData = {
        client_id: originalOrder.client_id,
        warehouse_id: originalOrder.warehouse_id,
        notes: `Duplicado de la Orden #${originalOrder.order_id.slice(-8).toUpperCase()}`,
        status: 'draft',
        tax_rate_ids: (originalOrder.tax_amount === 0 || originalOrder.tax_amount === null) ? [] : undefined,
        items: originalOrder.order_details.map(detail => ({
          product_type_id: detail.product_type_id || detail.product_id,
          quantity: detail.quantity,
          price: detail.price
        }))
      };

      const duplicatedOrder = await this.orderService.createOrder(duplicateData, organizationId);

      this.logger.info('Order duplicated successfully', { 
        originalOrderId: orderId,
        newOrderId: duplicatedOrder.order_id 
      });

      res.status(201).json({
        success: true,
        data: duplicatedOrder,
        message: 'Order duplicated successfully'
      });
    } catch (error) {
      this.logger.error('Error duplicating order', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/orders/:id/fulfill
   * Fulfill an order (mark as shipped and deduct stock)
   */
  async fulfillOrder(req, res, next) {
    try {
      const { id: orderId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const fulfillmentData = req.body || {};

      this.logger.info('Fulfilling order', { orderId, organizationId });

      const order = await this.orderService.fulfillOrder(orderId, organizationId, fulfillmentData);

      this.logger.info('Order fulfilled successfully', { orderId });

      res.json({
        success: true,
        data: order,
        message: 'Order fulfilled successfully. Stock has been deducted.'
      });
    } catch (error) {
      this.logger.error('Error fulfilling order', { error: error.message, orderId: req.params.id });
      next(error);
    }
  }

  /**
   * POST /api/orders/:id/process
   * Mark order as processing (validates stock availability)
   */
  async processOrder(req, res, next) {
    try {
      const { id: orderId } = req.params;
      const organizationId = req.user.currentOrganizationId;

      this.logger.info('Processing order', { orderId, organizationId });

      const order = await this.orderService.updateOrderStatus(orderId, organizationId, 'processing');

      this.logger.info('Order marked as processing', { orderId });

      res.json({
        success: true,
        data: order,
        message: 'Order is now being processed. Stock availability validated.'
      });
    } catch (error) {
      this.logger.error('Error processing order', { error: error.message, orderId: req.params.id });
      next(error);
    }
  }

  /**
   * POST /api/orders/:id/complete
   * Mark order as completed
   */
  async completeOrder(req, res, next) {
    try {
      const { id: orderId } = req.params;
      const organizationId = req.user.currentOrganizationId;

      this.logger.info('Completing order', { orderId, organizationId });

      const order = await this.orderService.updateOrderStatus(orderId, organizationId, 'completed');

      this.logger.info('Order completed', { orderId });

      res.json({
        success: true,
        data: order,
        message: 'Order completed successfully'
      });
    } catch (error) {
      this.logger.error('Error completing order', { error: error.message, orderId: req.params.id });
      next(error);
    }
  }

  /**
   * POST /api/orders/calculate-pricing
   * Calculate order pricing preview
   */
  async calculateOrderPricing(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const orderData = req.body;

      this.logger.info('Calculating order pricing preview', { organizationId });

      const pricingResult = await this.orderService.calculateOrderPricing(orderData, organizationId);

      this.logger.info('Order pricing preview calculated', { organizationId });

      res.json({
        success: true,
        data: pricingResult,
        message: 'Order pricing calculated successfully'
      });
    } catch (error) {
      this.logger.error('Error calculating order pricing preview', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/orders/validate-coupon
   * Validate coupon code for order
   */
  async validateOrderCoupon(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const { coupon_code, order_data } = req.body;

      if (!coupon_code) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code is required'
        });
      }

      this.logger.info('Validating coupon for order', { couponCode: coupon_code, organizationId });

      const result = await this.orderService.validateCouponCode(
        coupon_code,
        order_data || {},
        organizationId
      );

      this.logger.info('Coupon validation completed', { 
        couponCode: coupon_code,
        valid: result.valid 
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.logger.error('Error validating coupon for order', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/orders/:id/history
   * Get order status change history (placeholder for future implementation)
   */
  async getOrderHistory(req, res, next) {
    try {
      const { id: orderId } = req.params;
      const organizationId = req.user.currentOrganizationId;

      // This is a placeholder - you would implement order history tracking
      this.logger.info('Getting order history', { orderId, organizationId });

      // For now, just return the current order
      const order = await this.orderService.getOrderById(orderId, organizationId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Mock history entry
      const history = [
        {
          timestamp: order.created_at,
          status: 'draft',
          action: 'Order created',
          user: 'System'
        },
        {
          timestamp: order.updated_at,
          status: order.status,
          action: `Status changed to ${order.status}`,
          user: 'System'
        }
      ];

      res.json({
        success: true,
        data: {
          order_id: orderId,
          history: history
        }
      });
    } catch (error) {
      this.logger.error('Error getting order history', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/orders/:id/reserve-stock
   * Reserve stock for an order
   */
  async reserveStockForOrder(req, res, next) {
    try {
      const { id: orderId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const userId = req.user.id;

      this.logger.info('Reserving stock for order', { orderId, organizationId });

      const reservations = await this.orderService.reserveStockForOrder(
        orderId,
        organizationId,
        userId
      );

      this.logger.info('Stock reserved successfully', {
        orderId,
        reservationCount: reservations.length
      });

      res.json({
        success: true,
        message: 'Stock reserved successfully',
        data: reservations
      });
    } catch (error) {
      this.logger.error('Error reserving stock for order', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/orders/:id/release-stock
   * Release stock reservations for an order
   */
  async releaseStockReservations(req, res, next) {
    try {
      const { id: orderId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const { reason = 'cancelled' } = req.body;

      this.logger.info('Releasing stock reservations', { orderId, organizationId, reason });

      const releasedReservations = await this.orderService.releaseStockReservations(
        orderId,
        organizationId,
        reason
      );

      this.logger.info('Stock reservations released', {
        orderId,
        count: releasedReservations.length
      });

      res.json({
        success: true,
        message: 'Stock reservations released successfully',
        data: releasedReservations
      });
    } catch (error) {
      this.logger.error('Error releasing stock reservations', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/orders/:id/reservations
   * Get stock reservations for an order
   */
  async getOrderReservations(req, res, next) {
    try {
      const { id: orderId } = req.params;
      const organizationId = req.user.currentOrganizationId;

      this.logger.info('Getting order reservations', { orderId, organizationId });

      const reservations = await this.orderService.getOrderReservations(
        orderId,
        organizationId
      );

      this.logger.info('Order reservations retrieved', {
        orderId,
        count: reservations.length
      });

      res.json({
        success: true,
        data: reservations
      });
    } catch (error) {
      this.logger.error('Error getting order reservations', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/products/:id/available-stock
   * Get available stock for a product (physical - reserved)
   */
  async getAvailableStock(req, res, next) {
    try {
      const { id: productId } = req.params;
      const { warehouse_id: warehouseId } = req.query;
      const organizationId = req.user.currentOrganizationId;

      if (!warehouseId) {
        return res.status(400).json({
          success: false,
          message: 'warehouse_id query parameter is required'
        });
      }

      this.logger.info('Getting available stock', { productId, warehouseId, organizationId });

      const availableStock = await this.orderService.getAvailableStock(
        productId,
        warehouseId,
        organizationId
      );

      this.logger.info('Available stock retrieved', {
        productId,
        warehouseId,
        availableStock
      });

      res.json({
        success: true,
        data: {
          product_id: productId,
          warehouse_id: warehouseId,
          available_stock: availableStock
        }
      });
    } catch (error) {
      this.logger.error('Error getting available stock', { error: error.message });
      next(error);
    }
  }
}

module.exports = OrderController;