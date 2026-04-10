---
tags: [arquitectura, saas, multi-tenant]
project: betali
type: spec
created: 2026-04-09
updated: 2026-04-09
---
# PRD: Organization-Level Configurable Limits

## Overview
Allow organizations to configure business rules and limits at the organization level instead of having hard-coded system-wide limits.

## Problem Statement
Currently, the system has hard-coded validation limits (e.g., order quantity max 10,000 units) that apply to all organizations. This creates friction for:
- **Wholesalers/Distributors**: May need to process orders with >10,000 units
- **Small businesses**: May want stricter limits to prevent errors
- **Different business types**: Have different operational requirements

## Proposed Solution
Create an organization settings/configuration system that allows customizing business rules and limits per organization.

## Features to Implement

### 1. Organization Settings Table
Create a new database table `organization_settings` with configurable limits:

```sql
CREATE TABLE organization_settings (
  setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),

  -- Order Limits
  max_order_quantity INTEGER DEFAULT 10000,
  max_order_total_amount DECIMAL(15,2) DEFAULT NULL,
  min_order_total_amount DECIMAL(15,2) DEFAULT NULL,

  -- Inventory Limits
  max_stock_movement_quantity INTEGER DEFAULT 100000,
  low_stock_threshold_percentage INTEGER DEFAULT 20,

  -- Pricing Limits
  max_discount_percentage DECIMAL(5,2) DEFAULT 100,
  require_approval_above_amount DECIMAL(15,2) DEFAULT NULL,

  -- General Settings
  allow_negative_stock BOOLEAN DEFAULT FALSE,
  require_batch_tracking BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(organization_id)
);
```

### 2. Backend Implementation

#### Service Layer
- Create `OrganizationSettingsService.js` to manage settings CRUD
- Modify validation middleware to fetch organization-specific limits
- Update existing services (OrderService, InventoryService) to use org settings

#### Validation Updates
Current code location: `/backend/middleware/validation.js` (pricing validation)

```javascript
// BEFORE (hard-coded)
quantity: Joi.number().positive().max(10000)

// AFTER (organization-specific)
quantity: Joi.number().positive().max(orgSettings.max_order_quantity)
```

### 3. Frontend Implementation

#### Settings Page
Create new route: `/settings/organization` with tabs:
- **General**: Business info, timezone, currency
- **Limits & Rules**: Configurable limits (this feature)
- **Notifications**: Email/SMS preferences
- **Integrations**: Third-party connections

#### UI Components
- Form with numeric inputs for each limit
- Tooltips explaining each setting
- Preview/validation showing impact of changes
- Reset to defaults button

### 4. Default Values Strategy
When creating a new organization:
1. Apply sensible defaults (shown in table schema above)
2. Allow admins to choose from preset templates:
   - **Small Retail**: Conservative limits
   - **Wholesale/Distribution**: High limits
   - **Manufacturing**: Medium limits with batch tracking
   - **Custom**: Manual configuration

## Current Issue Reference
**Trigger**: User tried to create order with 1,000,000 units
**Current Limit**: 10,000 units (hard-coded)
**Error**: "Quantity cannot exceed 10,000"
**Request**: `/api/pricing/calculate` with `quantity: 1000000`

## Technical Requirements

### Backend
- [ ] Create `organization_settings` table with migration
- [ ] Create `OrganizationSettingsRepository.js`
- [ ] Create `OrganizationSettingsService.js`
- [ ] Create `OrganizationSettingsController.js`
- [ ] Add routes: GET/PUT `/api/organizations/:id/settings`
- [ ] Update validation middleware to use org settings
- [ ] Update OrderService to respect org limits
- [ ] Add default settings on organization creation

### Frontend
- [ ] Create Settings page UI
- [ ] Create organization settings form component
- [ ] Add API client methods for settings
- [ ] Add React Query hooks for settings management
- [ ] Add validation and error handling
- [ ] Show current limits in relevant forms (with warning if approaching limit)

### Testing
- [ ] Unit tests for settings service
- [ ] Integration tests for limit enforcement
- [ ] E2E tests for settings UI
- [ ] Test migration script

## Success Metrics
- Organizations can modify their own limits without code changes
- Validation errors include current limit and how to change it
- 95%+ reduction in support tickets about "arbitrary limits"

## Future Enhancements
- Role-based settings (admin vs user limits)
- Audit log for settings changes
- Bulk update limits across multiple organizations
- A/B testing different default limits
- Machine learning to suggest optimal limits based on usage

## Priority
**Medium** - Not blocking current work, but improves flexibility and reduces friction

## Dependencies
- Organization multi-tenant architecture (already in place)
- Settings UI framework (can use existing components)

## Related Documents
- `/SAAS_ARCHITECTURE.md` - Multi-tenant architecture
- `/backend/middleware/validation.js` - Current validation implementation
- `/backend/services/OrderService.js` - Order processing logic

## Notes
- Keep hard-coded maximum limits as safety guardrails (e.g., no org can set max_order_quantity > 10,000,000)
- Consider caching organization settings to reduce database queries
- Ensure settings changes take effect immediately (no restart required)
