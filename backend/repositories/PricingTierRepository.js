const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Repository for managing pricing tiers (volume-based pricing)
 * Follows the established multi-tenant pattern with organization_id isolation
 */
class PricingTierRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'pricing_tiers');
    this.logger = new Logger('PricingTierRepository');
  }

  /**
   * Get applicable pricing tier for a product and quantity
   * @param {string} productId - Product ID
   * @param {number} quantity - Order quantity
   * @param {string} organizationId - Organization ID
   * @param {Date} orderDate - Order date for date-based pricing
   * @returns {Promise<Object|null>}
   */
  async getApplicableTierPrice(productId, quantity, organizationId, orderDate = new Date()) {
    try {
      this.logger.info('Getting applicable tier price', { 
        productId, 
        quantity, 
        organizationId 
      });

      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('product_id', productId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .lte('min_quantity', quantity)
        .or(`max_quantity.is.null,max_quantity.gte.${quantity}`)
        .lte('valid_from', orderDate.toISOString())
        .or(`valid_to.is.null,valid_to.gte.${orderDate.toISOString()}`)
        .order('min_quantity', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error('Error getting tier price', { error: error.message });
        throw error;
      }

      this.logger.info('Tier price retrieved', { 
        productId, 
        quantity,
        tierFound: !!data,
        price: data?.price 
      });

      return data;
    } catch (error) {
      this.logger.error('Error getting applicable tier price', { 
        error: error.message,
        productId,
        quantity 
      });
      throw new Error(`Error getting tier price: ${error.message}`);
    }
  }

  /**
   * Get all pricing tiers for a product
   * @param {string} productId - Product ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async getProductTiers(productId, organizationId) {
    try {
      this.logger.info('Getting product pricing tiers', { productId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('product_id', productId)
        .eq('organization_id', organizationId)
        .order('min_quantity', { ascending: true });

      if (error) {
        this.logger.error('Error getting product tiers', { error: error.message });
        throw error;
      }

      this.logger.info('Product tiers retrieved', { 
        productId, 
        tierCount: data.length 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error getting product tiers', { 
        error: error.message,
        productId 
      });
      throw new Error(`Error getting product tiers: ${error.message}`);
    }
  }

  /**
   * Create a new pricing tier
   * @param {Object} tierData - Tier data
   * @returns {Promise<Object>}
   */
  async createTier(tierData) {
    try {
      this.logger.info('Creating pricing tier', { 
        productId: tierData.product_id,
        organizationId: tierData.organization_id 
      });

      // Validate tier data
      if (!tierData.product_id || !tierData.organization_id || !tierData.price) {
        throw new Error('Missing required fields: product_id, organization_id, price');
      }

      if (tierData.min_quantity < 0) {
        throw new Error('Minimum quantity cannot be negative');
      }

      if (tierData.max_quantity && tierData.max_quantity <= tierData.min_quantity) {
        throw new Error('Maximum quantity must be greater than minimum quantity');
      }

      const now = new Date().toISOString();
      const tierToCreate = {
        ...tierData,
        created_at: now,
        updated_at: now,
        is_active: tierData.is_active !== undefined ? tierData.is_active : true
      };

      const { data, error } = await this.client
        .from(this.table)
        .insert([tierToCreate])
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating tier', { error: error.message });
        throw error;
      }

      this.logger.info('Pricing tier created', { 
        tierId: data.pricing_tier_id,
        productId: tierData.product_id 
      });

      return data;
    } catch (error) {
      this.logger.error('Error creating pricing tier', { 
        error: error.message,
        productId: tierData.product_id 
      });
      throw new Error(`Error creating pricing tier: ${error.message}`);
    }
  }

  /**
   * Update a pricing tier
   * @param {string} tierId - Tier ID
   * @param {string} organizationId - Organization ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>}
   */
  async updateTier(tierId, organizationId, updateData) {
    try {
      this.logger.info('Updating pricing tier', { tierId, organizationId });

      const updateToApply = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from(this.table)
        .update(updateToApply)
        .eq('pricing_tier_id', tierId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating tier', { error: error.message });
        throw error;
      }

      if (!data) {
        throw new Error('Pricing tier not found or access denied');
      }

      this.logger.info('Pricing tier updated', { tierId });
      return data;
    } catch (error) {
      this.logger.error('Error updating pricing tier', { 
        error: error.message,
        tierId 
      });
      throw new Error(`Error updating pricing tier: ${error.message}`);
    }
  }

  /**
   * Delete a pricing tier
   * @param {string} tierId - Tier ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async deleteTier(tierId, organizationId) {
    try {
      this.logger.info('Deleting pricing tier', { tierId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .delete()
        .eq('pricing_tier_id', tierId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error deleting tier', { error: error.message });
        throw error;
      }

      if (!data) {
        throw new Error('Pricing tier not found or access denied');
      }

      this.logger.info('Pricing tier deleted', { tierId });
      return true;
    } catch (error) {
      this.logger.error('Error deleting pricing tier', { 
        error: error.message,
        tierId 
      });
      throw new Error(`Error deleting pricing tier: ${error.message}`);
    }
  }

  /**
   * Get all active pricing tiers for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getOrganizationTiers(organizationId, options = {}) {
    try {
      this.logger.info('Getting organization pricing tiers', { organizationId });

      let query = this.client
        .from(this.table)
        .select(`
          *,
          products!pricing_tiers_product_id_fkey(product_id, name, sku)
        `)
        .eq('organization_id', organizationId);

      // Apply filters
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
        this.logger.error('Error getting organization tiers', { error: error.message });
        throw error;
      }

      this.logger.info('Organization tiers retrieved', { 
        organizationId,
        tierCount: data.length 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error getting organization tiers', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Error getting organization tiers: ${error.message}`);
    }
  }

  /**
   * Check for overlapping pricing tiers
   * @param {string} productId - Product ID
   * @param {string} organizationId - Organization ID
   * @param {number} minQuantity - Minimum quantity
   * @param {number|null} maxQuantity - Maximum quantity
   * @param {string|null} excludeTierId - Tier ID to exclude (for updates)
   * @returns {Promise<boolean>}
   */
  async hasOverlappingTiers(productId, organizationId, minQuantity, maxQuantity, excludeTierId = null) {
    try {
      let query = this.client
        .from(this.table)
        .select('pricing_tier_id')
        .eq('product_id', productId)
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (excludeTierId) {
        query = query.neq('pricing_tier_id', excludeTierId);
      }

      // Check for overlaps
      if (maxQuantity) {
        query = query.or(
          `and(min_quantity.lte.${maxQuantity},or(max_quantity.is.null,max_quantity.gte.${minQuantity}))`
        );
      } else {
        query = query.gte('min_quantity', minQuantity);
      }

      const { data, error } = await query.limit(1);

      if (error) {
        this.logger.error('Error checking overlapping tiers', { error: error.message });
        throw error;
      }

      return data && data.length > 0;
    } catch (error) {
      this.logger.error('Error checking overlapping tiers', { 
        error: error.message,
        productId 
      });
      throw new Error(`Error checking overlapping tiers: ${error.message}`);
    }
  }
}

module.exports = PricingTierRepository;