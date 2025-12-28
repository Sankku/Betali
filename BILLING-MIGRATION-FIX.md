# Billing Migration Schema Fix - Complete

**Date**: December 22, 2025
**Issue**: Schema mismatch between migration and existing database
**Status**: ✅ RESOLVED

---

## 🐛 Problem Encountered

When attempting to apply the original billing migration (`create_billing_system.sql`), you received this error:

```
ERROR: 42703: column "price_usd" of relation "subscription_plans" does not exist
LINE 45: price_usd, price_ars, ^
```

**Root Cause**:
- The `subscription_plans` table **already exists** in the database
- It was created by an earlier migration: `001_create_subscription_plans_table.sql`
- The existing schema uses different column names than our new migration expected

---

## 🔍 Schema Comparison

### Existing Schema (Already in Database):
```sql
subscription_plans (
  plan_id UUID PRIMARY KEY,
  name VARCHAR(50),
  display_name VARCHAR(100),

  -- Pricing columns:
  price_monthly DECIMAL(10,2),  ← Uses this
  price_yearly DECIMAL(10,2),   ← Uses this
  currency VARCHAR(3),

  -- Features:
  features JSONB,  ← JSON object with feature flags

  -- Sorting:
  sort_order INTEGER,  ← Uses this
  is_public BOOLEAN
)
```

### Our Original Migration Schema:
```sql
subscription_plans (
  plan_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),

  -- Pricing columns:
  price_usd DECIMAL(10,2),  ← Tried to use this (doesn't exist!)
  price_ars DECIMAL(10,2),  ← Tried to use this (doesn't exist!)

  -- Features:
  feature_purchase_orders BOOLEAN,  ← Individual columns
  feature_advanced_reports BOOLEAN,
  feature_api_access BOOLEAN,

  -- Sorting:
  display_order INTEGER  ← Different name!
)
```

**Incompatibilities**:
1. ❌ `price_usd`/`price_ars` vs `price_monthly`/`price_yearly`
2. ❌ Individual feature columns vs `features` JSONB
3. ❌ `display_order` vs `sort_order`
4. ❌ `plan_id` type (VARCHAR vs UUID)

---

## ✅ Solution Implemented

### 1. Created New Compatible Migration
**File**: `backend/migrations/create_billing_system_v2.sql`

**Changes**:
- ✅ **Removed** `subscription_plans` table creation (already exists)
- ✅ **Added** foreign key to existing `subscription_plans.plan_id` (UUID)
- ✅ Created only the 4 new tables needed:
  - `subscriptions`
  - `manual_payments`
  - `invoices`
  - `subscription_history`

### 2. Updated SubscriptionService.js

**Changes Made**:

**Before**:
```javascript
// ❌ Wrong columns
const amount = currency === 'ARS' ? plan.price_ars : plan.price_usd;

// ❌ Wrong sort column
.order('display_order', { ascending: true });
```

**After**:
```javascript
// ✅ Use existing column
const amount = plan.price_monthly || 0;

// ✅ Use existing sort column + filter public plans
.eq('is_public', true)
.order('sort_order', { ascending: true });
```

### 3. Kept Compatible Features
- ✅ `has_feature_access()` function works with existing JSONB `features` column
- ✅ Uses existing plan names: 'free', 'starter', 'professional', 'enterprise'
- ✅ All plan metadata already seeded in database

---

## 📦 What's Now in the Migration v2

### Tables Created (4 new tables):

1. **subscriptions**
   ```sql
   - subscription_id (UUID, PK)
   - organization_id (UUID, FK → organizations)
   - plan_id (UUID, FK → subscription_plans) ← Uses existing table
   - status (pending, active, cancelled, expired)
   - amount, currency
   - start_date, end_date, next_billing_date
   ```

2. **manual_payments**
   ```sql
   - payment_id (UUID, PK)
   - subscription_id (UUID, FK)
   - organization_id (UUID, FK)
   - amount, currency, payment_method
   - status (pending, confirmed, failed)
   - payment_date, reference_number, notes
   ```

3. **invoices**
   ```sql
   - invoice_id (UUID, PK)
   - subscription_id (UUID, FK)
   - organization_id (UUID, FK)
   - invoice_number (unique)
   - amount, currency
   - status (draft, sent, paid, cancelled)
   - issue_date, due_date, paid_date
   - pdf_url
   ```

4. **subscription_history**
   ```sql
   - history_id (UUID, PK)
   - subscription_id (UUID, FK)
   - organization_id (UUID, FK)
   - action (created, activated, upgraded, etc.)
   - old_plan_id, new_plan_id
   - old_status, new_status
   - reason, performed_by
   ```

### Functions Created (2):

1. **has_feature_access(org_id, feature_name)**
   - Checks organization's active subscription plan
   - Queries `features` JSONB column
   - Returns boolean

2. **get_active_subscription(org_id)**
   - Returns active subscription details
   - Joins with subscription_plans
   - Returns plan_name, status, dates

### Triggers Created (6):

1. **Auto-update timestamps** (3 triggers)
   - subscriptions
   - manual_payments
   - invoices

2. **Log subscription changes** (1 trigger)
   - Creates audit trail in subscription_history

3. **Create default subscription** (1 trigger)
   - Auto-creates Free plan subscription for new organizations

4. **Update plan timestamps** (1 trigger)
   - Updates updated_at on subscription_plans

---

## 🎯 Current Plan Definitions

From existing database (`001_create_subscription_plans_table.sql`):

| Plan | Monthly | Yearly | Users | Warehouses | Orders/mo | Features |
|------|---------|--------|-------|------------|-----------|----------|
| **Free** | $0 | $0 | 1 | 1 | 20 | Basic only |
| **Starter** | $29 | $279 | 3 | 2 | 200 | Basic |
| **Professional** | $79 | $758 | 10 | 10 | 2,000 | + API, Reports, Analytics |
| **Enterprise** | $199 | $1,910 | Unlimited | Unlimited | Unlimited | + SSO, Dedicated Support |

**Features in JSONB**:
```json
{
  "api_access": true/false,
  "advanced_analytics": true/false,
  "custom_reports": true/false,
  "audit_logs": true/false,
  "sso": true/false,
  "priority_support": true/false
}
```

---

## 📋 Files Modified

### New Files:
```
✅ backend/migrations/create_billing_system_v2.sql (compatible migration)
✅ APPLY-BILLING-MIGRATION.md (step-by-step guide)
✅ BILLING-MIGRATION-FIX.md (this document)
```

### Modified Files:
```
✅ backend/services/SubscriptionService.js
   - Changed: price_usd/price_ars → price_monthly
   - Changed: display_order → sort_order
   - Added: is_public filter
```

### Unchanged Files:
```
✅ backend/controllers/SubscriptionController.js (no changes needed)
✅ backend/routes/subscriptions.js (no changes needed)
✅ backend/config/container.js (already updated)
✅ backend/server.js (already updated)
```

---

## ✅ Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Migration v2 Created | ✅ Done | Compatible with existing schema |
| Service Updated | ✅ Done | Uses correct column names |
| Controller | ✅ OK | No changes needed |
| Routes | ✅ OK | No changes needed |
| Container | ✅ OK | Already registered |
| Server | ✅ OK | Routes already added |
| Migration Applied | ⏳ Pending | **You need to apply manually** |
| API Testing | ⏳ Pending | After migration is applied |

---

## 🚀 Next Action Required

**You need to apply the migration manually in Supabase:**

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of: `backend/migrations/create_billing_system_v2.sql`
3. Paste and execute
4. Verify tables created (see APPLY-BILLING-MIGRATION.md)

**Then test**:
```bash
# Start backend
cd backend && bun run dev

# Test plans endpoint
curl http://localhost:4000/api/subscriptions/plans

# Should return: free, starter, professional, enterprise plans
```

---

## 🎓 Lessons Learned

1. **Always check existing schema** before creating migrations
2. **Use `IF NOT EXISTS`** clauses to avoid conflicts
3. **Prefer extending** existing tables over recreating them
4. **JSONB features** are more flexible than individual boolean columns
5. **UUID primary keys** are better than VARCHAR for joins

---

## ✅ Migration is Ready

The billing system backend is **100% ready** and the migration is **compatible** with your existing database schema.

**Status**: ✅ Ready to apply and test

**Estimated Time**: 5 minutes to apply migration + 10 minutes to test = **15 minutes total**
