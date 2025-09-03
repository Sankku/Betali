const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Repository for managing discount rules
 * Handles flexible discount system with various types and conditions
 */
class DiscountRuleRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'discount_rules');
    this.logger = new Logger('DiscountRuleRepository');
  }

  /**
   * Get all active discount rules for an organization
   * @param {string} organizationId - Organization ID
   * @param {Date} orderDate - Order date for date-based rules
   * @returns {Promise<Array>}
   */
  async getActiveDiscountRules(organizationId, orderDate = new Date()) {
    try {
      this.logger.info('Getting active discount rules', { organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .lte('valid_from', orderDate.toISOString())
        .or(`valid_to.is.null,valid_to.gte.${orderDate.toISOString()}`)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Error getting active discount rules', { error: error.message });
        throw error;
      }

      this.logger.info('Active discount rules retrieved', { 
        organizationId,
        ruleCount: data.length 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error getting active discount rules', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Error getting active discount rules: ${error.message}`);
    }
  }

  /**
   * Find discount rule by coupon code
   * @param {string} couponCode - Coupon code
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>}
   */
  async findByCouponCode(couponCode, organizationId) {
    try {
      this.logger.info('Finding discount rule by coupon code', { couponCode, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('coupon_code', couponCode)
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error('Error finding discount rule by coupon', { error: error.message });
        throw error;
      }

      this.logger.info('Discount rule by coupon retrieved', { 
        couponCode,
        found: !!data 
      });

      return data;
    } catch (error) {
      this.logger.error('Error finding discount rule by coupon code', { 
        error: error.message,
        couponCode 
      });
      throw new Error(`Error finding discount rule by coupon: ${error.message}`);
    }
  }

  /**
   * Create a new discount rule
   * @param {Object} discountData - Discount rule data
   * @returns {Promise<Object>}
   */
  async createDiscountRule(discountData) {
    try {
      this.logger.info('Creating discount rule', { 
        name: discountData.name,
        organizationId: discountData.organization_id 
      });

      // Validate discount rule data
      if (!discountData.name || !discountData.organization_id || !discountData.type || discountData.value === undefined) {
        throw new Error('Missing required fields: name, organization_id, type, value');
      }

      // Validate discount type
      const validTypes = ['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping'];
      if (!validTypes.includes(discountData.type)) {
        throw new Error(`Invalid discount type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Validate percentage values
      if (discountData.type === 'percentage' && (discountData.value <= 0 || discountData.value > 1)) {
        throw new Error('Percentage discount value must be between 0 and 1 (e.g., 0.15 for 15%)');
      }

      // Validate fixed amount values
      if (discountData.type === 'fixed_amount' && discountData.value <= 0) {
        throw new Error('Fixed amount discount value must be greater than 0');
      }

      const now = new Date().toISOString();
      const discountToCreate = {
        ...discountData,
        created_at: now,
        updated_at: now,
        is_active: discountData.is_active !== undefined ? discountData.is_active : true,
        current_uses: 0
      };

      const { data, error } = await this.client
        .from(this.table)
        .insert([discountToCreate])
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating discount rule', { error: error.message });
        throw error;
      }

      this.logger.info('Discount rule created', { 
        discountRuleId: data.discount_rule_id,
        name: discountData.name 
      });

      return data;
    } catch (error) {
      this.logger.error('Error creating discount rule', { 
        error: error.message,
        name: discountData.name 
      });
      throw new Error(`Error creating discount rule: ${error.message}`);
    }
  }

  /**
   * Update a discount rule
   * @param {string} discountRuleId - Discount rule ID
   * @param {string} organizationId - Organization ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>}
   */
  async updateDiscountRule(discountRuleId, organizationId, updateData) {
    try {
      this.logger.info('Updating discount rule', { discountRuleId, organizationId });

      // Validate discount type if being updated
      if (updateData.type) {
        const validTypes = ['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping'];
        if (!validTypes.includes(updateData.type)) {
          throw new Error(`Invalid discount type. Must be one of: ${validTypes.join(', ')}`);
        }
      }

      // Validate percentage values if being updated
      if (updateData.type === 'percentage' && updateData.value !== undefined) {
        if (updateData.value <= 0 || updateData.value > 1) {
          throw new Error('Percentage discount value must be between 0 and 1 (e.g., 0.15 for 15%)');
        }
      }

      // Validate fixed amount values if being updated
      if (updateData.type === 'fixed_amount' && updateData.value !== undefined) {
        if (updateData.value <= 0) {
          throw new Error('Fixed amount discount value must be greater than 0');
        }
      }

      const updateToApply = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from(this.table)
        .update(updateToApply)
        .eq('discount_rule_id', discountRuleId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating discount rule', { error: error.message });
        throw error;
      }

      if (!data) {
        throw new Error('Discount rule not found or access denied');
      }

      this.logger.info('Discount rule updated', { discountRuleId });
      return data;
    } catch (error) {
      this.logger.error('Error updating discount rule', { 
        error: error.message,
        discountRuleId 
      });
      throw new Error(`Error updating discount rule: ${error.message}`);
    }
  }

  /**
   * Delete a discount rule
   * @param {string} discountRuleId - Discount rule ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async deleteDiscountRule(discountRuleId, organizationId) {
    try {
      this.logger.info('Deleting discount rule', { discountRuleId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .delete()
        .eq('discount_rule_id', discountRuleId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error deleting discount rule', { error: error.message });
        throw error;
      }

      if (!data) {
        throw new Error('Discount rule not found or access denied');
      }

      this.logger.info('Discount rule deleted', { discountRuleId });
      return true;
    } catch (error) {
      this.logger.error('Error deleting discount rule', { 
        error: error.message,
        discountRuleId 
      });
      throw new Error(`Error deleting discount rule: ${error.message}`);
    }
  }

  /**
   * Get all discount rules for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getOrganizationDiscountRules(organizationId, options = {}) {
    try {
      this.logger.info('Getting organization discount rules', { organizationId });

      let query = this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId);

      // Apply filters
      if (options.is_active !== undefined) {
        query = query.eq('is_active', options.is_active);
      }

      if (options.type) {
        query = query.eq('type', options.type);
      }

      if (options.has_coupon !== undefined) {
        if (options.has_coupon) {
          query = query.not('coupon_code', 'is', null);
        } else {
          query = query.is('coupon_code', null);
        }
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
        this.logger.error('Error getting organization discount rules', { error: error.message });
        throw error;
      }

      this.logger.info('Organization discount rules retrieved', { 
        organizationId,
        ruleCount: data.length 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error getting organization discount rules', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Error getting organization discount rules: ${error.message}`);
    }
  }

  /**
   * Increment usage count for a discount rule
   * @param {string} discountRuleId - Discount rule ID
   * @returns {Promise<void>}
   */
  async incrementUsageCount(discountRuleId) {
    try {
      this.logger.info('Incrementing usage count', { discountRuleId });

      // First get current uses count
      const { data: currentRule, error: fetchError } = await this.client
        .from(this.table)
        .select('current_uses')
        .eq('discount_rule_id', discountRuleId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current usage count: ${fetchError.message}`);
      }

      // Then increment it
      const { error } = await this.client
        .from(this.table)
        .update({ 
          current_uses: (currentRule.current_uses || 0) + 1,
          updated_at: new Date().toISOString() 
        })
        .eq('discount_rule_id', discountRuleId);

      if (error) {
        this.logger.error('Error incrementing usage count', { error: error.message });
        throw error;
      }

      this.logger.info('Usage count incremented', { discountRuleId });
    } catch (error) {
      this.logger.error('Error incrementing usage count', { 
        error: error.message,
        discountRuleId 
      });
      // Don't throw error as this shouldn't block order creation
      this.logger.warn('Usage count increment failed, continuing anyway');
    }
  }

  /**
   * Check if coupon code is unique within organization
   * @param {string} couponCode - Coupon code
   * @param {string} organizationId - Organization ID
   * @param {string|null} excludeId - Rule ID to exclude (for updates)
   * @returns {Promise<boolean>}
   */
  async isCouponCodeUnique(couponCode, organizationId, excludeId = null) {
    try {
      let query = this.client
        .from(this.table)
        .select('discount_rule_id')
        .eq('coupon_code', couponCode)
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (excludeId) {
        query = query.neq('discount_rule_id', excludeId);
      }

      const { data, error } = await query.limit(1);

      if (error) {
        this.logger.error('Error checking coupon uniqueness', { error: error.message });
        throw error;
      }

      return !data || data.length === 0;
    } catch (error) {
      this.logger.error('Error checking coupon code uniqueness', { 
        error: error.message,
        couponCode 
      });
      throw new Error(`Error checking coupon uniqueness: ${error.message}`);
    }
  }

  /**
   * Find discount rule by ID
   * @param {string} discountRuleId - Discount rule ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>}
   */
  async findById(discountRuleId, organizationId) {
    try {
      this.logger.info('Finding discount rule by ID', { discountRuleId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('discount_rule_id', discountRuleId)
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error('Error finding discount rule', { error: error.message });
        throw error;
      }

      this.logger.info('Discount rule found', { 
        discountRuleId,
        found: !!data 
      });

      return data;
    } catch (error) {
      this.logger.error('Error finding discount rule by ID', { 
        error: error.message,
        discountRuleId 
      });
      throw new Error(`Error finding discount rule: ${error.message}`);
    }
  }

  /**
   * Get discount rule statistics
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getDiscountStats(organizationId) {
    try {
      this.logger.info('Getting discount statistics', { organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select('type, is_active, current_uses, max_uses')
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error getting discount stats', { error: error.message });
        throw error;
      }

      const stats = {
        total_rules: data.length,
        active_rules: data.filter(rule => rule.is_active).length,
        inactive_rules: data.filter(rule => !rule.is_active).length,
        by_type: {},
        total_uses: data.reduce((sum, rule) => sum + (rule.current_uses || 0), 0)
      };

      // Count by type
      data.forEach(rule => {
        stats.by_type[rule.type] = (stats.by_type[rule.type] || 0) + 1;
      });

      this.logger.info('Discount statistics calculated', { organizationId });
      return stats;
    } catch (error) {
      this.logger.error('Error getting discount statistics', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Error getting discount statistics: ${error.message}`);
    }
  }
}

module.exports = DiscountRuleRepository;