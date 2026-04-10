---
tags: [arquitectura, saas, multi-tenant]
project: betali
type: spec
created: 2026-04-09
updated: 2026-04-09
---
# PRD: Pricing & Tax Management System

> **Product**: Betali Inventory Management SaaS  
> **Feature**: Pricing & Tax Management  
> **Priority**: P1 (Essential for Revenue Operations)  
> **Status**: ✅ Implemented (Production)
> **Implemented**: 2026-03-20

## 📋 Executive Summary

The Pricing & Tax Management System enables Betali to handle complex pricing structures, tax calculations, and revenue management. This system is essential for businesses to properly price their products, manage tax compliance, and generate accurate financial reporting.

**Business Impact**: Enables proper revenue recognition, tax compliance, and flexible pricing strategies that are essential for any business using the platform for actual sales transactions.

## 🎯 Problem Statement

### Current State
- ✅ Product management (basic product information)
- ✅ Customer management (client information)
- ❌ **No pricing system for products**
- ❌ **No tax calculation capabilities**
- ❌ **No discount/promotion management**
- ❌ **No currency support**
- ❌ **No pricing history or tracking**

### Pain Points
1. **Manual Pricing**: No systematic way to set and manage product prices
2. **Tax Compliance**: No automated tax calculations for different regions/products
3. **Pricing Flexibility**: Cannot handle complex pricing scenarios (bulk discounts, customer-specific pricing)
4. **Financial Accuracy**: No proper cost tracking for profitability analysis
5. **Multi-Currency**: Cannot handle international business transactions

## 🎯 Goals & Success Metrics

### Primary Goals
- Implement flexible pricing system for products and services
- Automate tax calculations based on business rules
- Support multiple pricing strategies and discount structures
- Enable accurate financial reporting and profitability analysis

### Success Metrics
- **Pricing Coverage**: 95% of products have assigned prices within 30 days
- **Tax Accuracy**: <1% variance in automated tax calculations vs manual verification
- **Feature Adoption**: 80% of organizations use advanced pricing features within 60 days
- **Revenue Impact**: 20% improvement in pricing optimization through analytics

## 👥 Target Users

### Primary Users
1. **Business Owners**: Set pricing strategy and monitor profitability
2. **Sales Managers**: Apply discounts and manage customer-specific pricing
3. **Accountants**: Manage tax settings and financial compliance
4. **Finance Teams**: Monitor revenue and profitability metrics

### User Personas
- **Elena (Business Owner)**: Needs flexible pricing and profit visibility
- **Marco (Sales Manager)**: Requires quick discount application and pricing tools
- **Sofia (Accountant)**: Handles tax compliance and financial reporting

## 📋 Detailed Requirements

### 🔧 Functional Requirements

#### 1. Product Pricing Management
- **Base Pricing**: Set standard selling prices for all products
- **Cost Tracking**: Track purchase costs and calculate margins
- **Price Lists**: Create multiple price lists for different customer segments
- **Bulk Pricing**: Set quantity-based pricing tiers
- **Seasonal Pricing**: Time-based pricing adjustments
- **Price History**: Track price changes over time with audit trail

#### 2. Tax Management System
- **Tax Rates**: Configure tax rates by region, product type, customer type
- **Tax Categories**: Assign products to tax categories (exempt, standard, reduced)
- **Multi-Jurisdiction**: Support for multiple tax jurisdictions
- **Tax-Inclusive/Exclusive**: Handle both tax-inclusive and tax-exclusive pricing
- **Tax Reporting**: Generate tax reports for compliance purposes

#### 3. Discount & Promotion System
- **Fixed Amount Discounts**: Apply fixed dollar/currency discounts
- **Percentage Discounts**: Apply percentage-based discounts
- **Quantity Discounts**: Automatic discounts based on order quantity
- **Customer Discounts**: Customer-specific discount rates
- **Promotional Codes**: Create and manage promotional discount codes
- **Time-Limited Promotions**: Promotions with start/end dates

#### 4. Currency & International Support
- **Multi-Currency**: Support multiple currencies for international business
- **Exchange Rates**: Manual or automated exchange rate updates
- **Currency Conversion**: Real-time currency conversion in quotes/orders
- **Regional Pricing**: Different pricing for different geographic regions

#### 5. Profitability Analysis
- **Margin Calculations**: Calculate gross margins per product/order
- **Cost Analysis**: Track all costs (purchase, overhead, shipping)
- **Profitability Reports**: Product and customer profitability analysis
- **Price Optimization**: Suggestions for optimal pricing based on costs and margins

### 🎨 User Experience Requirements

#### 1. Pricing Configuration Interface
- **Product Pricing**: Simple interface to set and update product prices
- **Bulk Price Updates**: Excel-like interface for bulk price changes
- **Price List Management**: Create and manage multiple price lists
- **Visual Margin Indicators**: Quick visual feedback on margins

#### 2. Tax Configuration Dashboard
- **Tax Rate Setup**: Simple interface to configure tax rates
- **Tax Category Assignment**: Easy assignment of products to tax categories
- **Tax Preview**: Preview tax calculations before saving
- **Compliance Dashboard**: Overview of tax compliance status

#### 3. Order/Quote Integration
- **Real-time Calculations**: Instant price and tax calculations during order entry
- **Discount Application**: Quick discount application with approval workflows
- **Price Override**: Ability to override prices with proper permissions
- **Multi-Currency Display**: Show prices in customer's preferred currency

### 🔗 Integration Requirements

#### 1. Database Schema
```sql
-- Product pricing
product_pricing {
  pricing_id: uuid PRIMARY KEY
  organization_id: uuid REFERENCES organizations(organization_id)
  product_id: uuid REFERENCES products(product_id)
  price_list_id: uuid NULL REFERENCES price_lists(price_list_id)
  
  -- Pricing details
  currency: string DEFAULT 'USD'
  cost_price: decimal(10,4) NULL -- Purchase cost
  selling_price: decimal(10,4) NOT NULL
  markup_percentage: decimal(5,2) NULL
  margin_percentage: decimal(5,2) NULL
  
  -- Validity
  effective_from: timestamp DEFAULT now()
  effective_to: timestamp NULL
  is_active: boolean DEFAULT true
  
  created_at: timestamp DEFAULT now()
  updated_at: timestamp DEFAULT now()
}

-- Price lists for customer segments
price_lists {
  price_list_id: uuid PRIMARY KEY
  organization_id: uuid REFERENCES organizations(organization_id)
  
  name: string NOT NULL
  description: text NULL
  currency: string DEFAULT 'USD'
  
  -- Applicability
  customer_type: string NULL -- 'retail', 'wholesale', 'vip'
  minimum_quantity: decimal(10,3) DEFAULT 1
  
  -- Status
  is_default: boolean DEFAULT false
  is_active: boolean DEFAULT true
  
  created_at: timestamp DEFAULT now()
  updated_at: timestamp DEFAULT now()
}

-- Tax configuration
tax_rates {
  tax_rate_id: uuid PRIMARY KEY
  organization_id: uuid REFERENCES organizations(organization_id)
  
  name: string NOT NULL -- 'IVA', 'Sales Tax', etc.
  rate_percentage: decimal(5,4) NOT NULL
  tax_type: string NOT NULL -- 'sales', 'vat', 'gst'
  
  -- Applicability
  region: string NULL -- 'US', 'AR', 'CA'
  product_category: string NULL
  customer_type: string NULL
  
  -- Status
  is_active: boolean DEFAULT true
  effective_from: timestamp DEFAULT now()
  effective_to: timestamp NULL
  
  created_at: timestamp DEFAULT now()
}

-- Product tax categories
product_tax_categories {
  category_id: uuid PRIMARY KEY
  organization_id: uuid REFERENCES organizations(organization_id)
  
  name: string NOT NULL -- 'Taxable', 'Exempt', 'Reduced'
  description: text NULL
  default_tax_rate_id: uuid NULL REFERENCES tax_rates(tax_rate_id)
  
  created_at: timestamp DEFAULT now()
}

-- Discount rules
discount_rules {
  discount_id: uuid PRIMARY KEY
  organization_id: uuid REFERENCES organizations(organization_id)
  
  name: string NOT NULL
  description: text NULL
  discount_type: string NOT NULL -- 'percentage', 'fixed', 'quantity'
  
  -- Discount values
  discount_value: decimal(10,4) NOT NULL
  minimum_quantity: decimal(10,3) DEFAULT 1
  minimum_amount: decimal(10,2) DEFAULT 0
  
  -- Applicability
  applies_to: string NOT NULL -- 'all', 'product', 'category', 'customer'
  product_ids: uuid[] NULL
  customer_ids: uuid[] NULL
  
  -- Validity
  start_date: timestamp NULL
  end_date: timestamp NULL
  is_active: boolean DEFAULT true
  
  created_at: timestamp DEFAULT now()
  updated_at: timestamp DEFAULT now()
}

-- Currency exchange rates
exchange_rates {
  rate_id: uuid PRIMARY KEY
  organization_id: uuid REFERENCES organizations(organization_id)
  
  from_currency: string NOT NULL
  to_currency: string NOT NULL
  exchange_rate: decimal(10,6) NOT NULL
  
  -- Metadata
  rate_date: timestamp DEFAULT now()
  source: string DEFAULT 'manual' -- 'manual', 'api', 'bank'
  
  created_at: timestamp DEFAULT now()
}
```

#### 2. API Endpoints
```typescript
// Product Pricing
GET /api/products/:id/pricing        // Get product pricing
PUT /api/products/:id/pricing        // Update product pricing
GET /api/products/:id/price-history  // Get pricing history

// Price Lists
GET /api/price-lists                 // List all price lists
POST /api/price-lists                // Create price list
PUT /api/price-lists/:id             // Update price list
DELETE /api/price-lists/:id          // Delete price list
GET /api/price-lists/:id/products    // Get products in price list

// Tax Management
GET /api/tax-rates                   // List tax rates
POST /api/tax-rates                  // Create tax rate
PUT /api/tax-rates/:id               // Update tax rate
DELETE /api/tax-rates/:id            // Delete tax rate

// Tax Categories
GET /api/tax-categories              // List tax categories
POST /api/tax-categories             // Create tax category
PUT /api/tax-categories/:id          // Update tax category

// Discounts
GET /api/discounts                   // List discount rules
POST /api/discounts                  // Create discount rule
PUT /api/discounts/:id               // Update discount rule
DELETE /api/discounts/:id            // Delete discount rule

// Calculations
POST /api/pricing/calculate          // Calculate prices with taxes/discounts
GET /api/pricing/margins            // Get margin analysis
GET /api/pricing/profitability      // Get profitability reports

// Currency
GET /api/currencies                  // List supported currencies
GET /api/exchange-rates              // Get current exchange rates
PUT /api/exchange-rates              // Update exchange rates
```

#### 3. Integration Points
- **Order System Integration**: Automatic price and tax calculations
- **Product Management**: Seamless pricing configuration
- **Customer Management**: Customer-specific pricing and tax rules
- **Reporting System**: Financial reports with accurate pricing data

### 🔒 Security & Permissions

#### Permission Matrix
| Permission | Owner | Admin | Manager | Employee | Viewer |
|------------|-------|-------|---------|----------|--------|
| Manage pricing | ✅ | ✅ | ⚠️* | ❌ | ❌ |
| View cost data | ✅ | ✅ | ⚠️** | ❌ | ❌ |
| Apply discounts | ✅ | ✅ | ✅ | ⚠️*** | ❌ |
| Manage tax settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Override prices | ✅ | ✅ | ⚠️**** | ❌ | ❌ |

*Limited price adjustments  
**Limited cost visibility  
***Standard discounts only  
****With approval required

#### Data Security
- Sensitive pricing data protection
- Audit logging for all price changes
- Encrypted cost information
- Role-based access to financial data

## 🚀 Implementation Plan

### Phase 1: Basic Pricing System (3 weeks)
**Week 1-2: Core Pricing**
- Database schema implementation
- Basic product pricing CRUD
- Price history tracking
- Simple margin calculations

**Week 3: Frontend Interface**
- Product pricing configuration UI
- Bulk pricing update tools
- Price history views

**Deliverables:**
- Basic pricing system with history tracking
- Simple margin calculation and display

### Phase 2: Tax Management (3 weeks)
**Week 4-5: Tax Engine**
- Tax rate configuration system
- Tax category management
- Tax calculation engine
- Multi-jurisdiction support

**Week 6: Tax UI & Integration**
- Tax configuration interface
- Integration with pricing calculations
- Tax reporting tools

**Deliverables:**
- Complete tax management system
- Automated tax calculations

### Phase 3: Advanced Pricing Features (3 weeks)
**Week 7-8: Price Lists & Discounts**
- Price list management
- Discount rule engine
- Customer-specific pricing
- Quantity-based pricing tiers

**Week 9: Currency & International**
- Multi-currency support
- Exchange rate management
- Regional pricing configurations

**Deliverables:**
- Advanced pricing capabilities
- International business support

### Phase 4: Analytics & Optimization (2 weeks)
**Week 10: Profitability Analytics**
- Margin analysis tools
- Profitability reporting
- Cost tracking improvements

**Week 11: Testing & Polish**
- End-to-end testing
- Performance optimization
- User interface refinements

**Deliverables:**
- Complete pricing analytics
- Production-ready system

## 🧪 Testing Strategy

### Unit Testing
- Price calculation logic
- Tax calculation accuracy
- Discount application rules
- Currency conversion calculations

### Integration Testing
- Order system integration
- Product management integration
- Customer-specific pricing scenarios
- Multi-currency transactions

### User Acceptance Testing
- Complex pricing scenarios
- Tax compliance verification
- Discount and promotion workflows
- International pricing accuracy

## 📊 Analytics & Monitoring

### Key Metrics to Track
- Price change frequency and impact
- Tax calculation accuracy
- Discount utilization rates
- Margin trends over time
- Currency conversion accuracy

### Performance Monitoring
- Price calculation response time
- Tax calculation performance
- Bulk pricing update efficiency
- Report generation speed

## 🔮 Future Enhancements

### V2 Features
- **Dynamic Pricing**: AI-powered pricing optimization
- **Competitor Analysis**: Market pricing intelligence
- **Contract Pricing**: Customer-specific contract terms
- **Subscription Pricing**: Recurring pricing models

### V3 Features
- **Price Optimization AI**: Machine learning for optimal pricing
- **Advanced Tax Automation**: Integration with tax authorities
- **Global Compliance**: Multi-country tax compliance automation
- **Revenue Recognition**: Advanced revenue recognition rules

## 🏁 Definition of Done

### Minimum Viable Product (MVP)
- [ ] Products can have multiple pricing tiers and configurations
- [ ] Tax calculations work accurately for different scenarios
- [ ] Discount rules apply correctly to orders and quotes
- [ ] Multi-currency support with exchange rate management
- [ ] Profitability analysis provides accurate margin calculations
- [ ] Price history tracking and audit trails work correctly
- [ ] All functionality integrates seamlessly with order system
- [ ] Mobile-responsive pricing management interface
- [ ] Complete test coverage with edge case handling
- [ ] User documentation and training materials

### Success Criteria
- [ ] 95% of products have configured pricing within 30 days
- [ ] Tax calculations match manual verification 99% of the time
- [ ] Advanced pricing features used by 80% of organizations
- [ ] Price optimization leads to measurable margin improvements
- [ ] User satisfaction rating >4.4/5 for pricing management

---

**Owner**: Product Team  
**Engineering**: Backend + Frontend Teams  
**Design**: UX Team  
**Stakeholders**: Finance, Sales, Accounting, Operations