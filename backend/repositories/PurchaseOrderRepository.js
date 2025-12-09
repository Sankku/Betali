const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Repository for managing purchase orders
 * Follows the established multi-tenant pattern with organization_id isolation
 */
class PurchaseOrderRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'purchase_orders');
    this.logger = new Logger('PurchaseOrderRepository');
  }

  /**
   * Find purchase order by ID with organization isolation
   * @param {string} purchaseOrderId - Purchase Order ID
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Object|null>}
   */
  async findById(purchaseOrderId, organizationId) {
    try {
      this.logger.info('Finding purchase order by ID', { purchaseOrderId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select(`
          *,
          suppliers!purchase_orders_supplier_id_fkey(supplier_id, name, email, phone, contact_name),
          warehouse!purchase_orders_warehouse_id_fkey(warehouse_id, name, location),
          purchase_order_details(
            detail_id,
            product_id,
            quantity,
            received_quantity,
            unit_price,
            line_total,
            notes,
            products!purchase_order_details_product_id_fkey(product_id, name, sku)
          )
        `)
        .eq('purchase_order_id', purchaseOrderId)
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error('Error finding purchase order by ID', { error: error.message, purchaseOrderId });
        throw error;
      }

      this.logger.info('Purchase order found successfully', { purchaseOrderId });
      return data;
    } catch (error) {
      this.logger.error('Error finding purchase order', { error: error.message, purchaseOrderId });
      throw error;
    }
  }

  /**
   * Find all purchase orders with filters and organization isolation
   * @param {string} organizationId - Organization ID for tenant isolation
   * @param {Object} filters - Optional filters (status, supplier_id, date_from, date_to)
   * @param {number} limit - Optional limit
   * @param {number} offset - Optional offset for pagination
   * @returns {Promise<Array>}
   */
  async findAll(organizationId, filters = {}, limit = 100, offset = 0) {
    try {
      this.logger.info('Finding all purchase orders', { organizationId, filters });

      let query = this.client
        .from(this.table)
        .select(`
          *,
          suppliers!purchase_orders_supplier_id_fkey(supplier_id, name, email),
          warehouse!purchase_orders_warehouse_id_fkey(warehouse_id, name),
          purchase_order_details(count)
        `, { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('order_date', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      if (filters.date_from) {
        query = query.gte('order_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('order_date', filters.date_to);
      }

      const { data, error, count } = await query;

      if (error) {
        this.logger.error('Error finding purchase orders', { error: error.message });
        throw error;
      }

      this.logger.info('Purchase orders found', { count: data?.length || 0, total: count });
      return { data, count };
    } catch (error) {
      this.logger.error('Error finding purchase orders', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a new purchase order
   * @param {Object} purchaseOrderData - Purchase order data
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Object>}
   */
  async create(purchaseOrderData, organizationId) {
    try {
      this.logger.info('Creating new purchase order', { organizationId });

      const dataToInsert = {
        ...purchaseOrderData,
        organization_id: organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from(this.table)
        .insert([dataToInsert])
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating purchase order', { error: error.message });
        throw error;
      }

      this.logger.info('Purchase order created successfully', { purchaseOrderId: data.purchase_order_id });
      return data;
    } catch (error) {
      this.logger.error('Error creating purchase order', { error: error.message });
      throw error;
    }
  }

  /**
   * Update purchase order
   * @param {string} purchaseOrderId - Purchase Order ID
   * @param {Object} updateData - Data to update
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Object>}
   */
  async update(purchaseOrderId, updateData, organizationId) {
    try {
      this.logger.info('Updating purchase order', { purchaseOrderId, organizationId });

      const dataToUpdate = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from(this.table)
        .update(dataToUpdate)
        .eq('purchase_order_id', purchaseOrderId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating purchase order', { error: error.message, purchaseOrderId });
        throw error;
      }

      this.logger.info('Purchase order updated successfully', { purchaseOrderId });
      return data;
    } catch (error) {
      this.logger.error('Error updating purchase order', { error: error.message });
      throw error;
    }
  }

  /**
   * Update purchase order status
   * @param {string} purchaseOrderId - Purchase Order ID
   * @param {string} newStatus - New status
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Object>}
   */
  async updateStatus(purchaseOrderId, newStatus, organizationId) {
    try {
      this.logger.info('Updating purchase order status', { purchaseOrderId, newStatus, organizationId });

      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // If status is 'received', set received_date
      if (newStatus === 'received') {
        updateData.received_date = new Date().toISOString();
      }

      const { data, error } = await this.client
        .from(this.table)
        .update(updateData)
        .eq('purchase_order_id', purchaseOrderId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating purchase order status', { error: error.message, purchaseOrderId });
        throw error;
      }

      this.logger.info('Purchase order status updated successfully', { purchaseOrderId, newStatus });
      return data;
    } catch (error) {
      this.logger.error('Error updating purchase order status', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete (soft delete/cancel) purchase order
   * @param {string} purchaseOrderId - Purchase Order ID
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Object>}
   */
  async delete(purchaseOrderId, organizationId) {
    try {
      this.logger.info('Deleting purchase order', { purchaseOrderId, organizationId });

      // Soft delete by setting status to 'cancelled'
      const { data, error } = await this.client
        .from(this.table)
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('purchase_order_id', purchaseOrderId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error deleting purchase order', { error: error.message, purchaseOrderId });
        throw error;
      }

      this.logger.info('Purchase order deleted successfully', { purchaseOrderId });
      return data;
    } catch (error) {
      this.logger.error('Error deleting purchase order', { error: error.message });
      throw error;
    }
  }

  /**
   * Get purchase orders by status
   * @param {string} status - Status to filter by
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Array>}
   */
  async findByStatus(status, organizationId) {
    try {
      this.logger.info('Finding purchase orders by status', { status, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select(`
          *,
          suppliers!purchase_orders_supplier_id_fkey(supplier_id, name),
          warehouse!purchase_orders_warehouse_id_fkey(warehouse_id, name)
        `)
        .eq('organization_id', organizationId)
        .eq('status', status)
        .order('order_date', { ascending: false });

      if (error) {
        this.logger.error('Error finding purchase orders by status', { error: error.message });
        throw error;
      }

      this.logger.info('Purchase orders found by status', { status, count: data?.length || 0 });
      return data;
    } catch (error) {
      this.logger.error('Error finding purchase orders by status', { error: error.message });
      throw error;
    }
  }
}

module.exports = PurchaseOrderRepository;
