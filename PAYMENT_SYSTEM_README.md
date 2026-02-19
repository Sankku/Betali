# 💳 Betali Payment System - Complete Guide

**Status**: ✅ 30% → **90% Complete** (MVP Ready!)

This document serves as the main entry point for understanding and working with Betali's payment system.

---

## 🎯 System Overview

Betali uses **MercadoPago** as the primary payment gateway for Latin American markets, supporting:

- ✅ **Credit/Debit Cards** (Visa, Mastercard, Amex, etc.)
- ✅ **Cash Payments** (RapiPago, PagoFácil, etc.)
- ✅ **Bank Transfers**
- ✅ **Installment Plans** (up to 12 installments)
- ✅ **Multiple Currencies** (ARS, USD, BRL, MXN, CLP, etc.)

---

## 📁 Documentation Structure

### Quick Start
- **[Payment MVP Checklist](./docs/PAYMENT_MVP_CHECKLIST.md)** ⚡
  - 5-minute quick start
  - Development checklist
  - Production deployment guide
  - **START HERE** if you want to launch quickly

### Detailed Setup
- **[MercadoPago Setup Guide](./docs/MERCADOPAGO_SETUP.md)** 📖
  - Complete step-by-step setup
  - Environment configuration
  - Webhook configuration
  - Troubleshooting guide
  - **READ THIS** for comprehensive understanding

### Architecture & Design
- **[Payment System Architecture](./docs/architecture/PAYMENT-SYSTEM-ARCHITECTURE.md)**
  - System architecture overview
  - Database schema
  - API endpoints
  - Flow diagrams

- **[Subscription Billing PRD](./docs/prds/PRD-SUBSCRIPTION-BILLING-SYSTEM.md)**
  - Product requirements
  - Feature specifications
  - Business logic

---

## 🚀 Quick Start (5 Minutes)

### 1. Get Credentials

Visit [MercadoPago Developers](https://www.mercadopago.com.ar/developers) and:
1. Create an application
2. Copy your **TEST** credentials:
   - Public Key (starts with `TEST-`)
   - Access Token (starts with `TEST-`)

### 2. Configure Environment

**Backend** (`/backend/.env`):
```bash
MERCADOPAGO_ACCESS_TOKEN=TEST-your-access-token-here
BACKEND_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`/frontend/.env`):
```bash
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-your-public-key-here
VITE_API_BASE_URL=http://localhost:4000
```

### 3. Start Development

```bash
# Terminal 1: Backend
cd backend
bun run dev

# Terminal 2: Frontend
cd frontend
bun run dev

# Terminal 3: Webhooks (for testing)
ngrok http 4000
```

### 4. Test Payment

1. Navigate to `http://localhost:3000`
2. Sign up / Log in
3. Go to **Pricing** → Select **Basic** plan
4. Use test card:
   - Number: `5031 7557 3453 0604`
   - CVV: `123`
   - Expiry: `11/25`
   - Name: Any name

✅ **Done!** Your payment should process successfully.

---

## 📦 What's Included

### Backend (Node.js + Express)

**Services:**
- `backend/services/MercadoPagoService.js` - MercadoPago integration
- `backend/services/SubscriptionService.js` - Subscription management

**Controllers:**
- `backend/controllers/MercadoPagoController.js` - Payment endpoints
- `backend/controllers/SubscriptionController.js` - Subscription endpoints

**Routes:**
- `backend/routes/mercadopago.js` - Payment routes
- `backend/routes/subscriptions.js` - Subscription routes

**Database:**
- `subscription_plans` - Available plans
- `subscriptions` - User subscriptions
- `manual_payments` - Payment records
- `webhook_logs` - Webhook events

### Frontend (React + TypeScript)

**Pages:**
- `frontend/src/pages/Dashboard/Pricing.tsx` - Pricing plans
- `frontend/src/pages/Dashboard/SubscriptionManagement.tsx` - Manage subscription
- `frontend/src/pages/Dashboard/PaymentSuccess.tsx` - Success page
- `frontend/src/pages/Dashboard/PaymentFailure.tsx` - Failure page
- `frontend/src/pages/Dashboard/PaymentPending.tsx` - Pending page

**Components:**
- `frontend/src/components/features/billing/PaymentModal.tsx` - Payment modal
- `frontend/src/components/features/billing/MercadoPagoBricks.tsx` - Payment form

**Services:**
- `frontend/src/services/api/mercadoPagoService.ts` - Payment API client
- `frontend/src/services/api/subscriptionService.ts` - Subscription API client

### Testing & Scripts

- `backend/scripts/test-payment-flow.js` - End-to-end payment testing
- `backend/scripts/verify-mercadopago-tables.sql` - Database verification

---

## 🔄 Payment Flow

```
User → Select Plan → Create Subscription → MercadoPago Checkout
                                              ↓
                                         Process Payment
                                              ↓
                                    ┌─────────┴─────────┐
                                    ↓                   ↓
                              Approved              Rejected
                                    ↓                   ↓
                            Webhook Sent        Show Error Page
                                    ↓
                          Update Subscription
                          (status = 'active')
                                    ↓
                            Redirect to Success
```

---

## 🔑 Key Features

### ✅ Implemented (MVP Ready)

- [x] **Multiple Payment Methods**
  - Credit/Debit cards
  - Cash payments
  - Bank transfers

- [x] **Subscription Management**
  - Create subscription
  - Activate on payment
  - Cancel subscription

- [x] **Payment Processing**
  - MercadoPago Checkout Bricks integration
  - Webhook handling
  - Payment status tracking

- [x] **User Experience**
  - Payment success/failure pages
  - Payment pending page
  - Real-time status updates

- [x] **Security**
  - PCI compliant (via MercadoPago)
  - HTTPS required
  - Secure token handling

- [x] **Testing**
  - Test environment setup
  - Test cards support
  - Automated testing script

### 🚧 Future Enhancements

- [ ] Stripe integration (international payments)
- [ ] Automatic payment retries
- [ ] Prorated upgrades/downgrades
- [ ] Invoice generation
- [ ] Annual billing discounts
- [ ] Coupon codes
- [ ] Usage-based pricing

---

## 📊 Database Schema

### Subscription Plans

```sql
CREATE TABLE subscription_plans (
  plan_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'ARS',
  trial_period_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  features JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Subscriptions

```sql
CREATE TABLE subscriptions (
  subscription_id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(organization_id),
  plan_id VARCHAR(50) REFERENCES subscription_plans(plan_id),

  status VARCHAR(20) DEFAULT 'pending_payment',
  -- 'pending_payment', 'active', 'trialing', 'past_due', 'cancelled'

  payment_provider VARCHAR(20), -- 'mercadopago', 'stripe', 'manual'
  provider_subscription_id VARCHAR(255),

  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  currency VARCHAR(3) DEFAULT 'ARS',

  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  next_billing_date TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Payments

```sql
CREATE TABLE manual_payments (
  payment_id UUID PRIMARY KEY,
  subscription_id UUID REFERENCES subscriptions(subscription_id),
  organization_id UUID REFERENCES organizations(organization_id),

  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'pending', 'confirmed', 'failed'

  payment_method VARCHAR(50),
  payment_date TIMESTAMP,
  confirmed_at TIMESTAMP,

  reference_number VARCHAR(255), -- MercadoPago payment ID
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🌐 API Endpoints

### Payment Endpoints

```
POST   /api/mercadopago/create-checkout     - Create payment checkout
GET    /api/mercadopago/payment/:id         - Get payment status
POST   /api/webhooks/mercadopago            - Webhook handler (public)
GET    /api/mercadopago/payment-methods/:cc - Get available payment methods
POST   /api/mercadopago/process-payment     - Process Payment Brick payment
```

### Subscription Endpoints

```
GET    /api/subscriptions/current           - Get current subscription
POST   /api/subscriptions                   - Create subscription
PUT    /api/subscriptions/:id               - Update subscription
DELETE /api/subscriptions/:id               - Cancel subscription
GET    /api/subscription-plans              - List available plans
```

---

## 🧪 Testing

### Automated Testing

Run the end-to-end test:

```bash
node backend/scripts/test-payment-flow.js
```

This will:
1. Authenticate test user
2. Create subscription
3. Generate checkout preference
4. Guide you through payment testing

### Manual Testing

**Test Cards (Argentina):**

| Card | Number | Result |
|------|--------|--------|
| Mastercard | `5031 7557 3453 0604` | ✅ Approved |
| Visa | `4509 9535 6623 3704` | ✅ Approved |
| Rejected | `5031 4332 1540 6351` | ❌ Rejected |

**All test cards:**
- CVV: `123`
- Expiry: Any future date
- Name: Any name
- Document: Any number

Full list: https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/test-cards

---

## 🐛 Troubleshooting

### Common Issues

**Issue: "MercadoPago service not initialized"**
- ✅ Check `MERCADOPAGO_ACCESS_TOKEN` is set
- ✅ Restart backend server
- ✅ Verify token format (starts with `TEST-` or `APP-`)

**Issue: Payment Brick not loading**
- ✅ Check `VITE_MERCADOPAGO_PUBLIC_KEY` is set
- ✅ Restart frontend dev server
- ✅ Check browser console for errors

**Issue: Webhook not working**
- ✅ Ensure ngrok is running
- ✅ Configure webhook URL in MP dashboard
- ✅ Check `webhook_logs` table for events

For more troubleshooting, see [MercadoPago Setup Guide](./docs/MERCADOPAGO_SETUP.md#troubleshooting).

---

## 🚀 Production Deployment

### Pre-Production Checklist

- [ ] Switch to PRODUCTION credentials
- [ ] Update environment variables on hosting platform
- [ ] Configure production webhook URL
- [ ] Test with real payments (small amounts)
- [ ] Enable monitoring and logging
- [ ] Set up error tracking (Sentry)
- [ ] Create legal pages (Terms, Privacy, Refund Policy)

**Detailed guide:** [Payment MVP Checklist](./docs/PAYMENT_MVP_CHECKLIST.md#production-deployment-checklist)

---

## 📈 Next Steps

### MVP Launch (This Week)

1. **Configure Production Credentials**
   - Get production access from MercadoPago
   - Update environment variables

2. **Deploy to Production**
   - Deploy backend (Railway/Fly.io)
   - Deploy frontend (Vercel)
   - Configure webhook URL

3. **Test Live Payment**
   - Make small test payment
   - Verify webhook delivery
   - Confirm subscription activation

4. **Launch!** 🎉

### Post-Launch (Phase 2)

1. Add Stripe for international payments
2. Implement automatic payment retries
3. Add invoice generation
4. Create customer portal
5. Add analytics dashboard

---

## 📚 Additional Resources

### External Documentation
- [MercadoPago Developer Portal](https://www.mercadopago.com.ar/developers)
- [Checkout Bricks Guide](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks)
- [Test Environment](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/test-cards)
- [Webhook Documentation](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)

### Internal Documentation
- [SAAS Architecture](./docs/architecture/SAAS_ARCHITECTURE.md)
- [Betali MCP Docs](./docs/architecture/BETALI_MCP_DOCS.md)
- [Cleanup Reports](./docs/cleanup/)

---

## 🆘 Support

### Need Help?

1. **Check Documentation**
   - Start with [Quick Start](#quick-start-5-minutes)
   - See [Troubleshooting](#troubleshooting)

2. **Run Test Script**
   ```bash
   node backend/scripts/test-payment-flow.js
   ```

3. **Check Logs**
   - Backend logs for errors
   - `webhook_logs` table for webhook issues
   - Browser console for frontend issues

4. **MercadoPago Support**
   - [Developer Support](https://www.mercadopago.com.ar/developers/es/support)
   - [Community Forum](https://www.mercadopago.com.ar/developers/es/community)

---

## ✅ Current Status Summary

### What Works ✅

- ✅ MercadoPago integration (30% → **90%**)
- ✅ Payment processing with Checkout Bricks
- ✅ Webhook handling and subscription activation
- ✅ Success/Failure/Pending pages
- ✅ Database schema and tables
- ✅ API endpoints (backend)
- ✅ Frontend components and pages
- ✅ Testing scripts

### What's Needed for MVP 🚧

- ❌ Configure production credentials (5 min)
- ❌ Deploy to hosting (2-3 hours)
- ❌ Configure production webhooks (10 min)
- ❌ Test live payment (15 min)

### Estimated Time to MVP: **3-4 hours**

---

**Last Updated:** 2025-01-23
**Version:** 1.0.0
**Status:** ✅ **MVP Ready - 90% Complete**
