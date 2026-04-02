const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Repository for managing orders (sales orders)
 * Follows the established multi-tenant pattern with organization_id isolation
 */
class OrderRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'orders');
    this.logger = new Logger('OrderRepository');
  }

  /**
   * Find order by ID with organization isolation
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Object|null>}
   */
  async findById(orderId, organizationId) {
    try {
      this.logger.info('Finding order by ID', { orderId, organizationId });
      
      const { data, error } = await this.client
        .from(this.table)
        .select(`
          *,
          clients!orders_client_id_fkey(client_id, name, email, phone),
          warehouse!orders_warehouse_id_fkey(warehouse_id, name, location),
          order_details(
            order_detail_id,
            product_type_id,
            lot_id,
            quantity,
            price,
            product_types!order_details_product_type_id_fkey(product_type_id, name, sku, unit),
            product_lots!order_details_lot_id_fkey(lot_id, lot_number)
          )
        `)
        .eq('order_id', orderId)
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error('Error finding order by ID', { error: error.message, orderId });
        throw error;
      }

      this.logger.info('Order found successfully', { orderId });
      return data;
    } catch (error) {
      this.logger.error('Error finding order', { error: error.message, orderId });
      throw new Error(`Error finding order: ${error.message}`);
    }
  }

  /**
   * Find all orders for an organization with optional filters
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array>}
   */
  async findByOrganization(organizationId, filters = {}, options = {}) {
    try {
      this.logger.info('Finding orders by organization', { organizationId, filters });

      let query = this.client
        .from(this.table)
        .select(`
          *,
          clients!orders_client_id_fkey(client_id, name, email),
          warehouse!orders_warehouse_id_fkey(warehouse_id, name, location)
        `)
        .eq('organization_id', organizationId);

      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'organization_id' && key !== 'date_from' && key !== 'date_to' && key !== 'search') {
          query = query.eq(key, value);
        }
      });

      if (filters.date_from) {
        query = query.gte('order_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('order_date', filters.date_to);
      }

      // Apply search if provided
      if (filters.search) {
        query = query.or(`status.ilike.%${filters.search}%,clients.name.ilike.%${filters.search}%`);
      }

      // Apply ordering
      if (options.orderBy) {
        const { column, ascending = false } = options.orderBy;
        query = query.order(column, { ascending });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Error finding orders', { error: error.message, organizationId });
        throw error;
      }

      this.logger.info('Orders found successfully', { 
        organizationId, 
        count: data.length 
      });
      return data;
    } catch (error) {
      this.logger.error('Error finding orders by organization', { 
        error: error.message, 
        organizationId 
      });
      throw new Error(`Error finding orders: ${error.message}`);
    }
  }

  /**
   * Create a new order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>}
   */
  async create(orderData) {
    try {
      this.logger.info('Creating order', { organizationId: orderData.organization_id });

      // Generate order_number if not provided (this goes in order_number field, not order_id)
      if (!orderData.order_number) {
        orderData.order_number = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Validate and sanitize status value as additional protection
      const validStatuses = ['draft', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];
      const requestedStatus = orderData.status || 'pending';
      const finalStatus = validStatuses.includes(requestedStatus) ? requestedStatus : 'pending';

      if (requestedStatus !== finalStatus) {
        this.logger.warn('Invalid status in repository, correcting', { 
          organizationId: orderData.organization_id,
          requestedStatus,
          finalStatus
        });
      }

      // DO NOT set order_id - let the database auto-generate UUID

      // Set timestamps
      const now = new Date().toISOString();
      const orderToCreate = {
        ...orderData,
        order_date: orderData.order_date || now,
        created_at: now,
        updated_at: now,
        status: finalStatus
      };

      const { data, error } = await this.client
        .from(this.table)
        .insert([orderToCreate])
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating order', { 
          error: error.message, 
          organizationId: orderData.organization_id 
        });
        throw error;
      }

      this.logger.info('Order created successfully', { 
        orderId: data.order_id,
        organizationId: data.organization_id 
      });
      return data;
    } catch (error) {
      this.logger.error('Error creating order', { 
        error: error.message, 
        organizationId: orderData.organization_id 
      });
      throw new Error(`Error creating order: ${error.message}`);
    }
  }

  /**
   * Update an order
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @param {Object} orderData - Updated order data
   * @returns {Promise<Object>}
   */
  async update(orderId, organizationId, orderData) {
    try {
      this.logger.info('Updating order', { orderId, organizationId });

      const orderToUpdate = {
        ...orderData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from(this.table)
        .update(orderToUpdate)
        .eq('order_id', orderId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating order', { 
          error: error.message, 
          orderId 
        });
        throw error;
      }

      if (!data) {
        throw new Error('Order not found or access denied');
      }

      this.logger.info('Order updated successfully', { orderId });
      return data;
    } catch (error) {
      this.logger.error('Error updating order', { 
        error: error.message, 
        orderId 
      });
      throw new Error(`Error updating order: ${error.message}`);
    }
  }

  /**
   * Delete an order (soft delete by setting status to 'cancelled')
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async delete(orderId, organizationId) {
    try {
      this.logger.info('Deleting order', { orderId, organizationId });

      // Soft delete by setting status to cancelled
      const { data, error } = await this.client
        .from(this.table)
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error deleting order', {
          error: error.message,
          orderId
        });
        throw error;
      }

      if (!data) {
        throw new Error('Order not found or access denied');
      }

      this.logger.info('Order deleted (cancelled) successfully', { orderId });
      return true;
    } catch (error) {
      this.logger.error('Error deleting order', {
        error: error.message,
        orderId
      });
      throw new Error(`Error deleting order: ${error.message}`);
    }
  }

  /**
   * Permanently delete an order (hard delete)
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async hardDelete(orderId, organizationId) {
    try {
      this.logger.info('Hard deleting order', { orderId, organizationId });

      // First delete all related order_details (cascade should handle this, but explicit is safer)
      const { error: detailsError } = await this.client
        .from('order_details')
        .delete()
        .eq('order_id', orderId)
        .eq('organization_id', organizationId);

      if (detailsError) {
        this.logger.error('Error deleting order details', {
          error: detailsError.message,
          orderId
        });
        throw detailsError;
      }

      // Then delete the order itself
      const { data, error } = await this.client
        .from(this.table)
        .delete()
        .eq('order_id', orderId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error hard deleting order', {
          error: error.message,
          orderId
        });
        throw error;
      }

      if (!data) {
        throw new Error('Order not found or access denied');
      }

      this.logger.info('Order permanently deleted successfully', { orderId });
      return true;
    } catch (error) {
      this.logger.error('Error hard deleting order', {
        error: error.message,
        orderId
      });
      throw new Error(`Error permanently deleting order: ${error.message}`);
    }
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @param {string} status - New status
   * @returns {Promise<Object>}
   */
  async updateStatus(orderId, organizationId, status) {
    try {
      this.logger.info('Updating order status', { orderId, status, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating order status', { 
          error: error.message, 
          orderId 
        });
        throw error;
      }

      if (!data) {
        throw new Error('Order not found or access denied');
      }

      this.logger.info('Order status updated successfully', { orderId, status });
      return data;
    } catch (error) {
      this.logger.error('Error updating order status', { 
        error: error.message, 
        orderId 
      });
      throw new Error(`Error updating order status: ${error.message}`);
    }
  }

  /**
   * Get orders summary statistics for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getOrdersStats(organizationId) {
    try {
      this.logger.info('Getting orders statistics', { organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select('status, total, total_price, order_date')
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error getting orders stats', { 
          error: error.message, 
          organizationId 
        });
        throw error;
      }

      // Calculate statistics
      const stats = {
        total_orders: data.length,
        total_revenue: data.reduce((sum, order) => sum + (order.total || order.total_price || 0), 0),
        orders_by_status: {},
        orders_this_month: 0,
        revenue_this_month: 0
      };

      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      data.forEach(order => {
        // Count by status
        stats.orders_by_status[order.status] = (stats.orders_by_status[order.status] || 0) + 1;

        // Count this month
        if (order.order_date && order.order_date.startsWith(currentMonth)) {
          stats.orders_this_month++;
          stats.revenue_this_month += (order.total || order.total_price || 0);
        }
      });

      this.logger.info('Orders statistics calculated', { organizationId, stats });
      return stats;
    } catch (error) {
      this.logger.error('Error getting orders statistics', { 
        error: error.message, 
        organizationId 
      });
      throw new Error(`Error getting orders statistics: ${error.message}`);
    }
  }
}

module.exports = OrderRepository;