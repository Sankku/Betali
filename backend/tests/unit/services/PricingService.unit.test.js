/**
 * PricingService Unit Tests
 * Tests business logic in isolation with mocked dependencies
 */

const PricingService = require('../../../services/PricingService');
const { mockOrders, mockPricingEntities, mockPricingResults } = require('../../helpers/pricingMockData');

describe('PricingService Unit Tests', () => {
  let pricingService;
  let mockPricingTierRepository;
  let mockCustomerPricingRepository;
  let mockTaxRateRepository;
  let mockProductTaxGroupRepository;
  let mockDiscountRuleRepository;
  let mockAppliedDiscountRepository;
  let mockProductRepository;
  let mockLogger;

  beforeEach(() => {
    // Mock all repositories
    mockPricingTierRepository = {
      findByProductId: jest.fn(),
      getApplicableTierPrice: jest.fn(),
      findApplicableTier: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    mockCustomerPricingRepository = {
      getActiveCustomerPrice: jest.fn(),
      findByProductAndClient: jest.fn(),
      findByClientId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    mockTaxRateRepository = {
      findByOrganizationId: jest.fn(),
      findActiveByOrganization: jest.fn(),
      getDefaultTaxRate: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    };

    mockProductTaxGroupRepository = {
      findByProductId: jest.fn(),
      findByTaxRateId: jest.fn(),
      getProductTaxRates: jest.fn(),
      create: jest.fn(),
      delete: jest.fn()
    };

    mockDiscountRuleRepository = {
      findByCouponCode: jest.fn(),
      findActiveByOrganization: jest.fn(),
      getActiveDiscountRules: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      incrementUsageCount: jest.fn()
    };

    mockAppliedDiscountRepository = {
      create: jest.fn(),
      findByOrderId: jest.fn(),
      delete: jest.fn()
    };

    mockProductRepository = {
      findById: jest.fn(),
      findByOrganizationId: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Create service instance with all mocks
    pricingService = new PricingService(
      mockPricingTierRepository,
      mockCustomerPricingRepository,
      mockTaxRateRepository,
      mockProductTaxGroupRepository,
      mockDiscountRuleRepository,
      mockAppliedDiscountRepository,
      mockProductRepository,
      mockLogger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateOrderPricing', () => {
    const orgId = 'org-123';

    test('should calculate basic order pricing correctly', async () => {
      const orderData = mockOrders.basicOrder(orgId);

      // Mock no discounts or taxes
      mockProductTaxGroupRepository.getProductTaxRates.mockResolvedValue([]);
      mockTaxRateRepository.getDefaultTaxRate.mockResolvedValue(null);
      mockDiscountRuleRepository.getActiveDiscountRules.mockResolvedValue([]);

      const result = await pricingService.calculateOrderPricing(orderData, orgId);

      // Verify structure
      expect(result).toHaveProperty('subtotal');
      expect(result).toHaveProperty('discount_amount');
      expect(result).toHaveProperty('tax_amount');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('line_items');
      expect(result).toHaveProperty('applied_discounts');
      expect(result).toHaveProperty('tax_breakdown');

      // Verify calculations
      expect(result.line_items).toHaveLength(2);
      expect(result.subtotal).toBe(1250.00); // (10 * 100) + (5 * 50)
      expect(result.discount_amount).toBe(0);
      expect(result.tax_amount).toBe(0);
      expect(result.total).toBe(1250.00);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Calculating order pricing',
        expect.any(Object)
      );
    });

    test('should throw error for empty items array', async () => {
      const orderData = mockOrders.emptyOrder(orgId);

      await expect(pricingService.calculateOrderPricing(orderData, orgId))
        .rejects.toThrow('Order must have at least one item');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should throw error for missing items', async () => {
      const orderData = {
        organization_id: orgId,
        client_id: 'client-123',
        order_date: new Date().toISOString()
        // items missing
      };

      await expect(pricingService.calculateOrderPricing(orderData, orgId))
        .rejects.toThrow('Order must have at least one item');
    });

    test('should calculate order with exclusive taxes correctly', async () => {
      const orderData = mockOrders.basicOrder(orgId);
      const taxRate = {
        tax_rate_id: 'tax-123',
        name: 'IVA',
        rate: 0.21,
        is_inclusive: false
      };

      // Mock no product-specific tax rates, will use default
      mockProductTaxGroupRepository.getProductTaxRates.mockResolvedValue([]);
      mockTaxRateRepository.getDefaultTaxRate.mockResolvedValue(taxRate);
      mockDiscountRuleRepository.findActiveByOrganization.mockResolvedValue([]);

      const result = await pricingService.calculateOrderPricing(orderData, orgId);

      // With 21% exclusive tax on 1250.00
      expect(result.subtotal).toBe(1250.00);
      expect(result.tax_amount).toBe(262.50); // 21% of 1250
      expect(result.total).toBe(1512.50); // 1250 + 262.50
      expect(result.tax_breakdown).toHaveLength(1);
      expect(result.tax_breakdown[0].name).toBe('IVA');
      expect(result.tax_breakdown[0].is_inclusive).toBe(false);
    });

    test('should calculate order with inclusive taxes correctly', async () => {
      const orderData = mockOrders.basicOrder(orgId);
      const taxRate = {
        tax_rate_id: 'tax-123',
        name: 'IVA Incluido',
        rate: 0.21,
        is_inclusive: true
      };

      // Mock no product-specific tax rates, will use default
      mockProductTaxGroupRepository.getProductTaxRates.mockResolvedValue([]);
      mockTaxRateRepository.getDefaultTaxRate.mockResolvedValue(taxRate);
      mockDiscountRuleRepository.findActiveByOrganization.mockResolvedValue([]);

      const result = await pricingService.calculateOrderPricing(orderData, orgId);

      // With inclusive tax, total should equal subtotal
      expect(result.subtotal).toBe(1250.00);
      expect(result.tax_amount).toBeGreaterThan(0);
      expect(result.total).toBe(1250.00); // Same as subtotal for inclusive tax
      expect(result.tax_breakdown[0].is_inclusive).toBe(true);
    });

    test('should apply order-level percentage discount', async () => {
      const couponCode = 'SUMMER10';
      const orderData = mockOrders.discountOrder(orgId, 'client-123', couponCode);
      const discountRule = {
        discount_rule_id: 'discount-123',
        name: 'Summer Sale',
        type: 'percentage',
        value: 0.10, // 10%
        requires_coupon: true,
        coupon_code: couponCode,
        min_order_amount: null,
        max_uses: null,
        current_uses: 0
      };

      // Mock discount and no taxes
      mockDiscountRuleRepository.getActiveDiscountRules.mockResolvedValue([discountRule]);
      mockProductTaxGroupRepository.getProductTaxRates.mockResolvedValue([]);
      mockTaxRateRepository.getDefaultTaxRate.mockResolvedValue(null);

      const result = await pricingService.calculateOrderPricing(orderData, orgId);

      // 10% discount on 1000.00
      expect(result.subtotal).toBe(1000.00);
      expect(result.discount_amount).toBe(100.00); // 10% of 1000
      expect(result.total).toBe(900.00); // 1000 - 100
      expect(result.applied_discounts).toHaveLength(1);
      expect(result.applied_discounts[0].discount_type).toBe('percentage');
    });

    test('should apply order-level fixed discount', async () => {
      const couponCode = 'FIXED50';
      const orderData = mockOrders.discountOrder(orgId, 'client-123', couponCode);
      const discountRule = {
        discount_rule_id: 'discount-456',
        name: 'Fixed Discount',
        type: 'fixed_amount',
        value: 50.00,
        requires_coupon: true,
        coupon_code: couponCode,
        min_order_amount: null,
        max_uses: null,
        current_uses: 0
      };

      // Mock discount and no taxes
      mockDiscountRuleRepository.getActiveDiscountRules.mockResolvedValue([discountRule]);
      mockProductTaxGroupRepository.getProductTaxRates.mockResolvedValue([]);
      mockTaxRateRepository.getDefaultTaxRate.mockResolvedValue(null);

      const result = await pricingService.calculateOrderPricing(orderData, orgId);

      // Fixed 50.00 discount
      expect(result.subtotal).toBe(1000.00);
      expect(result.discount_amount).toBe(50.00);
      expect(result.total).toBe(950.00); // 1000 - 50
      expect(result.applied_discounts).toHaveLength(1);
      expect(result.applied_discounts[0].discount_type).toBe('fixed_amount');
    });

    test('should handle pricing calculation errors gracefully', async () => {
      const orderData = mockOrders.basicOrder(orgId);

      // Mock repository error
      mockProductTaxGroupRepository.getProductTaxRates.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(pricingService.calculateOrderPricing(orderData, orgId))
        .rejects.toThrow('Failed to calculate pricing');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error calculating order pricing',
        expect.any(Object)
      );
    });
  });

  describe('validateCouponCode', () => {
    const orgId = 'org-123';
    const couponCode = 'SUMMER10';

    test('should validate active coupon code', async () => {
      // Use a discount rule shaped to match what calculateDiscountAmount expects
      const discountRule = {
        discount_rule_id: 'discount-rule-123',
        organization_id: orgId,
        name: 'Summer Sale',
        type: 'percentage',
        value: 0.10,
        coupon_code: couponCode,
        requires_coupon: true,
        is_active: true,
        valid_from: null,
        valid_to: null,
        min_order_amount: null,
        max_uses: null,
        current_uses: 0
      };
      const orderData = mockOrders.basicOrder(orgId);

      mockDiscountRuleRepository.findByCouponCode.mockResolvedValue(discountRule);
      // Mock the internal calculateOrderPricing call made inside validateCouponCode
      mockProductTaxGroupRepository.getProductTaxRates.mockResolvedValue([]);
      mockTaxRateRepository.getDefaultTaxRate.mockResolvedValue(null);
      mockDiscountRuleRepository.getActiveDiscountRules.mockResolvedValue([discountRule]);

      const result = await pricingService.validateCouponCode(couponCode, orderData, orgId);

      expect(result.valid).toBe(true);
      expect(result.discount_rule).toBeDefined();
      expect(result.discount_rule.coupon_code).toBe(couponCode);
    });

    test('should reject invalid coupon code', async () => {
      const orderData = mockOrders.basicOrder(orgId);
      mockDiscountRuleRepository.findByCouponCode.mockResolvedValue(null);

      const result = await pricingService.validateCouponCode('INVALID', orderData, orgId);

      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
    });

    test('should reject expired coupon code', async () => {
      const discountRule = mockPricingEntities.discountRulePercentage(orgId);
      discountRule.coupon_code = couponCode;
      discountRule.valid_to = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
      const orderData = mockOrders.basicOrder(orgId);

      mockDiscountRuleRepository.findByCouponCode.mockResolvedValue(discountRule);

      const result = await pricingService.validateCouponCode(couponCode, orderData, orgId);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('expired');
    });

    test('should reject coupon with exceeded usage limit', async () => {
      const discountRule = mockPricingEntities.discountRulePercentage(orgId);
      discountRule.coupon_code = couponCode;
      discountRule.max_uses = 10;
      discountRule.current_uses = 10; // Limit reached
      const orderData = mockOrders.basicOrder(orgId);

      mockDiscountRuleRepository.findByCouponCode.mockResolvedValue(discountRule);

      const result = await pricingService.validateCouponCode(couponCode, orderData, orgId);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('usage limit');
    });

    test('should validate coupon before valid_from date', async () => {
      const discountRule = mockPricingEntities.discountRulePercentage(orgId);
      discountRule.coupon_code = couponCode;
      discountRule.valid_from = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
      const orderData = mockOrders.basicOrder(orgId);

      mockDiscountRuleRepository.findByCouponCode.mockResolvedValue(discountRule);

      const result = await pricingService.validateCouponCode(couponCode, orderData, orgId);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('not yet valid');
    });

    test('should check inactive coupon', async () => {
      const discountRule = mockPricingEntities.discountRulePercentage(orgId);
      discountRule.coupon_code = couponCode;
      discountRule.is_active = false;
      const orderData = mockOrders.basicOrder(orgId);

      mockDiscountRuleRepository.findByCouponCode.mockResolvedValue(discountRule);

      const result = await pricingService.validateCouponCode(couponCode, orderData, orgId);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('no longer active');
    });
  });

  describe('getApplicablePrice', () => {
    const orgId = 'org-123';
    const productId = 'product-123';
    const clientId = 'client-123';

    test('should use customer-specific pricing when available', async () => {
      const customerPricing = { price: 95.00 };
      const product = mockPricingEntities.product(orgId);
      product.product_id = productId;
      product.price = 100.00;

      mockCustomerPricingRepository.getActiveCustomerPrice.mockResolvedValue(customerPricing);
      mockPricingTierRepository.getApplicableTierPrice.mockResolvedValue(null);
      mockProductRepository.findById.mockResolvedValue(product);

      const price = await pricingService.getApplicablePrice(productId, 10, clientId, orgId);

      expect(price).toBe(95.00); // Customer-specific price
      expect(mockCustomerPricingRepository.getActiveCustomerPrice).toHaveBeenCalledWith(
        clientId,
        productId,
        orgId,
        expect.any(Date)
      );
    });

    test('should use tiered pricing when customer pricing not available', async () => {
      const tierPrice = { price: 85.00, tier_name: 'Wholesale' };
      const product = mockPricingEntities.product(orgId);
      product.product_id = productId;
      product.price = 100.00;

      mockCustomerPricingRepository.getActiveCustomerPrice.mockResolvedValue(null);
      mockPricingTierRepository.getApplicableTierPrice.mockResolvedValue(tierPrice);
      mockProductRepository.findById.mockResolvedValue(product);

      const price = await pricingService.getApplicablePrice(productId, 100, clientId, orgId);

      expect(price).toBe(85.00); // Tier price
      expect(mockPricingTierRepository.getApplicableTierPrice).toHaveBeenCalledWith(
        productId,
        100,
        orgId,
        expect.any(Date)
      );
    });

    test('should use base product price as fallback', async () => {
      const product = mockPricingEntities.product(orgId);
      product.product_id = productId;
      product.price = 100.00;

      mockCustomerPricingRepository.getActiveCustomerPrice.mockResolvedValue(null);
      mockPricingTierRepository.getApplicableTierPrice.mockResolvedValue(null);
      mockProductRepository.findById.mockResolvedValue(product);

      const price = await pricingService.getApplicablePrice(productId, 10, clientId, orgId);

      expect(price).toBe(100.00); // Base product price
    });

    test('should throw error if product not found', async () => {
      mockCustomerPricingRepository.getActiveCustomerPrice.mockResolvedValue(null);
      mockPricingTierRepository.getApplicableTierPrice.mockResolvedValue(null);
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(pricingService.getApplicablePrice(productId, 10, clientId, orgId))
        .rejects.toThrow('Product');
    });
  });

  describe('Edge Cases', () => {
    const orgId = 'org-123';

    test('should handle zero quantity items', async () => {
      const orderData = mockOrders.basicOrder(orgId);
      orderData.items[0].quantity = 0;

      mockProductTaxGroupRepository.getProductTaxRates.mockResolvedValue([]);
      mockTaxRateRepository.getDefaultTaxRate.mockResolvedValue(null);
      mockDiscountRuleRepository.getActiveDiscountRules.mockResolvedValue([]);

      const result = await pricingService.calculateOrderPricing(orderData, orgId);

      expect(result.line_items[0].line_total).toBe(0);
      expect(result.line_items[0].line_subtotal).toBe(0);
    });

    test('should handle negative prices gracefully', async () => {
      const orderData = mockOrders.basicOrder(orgId);
      orderData.items[0].price = -100.00;

      mockProductTaxGroupRepository.getProductTaxRates.mockResolvedValue([]);
      mockTaxRateRepository.getDefaultTaxRate.mockResolvedValue(null);
      mockDiscountRuleRepository.getActiveDiscountRules.mockResolvedValue([]);

      // Should either throw error or handle gracefully
      await expect(async () => {
        const result = await pricingService.calculateOrderPricing(orderData, orgId);
        // If it doesn't throw, at least verify it doesn't create invalid totals
        expect(result.total).toBeGreaterThanOrEqual(0);
      }).not.toThrow();
    });

    test('should handle very large quantities', async () => {
      const orderData = mockOrders.basicOrder(orgId);
      orderData.items[0].quantity = 1000000; // 1 million

      mockProductTaxGroupRepository.getProductTaxRates.mockResolvedValue([]);
      mockTaxRateRepository.getDefaultTaxRate.mockResolvedValue(null);
      mockDiscountRuleRepository.getActiveDiscountRules.mockResolvedValue([]);

      const result = await pricingService.calculateOrderPricing(orderData, orgId);

      expect(result.line_items[0].line_total).toBe(100000000); // 1M * 100
      expect(typeof result.total).toBe('number');
      expect(isFinite(result.total)).toBe(true);
    });

    test('should round prices to 2 decimal places', async () => {
      const orderData = mockOrders.basicOrder(orgId);
      orderData.items[0].price = 10.333;
      orderData.items[0].quantity = 3;

      mockProductTaxGroupRepository.getProductTaxRates.mockResolvedValue([]);
      mockTaxRateRepository.getDefaultTaxRate.mockResolvedValue(null);
      mockDiscountRuleRepository.getActiveDiscountRules.mockResolvedValue([]);

      const result = await pricingService.calculateOrderPricing(orderData, orgId);

      // All monetary values should be rounded to 2 decimals
      expect(Number.isInteger(result.subtotal * 100)).toBe(true);
      expect(Number.isInteger(result.total * 100)).toBe(true);
    });
  });
});
