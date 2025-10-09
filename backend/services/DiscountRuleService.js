/**
 * Discount rule business logic service
 * Handles discount rule management and validation business rules
 */
class DiscountRuleService {
  constructor(discountRuleRepository, logger) {
    this.discountRuleRepository = discountRuleRepository;
    this.logger = logger;
  }

  /**
   * Get all discount rules for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Discount rules
   */
  async getOrganizationDiscountRules(organizationId, options = {}) {
    try {
      this.logger.info(`Fetching discount rules for organization: ${organizationId}`);
      
      const discountRules = await this.discountRuleRepository.getOrganizationDiscountRules(organizationId, options);
      
      this.logger.info(`Found ${discountRules.length} discount rules for organization ${organizationId}`);
      return discountRules;
      
    } catch (error) {
      this.logger.error(`Error fetching discount rules: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get active discount rules for an organization
   * @param {string} organizationId - Organization ID
   * @param {Date} orderDate - Order date for date-based rules
   * @returns {Promise<Array>} Active discount rules
   */
  async getActiveDiscountRules(organizationId, orderDate = new Date()) {
    try {
      this.logger.info(`Fetching active discount rules for organization: ${organizationId}`);
      
      const discountRules = await this.discountRuleRepository.getActiveDiscountRules(organizationId, orderDate);
      
      this.logger.info(`Found ${discountRules.length} active discount rules for organization ${organizationId}`);
      return discountRules;
      
    } catch (error) {
      this.logger.error(`Error fetching active discount rules: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get discount rule by ID
   * @param {string} discountRuleId - Discount rule ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>} Discount rule
   */
  async getDiscountRuleById(discountRuleId, organizationId) {
    try {
      this.logger.info(`Fetching discount rule: ${discountRuleId} for organization: ${organizationId}`);
      
      const discountRule = await this.discountRuleRepository.findById(discountRuleId, organizationId);
      
      if (!discountRule) {
        return null;
      }
      
      this.logger.info(`Discount rule found: ${discountRuleId}`);
      return discountRule;
      
    } catch (error) {
      this.logger.error(`Error fetching discount rule ${discountRuleId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find discount rule by coupon code
   * @param {string} couponCode - Coupon code
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>} Discount rule
   */
  async findByCouponCode(couponCode, organizationId) {
    try {
      this.logger.info(`Finding discount rule by coupon code: ${couponCode} for organization: ${organizationId}`);
      
      const discountRule = await this.discountRuleRepository.findByCouponCode(couponCode, organizationId);
      
      if (!discountRule) {
        return null;
      }
      
      // Validate if the discount is still valid (allow 5 second buffer for immediate usage after creation)
      const now = new Date();
      const validFromDate = discountRule.valid_from ? new Date(discountRule.valid_from) : null;
      // Allow immediate usage within 5 seconds of creation or if valid_from is in the past
      if (validFromDate && validFromDate > new Date(now.getTime() + 5000)) {
        throw new Error('This coupon is not yet valid');
      }
      
      if (discountRule.valid_to && new Date(discountRule.valid_to) < now) {
        throw new Error('This coupon has expired');
      }
      
      if (!discountRule.is_active) {
        throw new Error('This coupon is no longer active');
      }
      
      if (discountRule.max_uses && discountRule.current_uses >= discountRule.max_uses) {
        throw new Error('This coupon has reached its usage limit');
      }
      
      this.logger.info(`Valid discount rule found by coupon: ${couponCode}`);
      return discountRule;
      
    } catch (error) {
      this.logger.error(`Error finding discount rule by coupon ${couponCode}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new discount rule
   * @param {Object} discountRuleData - Discount rule data
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Created discount rule
   */
  async createDiscountRule(discountRuleData, organizationId) {
    try {
      this.logger.info(`Creating new discount rule for organization: ${organizationId}`, { discountRuleData });
      
      // Validate required fields
      this.validateDiscountRuleData(discountRuleData);
      
      // Check coupon code uniqueness if provided
      if (discountRuleData.coupon_code) {
        const isCodeUnique = await this.discountRuleRepository.isCouponCodeUnique(
          discountRuleData.coupon_code, 
          organizationId
        );
        if (!isCodeUnique) {
          throw new Error('Coupon code must be unique within the organization');
        }
      }
      
      const discountRuleToCreate = {
        ...discountRuleData,
        organization_id: organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_uses: 0
      };
      
      const createdDiscountRule = await this.discountRuleRepository.createDiscountRule(discountRuleToCreate);
      
      this.logger.info(`Discount rule created: ${createdDiscountRule.discount_rule_id}`);
      return createdDiscountRule;
      
    } catch (error) {
      this.logger.error(`Error creating discount rule: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing discount rule
   * @param {string} discountRuleId - Discount rule ID
   * @param {Object} updateData - Update data
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Updated discount rule
   */
  async updateDiscountRule(discountRuleId, updateData, organizationId) {
    try {
      this.logger.info(`Updating discount rule: ${discountRuleId} for organization: ${organizationId}`, { updateData });
      
      // Check if discount rule exists and belongs to organization
      const existingDiscountRule = await this.discountRuleRepository.findById(discountRuleId, organizationId);
      if (!existingDiscountRule) {
        throw new Error('Discount rule not found');
      }
      
      // Validate update data if provided
      if (Object.keys(updateData).length > 0) {
        this.validateDiscountRuleData(updateData, true);
      }
      
      // Check coupon code uniqueness if being updated
      if (updateData.coupon_code && updateData.coupon_code !== existingDiscountRule.coupon_code) {
        const isCodeUnique = await this.discountRuleRepository.isCouponCodeUnique(
          updateData.coupon_code, 
          organizationId, 
          discountRuleId
        );
        if (!isCodeUnique) {
          throw new Error('Coupon code must be unique within the organization');
        }
      }
      
      const updatedDiscountRule = await this.discountRuleRepository.updateDiscountRule(
        discountRuleId, 
        organizationId, 
        updateData
      );
      
      this.logger.info(`Discount rule updated: ${discountRuleId}`);
      return updatedDiscountRule;
      
    } catch (error) {
      this.logger.error(`Error updating discount rule ${discountRuleId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a discount rule
   * @param {string} discountRuleId - Discount rule ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteDiscountRule(discountRuleId, organizationId) {
    try {
      this.logger.info(`Deleting discount rule: ${discountRuleId} for organization: ${organizationId}`);
      
      // Check if discount rule exists and belongs to organization
      const existingDiscountRule = await this.discountRuleRepository.findById(discountRuleId, organizationId);
      if (!existingDiscountRule) {
        throw new Error('Discount rule not found');
      }
      
      await this.discountRuleRepository.deleteDiscountRule(discountRuleId, organizationId);
      
      this.logger.info(`Discount rule deleted: ${discountRuleId}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Error deleting discount rule ${discountRuleId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get discount statistics for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Discount statistics
   */
  async getDiscountStats(organizationId) {
    try {
      this.logger.info(`Getting discount statistics for organization: ${organizationId}`);
      
      const stats = await this.discountRuleRepository.getDiscountStats(organizationId);
      
      this.logger.info(`Discount statistics calculated for organization ${organizationId}`);
      return stats;
      
    } catch (error) {
      this.logger.error(`Error getting discount statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Increment usage count for a discount rule
   * @param {string} discountRuleId - Discount rule ID
   * @returns {Promise<void>}
   */
  async incrementUsageCount(discountRuleId) {
    try {
      this.logger.info(`Incrementing usage count for discount rule: ${discountRuleId}`);
      
      await this.discountRuleRepository.incrementUsageCount(discountRuleId);
      
      this.logger.info(`Usage count incremented for discount rule: ${discountRuleId}`);
      
    } catch (error) {
      this.logger.error(`Error incrementing usage count for discount rule ${discountRuleId}: ${error.message}`);
      // Don't throw error as this shouldn't block order creation
      this.logger.warn('Usage count increment failed, continuing anyway');
    }
  }

  /**
   * Validate discount rule data
   * @param {Object} discountRuleData - Discount rule data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @throws {Error} If validation fails
   */
  validateDiscountRuleData(discountRuleData, isUpdate = false) {
    if (!isUpdate) {
      // Required fields for creation
      const required = ['name', 'type', 'value'];
      
      for (const field of required) {
        if (!discountRuleData[field] && discountRuleData[field] !== 0) {
          throw new Error(`Required field: ${field}`);
        }
      }
    }
    
    // Validate name
    if (discountRuleData.name !== undefined) {
      if (typeof discountRuleData.name !== 'string' || discountRuleData.name.trim().length === 0) {
        throw new Error('Discount rule name must be a non-empty string');
      }
      if (discountRuleData.name.length > 255) {
        throw new Error('Discount rule name must be 255 characters or less');
      }
    }
    
    // Validate type
    if (discountRuleData.type !== undefined) {
      const validTypes = ['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping'];
      if (!validTypes.includes(discountRuleData.type)) {
        throw new Error(`Invalid discount type. Must be one of: ${validTypes.join(', ')}`);
      }
    }
    
    // Validate value based on type
    if (discountRuleData.value !== undefined) {
      if (typeof discountRuleData.value !== 'number') {
        throw new Error('Discount value must be a number');
      }
      
      if (discountRuleData.type === 'percentage') {
        if (discountRuleData.value <= 0 || discountRuleData.value > 1) {
          throw new Error('Percentage discount value must be between 0 and 1 (e.g., 0.15 for 15%)');
        }
      } else if (discountRuleData.type === 'fixed_amount') {
        if (discountRuleData.value <= 0) {
          throw new Error('Fixed amount discount value must be greater than 0');
        }
      }
    }

    // Validate coupon code if provided
    if (discountRuleData.coupon_code !== undefined && discountRuleData.coupon_code !== null) {
      if (typeof discountRuleData.coupon_code !== 'string') {
        throw new Error('Coupon code must be a string');
      }
      if (discountRuleData.coupon_code.length > 50) {
        throw new Error('Coupon code must be 50 characters or less');
      }
      // Basic format validation - alphanumeric and common characters
      if (!/^[A-Za-z0-9_-]+$/.test(discountRuleData.coupon_code)) {
        throw new Error('Coupon code can only contain letters, numbers, underscores and hyphens');
      }
    }

    // Validate description if provided
    if (discountRuleData.description !== undefined && discountRuleData.description !== null) {
      if (typeof discountRuleData.description !== 'string') {
        throw new Error('Discount rule description must be a string');
      }
      if (discountRuleData.description.length > 500) {
        throw new Error('Discount rule description must be 500 characters or less');
      }
    }

    // Validate dates if provided
    if (discountRuleData.valid_from !== undefined && discountRuleData.valid_from !== null) {
      if (!(discountRuleData.valid_from instanceof Date) && typeof discountRuleData.valid_from !== 'string') {
        throw new Error('valid_from must be a valid date');
      }
    }

    if (discountRuleData.valid_to !== undefined && discountRuleData.valid_to !== null) {
      if (!(discountRuleData.valid_to instanceof Date) && typeof discountRuleData.valid_to !== 'string') {
        throw new Error('valid_to must be a valid date');
      }
    }

    // Validate usage limits if provided
    if (discountRuleData.max_uses !== undefined && discountRuleData.max_uses !== null) {
      if (typeof discountRuleData.max_uses !== 'number' || discountRuleData.max_uses < 1) {
        throw new Error('max_uses must be a positive integer');
      }
    }

    // Validate minimum order amount if provided
    if (discountRuleData.min_order_amount !== undefined && discountRuleData.min_order_amount !== null) {
      if (typeof discountRuleData.min_order_amount !== 'number' || discountRuleData.min_order_amount < 0) {
        throw new Error('min_order_amount must be a non-negative number');
      }
    }

    // Validate is_active if provided
    if (discountRuleData.is_active !== undefined) {
      if (typeof discountRuleData.is_active !== 'boolean') {
        throw new Error('is_active must be a boolean');
      }
    }
  }
}

module.exports = { DiscountRuleService };