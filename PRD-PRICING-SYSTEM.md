# PRD: Advanced Pricing & Tax Management System

> **Product**: Betali Inventory Management SaaS  
> **Feature**: Advanced Pricing & Tax Management  
> **Priority**: P0 (Critical for Sales Orders)  
> **Status**: In Development  
> **Target Release**: Current Sprint  

## 📋 Executive Summary

The Advanced Pricing & Tax Management System enables businesses to configure sophisticated pricing strategies, automatic tax calculations, and flexible discount structures. This system transforms the basic order management into a comprehensive sales platform.

**Impact**: Enables businesses to implement complex pricing strategies, comply with tax regulations, and offer competitive pricing while maintaining profitability.

## 🎯 Problem Statement

### Current State
- ✅ Basic product pricing (single price per product)
- ✅ Simple order calculations
- ❌ **No dynamic pricing strategies**
- ❌ **No automatic tax calculations**
- ❌ **No discount management**
- ❌ **No customer-specific pricing**
- ❌ **No quantity-based pricing tiers**

### Pain Points
1. **Limited Pricing Flexibility**: Cannot offer volume discounts or customer-specific rates
2. **Manual Tax Calculations**: Prone to errors and compliance issues
3. **No Promotional Pricing**: Cannot run sales, discounts, or special offers
4. **Single Price Point**: Cannot compete on pricing strategies

## 🎯 Goals & Success Metrics

### Primary Goals
- Enable dynamic pricing strategies (volume, customer, time-based)
- Automate tax calculations with configurable rates
- Provide comprehensive discount management
- Support multi-currency pricing (future)

### Success Metrics
- **Pricing Flexibility**: Support 5+ pricing strategies per product
- **Tax Accuracy**: 100% accurate tax calculations
- **Discount Usage**: 30% of orders use some form of discount
- **Revenue Impact**: 15% increase in average order value

## 📋 Detailed Requirements

### 🔧 Functional Requirements

#### 1. Product Pricing Management
- **Base Pricing**: Standard product prices
- **Tiered Pricing**: Quantity-based price breaks
- **Customer Pricing**: Specific prices per customer/group
- **Date-Based Pricing**: Seasonal/promotional pricing
- **Cost-Plus Pricing**: Markup-based pricing

#### 2. Tax Management
- **Tax Rates**: Configurable tax rates per organization
- **Tax Groups**: Different rates for different product types
- **Geographic Tax**: Location-based tax calculations
- **Tax-Inclusive/Exclusive**: Toggle tax calculation methods
- **Tax Reporting**: Tax collection summaries

#### 3. Discount System
- **Percentage Discounts**: % off line items or total
- **Fixed Amount Discounts**: $ off line items or total
- **Buy X Get Y**: Volume-based promotional discounts
- **Coupon Codes**: Promotional code system
- **Customer Discounts**: Loyalty-based discounts

#### 4. Pricing Rules Engine
- **Rule Priority**: Determine which pricing rule applies
- **Date Ranges**: Time-limited pricing
- **Customer Groups**: Group-based pricing
- **Minimum Quantities**: Quantity thresholds
- **Exclusions**: Products/customers excluded from rules

### 🗄️ Database Schema

```sql
-- Pricing tiers table
CREATE TABLE pricing_tiers (
  pricing_tier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(organization_id),
  product_id UUID REFERENCES products(product_id),
  tier_name VARCHAR(100) NOT NULL,
  min_quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  max_quantity DECIMAL(10,3) NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP DEFAULT now(),
  valid_to TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Customer pricing table
CREATE TABLE customer_pricing (
  customer_pricing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(organization_id),
  client_id UUID REFERENCES clients(client_id),
  product_id UUID REFERENCES products(product_id),
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP DEFAULT now(),
  valid_to TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Tax rates table
CREATE TABLE tax_rates (
  tax_rate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(organization_id),
  name VARCHAR(100) NOT NULL,
  rate DECIMAL(5,4) NOT NULL, -- e.g., 0.1650 for 16.5%
  is_inclusive BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Product tax groups
CREATE TABLE product_tax_groups (
  product_tax_group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(organization_id),
  product_id UUID REFERENCES products(product_id),
  tax_rate_id UUID REFERENCES tax_rates(tax_rate_id),
  created_at TIMESTAMP DEFAULT now()
);

-- Discount rules table
CREATE TABLE discount_rules (
  discount_rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(organization_id),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed_amount', 'buy_x_get_y'
  value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) NULL,
  max_discount_amount DECIMAL(10,2) NULL,
  coupon_code VARCHAR(50) NULL,
  max_uses INTEGER NULL,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP DEFAULT now(),
  valid_to TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Applied discounts (for audit trail)
CREATE TABLE applied_discounts (
  applied_discount_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(organization_id),
  order_id UUID REFERENCES orders(order_id),
  discount_rule_id UUID REFERENCES discount_rules(discount_rule_id),
  discount_amount DECIMAL(10,2) NOT NULL,
  applied_at TIMESTAMP DEFAULT now()
);
```

### 🔗 API Endpoints

```typescript
// Pricing Management
GET    /api/pricing/products/:productId/tiers    // Get pricing tiers
POST   /api/pricing/products/:productId/tiers    // Create pricing tier
PUT    /api/pricing/tiers/:tierId               // Update pricing tier
DELETE /api/pricing/tiers/:tierId               // Delete pricing tier

// Customer Pricing
GET    /api/pricing/customers/:clientId         // Get customer pricing
POST   /api/pricing/customers/:clientId         // Create customer pricing
PUT    /api/pricing/customers/:pricingId        // Update customer pricing

// Tax Management
GET    /api/taxes/rates                         // Get tax rates
POST   /api/taxes/rates                         // Create tax rate
PUT    /api/taxes/rates/:taxId                  // Update tax rate
POST   /api/taxes/products/:productId/assign    // Assign tax to product

// Discount Management
GET    /api/discounts/rules                     // Get discount rules
POST   /api/discounts/rules                     // Create discount rule
PUT    /api/discounts/rules/:ruleId             // Update discount rule
POST   /api/discounts/validate                  // Validate coupon code

// Pricing Calculation
POST   /api/pricing/calculate                   // Calculate order pricing
```

## 🎯 Implementation Plan

### Phase 1: Core Pricing Engine (Week 1)
**Backend Foundation**
- Database schema creation
- Basic pricing service
- Tiered pricing implementation
- Price calculation logic

**Deliverables:**
- Volume-based pricing tiers
- Price calculation API
- Basic tax calculations

### Phase 2: Tax Management (Week 1)
**Tax System**
- Tax rates configuration
- Product tax group assignments
- Tax-inclusive vs exclusive calculations
- Geographic tax support (basic)

**Deliverables:**
- Configurable tax rates
- Automatic tax calculations
- Tax reporting foundations

### Phase 3: Discount System (Week 2)
**Discount Engine**
- Discount rules creation
- Coupon code system
- Order-level and line-level discounts
- Usage tracking and limits

**Deliverables:**
- Flexible discount system
- Promotional code management
- Discount analytics

### Phase 4: Advanced Features (Week 2)
**Customer & Date-Based Pricing**
- Customer-specific pricing
- Date-range pricing rules
- Pricing rule priorities
- Advanced calculations

**Deliverables:**
- Customer pricing management
- Seasonal pricing support
- Complex pricing scenarios

### Phase 5: Frontend Integration (Week 3)
**Admin Interface**
- Pricing management UI
- Tax configuration interface
- Discount management dashboard
- Order pricing display updates

**Deliverables:**
- Complete pricing admin UI
- Enhanced order interface
- Price calculation previews

## 🧪 Testing Strategy

### Unit Testing
- Price calculation algorithms
- Tax calculation accuracy
- Discount application logic
- Rule priority resolution

### Integration Testing
- Order pricing integration
- Tax compliance scenarios
- Multi-discount combinations
- Customer pricing workflows

### Business Logic Testing
- Complex pricing scenarios
- Edge cases (zero prices, high quantities)
- Date-based pricing transitions
- Tax rate changes

## 📊 Pricing Calculation Flow

```javascript
// Pricing calculation workflow
const calculateOrderPricing = async (orderData) => {
  let lineItems = [];
  
  for (const item of orderData.items) {
    // 1. Get applicable price
    const price = await getApplicablePrice(
      item.product_id, 
      item.quantity, 
      orderData.client_id,
      orderData.order_date
    );
    
    // 2. Calculate line total
    const lineTotal = price * item.quantity;
    
    // 3. Apply line-level discounts
    const lineDiscount = await calculateLineDiscounts(item, lineTotal);
    
    lineItems.push({
      ...item,
      unit_price: price,
      line_total: lineTotal,
      line_discount: lineDiscount,
      line_subtotal: lineTotal - lineDiscount
    });
  }
  
  // 4. Calculate order subtotal
  const subtotal = lineItems.reduce((sum, item) => sum + item.line_subtotal, 0);
  
  // 5. Apply order-level discounts
  const orderDiscount = await calculateOrderDiscounts(orderData, subtotal);
  
  // 6. Calculate tax
  const taxableAmount = subtotal - orderDiscount;
  const taxAmount = await calculateTax(lineItems, taxableAmount);
  
  // 7. Calculate final total
  const total = taxableAmount + taxAmount;
  
  return {
    line_items: lineItems,
    subtotal,
    order_discount: orderDiscount,
    tax_amount: taxAmount,
    total
  };
};
```

## 🔒 Security & Permissions

### Access Control
- **Pricing Manager**: Can configure all pricing rules
- **Sales Manager**: Can view pricing, apply discounts
- **Employee**: Can view applicable prices only
- **Viewer**: Read-only access to pricing information

### Data Security
- Price change audit logs
- Discount usage tracking
- Tax calculation verification
- Customer pricing confidentiality

## 🎉 Success Criteria

### MVP Requirements
- [ ] Tiered pricing based on quantity
- [ ] Configurable tax rates and calculations
- [ ] Basic discount system (percentage and fixed)
- [ ] Customer-specific pricing
- [ ] Integration with existing order system
- [ ] Pricing management interface
- [ ] Tax reporting foundations

### Advanced Features (Future)
- [ ] Geographic tax calculations
- [ ] Multi-currency support
- [ ] Advanced promotional rules
- [ ] Pricing analytics and insights
- [ ] API for external pricing systems

---

**Next Steps**: Begin implementation with database schema creation and core pricing service development.