# 💳 MercadoPago Payment Integration - Setup Guide

Complete guide to configure and test the MercadoPago payment system in Betali.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [MercadoPago Account Setup](#mercadopago-account-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Webhook Configuration](#webhook-configuration)
6. [Testing the Integration](#testing-the-integration)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Bun package manager installed
- ✅ Supabase project configured
- ✅ Backend and frontend running locally
- ✅ ngrok or similar tool for webhook testing (development only)

---

## MercadoPago Account Setup

### Step 1: Create MercadoPago Account

1. Go to [MercadoPago Developers](https://www.mercadopago.com.ar/developers)
2. Sign up or log in with your MercadoPago account
3. Navigate to **"Your integrations"** → **"Create application"**

### Step 2: Get Your Credentials

1. In your application dashboard, go to **"Credentials"**
2. You'll see two sets of credentials:
   - **Test credentials** (for development)
   - **Production credentials** (for live payments)

3. Copy the following:
   - **Test Public Key** (starts with `TEST-`)
   - **Test Access Token** (starts with `TEST-`)

**Example:**
```
Public Key: TEST-abc123def456...
Access Token: TEST-7083896505132726-123021-3822ee35012fd93b2b1f8e1a33d08cb1-2347619481
```

---

## Environment Configuration

### Backend Configuration

Edit `/backend/.env`:

```bash
# MercadoPago Configuration
MERCADOPAGO_ACCESS_TOKEN=TEST-your-access-token-here
MERCADOPAGO_PUBLIC_KEY=TEST-your-public-key-here

# Backend URL (for webhook notifications)
BACKEND_URL=http://localhost:4000

# Frontend URL (for payment redirects)
FRONTEND_URL=http://localhost:3000
```

### Frontend Configuration

Edit `/frontend/.env` (or `.env.local`):

```bash
# MercadoPago Public Key (for Checkout Bricks)
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-your-public-key-here

# API Base URL
VITE_API_BASE_URL=http://localhost:4000
```

**Important Notes:**
- ⚠️ Never commit actual credentials to Git
- ⚠️ Use `.env.example` files as templates
- ✅ Use TEST credentials for development
- ✅ Switch to production credentials only when deploying

---

## Database Setup

### Step 1: Verify Required Tables

Run the verification script:

```bash
# From project root
cd backend
bun run supabase:verify-tables
```

Or manually run in Supabase SQL Editor:
```sql
-- File: backend/scripts/verify-mercadopago-tables.sql
```

### Step 2: Create Missing Tables

If tables are missing, run these migrations in order:

```bash
# 1. Create subscription_plans table
# File: backend/scripts/migrations/001_create_subscription_plans_table.sql

# 2. Create subscriptions table
# File: backend/scripts/migrations/002_create_subscriptions_table.sql

# 3. Add MercadoPago fields
# File: backend/migrations/add_mercadopago_fields.sql
```

### Step 3: Seed Subscription Plans

```sql
-- Insert default plans
INSERT INTO subscription_plans (plan_id, name, display_name, price_monthly, price_yearly, currency, is_active)
VALUES
  ('free', 'free', 'Free', 0, 0, 'ARS', true),
  ('basic', 'basic', 'Basic', 29000, 290000, 'ARS', true),
  ('professional', 'professional', 'Professional', 79000, 790000, 'ARS', true);
```

---

## Webhook Configuration

Webhooks allow MercadoPago to notify your server when payment status changes.

### Development Environment (Using ngrok)

#### Step 1: Install ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

#### Step 2: Start ngrok Tunnel

```bash
# Expose your local backend (port 4000)
ngrok http 4000
```

You'll see output like:
```
Forwarding https://abc123.ngrok.io -> http://localhost:4000
```

#### Step 3: Configure Webhook in MercadoPago

1. Go to [MercadoPago Developers](https://www.mercadopago.com.ar/developers)
2. Select your application
3. Navigate to **"Webhooks"** or **"Notifications"**
4. Add a new webhook:
   - **URL:** `https://your-ngrok-url.ngrok.io/api/webhooks/mercadopago`
   - **Events:** Select "Payments"
5. Save the configuration

#### Step 4: Verify Webhook

MercadoPago will send a test notification. Check your backend logs:

```bash
# In backend terminal
bun run dev

# You should see:
# [MercadoPagoController] Received MercadoPago webhook: {...}
```

### Production Environment

For production, configure the webhook with your actual domain:

```
https://api.yourdomain.com/api/webhooks/mercadopago
```

**Security Recommendations:**
- ✅ Use HTTPS only
- ✅ Verify webhook signatures (optional but recommended)
- ✅ Log all webhook events to `webhook_logs` table
- ✅ Implement idempotency to handle duplicate notifications

---

## Testing the Integration

### Option 1: Automated Test Script

Run the end-to-end test script:

```bash
# From project root
node backend/scripts/test-payment-flow.js
```

This script will:
1. Authenticate a test user
2. Create a subscription
3. Generate a checkout preference
4. Guide you through manual payment testing

### Option 2: Manual Testing

#### Step 1: Start the Application

```bash
# Terminal 1: Backend
cd backend
bun run dev

# Terminal 2: Frontend
cd frontend
bun run dev

# Terminal 3: ngrok (for webhooks)
ngrok http 4000
```

#### Step 2: Create a Test Account

1. Go to `http://localhost:3000`
2. Sign up with a test email
3. Create an organization

#### Step 3: Select a Plan

1. Navigate to **Pricing** page
2. Click **"Upgrade"** on a paid plan (Basic or Professional)

#### Step 4: Complete Payment

1. The payment modal will open with MercadoPago Checkout Bricks
2. Use MercadoPago test cards:

**Test Cards for Argentina (ARS):**

| Card Network | Number | CVV | Expiry | Result |
|-------------|---------|-----|--------|--------|
| Mastercard | `5031 7557 3453 0604` | 123 | 11/25 | ✅ Approved |
| Visa | `4509 9535 6623 3704` | 123 | 11/25 | ✅ Approved |
| Rejected | `5031 7557 3453 0604` | 123 | 11/25 | ❌ Rejected (insufficient funds) |

**Complete documentation:** https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/test-cards

#### Step 5: Verify Payment Flow

1. **Success Flow:**
   - Payment processed successfully
   - Redirected to `/payment/success`
   - Subscription status changes to `active` or `trialing`
   - User receives confirmation

2. **Failure Flow:**
   - Payment rejected
   - Redirected to `/payment/failure`
   - Subscription remains `pending_payment`

3. **Pending Flow:**
   - Payment pending (cash, bank transfer)
   - Redirected to `/payment/pending`
   - Subscription status `pending`
   - Activated when webhook confirms payment

#### Step 6: Verify Webhook Processing

Check backend logs for:

```
[MercadoPagoService] Processing MercadoPago webhook: { type: 'payment', ... }
[MercadoPagoService] Payment approved: { paymentId: '...', subscriptionId: '...' }
[MercadoPagoService] Subscription activated successfully
```

Check database:

```sql
-- Verify subscription was activated
SELECT subscription_id, status, current_period_start, next_billing_date
FROM subscriptions
WHERE subscription_id = 'your-subscription-id';

-- Check payment record
SELECT payment_id, amount, status, payment_date
FROM manual_payments
WHERE subscription_id = 'your-subscription-id';

-- View webhook logs
SELECT event_type, event_data, processed, created_at
FROM webhook_logs
WHERE provider = 'mercadopago'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Switch from TEST to PRODUCTION credentials
- [ ] Configure production webhook URL
- [ ] Update FRONTEND_URL and BACKEND_URL
- [ ] Test with real payment methods
- [ ] Set up monitoring and alerts
- [ ] Configure backup payment gateway (optional)

### Environment Variables (Production)

```bash
# Backend
MERCADOPAGO_ACCESS_TOKEN=APP-your-production-access-token
MERCADOPAGO_PUBLIC_KEY=APP-your-production-public-key
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Frontend
VITE_MERCADOPAGO_PUBLIC_KEY=APP-your-production-public-key
VITE_API_BASE_URL=https://api.yourdomain.com
```

### Webhook Configuration (Production)

1. Update webhook URL in MercadoPago dashboard
2. Use production credentials
3. Enable webhook signature verification (recommended)

```javascript
// backend/controllers/MercadoPagoController.js
// Add signature verification in handleWebhook method

const signature = req.headers['x-signature'];
const requestId = req.headers['x-request-id'];

// Verify signature (MercadoPago provides verification SDK)
const isValid = mercadoPago.webhooks.verifySignature(
  req.body,
  signature,
  requestId
);

if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### Monitoring

Set up monitoring for:
- Payment success rate
- Webhook delivery rate
- Failed payments
- Subscription activations

```sql
-- Monitor payment statistics
SELECT
  DATE(payment_date) as date,
  COUNT(*) as total_payments,
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(amount) as total_amount
FROM manual_payments
WHERE payment_date >= NOW() - INTERVAL '30 days'
GROUP BY DATE(payment_date)
ORDER BY date DESC;
```

---

## Troubleshooting

### Issue: "MercadoPago service not initialized"

**Cause:** Access token not configured or invalid

**Solution:**
1. Check `.env` file has `MERCADOPAGO_ACCESS_TOKEN`
2. Restart backend server
3. Verify token is correct (starts with `TEST-` or `APP-`)

```bash
# Verify environment variable is loaded
cd backend
node -e "require('dotenv').config(); console.log('Token:', process.env.MERCADOPAGO_ACCESS_TOKEN);"
```

### Issue: Webhook not receiving notifications

**Cause:** Webhook URL not accessible or not configured

**Solution:**
1. Verify ngrok is running: `ngrok http 4000`
2. Check MercadoPago webhook configuration
3. Test webhook manually:

```bash
# Test webhook endpoint
curl -X POST http://localhost:4000/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "action": "payment.created",
    "data": { "id": "test123" }
  }'
```

4. Check backend logs for errors
5. Verify firewall allows incoming connections

### Issue: Payment Brick not loading

**Cause:** Public key not configured or CORS issues

**Solution:**
1. Check frontend `.env` has `VITE_MERCADOPAGO_PUBLIC_KEY`
2. Restart frontend dev server
3. Open browser console for errors
4. Verify MercadoPago SDK loads:

```javascript
// In browser console
console.log(window.MercadoPago);
```

### Issue: Subscription not activating after payment

**Cause:** Webhook not processed or database transaction failed

**Solution:**
1. Check `webhook_logs` table for webhook receipt
2. Check backend logs for processing errors
3. Manually verify payment in MercadoPago dashboard
4. Check subscription status:

```sql
SELECT subscription_id, status, payment_provider, provider_subscription_id
FROM subscriptions
WHERE subscription_id = 'your-subscription-id';
```

5. If webhook failed, manually activate:

```sql
UPDATE subscriptions
SET
  status = 'active',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '30 days',
  next_billing_date = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE subscription_id = 'your-subscription-id';
```

### Issue: Test payments failing with real cards

**Cause:** Using production credentials in test mode

**Solution:**
1. Verify you're using TEST credentials (starts with `TEST-`)
2. Use only test cards from MercadoPago documentation
3. Never use real cards in test environment

### Getting Help

- **MercadoPago Docs:** https://www.mercadopago.com.ar/developers
- **Support:** https://www.mercadopago.com.ar/developers/es/support
- **Test Cards:** https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/test-cards
- **Webhook Guide:** https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks

---

## Payment Flow Diagram

```
┌─────────────┐
│   User      │
│  Selects    │
│   Plan      │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Frontend: Create Subscription              │
│  POST /api/subscriptions                    │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Backend: Create Subscription Record        │
│  Status: pending_payment                    │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Frontend: Create MercadoPago Checkout      │
│  POST /api/mercadopago/create-checkout      │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Backend: Create Payment Preference         │
│  Returns: preferenceId, initPoint           │
└──────┬──────────────────────────────────────┘
       │
       ├─── Option A: Redirect Flow ───────────┐
       │                                        │
       ▼                                        ▼
┌─────────────────────┐           ┌──────────────────────┐
│  Redirect to MP     │           │  Payment Brick       │
│  Checkout           │           │  (In-page payment)   │
└─────────┬───────────┘           └──────────┬───────────┘
          │                                  │
          ▼                                  ▼
┌─────────────────────────────────────────────┐
│  User Completes Payment                     │
│  (Credit Card, Debit, Cash, etc.)           │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  MercadoPago Processes Payment              │
└──────┬──────────────────────────────────────┘
       │
       ├─── Approved ────┬─── Rejected ────┬─── Pending ────┐
       │                 │                 │                │
       ▼                 ▼                 ▼                ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐  ┌─────────────┐
│ MP Sends    │   │ MP Sends    │   │ MP Sends    │  │ User sees   │
│ Webhook     │   │ Webhook     │   │ Webhook     │  │ pending     │
│ (approved)  │   │ (rejected)  │   │ (pending)   │  │ message     │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘  └─────────────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend: Process Webhook                                       │
│  POST /api/webhooks/mercadopago                                 │
└──────┬──────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Backend: Update Subscription               │
│  - Approved: status = 'active'              │
│  - Rejected: status = 'cancelled'           │
│  - Pending: status = 'pending'              │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Backend: Record Payment                    │
│  Insert into manual_payments table          │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Frontend: Redirect to Success/Failure      │
│  /payment/success?payment_id=...            │
│  /payment/failure?payment_id=...            │
│  /payment/pending?payment_id=...            │
└─────────────────────────────────────────────┘
```

---

**Status:** ✅ Integration Complete
**Last Updated:** 2025-01-23
**Version:** 1.0.0
