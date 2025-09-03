const { Logger } = require('../utils/Logger');

/**
 * Pricing Controller - HTTP API endpoints for pricing management
 * Provides RESTful API for pricing, tax, and discount operations
 */
class PricingController {
  constructor(pricingService, pricingTierRepository, customerPricingRepository, taxRateRepository, discountRuleRepository) {
    this.pricingService = pricingService;
    this.pricingTierRepository = pricingTierRepository;
    this.customerPricingRepository = customerPricingRepository;
    this.taxRateRepository = taxRateRepository;
    this.discountRuleRepository = discountRuleRepository;
    this.logger = new Logger('PricingController');
  }

  // =================== PRICING CALCULATIONS ===================

  /**
   * POST /api/pricing/calculate
   * Calculate order pricing preview
   */
  async calculateOrderPricing(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const orderData = req.body;

      this.logger.info('Calculating order pricing', { organizationId });

      const pricingResult = await this.pricingService.calculateOrderPricing(
        orderData,
        organizationId
      );

      this.logger.info('Order pricing calculated successfully', { 
        organizationId,
        total: pricingResult.total 
      });

      res.json({
        success: true,
        data: pricingResult
      });
    } catch (error) {
      this.logger.error('Error calculating order pricing', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/pricing/validate-coupon
   * Validate coupon code
   */
  async validateCouponCode(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const { coupon_code, order_data } = req.body;

      if (!coupon_code) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code is required'
        });
      }

      this.logger.info('Validating coupon code', { couponCode: coupon_code, organizationId });

      const result = await this.pricingService.validateCouponCode(
        coupon_code,
        order_data || {},
        organizationId
      );

      this.logger.info('Coupon validation completed', { 
        couponCode: coupon_code,
        valid: result.valid 
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.logger.error('Error validating coupon code', { error: error.message });
      next(error);
    }
  }

  // =================== PRICING TIERS ===================

  /**
   * GET /api/pricing/products/:productId/tiers
   * Get pricing tiers for a product
   */
  async getProductPricingTiers(req, res, next) {
    try {
      const { productId } = req.params;
      const organizationId = req.user.currentOrganizationId;

      this.logger.info('Getting product pricing tiers', { productId, organizationId });

      const tiers = await this.pricingTierRepository.getProductTiers(productId, organizationId);

      this.logger.info('Product pricing tiers retrieved', { 
        productId,
        tierCount: tiers.length 
      });

      res.json({
        success: true,
        data: tiers
      });
    } catch (error) {
      this.logger.error('Error getting product pricing tiers', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/pricing/products/:productId/tiers
   * Create pricing tier for a product
   */
  async createPricingTier(req, res, next) {
    try {
      const { productId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const tierData = {
        ...req.body,
        product_id: productId,
        organization_id: organizationId
      };

      this.logger.info('Creating pricing tier', { productId, organizationId });

      const tier = await this.pricingTierRepository.createTier(tierData);

      this.logger.info('Pricing tier created successfully', { 
        tierId: tier.pricing_tier_id,
        productId 
      });

      res.status(201).json({
        success: true,
        data: tier,
        message: 'Pricing tier created successfully'
      });
    } catch (error) {
      this.logger.error('Error creating pricing tier', { error: error.message });
      next(error);
    }
  }

  /**
   * PUT /api/pricing/tiers/:tierId
   * Update pricing tier
   */
  async updatePricingTier(req, res, next) {
    try {
      const { tierId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const updateData = req.body;

      this.logger.info('Updating pricing tier', { tierId, organizationId });

      const tier = await this.pricingTierRepository.updateTier(tierId, organizationId, updateData);

      this.logger.info('Pricing tier updated successfully', { tierId });

      res.json({
        success: true,
        data: tier,
        message: 'Pricing tier updated successfully'
      });
    } catch (error) {
      this.logger.error('Error updating pricing tier', { error: error.message });
      next(error);
    }
  }

  /**
   * DELETE /api/pricing/tiers/:tierId
   * Delete pricing tier
   */
  async deletePricingTier(req, res, next) {
    try {
      const { tierId } = req.params;
      const organizationId = req.user.currentOrganizationId;

      this.logger.info('Deleting pricing tier', { tierId, organizationId });

      await this.pricingTierRepository.deleteTier(tierId, organizationId);

      this.logger.info('Pricing tier deleted successfully', { tierId });

      res.json({
        success: true,
        message: 'Pricing tier deleted successfully'
      });
    } catch (error) {
      this.logger.error('Error deleting pricing tier', { error: error.message });
      next(error);
    }
  }

  // =================== CUSTOMER PRICING ===================

  /**
   * GET /api/pricing/customers/:clientId
   * Get customer-specific pricing
   */
  async getCustomerPricing(req, res, next) {
    try {
      const { clientId } = req.params;
      const organizationId = req.user.currentOrganizationId;

      this.logger.info('Getting customer pricing', { clientId, organizationId });

      const pricing = await this.customerPricingRepository.getClientPricing(clientId, organizationId);

      this.logger.info('Customer pricing retrieved', { 
        clientId,
        pricingCount: pricing.length 
      });

      res.json({
        success: true,
        data: pricing
      });
    } catch (error) {
      this.logger.error('Error getting customer pricing', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/pricing/customers/:clientId
   * Create customer-specific pricing
   */
  async createCustomerPricing(req, res, next) {
    try {
      const { clientId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const pricingData = {
        ...req.body,
        client_id: clientId,
        organization_id: organizationId
      };

      this.logger.info('Creating customer pricing', { clientId, organizationId });

      const pricing = await this.customerPricingRepository.createCustomerPricing(pricingData);

      this.logger.info('Customer pricing created successfully', { 
        pricingId: pricing.customer_pricing_id,
        clientId 
      });

      res.status(201).json({
        success: true,
        data: pricing,
        message: 'Customer pricing created successfully'
      });
    } catch (error) {
      this.logger.error('Error creating customer pricing', { error: error.message });
      next(error);
    }
  }

  /**
   * PUT /api/pricing/customers/:pricingId
   * Update customer pricing
   */
  async updateCustomerPricing(req, res, next) {
    try {
      const { pricingId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const updateData = req.body;

      this.logger.info('Updating customer pricing', { pricingId, organizationId });

      const pricing = await this.customerPricingRepository.updateCustomerPricing(
        pricingId,
        organizationId,
        updateData
      );

      this.logger.info('Customer pricing updated successfully', { pricingId });

      res.json({
        success: true,
        data: pricing,
        message: 'Customer pricing updated successfully'
      });
    } catch (error) {
      this.logger.error('Error updating customer pricing', { error: error.message });
      next(error);
    }
  }

  // =================== TAX RATES ===================

  /**
   * GET /api/pricing/taxes/rates
   * Get all tax rates for organization
   */
  async getTaxRates(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const options = {
        is_active: req.query.active === 'false' ? false : undefined,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      this.logger.info('Getting tax rates', { organizationId });

      const taxRates = await this.taxRateRepository.getOrganizationTaxRates(organizationId, options);

      this.logger.info('Tax rates retrieved', { 
        organizationId,
        taxRateCount: taxRates.length 
      });

      res.json({
        success: true,
        data: taxRates
      });
    } catch (error) {
      this.logger.error('Error getting tax rates', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/pricing/taxes/rates
   * Create tax rate
   */
  async createTaxRate(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const taxRateData = {
        ...req.body,
        organization_id: organizationId
      };

      this.logger.info('Creating tax rate', { 
        name: taxRateData.name,
        organizationId 
      });

      const taxRate = await this.taxRateRepository.createTaxRate(taxRateData);

      this.logger.info('Tax rate created successfully', { 
        taxRateId: taxRate.tax_rate_id,
        name: taxRateData.name 
      });

      res.status(201).json({
        success: true,
        data: taxRate,
        message: 'Tax rate created successfully'
      });
    } catch (error) {
      this.logger.error('Error creating tax rate', { error: error.message });
      next(error);
    }
  }

  /**
   * PUT /api/pricing/taxes/rates/:taxRateId
   * Update tax rate
   */
  async updateTaxRate(req, res, next) {
    try {
      const { taxRateId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const updateData = req.body;

      this.logger.info('Updating tax rate', { taxRateId, organizationId });

      const taxRate = await this.taxRateRepository.updateTaxRate(taxRateId, organizationId, updateData);

      this.logger.info('Tax rate updated successfully', { taxRateId });

      res.json({
        success: true,
        data: taxRate,
        message: 'Tax rate updated successfully'
      });
    } catch (error) {
      this.logger.error('Error updating tax rate', { error: error.message });
      next(error);
    }
  }

  // =================== DISCOUNT RULES ===================

  /**
   * GET /api/pricing/discounts/rules
   * Get all discount rules for organization
   */
  async getDiscountRules(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const options = {
        is_active: req.query.active === 'false' ? false : undefined,
        type: req.query.type,
        has_coupon: req.query.has_coupon === 'true' ? true : (req.query.has_coupon === 'false' ? false : undefined),
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      this.logger.info('Getting discount rules', { organizationId });

      const discountRules = await this.discountRuleRepository.getOrganizationDiscountRules(
        organizationId,
        options
      );

      this.logger.info('Discount rules retrieved', { 
        organizationId,
        ruleCount: discountRules.length 
      });

      res.json({
        success: true,
        data: discountRules
      });
    } catch (error) {
      this.logger.error('Error getting discount rules', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/pricing/discounts/rules
   * Create discount rule
   */
  async createDiscountRule(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const userId = req.userId;
      const discountData = {
        ...req.body,
        organization_id: organizationId,
        created_by: userId
      };

      this.logger.info('Creating discount rule', { 
        name: discountData.name,
        organizationId 
      });

      const discountRule = await this.discountRuleRepository.createDiscountRule(discountData);

      this.logger.info('Discount rule created successfully', { 
        discountRuleId: discountRule.discount_rule_id,
        name: discountData.name 
      });

      res.status(201).json({
        success: true,
        data: discountRule,
        message: 'Discount rule created successfully'
      });
    } catch (error) {
      this.logger.error('Error creating discount rule', { error: error.message });
      next(error);
    }
  }

  /**
   * PUT /api/pricing/discounts/rules/:ruleId
   * Update discount rule
   */
  async updateDiscountRule(req, res, next) {
    try {
      const { ruleId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const updateData = req.body;

      this.logger.info('Updating discount rule', { ruleId, organizationId });

      const discountRule = await this.discountRuleRepository.updateDiscountRule(
        ruleId,
        organizationId,
        updateData
      );

      this.logger.info('Discount rule updated successfully', { ruleId });

      res.json({
        success: true,
        data: discountRule,
        message: 'Discount rule updated successfully'
      });
    } catch (error) {
      this.logger.error('Error updating discount rule', { error: error.message });
      next(error);
    }
  }

  /**
   * DELETE /api/pricing/discounts/rules/:ruleId
   * Delete discount rule
   */
  async deleteDiscountRule(req, res, next) {
    try {
      const { ruleId } = req.params;
      const organizationId = req.user.currentOrganizationId;

      this.logger.info('Deleting discount rule', { ruleId, organizationId });

      await this.discountRuleRepository.deleteDiscountRule(ruleId, organizationId);

      this.logger.info('Discount rule deleted successfully', { ruleId });

      res.json({
        success: true,
        message: 'Discount rule deleted successfully'
      });
    } catch (error) {
      this.logger.error('Error deleting discount rule', { error: error.message });
      next(error);
    }
  }

  // =================== ORGANIZATION OVERVIEW ===================

  /**
   * GET /api/pricing/overview
   * Get pricing overview for organization
   */
  async getPricingOverview(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;

      this.logger.info('Getting pricing overview', { organizationId });

      // Get counts for different pricing elements
      const [pricingTiers, customerPricing, taxRates, discountRules] = await Promise.all([
        this.pricingTierRepository.getOrganizationTiers(organizationId, { limit: 1 }),
        this.customerPricingRepository.getOrganizationCustomerPricing(organizationId, { limit: 1 }),
        this.taxRateRepository.getOrganizationTaxRates(organizationId, { is_active: true }),
        this.discountRuleRepository.getOrganizationDiscountRules(organizationId, { is_active: true })
      ]);

      const overview = {
        pricing_tiers_count: pricingTiers.length,
        customer_pricing_count: customerPricing.length,
        active_tax_rates_count: taxRates.length,
        active_discount_rules_count: discountRules.length
      };

      this.logger.info('Pricing overview retrieved', { organizationId });

      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      this.logger.error('Error getting pricing overview', { error: error.message });
      next(error);
    }
  }
}

module.exports = PricingController;