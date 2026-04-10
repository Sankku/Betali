---
tags: [arquitectura, saas, multi-tenant]
project: betali
type: spec
created: 2026-04-09
updated: 2026-04-09
---
# Tax Management System Documentation

## 🎯 Overview

The Tax Management System is a comprehensive solution that allows users to create, manage, and apply custom tax rates to products and orders. This system supports multi-tenant SaaS architecture with organization-based isolation and provides flexible tax calculation models for different business needs.

## ✨ Key Features

- **Custom Tax Rate Creation**: Users can create their own tax rates (e.g., IVA 21%, IVA 17%, GST 10%)
- **Multi-Tenant Support**: Tax rates are isolated per organization
- **Tax-Inclusive/Exclusive Models**: Support for both tax calculation methods
- **Real-time Pricing**: Dynamic pricing calculations with tax integration
- **Product Integration**: Tax rates can be assigned to individual products
- **Order Integration**: Tax calculations automatically applied during order creation
- **Comprehensive CRUD**: Full create, read, update, delete operations for tax rates

## 🏗️ Architecture

### Backend Components

#### 1. Database Schema (`backend/scripts/create-pricing-schema.sql`)
```sql
CREATE TABLE tax_rates (
  tax_rate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  rate DECIMAL(8,6) NOT NULL,
  is_inclusive BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 2. Repository Layer (`backend/repositories/TaxRateRepository.js`)
- **Purpose**: Data access layer for tax rate operations
- **Key Methods**:
  - `getDefaultTaxRate(organizationId)` - Get organization's default tax rate
  - `getActiveTaxRates(organizationId)` - Get all active tax rates
  - `createTaxRate(taxRateData)` - Create new tax rate with validation
  - `updateTaxRate(taxRateId, organizationId, updateData)` - Update existing tax rate
  - `deleteTaxRate(taxRateId, organizationId)` - Delete tax rate with usage checks
- **Error Handling**: Graceful handling when tables don't exist (returns empty arrays)
- **Validation**: Rate validation (0-1 range), required field checks, organization isolation

#### 3. Service Layer (`backend/services/PricingService.js`)
- **Purpose**: Business logic for tax and pricing calculations
- **Integration**: Works with TaxRateRepository for tax rate lookup
- **Calculations**: Supports both tax-inclusive and tax-exclusive models

#### 4. API Routes (`backend/routes/pricing.js`)
```javascript
// Tax Rate Management Endpoints
GET    /api/pricing/taxes/rates           // Get all tax rates for organization
POST   /api/pricing/taxes/rates           // Create new tax rate
GET    /api/pricing/taxes/rates/:id       // Get specific tax rate
PUT    /api/pricing/taxes/rates/:id       // Update tax rate
DELETE /api/pricing/taxes/rates/:id       // Delete tax rate

// Pricing Calculation Endpoints
POST   /api/pricing/calculate             // Calculate pricing with taxes
POST   /api/pricing/calculate/realtime    // Real-time pricing updates
```

### Frontend Components

#### 1. Tax Management Page (`frontend/src/pages/Dashboard/TaxManagement.tsx`)
- **Features**:
  - Statistics dashboard with tax rate overview
  - Complete CRUD interface with data table
  - Create/Edit modal with tax rate presets
  - Real-time tax calculation preview
  - Proper layout integration with DashboardLayout

#### 2. Tax Rate Modal (`frontend/src/components/features/taxes/tax-rate-modal.tsx`)
- **Features**:
  - Common tax rate presets (IVA 21%, IVA 10.5%, GST 10%, VAT 20%, etc.)
  - Tax-inclusive vs tax-exclusive selection
  - Real-time calculation preview
  - Form validation with Yup schema
  - Responsive design with proper contrast

#### 3. Product Integration (`frontend/src/components/features/products/product-form.tsx`)
- **Features**:
  - Tax rate dropdown selector in product forms
  - Loading states during tax rate fetching
  - Integration with useTaxRates hook

#### 4. Order Integration (`frontend/src/components/features/orders/order-form.tsx`)
- **Features**:
  - Real-time pricing calculations with taxes
  - Integration with useRealtimePricing hook
  - Automatic tax application based on product tax rates

#### 5. Custom Hooks

##### `useTaxRates` Hook (`frontend/src/hooks/useTaxRates.ts`)
- **CRUD Operations**:
  - `useTaxRates()` - Fetch all tax rates with caching
  - `useCreateTaxRate()` - Create tax rate with optimistic updates
  - `useUpdateTaxRate()` - Update tax rate with cache invalidation
  - `useDeleteTaxRate()` - Delete with usage validation
- **Utility Functions**:
  - `calculateTaxAmount()` - Tax calculation utility
  - `formatTaxRate()` - Display formatting utility

##### `useRealtimePricing` Hook (`frontend/src/hooks/usePricing.ts`)
- **Features**:
  - Debounced pricing calculations (500ms)
  - Real-time updates during form changes
  - Integration with backend pricing API
  - Automatic tax application

## 🔧 Technical Implementation Details

### Tax Calculation Models

#### Tax-Exclusive Model (Default)
```javascript
// Example: Product price $100, Tax rate 21%
const basePrice = 100.00;
const taxRate = 0.21;
const taxAmount = basePrice * taxRate;  // $21.00
const totalPrice = basePrice + taxAmount;  // $121.00
```

#### Tax-Inclusive Model
```javascript
// Example: Product price $121 (tax included), Tax rate 21%
const totalPrice = 121.00;
const taxRate = 0.21;
const basePrice = totalPrice / (1 + taxRate);  // $100.00
const taxAmount = totalPrice - basePrice;  // $21.00
```

### Error Handling

#### Backend Error Handling
- **Table Not Found**: Returns empty arrays instead of throwing errors
- **Authentication**: Proper JWT validation with detailed error messages
- **Validation Errors**: Comprehensive field validation with user-friendly messages
- **Database Errors**: Graceful error handling with logging

#### Frontend Error Handling
- **API Errors**: Toast notifications with user-friendly messages
- **Loading States**: Proper loading indicators during operations
- **Form Validation**: Real-time validation with Yup schemas
- **Network Errors**: Retry mechanisms and error recovery

### Security Features

#### Row Level Security (RLS)
```sql
CREATE POLICY tax_rates_org_policy ON tax_rates
  FOR ALL USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid() AND uo.is_active = true
    )
  );
```

#### Authentication & Authorization
- **JWT Token Validation**: All endpoints require valid authentication
- **Organization Isolation**: Users can only access their organization's tax rates
- **Permission Checks**: Proper role-based access control

## 🚀 Usage Examples

### Creating a Tax Rate
```typescript
// Frontend usage
const createTaxRate = useCreateTaxRate();

await createTaxRate.mutateAsync({
  name: 'IVA 21%',
  description: 'Standard VAT rate for Argentina',
  rate: 0.21,
  is_inclusive: false,
  is_active: true
});
```

### Calculating Pricing with Taxes
```typescript
// Real-time pricing calculation
const { calculatePricing, pricingResult } = useRealtimePricing({
  items: [{
    product_id: 'prod-123',
    quantity: 2,
    unit_price: 100.00,
    tax_rate_id: 'tax-rate-123'
  }]
}, true);

// Result: { subtotal: 200.00, tax_amount: 42.00, total: 242.00 }
```

### API Usage
```bash
# Create tax rate
curl -X POST "http://localhost:4000/api/pricing/taxes/rates" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "IVA 21%",
    "rate": 0.21,
    "is_inclusive": false
  }'

# Calculate pricing
curl -X POST "http://localhost:4000/api/pricing/calculate" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "product_id": "prod-123",
      "quantity": 2,
      "unit_price": 100.00,
      "tax_rate_id": "tax-rate-123"
    }]
  }'
```

## 🧪 Testing

### Backend Testing
The system includes comprehensive API testing with:
- **Authentication validation**
- **CRUD operations testing**
- **Pricing calculation verification**
- **Error handling validation**
- **Multi-tenant isolation testing**

### Frontend Testing
- **Component rendering tests**
- **Hook functionality tests**
- **Form validation tests**
- **API integration tests**
- **User interaction tests**

## 🎨 UI/UX Features

### Visual Improvements
- **High Contrast Text**: Changed from `text-gray-500` to `text-gray-800/900` for better readability
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Loading States**: Clear loading indicators during API operations
- **Error States**: User-friendly error messages and recovery options

### User Experience
- **Preset Tax Rates**: Common tax rates for quick selection
- **Real-time Preview**: Instant calculation preview during form entry
- **Intuitive Navigation**: Seamlessly integrated into dashboard navigation
- **Bulk Operations**: Support for managing multiple tax rates efficiently

## 📊 Benefits

### For Businesses
- **Flexibility**: Create custom tax rates for different products/regions
- **Compliance**: Proper tax calculation and record keeping
- **Efficiency**: Automated tax calculations reduce manual errors
- **Scalability**: Multi-tenant architecture supports business growth

### For Developers
- **Clean Architecture**: Well-structured, maintainable codebase
- **Type Safety**: Full TypeScript support with proper typing
- **Testability**: Comprehensive test coverage and mock support
- **Extensibility**: Easy to add new tax calculation methods or features

## 🔮 Future Enhancements

- **Tax Rate Templates**: Predefined tax configurations for different countries
- **Advanced Tax Rules**: Complex tax calculation logic (tiered rates, exemptions)
- **Tax Reporting**: Detailed tax reports and analytics
- **Integration APIs**: Connect with external tax services (Avalara, TaxJar)
- **Audit Trail**: Complete history of tax rate changes
- **Bulk Import/Export**: CSV/Excel support for tax rate management

---

✨ **Status**: Fully implemented and tested
🎯 **Version**: 1.0.0
📅 **Last Updated**: September 2025