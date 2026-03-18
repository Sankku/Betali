const { Logger } = require('../utils/Logger');

/**
 * Pricing Service - Advanced pricing calculations with tax and discounts
 * Handles tiered pricing, customer-specific pricing, tax calculations, and discounts
 */
class PricingService {
  constructor(
    pricingTierRepository,
    customerPricingRepository,
    taxRateRepository,
    productTaxGroupRepository,
    discountRuleRepository,
    appliedDiscountRepository,
    productRepository,
    logger
  ) {
    this.pricingTierRepository = pricingTierRepository;
    this.customerPricingRepository = customerPricingRepository;
    this.taxRateRepository = taxRateRepository;
    this.productTaxGroupRepository = productTaxGroupRepository;
    this.discountRuleRepository = discountRuleRepository;
    this.appliedDiscountRepository = appliedDiscountRepository;
    this.productRepository = productRepository;
    this.logger = logger || new Logger('PricingService');
  }

  /**
   * Calculate complete pricing for an order
   * @param {Object} orderData - Order data with items, client, dates, etc.
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Complete pricing breakdown
   */
  async calculateOrderPricing(orderData, organizationId) {
    try {
      this.logger.info('Calculating order pricing', { 
        organizationId,
        itemCount: orderData.items?.length 
      });

      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new Error('Order must have at least one item');
      }

      // Calculate line items with individual pricing
      const lineItems = await this.calculateLineItemPricing(
        orderData.items,
        orderData.client_id,
        organizationId,
        orderData.order_date
      );

      // Calculate order subtotal
      const subtotal = lineItems.reduce((sum, item) => sum + item.line_subtotal, 0);

      // Apply order-level discounts
      const orderDiscounts = await this.calculateOrderDiscounts(
        orderData,
        subtotal,
        lineItems,
        organizationId
      );

      // Calculate discounted amount
      const discountedAmount = subtotal - orderDiscounts.total_discount;

      // Calculate taxes — pass tax_rate_ids so explicit "no tax" selection is respected
      const taxCalculation = await this.calculateTaxes(
        lineItems,
        discountedAmount,
        organizationId,
        orderData.tax_rate_ids
      );

      // Calculate final total based on tax method
      let total;
      const hasInclusiveTaxes = taxCalculation.tax_breakdown.some(tax => tax.is_inclusive);
      
      if (hasInclusiveTaxes) {
        // For tax-inclusive: the discounted amount already includes taxes
        total = discountedAmount;
      } else {
        // For tax-exclusive: add taxes to the discounted amount
        total = discountedAmount + taxCalculation.total_tax;
      }

      const result = {
        line_items: lineItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount_amount: parseFloat(orderDiscounts.total_discount.toFixed(2)),
        tax_amount: parseFloat(taxCalculation.total_tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        applied_discounts: orderDiscounts.applied_discounts,
        tax_breakdown: taxCalculation.tax_breakdown
      };

      this.logger.info('Order pricing calculated', { 
        organizationId,
        subtotal: result.subtotal,
        total: result.total 
      });

      return result;
    } catch (error) {
      this.logger.error('Error calculating order pricing', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Failed to calculate pricing: ${error.message}`);
    }
  }

  /**
   * Calculate pricing for individual line items
   * @private
   */
  async calculateLineItemPricing(items, clientId, organizationId, orderDate = new Date()) {
    const lineItems = [];

    for (const item of items) {
      // Use the price from the item if provided (manual override), otherwise get applicable price
      let unitPrice;
      if (item.price !== undefined && item.price !== null) {
        unitPrice = parseFloat(item.price);
      } else {
        unitPrice = await this.getApplicablePrice(
          item.product_id,
          item.quantity,
          clientId,
          organizationId,
          orderDate
        );
      }

      // Calculate line total
      const lineTotal = unitPrice * item.quantity;

      // Apply line-level discounts (if any)
      const lineDiscounts = await this.calculateLineDiscounts(
        item,
        unitPrice,
        lineTotal,
        organizationId
      );

      // Calculate line subtotal after discounts
      const lineSubtotal = lineTotal - lineDiscounts.total_discount;

      lineItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: parseFloat(unitPrice.toFixed(2)),
        line_total: parseFloat(lineTotal.toFixed(2)),
        line_discount: parseFloat(lineDiscounts.total_discount.toFixed(2)),
        line_subtotal: parseFloat(lineSubtotal.toFixed(2)),
        applied_discounts: lineDiscounts.applied_discounts,
        pricing_source: unitPrice.source || 'base_price'
      });
    }

    return lineItems;
  }

  /**
   * Get the applicable price for a product considering all pricing rules
   * @private
   */
  async getApplicablePrice(productId, quantity, clientId, organizationId, orderDate = new Date()) {
    try {
      let applicablePrice = null;
      let priceSource = 'base_price';

      // 1. Check customer-specific pricing (highest priority)
      if (clientId) {
        const customerPrice = await this.customerPricingRepository.getActiveCustomerPrice(
          clientId,
          productId,
          organizationId,
          orderDate
        );
        
        if (customerPrice) {
          applicablePrice = customerPrice.price;
          priceSource = 'customer_pricing';
          this.logger.debug('Using customer-specific pricing', { 
            productId, 
            clientId, 
            price: applicablePrice 
          });
        }
      }

      // 2. Check tiered pricing (second priority)
      if (!applicablePrice) {
        const tierPrice = await this.pricingTierRepository.getApplicableTierPrice(
          productId,
          quantity,
          organizationId,
          orderDate
        );

        if (tierPrice) {
          applicablePrice = tierPrice.price;
          priceSource = `tier_pricing_${tierPrice.tier_name}`;
          this.logger.debug('Using tiered pricing', { 
            productId, 
            quantity, 
            tier: tierPrice.tier_name, 
            price: applicablePrice 
          });
        }
      }

      // 3. Fall back to base product price
      if (!applicablePrice) {
        const product = await this.productRepository.findById(productId, organizationId);
        if (!product) {
          throw new Error(`Product ${productId} not found`);
        }
        applicablePrice = product.price || 0;
        priceSource = 'base_price';
      }

      return applicablePrice;
    } catch (error) {
      this.logger.error('Error getting applicable price', { 
        error: error.message,
        productId,
        quantity 
      });
      throw error;
    }
  }

  /**
   * Calculate line-level discounts
   * @private
   */
  async calculateLineDiscounts(item, unitPrice, lineTotal, organizationId) {
    // For now, return no line-level discounts
    // This can be expanded to include product-specific discounts
    return {
      total_discount: 0,
      applied_discounts: []
    };
  }

  /**
   * Calculate order-level discounts
   * @private
   */
  async calculateOrderDiscounts(orderData, subtotal, lineItems, organizationId) {
    try {
      let totalDiscount = 0;
      const appliedDiscounts = [];

      // Get all active discount rules for the organization
      const discountRules = await this.discountRuleRepository.getActiveDiscountRules(
        organizationId,
        orderData.order_date || new Date()
      );

      for (const rule of discountRules) {
        // Check if discount rule applies to this order
        const discountAmount = await this.calculateDiscountAmount(
          rule,
          orderData,
          subtotal,
          lineItems,
          organizationId
        );

        if (discountAmount > 0) {
          totalDiscount += discountAmount;
          appliedDiscounts.push({
            rule_id: rule.discount_rule_id,
            rule_name: rule.name,
            discount_type: rule.type,
            discount_amount: parseFloat(discountAmount.toFixed(2)),
            coupon_code: orderData.coupon_code || null
          });
        }
      }

      return {
        total_discount: totalDiscount,
        applied_discounts: appliedDiscounts
      };
    } catch (error) {
      this.logger.error('Error calculating order discounts', { 
        error: error.message,
        organizationId 
      });
      return { total_discount: 0, applied_discounts: [] };
    }
  }

  /**
   * Calculate discount amount for a specific rule
   * @private
   */
  async calculateDiscountAmount(rule, orderData, subtotal, lineItems, organizationId) {
    try {
      // Check if coupon code is required and matches
      if (rule.requires_coupon && rule.coupon_code !== orderData.coupon_code) {
        return 0;
      }

      // Check minimum order amount
      if (rule.min_order_amount && subtotal < rule.min_order_amount) {
        return 0;
      }

      // Check usage limits
      if (rule.max_uses && rule.current_uses >= rule.max_uses) {
        return 0;
      }

      let discountAmount = 0;

      switch (rule.type) {
        case 'percentage':
          discountAmount = subtotal * rule.value;
          break;
        
        case 'fixed_amount':
          discountAmount = rule.value;
          break;
        
        case 'buy_x_get_y':
          // Implement buy X get Y logic here
          discountAmount = 0; // Placeholder
          break;
        
        default:
          this.logger.warn('Unknown discount type', { type: rule.type });
          return 0;
      }

      // Apply maximum discount limit if set
      if (rule.max_discount_amount) {
        discountAmount = Math.min(discountAmount, rule.max_discount_amount);
      }

      // Ensure discount doesn't exceed order total
      discountAmount = Math.min(discountAmount, subtotal);

      return Math.max(0, discountAmount);
    } catch (error) {
      this.logger.error('Error calculating discount amount', { 
        error: error.message,
        ruleId: rule.discount_rule_id 
      });
      return 0;
    }
  }

  /**
   * Calculate taxes for the order
   * @private
   */
  async calculateTaxes(lineItems, taxableAmount, organizationId, taxRateIds) {
    try {
      // If the caller explicitly passed an empty array, the user selected "No tax"
      if (Array.isArray(taxRateIds) && taxRateIds.length === 0) {
        return { total_tax: 0, tax_breakdown: [] };
      }

      let totalTax = 0;
      const taxBreakdown = [];

      // Get tax rates for products in the order
      const productIds = lineItems.map(item => item.product_id);
      const productTaxRates = await this.productTaxGroupRepository.getProductTaxRates(
        productIds,
        organizationId
      );

      // If no specific product tax rates, use default organization tax rate
      if (productTaxRates.length === 0) {
        const defaultTaxRate = await this.taxRateRepository.getDefaultTaxRate(organizationId);
        if (defaultTaxRate) {
          let taxAmount, adjustedTaxableAmount;
          
          if (defaultTaxRate.is_inclusive) {
            // Tax-inclusive: extract tax from total price
            // baseAmount = totalPrice / (1 + rate)
            // taxAmount = totalPrice - baseAmount
            const baseAmount = taxableAmount / (1 + defaultTaxRate.rate);
            taxAmount = taxableAmount - baseAmount;
            adjustedTaxableAmount = baseAmount;
          } else {
            // Tax-exclusive: add tax to base price
            taxAmount = taxableAmount * defaultTaxRate.rate;
            adjustedTaxableAmount = taxableAmount;
          }
          
          totalTax += taxAmount;
          
          taxBreakdown.push({
            tax_rate_id: defaultTaxRate.tax_rate_id,
            name: defaultTaxRate.name,
            rate: defaultTaxRate.rate,
            taxable_amount: parseFloat(adjustedTaxableAmount.toFixed(2)),
            tax_amount: parseFloat(taxAmount.toFixed(2)),
            is_inclusive: defaultTaxRate.is_inclusive
          });
        }
      } else {
        // Calculate tax for each product based on its assigned tax rates
        for (const item of lineItems) {
          const itemTaxRates = productTaxRates.filter(ptr => ptr.product_id === item.product_id);
          
          if (itemTaxRates.length > 0) {
            for (const taxRate of itemTaxRates) {
              let itemTaxAmount, adjustedItemTaxableAmount;
              const itemTotalAmount = item.line_subtotal;
              
              if (taxRate.is_inclusive) {
                // Tax-inclusive: extract tax from total price
                const itemBaseAmount = itemTotalAmount / (1 + taxRate.rate);
                itemTaxAmount = itemTotalAmount - itemBaseAmount;
                adjustedItemTaxableAmount = itemBaseAmount;
              } else {
                // Tax-exclusive: add tax to base price
                itemTaxAmount = itemTotalAmount * taxRate.rate;
                adjustedItemTaxableAmount = itemTotalAmount;
              }
              
              totalTax += itemTaxAmount;
              
              // Find or create tax breakdown entry
              let existingTax = taxBreakdown.find(tb => tb.tax_rate_id === taxRate.tax_rate_id);
              if (existingTax) {
                existingTax.taxable_amount += adjustedItemTaxableAmount;
                existingTax.tax_amount += itemTaxAmount;
              } else {
                taxBreakdown.push({
                  tax_rate_id: taxRate.tax_rate_id,
                  name: taxRate.name,
                  rate: taxRate.rate,
                  taxable_amount: parseFloat(adjustedItemTaxableAmount.toFixed(2)),
                  tax_amount: parseFloat(itemTaxAmount.toFixed(2)),
                  is_inclusive: taxRate.is_inclusive
                });
              }
            }
          }
        }
      }

      // Round tax amounts
      taxBreakdown.forEach(tax => {
        tax.taxable_amount = parseFloat(tax.taxable_amount.toFixed(2));
        tax.tax_amount = parseFloat(tax.tax_amount.toFixed(2));
      });

      return {
        total_tax: parseFloat(totalTax.toFixed(2)),
        tax_breakdown: taxBreakdown
      };
    } catch (error) {
      this.logger.error('Error calculating taxes', { 
        error: error.message,
        organizationId 
      });
      return { total_tax: 0, tax_breakdown: [] };
    }
  }

  /**
   * Validate and apply coupon code
   * @param {string} couponCode - Coupon code to validate
   * @param {Object} orderData - Order data for validation
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Validation result
   */
  async validateCouponCode(couponCode, orderData, organizationId) {
    try {
      this.logger.info('Validating coupon code', { couponCode, organizationId });

      const discountRule = await this.discountRuleRepository.findByCouponCode(
        couponCode,
        organizationId
      );

      if (!discountRule) {
        return { valid: false, message: 'Invalid coupon code' };
      }

      if (!discountRule.is_active) {
        return { valid: false, message: 'Coupon code is no longer active' };
      }

      // Check date validity
      const now = new Date();
      if (discountRule.valid_from && new Date(discountRule.valid_from) > now) {
        return { valid: false, message: 'Coupon code is not yet valid' };
      }

      if (discountRule.valid_to && new Date(discountRule.valid_to) < now) {
        return { valid: false, message: 'Coupon code has expired' };
      }

      // Check usage limits
      if (discountRule.max_uses && discountRule.current_uses >= discountRule.max_uses) {
        return { valid: false, message: 'Coupon code usage limit exceeded' };
      }

      // Calculate potential discount to show preview
      const tempPricing = await this.calculateOrderPricing(
        { ...orderData, coupon_code: couponCode },
        organizationId
      );

      const applicableDiscount = tempPricing.applied_discounts.find(
        d => d.rule_id === discountRule.discount_rule_id
      );

      if (!applicableDiscount) {
        return { valid: false, message: 'Coupon code cannot be applied to this order' };
      }

      return {
        valid: true,
        discount_rule: discountRule,
        discount_amount: applicableDiscount.discount_amount,
        message: `Coupon applied! You save $${applicableDiscount.discount_amount.toFixed(2)}`
      };
    } catch (error) {
      this.logger.error('Error validating coupon code', { 
        error: error.message,
        couponCode 
      });
      return { valid: false, message: 'Error validating coupon code' };
    }
  }

  /**
   * Save applied discounts to database for audit trail
   * @param {string} orderId - Order ID
   * @param {Array} appliedDiscounts - Applied discounts from pricing calculation
   * @param {string} organizationId - Organization ID
   * @returns {Promise<void>}
   */
  async saveAppliedDiscounts(orderId, appliedDiscounts, organizationId) {
    try {
      if (!appliedDiscounts || appliedDiscounts.length === 0) {
        return;
      }

      this.logger.info('Saving applied discounts', { 
        orderId,
        discountCount: appliedDiscounts.length 
      });

      const discountRecords = appliedDiscounts.map(discount => ({
        organization_id: organizationId,
        order_id: orderId,
        discount_rule_id: discount.rule_id,
        discount_amount: discount.discount_amount,
        applied_to: 'order',
        coupon_code: discount.coupon_code || null
      }));

      await this.appliedDiscountRepository.createBulk(discountRecords);

      // Update usage counts for discount rules
      for (const discount of appliedDiscounts) {
        await this.discountRuleRepository.incrementUsageCount(discount.rule_id);
      }

      this.logger.info('Applied discounts saved successfully', { orderId });
    } catch (error) {
      this.logger.error('Error saving applied discounts', { 
        error: error.message,
        orderId 
      });
      // Don't throw error as this is for audit purposes only
    }
  }
}

module.exports = PricingService;