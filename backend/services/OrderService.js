const { Logger } = require('../utils/Logger');
const { incrementUsage } = require('../middleware/limitEnforcement');

/**
 * Order Service - Business logic for managing sales orders
 * Handles order creation, updates, status changes, and business rules
 */
class OrderService {
  constructor(orderRepository, orderDetailRepository, productRepository, warehouseRepository, stockMovementRepository, stockReservationRepository, clientRepository, pricingService, logger) {
    this.orderRepository = orderRepository;
    this.orderDetailRepository = orderDetailRepository;
    this.productRepository = productRepository;
    this.warehouseRepository = warehouseRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.stockReservationRepository = stockReservationRepository;
    this.clientRepository = clientRepository;
    this.pricingService = pricingService;
    this.logger = logger || new Logger('OrderService');
  }

  /**
   * Create a new order with items
   * @param {Object} orderData - Order data including items
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async createOrder(orderData, organizationId) {
    try {
      this.logger.info('Creating new order', { organizationId });

      // Validate required fields
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new Error('Order must have at least one item');
      }

      // Validate client if provided
      if (orderData.client_id) {
        const client = await this.clientRepository.findById(orderData.client_id, organizationId);
        if (!client) {
          throw new Error('Client not found or access denied');
        }
      }

      // Calculate complete pricing using PricingService
      const pricingResult = await this.pricingService.calculateOrderPricing(orderData, organizationId);
      
      // Validate stock for all items
      await this.validateOrderItems(pricingResult.line_items, organizationId, orderData.warehouse_id);

      // Validate and sanitize status value
      const validStatuses = ['draft', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];
      const requestedStatus = orderData.status || 'pending';
      const finalStatus = validStatuses.includes(requestedStatus) ? requestedStatus : 'pending';

      if (requestedStatus !== finalStatus) {
        this.logger.warn('Invalid status provided, defaulting to pending', { 
          organizationId,
          requestedStatus,
          finalStatus
        });
      }

      // Prepare order data with advanced pricing
      const order = {
        organization_id: organizationId,
        client_id: orderData.client_id || null,
        warehouse_id: orderData.warehouse_id || null,
        user_id: orderData.user_id,
        status: finalStatus,
        order_date: orderData.order_date || new Date().toISOString(),
        subtotal: pricingResult.subtotal,
        discount_amount: pricingResult.discount_amount,
        tax_amount: pricingResult.tax_amount,
        total_price: pricingResult.total,
        total: pricingResult.total,
        notes: orderData.notes || null
      };

      // Create the order
      const createdOrder = await this.orderRepository.create(order);

      // Create order details with advanced pricing
      const orderDetails = pricingResult.line_items.map(item => ({
        order_id: createdOrder.order_id,
        organization_id: organizationId,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.unit_price, // Map unit_price to price field expected by database
        line_total: item.line_total,
        discount_amount: item.line_discount || 0,
        tax_amount: 0 // Tax is calculated at order level for now
      }));

      const createdDetails = await this.orderDetailRepository.createBulk(orderDetails);

      // Save applied discounts for audit trail
      if (pricingResult.applied_discounts && pricingResult.applied_discounts.length > 0) {
        await this.pricingService.saveAppliedDiscounts(
          createdOrder.order_id,
          pricingResult.applied_discounts,
          organizationId
        );
      }

      // Return complete order with details and pricing breakdown
      const completeOrder = {
        ...createdOrder,
        order_details: createdDetails,
        pricing_breakdown: {
          subtotal: pricingResult.subtotal,
          discount_amount: pricingResult.discount_amount,
          tax_amount: pricingResult.tax_amount,
          total: pricingResult.total,
          applied_discounts: pricingResult.applied_discounts,
          tax_breakdown: pricingResult.tax_breakdown
        }
      };

      this.logger.info('Order created successfully', {
        orderId: createdOrder.order_id,
        organizationId,
        total: pricingResult.total
      });

      // Track monthly usage (fire-and-forget, must not fail the operation)
      incrementUsage(organizationId, 'orders_per_month').catch(err =>
        this.logger.error('Failed to increment order usage', { error: err.message })
      );

      return completeOrder;
    } catch (error) {
      this.logger.error('Error creating order', { 
        error: error.message, 
        organizationId 
      });
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Get order by ID with full details
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>}
   */
  async getOrderById(orderId, organizationId) {
    try {
      this.logger.info('Getting order by ID', { orderId, organizationId });

      const order = await this.orderRepository.findById(orderId, organizationId);
      if (!order) {
        return null;
      }

      // Get order details if not included
      if (!order.order_details) {
        order.order_details = await this.orderDetailRepository.findByOrderId(orderId, organizationId);
      }

      // Calculate current totals
      order.totals = this.calculateOrderTotals(order.order_details);

      this.logger.info('Order retrieved successfully', { orderId });
      return order;
    } catch (error) {
      this.logger.error('Error getting order by ID', { 
        error: error.message, 
        orderId 
      });
      throw new Error(`Failed to get order: ${error.message}`);
    }
  }

  /**
   * Get all orders for an organization with filters and pagination
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  async getOrders(organizationId, options = {}) {
    try {
      this.logger.info('Getting orders for organization', { organizationId, options });

      const { filters = {}, pagination = {}, sort = {} } = options;

      const orders = await this.orderRepository.findByOrganization(
        organizationId,
        filters,
        {
          limit: pagination.limit || 50,
          offset: pagination.offset || 0,
          orderBy: sort.orderBy || { column: 'created_at', ascending: false }
        }
      );

      // Get summary statistics
      const stats = await this.orderRepository.getOrdersStats(organizationId);

      this.logger.info('Orders retrieved successfully', { 
        organizationId, 
        count: orders.length 
      });

      return {
        orders,
        pagination: {
          limit: pagination.limit || 50,
          offset: pagination.offset || 0,
          total: stats.total_orders
        },
        stats
      };
    } catch (error) {
      this.logger.error('Error getting orders', { 
        error: error.message, 
        organizationId 
      });
      throw new Error(`Failed to get orders: ${error.message}`);
    }
  }

  /**
   * Update an order
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>}
   */
  async updateOrder(orderId, organizationId, updateData) {
    try {
      this.logger.info('Updating order', { orderId, organizationId });

      // Get current order to validate state changes
      const currentOrder = await this.orderRepository.findById(orderId, organizationId);
      if (!currentOrder) {
        throw new Error('Order not found or access denied');
      }

      // Validate status transitions
      if (updateData.status) {
        this.validateStatusTransition(currentOrder.status, updateData.status);
      }

      // If items are being updated, handle them
      if (updateData.items && Array.isArray(updateData.items)) {
        const validatedItems = await this.validateOrderItems(updateData.items, organizationId, updateData.warehouse_id || currentOrder.warehouse_id);
        const orderTotals = this.calculateOrderTotals(validatedItems);

        // Update order details
        const orderDetails = validatedItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        }));

        await this.orderDetailRepository.replaceOrderDetails(orderId, organizationId, orderDetails);

        // Update order total
        updateData.total_price = orderTotals.total;
      }

      // Update the order
      const updatedOrder = await this.orderRepository.update(orderId, organizationId, updateData);

      // Get complete order with details
      const completeOrder = await this.getOrderById(orderId, organizationId);

      this.logger.info('Order updated successfully', { orderId });
      return completeOrder;
    } catch (error) {
      this.logger.error('Error updating order', { 
        error: error.message, 
        orderId 
      });
      throw new Error(`Failed to update order: ${error.message}`);
    }
  }

  /**
   * Update order status with business logic
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @param {string} newStatus - New status
   * @returns {Promise<Object>}
   */
  async updateOrderStatus(orderId, organizationId, newStatus) {
    try {
      this.logger.info('Updating order status', { orderId, newStatus, organizationId });

      const currentOrder = await this.orderRepository.findById(orderId, organizationId);
      if (!currentOrder) {
        throw new Error('Order not found or access denied');
      }

      // Validate status transition
      this.validateStatusTransition(currentOrder.status, newStatus);

      // Apply business rules based on status change
      await this.applyStatusChangeRules(currentOrder, newStatus, organizationId);

      // Update the status
      const updatedOrder = await this.orderRepository.updateStatus(orderId, organizationId, newStatus);

      this.logger.info('Order status updated successfully', { orderId, newStatus });
      return updatedOrder;
    } catch (error) {
      this.logger.error('Error updating order status', { 
        error: error.message, 
        orderId, 
        newStatus 
      });
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  /**
   * Delete (permanently remove) an order
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @param {boolean} hardDelete - If true, permanently deletes the order. If false, cancels it.
   * @returns {Promise<boolean>}
   */
  async deleteOrder(orderId, organizationId, hardDelete = true) {
    try {
      this.logger.info('Deleting order', { orderId, organizationId, hardDelete });

      const currentOrder = await this.orderRepository.findById(orderId, organizationId);
      if (!currentOrder) {
        throw new Error('Order not found or access denied');
      }

      // If hard delete is requested
      if (hardDelete) {
        // Validate that order can be permanently deleted
        if (['shipped', 'completed'].includes(currentOrder.status)) {
          throw new Error('Cannot permanently delete shipped or completed orders. Cancel them instead.');
        }

        // Permanently delete the order
        const success = await this.orderRepository.hardDelete(orderId, organizationId);
        this.logger.info('Order permanently deleted successfully', { orderId });
        return success;
      } else {
        // Soft delete (cancel) the order
        if (['completed', 'shipped'].includes(currentOrder.status)) {
          throw new Error('Cannot cancel completed or shipped orders');
        }

        const success = await this.orderRepository.delete(orderId, organizationId);
        this.logger.info('Order cancelled successfully', { orderId });
        return success;
      }
    } catch (error) {
      this.logger.error('Error deleting order', {
        error: error.message,
        orderId
      });
      throw new Error(`Failed to delete order: ${error.message}`);
    }
  }

  /**
   * Get order statistics for dashboard
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getOrderStats(organizationId) {
    try {
      this.logger.info('Getting order statistics', { organizationId });

      const stats = await this.orderRepository.getOrdersStats(organizationId);

      this.logger.info('Order statistics retrieved', { organizationId });
      return stats;
    } catch (error) {
      this.logger.error('Error getting order statistics', { 
        error: error.message, 
        organizationId 
      });
      throw new Error(`Failed to get order statistics: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Validate order items stock availability (simplified for pricing integration)
   * @private
   */
  async validateOrderItems(lineItems, organizationId, warehouseId = null) {
    // Get all product IDs for bulk stock check
    const productIds = lineItems.map(item => item.product_id);
    
    // Get current stock for all products in bulk for efficiency
    const stockByProduct = await this.stockMovementRepository.getCurrentStockBulk(
      productIds, 
      warehouseId, 
      organizationId
    );

    for (const item of lineItems) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        throw new Error('Each item must have a valid product_id and positive quantity');
      }

      // Get product to validate existence
      const product = await this.productRepository.findById(item.product_id, organizationId);
      if (!product) {
        throw new Error(`Product ${item.product_id} not found or access denied`);
      }

      // Validate stock availability
      const requestedQuantity = parseFloat(item.quantity);
      const availableStock = stockByProduct[item.product_id] || 0;
      
      if (requestedQuantity > availableStock) {
        throw new Error(
          `Insufficient stock for product "${product.name}". ` +
          `Requested: ${requestedQuantity}, Available: ${availableStock}`
        );
      }
    }

    this.logger.info('Order items stock validated successfully', {
      organizationId,
      warehouseId,
      itemCount: lineItems.length
    });
  }

  /**
   * Calculate order totals
   * @private
   */
  calculateOrderTotals(items) {
    let subtotal = 0;
    let totalItems = 0;

    items.forEach(item => {
      const lineTotal = item.quantity * item.price;
      subtotal += lineTotal;
      totalItems += item.quantity;
    });

    // You can add tax calculations, discounts, etc. here
    const tax = subtotal * 0.0; // No tax for now
    const total = subtotal + tax;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      total_items: totalItems,
      line_items_count: items.length
    };
  }

  /**
   * Validate status transitions
   * @private
   */
  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'draft': ['pending', 'cancelled'],
      'pending': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['completed'],
      'completed': [], // Final state
      'cancelled': ['draft'] // Can reactivate cancelled orders
    };

    if (!validTransitions[currentStatus]) {
      throw new Error(`Invalid current status: ${currentStatus}`);
    }

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Apply business rules when status changes
   * @private
   */
  async applyStatusChangeRules(order, newStatus, organizationId) {
    switch (newStatus) {
      case 'processing':
        await this.handleOrderProcessing(order, organizationId);
        break;
      case 'shipped':
        await this.handleOrderShipped(order, organizationId);
        break;
      case 'completed':
        await this.handleOrderCompleted(order, organizationId);
        break;
      case 'cancelled':
        await this.handleOrderCancelled(order, organizationId);
        break;
    }
  }

  /**
   * Handle order processing - reserve stock
   * @private
   */
  async handleOrderProcessing(order, organizationId) {
    this.logger.info('Processing order - reserving stock', {
      orderId: order.order_id,
      organizationId
    });

    // Reserve stock for this order
    // This will validate stock availability and create reservations
    await this.reserveStockForOrder(
      order.order_id,
      organizationId,
      order.user_id || order.created_by
    );

    this.logger.info('Stock reserved for order processing', { orderId: order.order_id });
  }

  /**
   * Handle order shipped - create stock movements for fulfillment
   * @private
   */
  async handleOrderShipped(order, organizationId) {
    this.logger.info('Order shipped - creating stock movements', {
      orderId: order.order_id,
      organizationId
    });

    // Get order details if not loaded
    const orderDetails = order.order_details ||
      await this.orderDetailRepository.findByOrderId(order.order_id, organizationId);

    // Create stock exit movements for each order item
    const stockMovements = [];

    for (const detail of orderDetails) {
      // Double-check stock availability
      const currentStock = await this.stockMovementRepository.getCurrentStock(
        detail.product_id,
        order.warehouse_id,
        organizationId
      );

      if (currentStock < detail.quantity) {
        const product = await this.productRepository.findById(detail.product_id, organizationId);
        throw new Error(
          `Insufficient stock for fulfillment of product "${product?.name || detail.product_id}". ` +
          `Required: ${detail.quantity}, Available: ${currentStock}`
        );
      }

      // Create stock exit movement
      const movement = {
        organization_id: organizationId,
        product_id: detail.product_id,
        warehouse_id: order.warehouse_id,
        movement_type: 'exit',
        quantity: detail.quantity,
        movement_date: new Date().toISOString(),
        reference: `Order ${order.order_number || order.order_id.slice(-8)}`
      };

      stockMovements.push(movement);
    }

    // Create all stock movements in batch
    if (stockMovements.length > 0) {
      await this.stockMovementRepository.createBulk(stockMovements);

      this.logger.info('Stock movements created for order shipment', {
        orderId: order.order_id,
        movementCount: stockMovements.length,
        totalValue: stockMovements.reduce((sum, m) => sum + m.total_price, 0)
      });
    }

    // Release (fulfill) stock reservations
    await this.releaseStockReservations(order.order_id, organizationId, 'fulfilled');
    this.logger.info('Stock reservations fulfilled for shipped order', { orderId: order.order_id });
  }

  /**
   * Handle order completed - final validations and logging
   * @private
   */
  async handleOrderCompleted(order, organizationId) {
    this.logger.info('Order completed', { 
      orderId: order.order_id, 
      organizationId,
      totalValue: order.total_price 
    });

    // Here you could add:
    // - Revenue tracking
    // - Customer loyalty points
    // - Reorder suggestions
    // - Analytics events
  }

  /**
   * Handle order cancelled - restore stock if needed and release reservations
   * @private
   */
  async handleOrderCancelled(order, organizationId) {
    this.logger.info('Order cancelled - checking stock restoration', {
      orderId: order.order_id,
      organizationId
    });

    // Release any active stock reservations
    await this.releaseStockReservations(order.order_id, organizationId, 'cancelled');
    this.logger.info('Stock reservations cancelled', { orderId: order.order_id });

    // If order was already shipped, we need to create return stock movements
    if (['shipped', 'completed'].includes(order.status)) {
      await this.restoreStockForCancelledOrder(order, organizationId);
    }
  }

  /**
   * Restore stock for cancelled orders that were already fulfilled
   * @private
   */
  async restoreStockForCancelledOrder(order, organizationId) {
    this.logger.info('Restoring stock for cancelled order', { 
      orderId: order.order_id, 
      organizationId 
    });

    // Get order details
    const orderDetails = order.order_details || 
      await this.orderDetailRepository.findByOrderId(order.order_id, organizationId);

    // Create stock entry movements to restore inventory
    const restorationMovements = [];
    
    for (const detail of orderDetails) {
      const movement = {
        organization_id: organizationId,
        product_id: detail.product_id,
        warehouse_id: order.warehouse_id,
        movement_type: 'entry',
        quantity: detail.quantity,
        movement_date: new Date().toISOString(),
        reference: `Order Cancellation ${order.order_number || order.order_id.slice(-8)}`
      };

      restorationMovements.push(movement);
    }

    // Create restoration movements
    if (restorationMovements.length > 0) {
      await this.stockMovementRepository.createBulk(restorationMovements);
      
      this.logger.info('Stock restored for cancelled order', { 
        orderId: order.order_id,
        restoredItems: restorationMovements.length
      });
    }
  }

  /**
   * Fulfill order - convenience method for marking order as shipped
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @param {Object} fulfillmentData - Optional fulfillment data (tracking, notes, etc.)
   * @returns {Promise<Object>}
   */
  async fulfillOrder(orderId, organizationId, fulfillmentData = {}) {
    try {
      this.logger.info('Fulfilling order', { orderId, organizationId });

      const currentOrder = await this.orderRepository.findById(orderId, organizationId);
      if (!currentOrder) {
        throw new Error('Order not found or access denied');
      }

      // Validate current status allows fulfillment
      if (!['pending', 'processing'].includes(currentOrder.status)) {
        throw new Error(`Cannot fulfill order with status: ${currentOrder.status}`);
      }

      // Update order to shipped status (this will trigger stock movements)
      const updatedOrder = await this.updateOrderStatus(orderId, organizationId, 'shipped');

      // Add fulfillment metadata if provided
      if (Object.keys(fulfillmentData).length > 0) {
        const fulfillmentUpdate = {
          notes: fulfillmentData.notes || currentOrder.notes,
          delivery_date: fulfillmentData.delivery_date || null,
          // Add other fulfillment fields as needed
        };

        await this.orderRepository.update(orderId, organizationId, fulfillmentUpdate);
      }

      this.logger.info('Order fulfilled successfully', { orderId });
      return updatedOrder;
    } catch (error) {
      this.logger.error('Error fulfilling order', { 
        error: error.message, 
        orderId 
      });
      throw new Error(`Failed to fulfill order: ${error.message}`);
    }
  }

  /**
   * Validate coupon code for an order
   * @param {string} couponCode - Coupon code to validate
   * @param {Object} orderData - Order data for validation
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async validateCouponCode(couponCode, orderData, organizationId) {
    try {
      this.logger.info('Validating coupon code', { couponCode, organizationId });

      const result = await this.pricingService.validateCouponCode(
        couponCode,
        orderData,
        organizationId
      );

      this.logger.info('Coupon validation completed', { 
        couponCode,
        valid: result.valid 
      });

      return result;
    } catch (error) {
      this.logger.error('Error validating coupon code', { 
        error: error.message,
        couponCode 
      });
      throw new Error(`Failed to validate coupon code: ${error.message}`);
    }
  }

  /**
   * Calculate order pricing preview (without creating order)
   * @param {Object} orderData - Order data
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async calculateOrderPricing(orderData, organizationId) {
    try {
      this.logger.info('Calculating order pricing preview', { organizationId });

      const pricingResult = await this.pricingService.calculateOrderPricing(
        orderData,
        organizationId
      );

      this.logger.info('Order pricing preview calculated', { 
        organizationId,
        total: pricingResult.total 
      });

      return pricingResult;
    } catch (error) {
      this.logger.error('Error calculating order pricing preview', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Failed to calculate order pricing: ${error.message}`);
    }
  }

  /**
   * Reserve stock for an order
   * Creates stock reservations for all order items
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID who is reserving the stock
   * @returns {Promise<Array>} - Created reservations
   */
  async reserveStockForOrder(orderId, organizationId, userId) {
    try {
      this.logger.info('Reserving stock for order', { orderId, organizationId });

      // Get order with details
      const order = await this.getOrderById(orderId, organizationId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Don't reserve stock for cancelled or completed orders
      if (['cancelled', 'completed', 'shipped'].includes(order.status)) {
        this.logger.warn('Cannot reserve stock for order with status', {
          orderId,
          status: order.status
        });
        return [];
      }

      // Check if stock is already reserved
      const existingReservations = await this.stockReservationRepository.getActiveReservationsByOrder(
        orderId,
        organizationId
      );

      if (existingReservations.length > 0) {
        this.logger.info('Stock already reserved for this order', {
          orderId,
          reservationCount: existingReservations.length
        });
        return existingReservations;
      }

      // Get order details
      const orderDetails = await this.orderDetailRepository.findByOrderId(orderId, organizationId);
      if (!orderDetails || orderDetails.length === 0) {
        throw new Error('No order details found');
      }

      // Create reservations for each item
      const reservations = orderDetails.map(detail => ({
        organization_id: organizationId,
        order_id: orderId,
        product_id: detail.product_id,
        warehouse_id: order.warehouse_id,
        quantity: detail.quantity,
        created_by: userId,
        notes: `Auto-reserved for order ${orderId}`
      }));

      // Validate stock availability before reserving
      for (const reservation of reservations) {
        const availability = await this.stockReservationRepository.checkStockAvailability(
          reservation.product_id,
          reservation.warehouse_id,
          organizationId,
          reservation.quantity
        );

        if (!availability.available) {
          throw new Error(
            `Insufficient stock for product ${reservation.product_id}. ` +
            `Available: ${availability.availableStock}, Requested: ${reservation.quantity}`
          );
        }
      }

      // Create bulk reservations
      const createdReservations = await this.stockReservationRepository.createBulkReservations(reservations);

      this.logger.info('Stock reserved successfully', {
        orderId,
        reservationCount: createdReservations.length
      });

      return createdReservations;
    } catch (error) {
      this.logger.error('Error reserving stock for order', {
        error: error.message,
        orderId,
        organizationId
      });
      throw new Error(`Failed to reserve stock: ${error.message}`);
    }
  }

  /**
   * Release stock reservations for an order
   * Cancels all active reservations and returns stock to available pool
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @param {string} reason - Reason for release ('cancelled' or 'fulfilled')
   * @returns {Promise<Array>} - Released reservations
   */
  async releaseStockReservations(orderId, organizationId, reason = 'cancelled') {
    try {
      this.logger.info('Releasing stock reservations', { orderId, organizationId, reason });

      const releasedReservations = await this.stockReservationRepository.releaseOrderReservations(
        orderId,
        organizationId,
        reason
      );

      this.logger.info('Stock reservations released', {
        orderId,
        count: releasedReservations.length,
        reason
      });

      return releasedReservations;
    } catch (error) {
      this.logger.error('Error releasing stock reservations', {
        error: error.message,
        orderId,
        organizationId
      });
      throw new Error(`Failed to release stock reservations: ${error.message}`);
    }
  }

  /**
   * Get available stock for a product
   * Returns physical stock minus reserved stock
   * @param {string} productId - Product ID
   * @param {string} warehouseId - Warehouse ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<number>} - Available stock quantity
   */
  async getAvailableStock(productId, warehouseId, organizationId) {
    try {
      return await this.stockReservationRepository.getAvailableStock(
        productId,
        warehouseId,
        organizationId
      );
    } catch (error) {
      this.logger.error('Error getting available stock', {
        error: error.message,
        productId,
        warehouseId,
        organizationId
      });
      throw new Error(`Failed to get available stock: ${error.message}`);
    }
  }

  /**
   * Get stock reservations for an order
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} - Order reservations
   */
  async getOrderReservations(orderId, organizationId) {
    try {
      return await this.stockReservationRepository.getReservationsByOrder(
        orderId,
        organizationId
      );
    } catch (error) {
      this.logger.error('Error getting order reservations', {
        error: error.message,
        orderId,
        organizationId
      });
      throw new Error(`Failed to get order reservations: ${error.message}`);
    }
  }
}

module.exports = OrderService;