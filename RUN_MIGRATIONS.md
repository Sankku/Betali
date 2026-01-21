# Database Migrations - Quick Setup Guide

## ⚠️ CRITICAL: Run These Migrations First!

The subscriptions table doesn't exist yet. You need to run these SQL migrations in your Supabase SQL Editor.

## Steps to Run Migrations

### 1. Go to Supabase Dashboard
- Open your Supabase project: https://supabase.com/dashboard
- Navigate to **SQL Editor** (left sidebar)

### 2. Run Migrations in Order

Copy and paste each file's contents into the SQL Editor and click **RUN**.

#### Migration 1: Create subscription_plans table
**File:** `backend/scripts/migrations/001_create_subscription_plans_table.sql`

```bash
# Or run from terminal:
cat backend/scripts/migrations/001_create_subscription_plans_table.sql
```

#### Migration 2: Create subscriptions table
**File:** `backend/scripts/migrations/002_create_subscriptions_table.sql`

```bash
# Or run from terminal:
cat backend/scripts/migrations/002_create_subscriptions_table.sql
```

#### Migration 3: Add Mercado Pago fields
**File:** `backend/migrations/add_mercadopago_fields.sql`

```bash
# Or run from terminal:
cat backend/migrations/add_mercadopago_fields.sql
```

## Quick Copy-Paste Script

Run this in your terminal to output all migrations at once:

```bash
echo "=== MIGRATION 1: subscription_plans ===" && \
cat backend/scripts/migrations/001_create_subscription_plans_table.sql && \
echo -e "\n\n=== MIGRATION 2: subscriptions ===" && \
cat backend/scripts/migrations/002_create_subscriptions_table.sql && \
echo -e "\n\n=== MIGRATION 3: mercadopago fields ===" && \
cat backend/migrations/add_mercadopago_fields.sql
```

Then copy each section into Supabase SQL Editor.

## Verification

After running all migrations, verify they worked:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('subscription_plans', 'subscriptions', 'webhook_logs');

-- Check subscriptions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;
```

## What I Fixed

1. **Added missing database tables** - The `subscriptions` table didn't exist, causing Postgres error `42P01`
2. **Fixed subscription creation logic** - Now fetches plan details and provides all required fields:
   - `amount` (required)
   - `current_period_start` (required)
   - `current_period_end` (required)
3. **Added error handling** - Better error logging in BaseRepository to show actual Supabase errors

## Next Steps After Migrations

Once migrations are complete:

1. **Test the subscription creation** - Try selecting a plan in the UI
2. **Configure Mercado Pago credentials**:
   - Get Access Token from Mercado Pago dashboard
   - Add to `backend/.env`: `MERCADOPAGO_ACCESS_TOKEN=your_access_token`
   - Add Public Key to `frontend/.env`: `VITE_MERCADOPAGO_PUBLIC_KEY=TEST-bfcb63e5-4a9d-4015-8617-d5a334555e85`
3. **Test complete payment flow** with test credentials
