const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Repository for managing customer-specific pricing
 * Enables custom pricing for specific customers
 */
class CustomerPricingRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'customer_pricing');
    this.logger = new Logger('CustomerPricingRepository');
  }

  /**
   * Get active customer price for a product
   * @param {string} clientId - Client ID
   * @param {string} productId - Product ID
   * @param {string} organizationId - Organization ID
   * @param {Date} orderDate - Order date for date-based pricing
   * @returns {Promise<Object|null>}
   */
  async getActiveCustomerPrice(clientId, productId, organizationId, orderDate = new Date()) {
    try {
      this.logger.info('Getting customer price', { 
        clientId, 
        productId, 
        organizationId 
      });

      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('client_id', clientId)
        .eq('product_id', productId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .lte('valid_from', orderDate.toISOString())
        .or(`valid_to.is.null,valid_to.gte.${orderDate.toISOString()}`)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error('Error getting customer price', { error: error.message });
        throw error;
      }

      this.logger.info('Customer price retrieved', { 
        clientId, 
        productId,
        priceFound: !!data,
        price: data?.price 
      });

      return data;
    } catch (error) {
      this.logger.error('Error getting customer price', { 
        error: error.message,
        clientId,
        productId 
      });
      throw new Error(`Error getting customer price: ${error.message}`);
    }
  }

  /**
   * Get all customer pricing for a client
   * @param {string} clientId - Client ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async getClientPricing(clientId, organizationId) {
    try {
      this.logger.info('Getting client pricing', { clientId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select(`
          *,
          products!customer_pricing_product_id_fkey(product_id, name, sku, price)
        `)
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Error getting client pricing', { error: error.message });
        throw error;
      }

      this.logger.info('Client pricing retrieved', { 
        clientId, 
        pricingCount: data.length 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error getting client pricing', { 
        error: error.message,
        clientId 
      });
      throw new Error(`Error getting client pricing: ${error.message}`);
    }
  }

  /**
   * Create customer pricing
   * @param {Object} pricingData - Customer pricing data
   * @returns {Promise<Object>}
   */
  async createCustomerPricing(pricingData) {
    try {
      this.logger.info('Creating customer pricing', { 
        clientId: pricingData.client_id,
        productId: pricingData.product_id,
        organizationId: pricingData.organization_id 
      });

      // Validate pricing data
      if (!pricingData.client_id || !pricingData.product_id || !pricingData.organization_id || pricingData.price === undefined) {
        throw new Error('Missing required fields: client_id, product_id, organization_id, price');
      }

      if (pricingData.price < 0) {
        throw new Error('Price cannot be negative');
      }

      const now = new Date().toISOString();
      const pricingToCreate = {
        ...pricingData,
        created_at: now,
        updated_at: now,
        is_active: pricingData.is_active !== undefined ? pricingData.is_active : true
      };

      const { data, error } = await this.client
        .from(this.table)
        .insert([pricingToCreate])
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating customer pricing', { error: error.message });
        throw error;
      }

      this.logger.info('Customer pricing created', { 
        pricingId: data.customer_pricing_id,
        clientId: pricingData.client_id 
      });

      return data;
    } catch (error) {
      this.logger.error('Error creating customer pricing', { 
        error: error.message,
        clientId: pricingData.client_id,
        productId: pricingData.product_id 
      });
      throw new Error(`Error creating customer pricing: ${error.message}`);
    }
  }

  /**
   * Update customer pricing
   * @param {string} pricingId - Pricing ID
   * @param {string} organizationId - Organization ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>}
   */
  async updateCustomerPricing(pricingId, organizationId, updateData) {
    try {
      this.logger.info('Updating customer pricing', { pricingId, organizationId });

      const updateToApply = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from(this.table)
        .update(updateToApply)
        .eq('customer_pricing_id', pricingId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating customer pricing', { error: error.message });
        throw error;
      }

      if (!data) {
        throw new Error('Customer pricing not found or access denied');
      }

      this.logger.info('Customer pricing updated', { pricingId });
      return data;
    } catch (error) {
      this.logger.error('Error updating customer pricing', { 
        error: error.message,
        pricingId 
      });
      throw new Error(`Error updating customer pricing: ${error.message}`);
    }
  }

  /**
   * Delete customer pricing
   * @param {string} pricingId - Pricing ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async deleteCustomerPricing(pricingId, organizationId) {
    try {
      this.logger.info('Deleting customer pricing', { pricingId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .delete()
        .eq('customer_pricing_id', pricingId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error deleting customer pricing', { error: error.message });
        throw error;
      }

      if (!data) {
        throw new Error('Customer pricing not found or access denied');
      }

      this.logger.info('Customer pricing deleted', { pricingId });
      return true;
    } catch (error) {
      this.logger.error('Error deleting customer pricing', { 
        error: error.message,
        pricingId 
      });
      throw new Error(`Error deleting customer pricing: ${error.message}`);
    }
  }

  /**
   * Get all customer pricing for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getOrganizationCustomerPricing(organizationId, options = {}) {
    try {
      this.logger.info('Getting organization customer pricing', { organizationId });

      let query = this.client
        .from(this.table)
        .select(`
          *,
          clients!customer_pricing_client_id_fkey(client_id, name, email),
          products!customer_pricing_product_id_fkey(product_id, name, sku, price)
        `)
        .eq('organization_id', organizationId);

      // Apply filters
      if (options.client_id) {
        query = query.eq('client_id', options.client_id);
      }

      if (options.product_id) {
        query = query.eq('product_id', options.product_id);
      }

      if (options.is_active !== undefined) {
        query = query.eq('is_active', options.is_active);
      }

      // Apply ordering
      query = query.order('created_at', { ascending: false });

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Error getting organization customer pricing', { error: error.message });
        throw error;
      }

      this.logger.info('Organization customer pricing retrieved', { 
        organizationId,
        pricingCount: data.length 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error getting organization customer pricing', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Error getting organization customer pricing: ${error.message}`);
    }
  }

  /**
   * Create bulk customer pricing entries
   * @param {Array} pricingEntries - Array of pricing objects
   * @returns {Promise<Array>}
   */
  async createBulkCustomerPricing(pricingEntries) {
    try {
      if (!Array.isArray(pricingEntries) || pricingEntries.length === 0) {
        return [];
      }

      this.logger.info('Creating bulk customer pricing', { 
        entryCount: pricingEntries.length 
      });

      const now = new Date().toISOString();
      const pricingWithTimestamps = pricingEntries.map(entry => ({
        ...entry,
        created_at: now,
        updated_at: now,
        is_active: entry.is_active !== undefined ? entry.is_active : true
      }));

      const { data, error } = await this.client
        .from(this.table)
        .insert(pricingWithTimestamps)
        .select();

      if (error) {
        this.logger.error('Error creating bulk customer pricing', { error: error.message });
        throw error;
      }

      this.logger.info('Bulk customer pricing created', { 
        createdCount: data.length 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error creating bulk customer pricing', { 
        error: error.message 
      });
      throw new Error(`Error creating bulk customer pricing: ${error.message}`);
    }
  }

  /**
   * Check if customer pricing exists for client-product combination
   * @param {string} clientId - Client ID
   * @param {string} productId - Product ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async customerPricingExists(clientId, productId, organizationId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('customer_pricing_id')
        .eq('client_id', clientId)
        .eq('product_id', productId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .limit(1);

      if (error) {
        this.logger.error('Error checking customer pricing existence', { error: error.message });
        throw error;
      }

      return data && data.length > 0;
    } catch (error) {
      this.logger.error('Error checking customer pricing existence', { 
        error: error.message,
        clientId,
        productId 
      });
      throw new Error(`Error checking customer pricing existence: ${error.message}`);
    }
  }
}

module.exports = CustomerPricingRepository;