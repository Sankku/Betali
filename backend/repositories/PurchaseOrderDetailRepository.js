const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Repository for managing purchase order details (line items)
 * Follows the established multi-tenant pattern with organization_id isolation
 */
class PurchaseOrderDetailRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'purchase_order_details');
    this.logger = new Logger('PurchaseOrderDetailRepository');
  }

  /**
   * Create bulk purchase order details
   * @param {Array} detailsData - Array of detail objects
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Array>}
   */
  async createBulk(detailsData, organizationId) {
    try {
      this.logger.info('Creating bulk purchase order details', { count: detailsData.length, organizationId });

      const dataToInsert = detailsData.map(detail => ({
        ...detail,
        organization_id: organizationId,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await this.client
        .from(this.table)
        .insert(dataToInsert)
        .select();

      if (error) {
        this.logger.error('Error creating bulk purchase order details', { error: error.message });
        throw error;
      }

      this.logger.info('Purchase order details created successfully', { count: data?.length || 0 });
      return data;
    } catch (error) {
      this.logger.error('Error creating bulk purchase order details', { error: error.message });
      throw error;
    }
  }

  /**
   * Find all details for a purchase order
   * @param {string} purchaseOrderId - Purchase Order ID
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Array>}
   */
  async findByPurchaseOrderId(purchaseOrderId, organizationId) {
    try {
      this.logger.info('Finding details for purchase order', { purchaseOrderId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select(`
          *,
          products!purchase_order_details_product_id_fkey(
            product_id,
            name,
            batch_number,
            description,
            expiration_date
          )
        `)
        .eq('purchase_order_id', purchaseOrderId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) {
        this.logger.error('Error finding purchase order details', { error: error.message, purchaseOrderId });
        throw error;
      }

      this.logger.info('Purchase order details found', { count: data?.length || 0, purchaseOrderId });
      return data;
    } catch (error) {
      this.logger.error('Error finding purchase order details', { error: error.message });
      throw error;
    }
  }

  /**
   * Update received quantity for a detail
   * @param {string} detailId - Detail ID
   * @param {number} receivedQuantity - Received quantity
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Object>}
   */
  async updateReceivedQuantity(detailId, receivedQuantity, organizationId) {
    try {
      this.logger.info('Updating received quantity', { detailId, receivedQuantity, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .update({ received_quantity: receivedQuantity })
        .eq('detail_id', detailId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating received quantity', { error: error.message, detailId });
        throw error;
      }

      this.logger.info('Received quantity updated successfully', { detailId, receivedQuantity });
      return data;
    } catch (error) {
      this.logger.error('Error updating received quantity', { error: error.message });
      throw error;
    }
  }

  /**
   * Update both received_quantity and lot_id for a detail line
   * @param {string} detailId
   * @param {number} newReceivedQuantity - Total received so far (not delta)
   * @param {string} lotId
   * @param {string} organizationId
   * @returns {Promise<Object>}
   */
  async updateReceivedQuantityAndLot(detailId, newReceivedQuantity, lotId, organizationId) {
    try {
      this.logger.info('Updating received quantity and lot', { detailId, newReceivedQuantity, lotId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .update({ received_quantity: newReceivedQuantity, lot_id: lotId })
        .eq('detail_id', detailId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating received quantity and lot', { error: error.message, detailId });
        throw new Error(`Error updating detail: ${error.message}`);
      }

      this.logger.info('Received quantity and lot updated successfully', { detailId, newReceivedQuantity, lotId });
      return data;
    } catch (error) {
      this.logger.error('Error updating received quantity and lot', { error: error.message });
      throw error;
    }
  }

  /**
   * Update detail
   * @param {string} detailId - Detail ID
   * @param {Object} updateData - Data to update
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Object>}
   */
  async update(detailId, updateData, organizationId) {
    try {
      this.logger.info('Updating purchase order detail', { detailId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .update(updateData)
        .eq('detail_id', detailId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating purchase order detail', { error: error.message, detailId });
        throw error;
      }

      this.logger.info('Purchase order detail updated successfully', { detailId });
      return data;
    } catch (error) {
      this.logger.error('Error updating purchase order detail', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete detail
   * @param {string} detailId - Detail ID
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Object>}
   */
  async delete(detailId, organizationId) {
    try {
      this.logger.info('Deleting purchase order detail', { detailId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .delete()
        .eq('detail_id', detailId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error deleting purchase order detail', { error: error.message, detailId });
        throw error;
      }

      this.logger.info('Purchase order detail deleted successfully', { detailId });
      return data;
    } catch (error) {
      this.logger.error('Error deleting purchase order detail', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete all details for a purchase order
   * @param {string} purchaseOrderId - Purchase Order ID
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Array>}
   */
  async deleteByPurchaseOrderId(purchaseOrderId, organizationId) {
    try {
      this.logger.info('Deleting all details for purchase order', { purchaseOrderId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .delete()
        .eq('purchase_order_id', purchaseOrderId)
        .eq('organization_id', organizationId)
        .select();

      if (error) {
        this.logger.error('Error deleting purchase order details', { error: error.message, purchaseOrderId });
        throw error;
      }

      this.logger.info('Purchase order details deleted successfully', { count: data?.length || 0, purchaseOrderId });
      return data;
    } catch (error) {
      this.logger.error('Error deleting purchase order details', { error: error.message });
      throw error;
    }
  }

  /**
   * Find detail by ID
   * @param {string} detailId - Detail ID
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Object|null>}
   */
  async findById(detailId, organizationId) {
    try {
      this.logger.info('Finding purchase order detail by ID', { detailId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select(`
          *,
          products!purchase_order_details_product_id_fkey(
            product_id,
            name,
            batch_number,
            description,
            expiration_date
          )
        `)
        .eq('detail_id', detailId)
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error('Error finding purchase order detail by ID', { error: error.message, detailId });
        throw error;
      }

      this.logger.info('Purchase order detail found successfully', { detailId });
      return data;
    } catch (error) {
      this.logger.error('Error finding purchase order detail', { error: error.message, detailId });
      throw error;
    }
  }

  /**
   * Get total quantity ordered and received for a purchase order
   * @param {string} purchaseOrderId - Purchase Order ID
   * @param {string} organizationId - Organization ID for tenant isolation
   * @returns {Promise<Object>} { totalOrdered, totalReceived }
   */
  async getTotals(purchaseOrderId, organizationId) {
    try {
      this.logger.info('Getting totals for purchase order', { purchaseOrderId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select('quantity, received_quantity')
        .eq('purchase_order_id', purchaseOrderId)
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error getting purchase order totals', { error: error.message, purchaseOrderId });
        throw error;
      }

      const totals = data.reduce(
        (acc, detail) => ({
          totalOrdered: acc.totalOrdered + (detail.quantity || 0),
          totalReceived: acc.totalReceived + (detail.received_quantity || 0)
        }),
        { totalOrdered: 0, totalReceived: 0 }
      );

      this.logger.info('Purchase order totals calculated', { purchaseOrderId, totals });
      return totals;
    } catch (error) {
      this.logger.error('Error getting purchase order totals', { error: error.message });
      throw error;
    }
  }
}

module.exports = PurchaseOrderDetailRepository;
