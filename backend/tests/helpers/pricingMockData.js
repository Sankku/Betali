/**
 * Mock Data Generators for Pricing System Tests
 * Provides consistent test data for pricing-related tests
 */

const { randomUUID } = require('crypto');

/**
 * Generate mock order data for pricing calculations
 */
const mockOrders = {
  /**
   * Basic order with simple items
   */
  basicOrder: (organizationId = randomUUID(), clientId = randomUUID()) => ({
    organization_id: organizationId,
    client_id: clientId,
    order_date: new Date().toISOString(),
    items: [
      {
        product_id: randomUUID(),
        quantity: 10,
        price: 100.00
      },
      {
        product_id: randomUUID(),
        quantity: 5,
        price: 50.00
      }
    ]
  }),

  /**
   * Order with high quantity (for tiered pricing tests)
   */
  tieredPricingOrder: (organizationId = randomUUID(), clientId = randomUUID()) => ({
    organization_id: organizationId,
    client_id: clientId,
    order_date: new Date().toISOString(),
    items: [
      {
        product_id: randomUUID(),
        quantity: 100, // High quantity to trigger tier pricing
        price: 100.00
      }
    ]
  }),

  /**
   * Order with customer-specific pricing
   */
  customerPricingOrder: (organizationId = randomUUID(), clientId = randomUUID(), productId = randomUUID()) => ({
    organization_id: organizationId,
    client_id: clientId,
    order_date: new Date().toISOString(),
    items: [
      {
        product_id: productId,
        quantity: 10
        // No price specified - should use customer pricing
      }
    ]
  }),

  /**
   * Order with taxable items
   */
  taxableOrder: (organizationId = randomUUID(), clientId = randomUUID()) => ({
    organization_id: organizationId,
    client_id: clientId,
    order_date: new Date().toISOString(),
    items: [
      {
        product_id: randomUUID(),
        quantity: 10,
        price: 100.00
      }
    ]
  }),

  /**
   * Order with discount code
   */
  discountOrder: (organizationId = randomUUID(), clientId = randomUUID(), couponCode = 'DISCOUNT10') => ({
    organization_id: organizationId,
    client_id: clientId,
    order_date: new Date().toISOString(),
    coupon_code: couponCode,
    items: [
      {
        product_id: randomUUID(),
        quantity: 10,
        price: 100.00
      }
    ]
  }),

  /**
   * Empty order (for validation tests)
   */
  emptyOrder: (organizationId = randomUUID(), clientId = randomUUID()) => ({
    organization_id: organizationId,
    client_id: clientId,
    order_date: new Date().toISOString(),
    items: []
  })
};

/**
 * Generate mock pricing entities
 */
const mockPricingEntities = {
  /**
   * Pricing tier for quantity-based discounts
   */
  pricingTier: (productId = randomUUID(), organizationId = randomUUID()) => ({
    pricing_tier_id: randomUUID(),
    product_id: productId,
    organization_id: organizationId,
    tier_name: 'Wholesale',
    min_quantity: 50,
    max_quantity: null,
    price: 85.00,
    is_active: true,
    priority: 1,
    created_at: new Date().toISOString()
  }),

  /**
   * Customer-specific pricing
   */
  customerPricing: (productId = randomUUID(), clientId = randomUUID(), organizationId = randomUUID()) => ({
    customer_pricing_id: randomUUID(),
    product_id: productId,
    client_id: clientId,
    organization_id: organizationId,
    custom_price: 95.00,
    valid_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    is_active: true,
    created_at: new Date().toISOString()
  }),

  /**
   * Tax rate configuration
   */
  taxRate: (organizationId = randomUUID()) => ({
    tax_rate_id: randomUUID(),
    organization_id: organizationId,
    tax_name: 'IVA',
    tax_rate: 21.00,
    is_inclusive: false,
    is_active: true,
    created_at: new Date().toISOString()
  }),

  /**
   * Inclusive tax rate (tax already included in price)
   */
  inclusiveTaxRate: (organizationId = randomUUID()) => ({
    tax_rate_id: randomUUID(),
    organization_id: organizationId,
    tax_name: 'IVA Incluido',
    tax_rate: 21.00,
    is_inclusive: true,
    is_active: true,
    created_at: new Date().toISOString()
  }),

  /**
   * Product tax group mapping
   */
  productTaxGroup: (productId = randomUUID(), taxRateId = randomUUID(), organizationId = randomUUID()) => ({
    product_tax_group_id: randomUUID(),
    product_id: productId,
    tax_rate_id: taxRateId,
    organization_id: organizationId,
    is_active: true,
    created_at: new Date().toISOString()
  }),

  /**
   * Discount rule (percentage-based)
   */
  discountRulePercentage: (organizationId = randomUUID()) => ({
    discount_rule_id: randomUUID(),
    organization_id: organizationId,
    rule_name: 'Summer Sale',
    discount_type: 'percentage',
    discount_value: 10.00,
    applies_to: 'order',
    min_order_value: 100.00,
    coupon_code: 'SUMMER10',
    is_active: true,
    valid_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    usage_limit: 100,
    times_used: 5,
    created_at: new Date().toISOString()
  }),

  /**
   * Discount rule (fixed amount)
   */
  discountRuleFixed: (organizationId = randomUUID()) => ({
    discount_rule_id: randomUUID(),
    organization_id: organizationId,
    rule_name: 'Fixed Discount',
    discount_type: 'fixed_amount',
    discount_value: 50.00,
    applies_to: 'order',
    min_order_value: 500.00,
    coupon_code: 'FIXED50',
    is_active: true,
    valid_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    usage_limit: null,
    times_used: 0,
    created_at: new Date().toISOString()
  }),

  /**
   * Applied discount record
   */
  appliedDiscount: (orderId = randomUUID(), discountRuleId = randomUUID()) => ({
    applied_discount_id: randomUUID(),
    order_id: orderId,
    discount_rule_id: discountRuleId,
    discount_amount: 100.00,
    applied_at: new Date().toISOString()
  }),

  /**
   * Mock product data
   */
  product: (organizationId = randomUUID()) => ({
    product_id: randomUUID(),
    organization_id: organizationId,
    name: 'Test Product',
    description: 'Test product for pricing',
    batch_number: `BATCH-${Date.now()}`,
    price: 100.00,
    is_active: true,
    created_at: new Date().toISOString()
  })
};

/**
 * Expected pricing calculation results
 */
const mockPricingResults = {
  /**
   * Basic order pricing result
   */
  basicOrderResult: () => ({
    subtotal: 1250.00, // (10 * 100) + (5 * 50)
    discount_amount: 0,
    tax_amount: 0,
    total: 1250.00,
    line_items: [
      {
        product_id: expect.any(String),
        quantity: 10,
        unit_price: 100.00,
        line_total: 1000.00,
        discount_amount: 0,
        line_subtotal: 1000.00,
        applied_discounts: []
      },
      {
        product_id: expect.any(String),
        quantity: 5,
        unit_price: 50.00,
        line_total: 250.00,
        discount_amount: 0,
        line_subtotal: 250.00,
        applied_discounts: []
      }
    ],
    applied_discounts: [],
    tax_breakdown: []
  }),

  /**
   * Order with 21% exclusive tax
   */
  orderWithExclusiveTax: () => ({
    subtotal: 1000.00,
    discount_amount: 0,
    tax_amount: 210.00, // 21% of 1000
    total: 1210.00, // 1000 + 210
    applied_discounts: [],
    tax_breakdown: [
      {
        tax_name: 'IVA',
        tax_rate: 21.00,
        tax_amount: 210.00,
        is_inclusive: false
      }
    ]
  }),

  /**
   * Order with 21% inclusive tax
   */
  orderWithInclusiveTax: () => ({
    subtotal: 1000.00,
    discount_amount: 0,
    tax_amount: 173.55, // Tax included in price
    total: 1000.00, // Same as subtotal for inclusive tax
    applied_discounts: [],
    tax_breakdown: [
      {
        tax_name: 'IVA Incluido',
        tax_rate: 21.00,
        tax_amount: 173.55,
        is_inclusive: true
      }
    ]
  }),

  /**
   * Order with 10% discount
   */
  orderWithPercentageDiscount: () => ({
    subtotal: 1000.00,
    discount_amount: 100.00, // 10% of 1000
    tax_amount: 0,
    total: 900.00,
    applied_discounts: [
      {
        discount_rule_id: expect.any(String),
        rule_name: 'Summer Sale',
        discount_type: 'percentage',
        discount_value: 10.00,
        discount_amount: 100.00
      }
    ],
    tax_breakdown: []
  })
};

module.exports = {
  mockOrders,
  mockPricingEntities,
  mockPricingResults
};
