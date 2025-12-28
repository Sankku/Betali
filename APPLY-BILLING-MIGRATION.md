# How to Apply Billing System Migration

**Date**: December 22, 2025
**Migration File**: `backend/migrations/create_billing_system_v2.sql`
**Status**: Ready to Apply

---

## ⚠️ Important Notes

1. **Existing Table**: The `subscription_plans` table already exists with data
2. **Compatible Migration**: The v2 migration works with the existing schema
3. **New Tables**: Will create 4 new tables: `subscriptions`, `manual_payments`, `invoices`, `subscription_history`

---

## 📋 Steps to Apply Migration

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to: **SQL Editor**

2. **Copy Migration SQL**
   - Open file: `backend/migrations/create_billing_system_v2.sql`
   - Copy ALL contents (entire file)

3. **Paste and Execute**
   - Paste into SQL Editor
   - Click **Run** button
   - Wait for success confirmation

4. **Verify Tables Created**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('subscriptions', 'manual_payments', 'invoices', 'subscription_history');
   ```

   **Expected Result**: Should return 4 rows

5. **Verify Functions Created**
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name IN ('has_feature_access', 'get_active_subscription');
   ```

   **Expected Result**: Should return 2 rows

6. **Verify Triggers Created**
   ```sql
   SELECT trigger_name, event_object_table
   FROM information_schema.triggers
   WHERE trigger_schema = 'public'
   AND event_object_table IN ('subscriptions', 'manual_payments', 'invoices', 'organizations');
   ```

   **Expected Result**: Should return multiple triggers

---

### Option 2: Command Line (Alternative)

If you have `psql` installed and database credentials:

```bash
# Set your connection string
export DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"

# Apply migration
psql "$DATABASE_URL" -f backend/migrations/create_billing_system_v2.sql

# Verify
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM subscriptions;"
```

---

## ✅ What the Migration Does

### Creates Tables:

1. **subscriptions**
   - Links organizations to subscription plans
   - Tracks status (pending, active, cancelled, expired)
   - Stores billing details (amount, currency, dates)
   - **Auto-creates Free subscription for new organizations**

2. **manual_payments**
   - Records manual payments (bank transfers, cash, etc.)
   - Tracks payment status (pending, confirmed, failed)
   - Links to subscriptions
   - Stores payment reference and notes

3. **invoices**
   - Generates invoice records
   - Tracks invoice status (draft, sent, paid, cancelled)
   - Stores invoice numbers and PDF URLs
   - Links to subscriptions

4. **subscription_history**
   - Audit trail of all subscription changes
   - Tracks plan changes, activations, cancellations
   - Records who performed each action
   - Provides compliance and debugging data

### Creates Functions:

1. **has_feature_access(org_id, feature_name)**
   - Checks if organization has access to a feature
   - Used by backend for feature gating
   - Returns boolean

2. **get_active_subscription(org_id)**
   - Returns active subscription details
   - Returns plan name, status, dates
   - NULL if no active subscription

### Creates Triggers:

1. **Auto-update timestamps** on subscriptions, payments, invoices
2. **Log changes** to subscription_history automatically
3. **Create Free subscription** for new organizations

---

## 🧪 Testing After Migration

### 1. Check Free Plan Exists
```sql
SELECT plan_id, name, display_name, price_monthly
FROM subscription_plans
WHERE name = 'free';
```

**Expected**: Should return the Free plan

### 2. Check Default Subscription Created
```sql
SELECT
  o.name as organization_name,
  s.status,
  sp.name as plan_name
FROM organizations o
LEFT JOIN subscriptions s ON s.organization_id = o.organization_id
LEFT JOIN subscription_plans sp ON sp.plan_id = s.plan_id
LIMIT 5;
```

**Expected**: All organizations should have a subscription (likely Free)

### 3. Test Feature Access Function
```sql
SELECT has_feature_access(
  (SELECT organization_id FROM organizations LIMIT 1),
  'api_access'
);
```

**Expected**: Should return `false` for Free plan

### 4. Check Tables Are Empty (Except Subscriptions)
```sql
SELECT
  (SELECT COUNT(*) FROM manual_payments) as payments_count,
  (SELECT COUNT(*) FROM invoices) as invoices_count,
  (SELECT COUNT(*) FROM subscription_history) as history_count,
  (SELECT COUNT(*) FROM subscriptions) as subscriptions_count;
```

**Expected**:
- payments_count: 0
- invoices_count: 0
- history_count: >= subscriptions_count (auto-created)
- subscriptions_count: >= 1

---

## 🚨 Troubleshooting

### Error: "table subscriptions already exists"
**Solution**: Migration uses `IF NOT EXISTS`, so this should not happen. If it does:
```sql
-- Check what exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%subscript%';

-- Drop if needed (CAREFUL!)
DROP TABLE IF EXISTS subscriptions CASCADE;
```

### Error: "function has_feature_access already exists"
**Solution**: Migration uses `CREATE OR REPLACE`, so this should not happen. If it does:
```sql
DROP FUNCTION IF EXISTS has_feature_access(UUID, VARCHAR);
DROP FUNCTION IF EXISTS get_active_subscription(UUID);
```

### Error: "column plan_id does not exist"
**Cause**: subscription_plans table structure mismatch
**Solution**: Check your subscription_plans schema:
```sql
\d subscription_plans
```
Compare with: `backend/scripts/migrations/001_create_subscription_plans_table.sql`

---

## 📊 Expected Database State After Migration

```
subscription_plans (existing)
├── 4 plans: free, starter, professional, enterprise
├── Uses: price_monthly, price_yearly, features (JSONB)
└── All plans active and public

subscriptions (new)
├── One record per organization (Free plan auto-created)
├── Status: 'active' for existing orgs
└── Linked to subscription_plans via plan_id

manual_payments (new)
└── Empty (no manual payments yet)

invoices (new)
└── Empty (no invoices generated yet)

subscription_history (new)
└── Records for each auto-created subscription
```

---

## ✅ Success Criteria

After running the migration, you should have:

- ✅ 4 new tables created
- ✅ 2 helper functions created
- ✅ Multiple triggers created
- ✅ Free subscription auto-created for all existing organizations
- ✅ Subscription history records created
- ✅ No errors in SQL execution

---

## 🎯 Next Steps After Migration

1. **Test API Endpoints**
   ```bash
   # Start backend
   cd backend && bun run dev

   # Test plans endpoint
   curl http://localhost:4000/api/subscriptions/plans
   ```

2. **Verify Backend Integration**
   - Check logs for any errors
   - Test authenticated endpoints with JWT token
   - Verify admin endpoints work

3. **Build Frontend**
   - Create pricing page
   - Build admin billing dashboard
   - Implement plan selection UI

---

## 📝 Rollback Plan (If Needed)

If something goes wrong and you need to rollback:

```sql
BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_create_default_subscription ON organizations;
DROP TRIGGER IF EXISTS trigger_log_subscription_change ON subscriptions;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS update_manual_payments_updated_at ON manual_payments;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;

-- Drop functions
DROP FUNCTION IF EXISTS has_feature_access(UUID, VARCHAR);
DROP FUNCTION IF EXISTS get_active_subscription(UUID);
DROP FUNCTION IF EXISTS log_subscription_change();
DROP FUNCTION IF EXISTS create_default_subscription();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS subscription_history CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS manual_payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Note: We do NOT drop subscription_plans as it existed before

COMMIT;
```

**⚠️ WARNING**: This will delete all subscription data. Only use if absolutely necessary.

---

## 📞 Support

If you encounter issues:
1. Check the error message carefully
2. Verify your subscription_plans table schema matches expectations
3. Ensure you have proper database permissions
4. Check Supabase logs for more details

---

**Ready to apply?** Copy the SQL from `backend/migrations/create_billing_system_v2.sql` and paste into Supabase SQL Editor!
