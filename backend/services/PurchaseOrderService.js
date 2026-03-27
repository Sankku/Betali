const { Logger } = require('../utils/Logger');

/**
 * Purchase Order Service - Business logic for managing purchase orders
 * Handles purchase order creation, updates, status changes, receiving, and stock entry
 */
class PurchaseOrderService {
  constructor(
    purchaseOrderRepository,
    purchaseOrderDetailRepository,
    supplierRepository,
    productTypeRepository,
    warehouseRepository,
    stockMovementRepository,
    logger
  ) {
    this.purchaseOrderRepository = purchaseOrderRepository;
    this.purchaseOrderDetailRepository = purchaseOrderDetailRepository;
    this.supplierRepository = supplierRepository;
    this.productTypeRepository = productTypeRepository;
    this.warehouseRepository = warehouseRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.logger = logger || new Logger('PurchaseOrderService');
  }

  /**
   * Create a new purchase order
   * @param {Object} purchaseOrderData - Purchase order data including items
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async createPurchaseOrder(purchaseOrderData, organizationId) {
    try {
      this.logger.info('Creating new purchase order', { organizationId });

      // Validate required fields
      if (!purchaseOrderData.items || !Array.isArray(purchaseOrderData.items) || purchaseOrderData.items.length === 0) {
        throw new Error('Purchase order must have at least one item');
      }

      if (!purchaseOrderData.warehouse_id) {
        throw new Error('Warehouse is required for purchase orders');
      }

      // Validate supplier if provided
      if (purchaseOrderData.supplier_id) {
        const supplier = await this.supplierRepository.findById(purchaseOrderData.supplier_id, organizationId);
        if (!supplier) {
          throw new Error('Supplier not found or access denied');
        }
        if (!supplier.is_active) {
          throw new Error('Supplier is inactive');
        }
      }

      // Validate warehouse
      const warehouse = await this.warehouseRepository.findById(purchaseOrderData.warehouse_id, organizationId);
      if (!warehouse) {
        throw new Error('Warehouse not found or access denied');
      }

      // Validate products and calculate totals
      const lineItems = await this.validateAndPrepareLineItems(purchaseOrderData.items, organizationId);

      // Calculate pricing
      const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);
      const discountAmount = purchaseOrderData.discount_amount || 0;
      const taxAmount = purchaseOrderData.tax_amount || 0;
      const shippingAmount = purchaseOrderData.shipping_amount || 0;
      const total = subtotal - discountAmount + taxAmount + shippingAmount;

      // Validate status
      const validStatuses = ['draft', 'pending', 'approved', 'received', 'partially_received', 'cancelled'];
      const requestedStatus = purchaseOrderData.status || 'draft';
      const finalStatus = validStatuses.includes(requestedStatus) ? requestedStatus : 'draft';

      if (requestedStatus !== finalStatus) {
        this.logger.warn('Invalid status provided, defaulting to draft', {
          organizationId,
          requestedStatus,
          finalStatus
        });
      }

      // Prepare purchase order data
      const purchaseOrder = {
        organization_id: organizationId,
        supplier_id: purchaseOrderData.supplier_id || null,
        warehouse_id: purchaseOrderData.warehouse_id,
        user_id: purchaseOrderData.user_id || null,
        created_by: purchaseOrderData.created_by || null,
        status: finalStatus,
        order_date: purchaseOrderData.order_date || new Date().toISOString(),
        expected_delivery_date: purchaseOrderData.expected_delivery_date || null,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        shipping_amount: shippingAmount,
        total,
        notes: purchaseOrderData.notes || null
      };

      // Create the purchase order
      const createdPurchaseOrder = await this.purchaseOrderRepository.create(purchaseOrder, organizationId);

      // Create purchase order details
      const orderDetails = lineItems.map(item => ({
        purchase_order_id: createdPurchaseOrder.purchase_order_id,
        organization_id: organizationId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        notes: item.notes || null
      }));

      const createdDetails = await this.purchaseOrderDetailRepository.createBulk(orderDetails, organizationId);

      this.logger.info('Purchase order created successfully', {
        purchaseOrderId: createdPurchaseOrder.purchase_order_id,
        itemCount: createdDetails.length,
        total
      });

      // Return complete purchase order
      return {
        ...createdPurchaseOrder,
        purchase_order_details: createdDetails
      };

    } catch (error) {
      this.logger.error('Error creating purchase order', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate and prepare line items
   * @param {Array} items - Array of items
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async validateAndPrepareLineItems(items, organizationId) {
    const lineItems = [];

    for (const item of items) {
      if (!item.product_id) {
        throw new Error('Product ID is required for all items');
      }

      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Invalid quantity for product ${item.product_id}`);
      }

      if (item.unit_price === undefined || item.unit_price === null || item.unit_price < 0) {
        throw new Error(`Invalid unit price for product ${item.product_id}`);
      }

      // Validate product type exists
      const product = await this.productTypeRepository.findById(item.product_id, organizationId);
      if (!product) {
        throw new Error(`Product not found: ${item.product_id}`);
      }

      const lineTotal = item.quantity * item.unit_price;

      lineItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: lineTotal,
        notes: item.notes || null
      });
    }

    return lineItems;
  }

  /**
   * Get purchase order by ID
   * @param {string} purchaseOrderId - Purchase Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getPurchaseOrderById(purchaseOrderId, organizationId) {
    try {
      this.logger.info('Getting purchase order by ID', { purchaseOrderId, organizationId });

      const purchaseOrder = await this.purchaseOrderRepository.findById(purchaseOrderId, organizationId);
      if (!purchaseOrder) {
        throw new Error('Purchase order not found or access denied');
      }

      return purchaseOrder;
    } catch (error) {
      this.logger.error('Error getting purchase order', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all purchase orders
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Optional filters
   * @param {number} limit - Optional limit
   * @param {number} offset - Optional offset
   * @returns {Promise<Object>}
   */
  async getPurchaseOrders(organizationId, filters = {}, limit = 100, offset = 0) {
    try {
      this.logger.info('Getting purchase orders', { organizationId, filters });

      const result = await this.purchaseOrderRepository.findAll(organizationId, filters, limit, offset);
      return result;
    } catch (error) {
      this.logger.error('Error getting purchase orders', { error: error.message });
      throw error;
    }
  }

  /**
   * Update purchase order (full edit: header + items)
   * @param {string} purchaseOrderId - Purchase Order ID
   * @param {Object} updateData - Fields to update
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async updatePurchaseOrder(purchaseOrderId, updateData, organizationId) {
    try {
      this.logger.info('Updating purchase order', { purchaseOrderId, organizationId });

      const existing = await this.purchaseOrderRepository.findById(purchaseOrderId, organizationId);
      if (!existing) {
        throw new Error('Purchase order not found or access denied');
      }

      // Only draft/pending orders can be fully edited
      const editableStatuses = ['draft', 'pending'];
      if (!editableStatuses.includes(existing.status)) {
        throw new Error(`Cannot edit a purchase order with status "${existing.status}". Only draft and pending orders can be edited.`);
      }

      // Validate supplier if changing
      if (updateData.supplier_id && updateData.supplier_id !== existing.supplier_id) {
        const supplier = await this.supplierRepository.findById(updateData.supplier_id, organizationId);
        if (!supplier) throw new Error('Supplier not found or access denied');
        if (!supplier.is_active) throw new Error('Supplier is inactive');
      }

      // Validate warehouse if changing
      const warehouseId = updateData.warehouse_id || existing.warehouse_id;
      if (updateData.warehouse_id && updateData.warehouse_id !== existing.warehouse_id) {
        const warehouse = await this.warehouseRepository.findById(warehouseId, organizationId);
        if (!warehouse) throw new Error('Warehouse not found or access denied');
      }

      // Re-calculate totals if items are provided
      let headerUpdate = {};
      if (updateData.items && Array.isArray(updateData.items) && updateData.items.length > 0) {
        const lineItems = await this.validateAndPrepareLineItems(updateData.items, organizationId);
        const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);
        const discountAmount = updateData.discount_amount ?? existing.discount_amount ?? 0;
        const taxAmount = updateData.tax_amount ?? existing.tax_amount ?? 0;
        const shippingAmount = updateData.shipping_amount ?? existing.shipping_amount ?? 0;
        const total = subtotal - discountAmount + taxAmount + shippingAmount;

        // Replace details
        await this.purchaseOrderDetailRepository.deleteByPurchaseOrderId(purchaseOrderId, organizationId);
        const orderDetails = lineItems.map(item => ({
          purchase_order_id: purchaseOrderId,
          organization_id: organizationId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          notes: item.notes || null
        }));
        await this.purchaseOrderDetailRepository.createBulk(orderDetails, organizationId);

        headerUpdate = { subtotal, discount_amount: discountAmount, tax_amount: taxAmount, shipping_amount: shippingAmount, total };
      }

      // Update header fields
      const { items, ...fieldsWithoutItems } = updateData;
      await this.purchaseOrderRepository.update(purchaseOrderId, { ...fieldsWithoutItems, ...headerUpdate }, organizationId);

      const updated = await this.purchaseOrderRepository.findById(purchaseOrderId, organizationId);
      this.logger.info('Purchase order updated successfully', { purchaseOrderId });
      return updated;
    } catch (error) {
      this.logger.error('Error updating purchase order', { error: error.message, purchaseOrderId });
      throw error;
    }
  }

  /**
   * Update purchase order status with business logic
   * @param {string} purchaseOrderId - Purchase Order ID
   * @param {string} newStatus - New status
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async updatePurchaseOrderStatus(purchaseOrderId, newStatus, organizationId) {
    try {
      this.logger.info('Updating purchase order status', { purchaseOrderId, newStatus, organizationId });

      // Get current purchase order
      const purchaseOrder = await this.purchaseOrderRepository.findById(purchaseOrderId, organizationId);
      if (!purchaseOrder) {
        throw new Error('Purchase order not found or access denied');
      }

      const currentStatus = purchaseOrder.status;

      // Validate status transition
      this.validateStatusTransition(currentStatus, newStatus);

      // Handle status-specific logic
      if (newStatus === 'received') {
        await this.handlePurchaseOrderReceived(purchaseOrder, organizationId);
      } else if (newStatus === 'cancelled') {
        await this.handlePurchaseOrderCancelled(purchaseOrder, organizationId);
      }

      // Update status
      const updatedPurchaseOrder = await this.purchaseOrderRepository.updateStatus(
        purchaseOrderId,
        newStatus,
        organizationId
      );

      this.logger.info('Purchase order status updated successfully', {
        purchaseOrderId,
        oldStatus: currentStatus,
        newStatus
      });

      return updatedPurchaseOrder;
    } catch (error) {
      this.logger.error('Error updating purchase order status', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate status transition
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - New status
   */
  validateStatusTransition(currentStatus, newStatus) {
    const allowedTransitions = {
      'draft': ['pending', 'cancelled'],
      'pending': ['approved', 'cancelled'],
      'approved': ['received', 'partially_received', 'cancelled'],
      'partially_received': ['received', 'cancelled'],
      'received': [], // Cannot transition from received
      'cancelled': [] // Cannot transition from cancelled
    };

    const validTransitions = allowedTransitions[currentStatus] || [];

    if (!validTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Handle purchase order received - Create stock movements
   * @param {Object} purchaseOrder - Purchase order object
   * @param {string} organizationId - Organization ID
   */
  async handlePurchaseOrderReceived(purchaseOrder, organizationId) {
    try {
      this.logger.info('Processing purchase order received', {
        purchaseOrderId: purchaseOrder.purchase_order_id,
        organizationId
      });

      // Get purchase order details
      const details = await this.purchaseOrderDetailRepository.findByPurchaseOrderId(
        purchaseOrder.purchase_order_id,
        organizationId
      );

      if (!details || details.length === 0) {
        throw new Error('No items found in purchase order');
      }

      // Create stock entry movements for each item
      for (const detail of details) {
        const quantityToReceive = detail.quantity - (detail.received_quantity || 0);

        if (quantityToReceive > 0) {
          await this.stockMovementRepository.create({
            product_id: detail.product_id,
            warehouse_id: purchaseOrder.warehouse_id,
            organization_id: organizationId,
            movement_type: 'entry',
            quantity: quantityToReceive,
            reference: purchaseOrder.purchase_order_number || `PO-${purchaseOrder.purchase_order_id.slice(0, 8).toUpperCase()}`,
            reference_type: 'purchase_order',
            reference_id: purchaseOrder.purchase_order_id,
            notes: `Received from purchase order ${purchaseOrder.purchase_order_number || purchaseOrder.purchase_order_id}`,
            created_by: purchaseOrder.created_by
          });

          // Update received quantity in detail
          await this.purchaseOrderDetailRepository.updateReceivedQuantity(
            detail.detail_id,
            detail.quantity,
            organizationId
          );

          this.logger.info('Stock movement created for purchase order item', {
            purchaseOrderId: purchaseOrder.purchase_order_id,
            productId: detail.product_id,
            quantity: quantityToReceive
          });
        }
      }

      this.logger.info('Purchase order received processing completed', {
        purchaseOrderId: purchaseOrder.purchase_order_id,
        itemsReceived: details.length
      });

    } catch (error) {
      this.logger.error('Error handling purchase order received', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle purchase order cancelled
   * @param {Object} purchaseOrder - Purchase order object
   * @param {string} organizationId - Organization ID
   */
  async handlePurchaseOrderCancelled(purchaseOrder, organizationId) {
    try {
      this.logger.info('Processing purchase order cancellation', {
        purchaseOrderId: purchaseOrder.purchase_order_id,
        organizationId
      });

      // For purchase orders, cancellation doesn't affect stock
      // since stock is only added when received, not when ordered

      this.logger.info('Purchase order cancelled successfully', {
        purchaseOrderId: purchaseOrder.purchase_order_id
      });

    } catch (error) {
      this.logger.error('Error handling purchase order cancellation', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete/cancel purchase order
   * @param {string} purchaseOrderId - Purchase Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async deletePurchaseOrder(purchaseOrderId, organizationId) {
    try {
      this.logger.info('Deleting purchase order', { purchaseOrderId, organizationId });

      // Get purchase order first
      const purchaseOrder = await this.purchaseOrderRepository.findById(purchaseOrderId, organizationId);
      if (!purchaseOrder) {
        throw new Error('Purchase order not found or access denied');
      }

      // Only allow deletion of draft or pending orders
      if (!['draft', 'pending'].includes(purchaseOrder.status)) {
        throw new Error(`Cannot delete purchase order with status: ${purchaseOrder.status}`);
      }

      // Soft delete by setting status to cancelled
      const deletedPurchaseOrder = await this.purchaseOrderRepository.delete(purchaseOrderId, organizationId);

      this.logger.info('Purchase order deleted successfully', { purchaseOrderId });
      return deletedPurchaseOrder;
    } catch (error) {
      this.logger.error('Error deleting purchase order', { error: error.message });
      throw error;
    }
  }
}

module.exports = PurchaseOrderService;
