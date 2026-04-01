const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Repository for managing order details (line items)
 * Handles the individual products/services within each order
 */
class OrderDetailRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'order_details');
    this.logger = new Logger('OrderDetailRepository');
  }

  /**
   * Find all order details for a specific order
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Array>}
   */
  async findByOrderId(orderId, organizationId) {
    try {
      this.logger.info('Finding order details by order ID', { orderId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select(`
          *,
          product_types!order_details_product_type_id_fkey(
            product_type_id,
            name,
            sku,
            description
          )
        `)
        .eq('order_id', orderId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) {
        this.logger.error('Error finding order details', { 
          error: error.message, 
          orderId 
        });
        throw error;
      }

      this.logger.info('Order details found successfully', { 
        orderId, 
        count: data.length 
      });
      return data;
    } catch (error) {
      this.logger.error('Error finding order details by order ID', { 
        error: error.message, 
        orderId 
      });
      throw new Error(`Error finding order details: ${error.message}`);
    }
  }

  /**
   * Create order details in bulk
   * @param {Array} orderDetails - Array of order detail objects
   * @returns {Promise<Array>}
   */
  async createBulk(orderDetails) {
    try {
      this.logger.info('Creating order details in bulk', { 
        count: orderDetails.length,
        orderId: orderDetails[0]?.order_id 
      });

      // Set timestamps - let database auto-generate UUIDs for order_detail_id/order_item_id
      const now = new Date().toISOString();
      const detailsToCreate = orderDetails.map(detail => ({
        ...detail,
        created_at: now
        // DO NOT set order_detail_id/order_item_id - let database auto-generate UUID
      }));

      const { data, error } = await this.client
        .from(this.table)
        .insert(detailsToCreate)
        .select(`
          *,
          product_types!order_details_product_type_id_fkey(
            product_type_id,
            name,
            sku
          )
        `);

      if (error) {
        this.logger.error('Error creating order details', { 
          error: error.message, 
          count: orderDetails.length 
        });
        throw error;
      }

      this.logger.info('Order details created successfully', { 
        count: data.length,
        orderId: data[0]?.order_id 
      });
      return data;
    } catch (error) {
      this.logger.error('Error creating order details in bulk', { 
        error: error.message, 
        count: orderDetails.length 
      });
      throw new Error(`Error creating order details: ${error.message}`);
    }
  }

  /**
   * Update an order detail
   * @param {string} orderDetailId - Order detail ID
   * @param {string} organizationId - Organization ID
   * @param {Object} detailData - Updated detail data
   * @returns {Promise<Object>}
   */
  async update(orderDetailId, organizationId, detailData) {
    try {
      this.logger.info('Updating order detail', { orderDetailId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .update(detailData)
        .eq('order_detail_id', orderDetailId)
        .eq('organization_id', organizationId)
        .select(`
          *,
          product_types!order_details_product_type_id_fkey(
            product_type_id,
            name,
            sku
          )
        `)
        .single();

      if (error) {
        this.logger.error('Error updating order detail', { 
          error: error.message, 
          orderDetailId 
        });
        throw error;
      }

      if (!data) {
        throw new Error('Order detail not found or access denied');
      }

      this.logger.info('Order detail updated successfully', { orderDetailId });
      return data;
    } catch (error) {
      this.logger.error('Error updating order detail', { 
        error: error.message, 
        orderDetailId 
      });
      throw new Error(`Error updating order detail: ${error.message}`);
    }
  }

  /**
   * Delete order details by order ID
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async deleteByOrderId(orderId, organizationId) {
    try {
      this.logger.info('Deleting order details by order ID', { orderId, organizationId });

      const { error } = await this.client
        .from(this.table)
        .delete()
        .eq('order_id', orderId)
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error deleting order details', { 
          error: error.message, 
          orderId 
        });
        throw error;
      }

      this.logger.info('Order details deleted successfully', { orderId });
      return true;
    } catch (error) {
      this.logger.error('Error deleting order details by order ID', { 
        error: error.message, 
        orderId 
      });
      throw new Error(`Error deleting order details: ${error.message}`);
    }
  }

  /**
   * Delete a specific order detail
   * @param {string} orderDetailId - Order detail ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async delete(orderDetailId, organizationId) {
    try {
      this.logger.info('Deleting order detail', { orderDetailId, organizationId });

      const { error } = await this.client
        .from(this.table)
        .delete()
        .eq('order_detail_id', orderDetailId)
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error deleting order detail', { 
          error: error.message, 
          orderDetailId 
        });
        throw error;
      }

      this.logger.info('Order detail deleted successfully', { orderDetailId });
      return true;
    } catch (error) {
      this.logger.error('Error deleting order detail', { 
        error: error.message, 
        orderDetailId 
      });
      throw new Error(`Error deleting order detail: ${error.message}`);
    }
  }

  /**
   * Replace all order details for an order (used when updating order items)
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @param {Array} newDetails - New order details
   * @returns {Promise<Array>}
   */
  async replaceOrderDetails(orderId, organizationId, newDetails) {
    try {
      this.logger.info('Replacing order details', { 
        orderId, 
        organizationId, 
        newCount: newDetails.length 
      });

      // Start a transaction-like operation
      // First delete existing details
      await this.deleteByOrderId(orderId, organizationId);

      // Then create new details
      if (newDetails.length > 0) {
        const detailsWithOrderId = newDetails.map(detail => ({
          ...detail,
          order_id: orderId,
          organization_id: organizationId
        }));

        const createdDetails = await this.createBulk(detailsWithOrderId);
        
        this.logger.info('Order details replaced successfully', { 
          orderId, 
          newCount: createdDetails.length 
        });
        return createdDetails;
      }

      this.logger.info('Order details replaced (empty order)', { orderId });
      return [];
    } catch (error) {
      this.logger.error('Error replacing order details', { 
        error: error.message, 
        orderId 
      });
      throw new Error(`Error replacing order details: ${error.message}`);
    }
  }

  /**
   * Calculate totals for an order based on its details
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async calculateOrderTotals(orderId, organizationId) {
    try {
      this.logger.info('Calculating order totals', { orderId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select('quantity, price')
        .eq('order_id', orderId)
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error calculating order totals', { 
          error: error.message, 
          orderId 
        });
        throw error;
      }

      const totals = {
        subtotal: 0,
        total_items: 0,
        line_items_count: data.length
      };

      data.forEach(detail => {
        const lineTotal = detail.quantity * detail.price;
        totals.subtotal += lineTotal;
        totals.total_items += detail.quantity;
      });

      // You can add tax calculations, discounts, etc. here
      totals.tax = totals.subtotal * 0.0; // No tax for now
      totals.total = totals.subtotal + totals.tax;

      this.logger.info('Order totals calculated', { orderId, totals });
      return totals;
    } catch (error) {
      this.logger.error('Error calculating order totals', { 
        error: error.message, 
        orderId 
      });
      throw new Error(`Error calculating order totals: ${error.message}`);
    }
  }
}

module.exports = OrderDetailRepository;