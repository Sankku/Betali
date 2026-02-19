# 🚀 Payment System MVP - Launch Checklist

Quick checklist to get your payment system production-ready for MVP launch.

---

## ⚡ Quick Start (5 Minutes)

### 1. Get MercadoPago Credentials

```bash
# 1. Go to: https://www.mercadopago.com.ar/developers
# 2. Create an application
# 3. Copy your TEST credentials
```

### 2. Configure Environment

```bash
# Backend: /backend/.env
MERCADOPAGO_ACCESS_TOKEN=TEST-your-token-here
BACKEND_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000

# Frontend: /frontend/.env
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-your-public-key-here
```

### 3. Start Everything

```bash
# Terminal 1: Backend
cd backend && bun run dev

# Terminal 2: Frontend
cd frontend && bun run dev

# Terminal 3: ngrok (for webhook testing)
ngrok http 4000
```

### 4. Test Payment

1. Go to `http://localhost:3000`
2. Sign up / Log in
3. Navigate to Pricing
4. Click "Upgrade" on Basic plan
5. Use test card: `5031 7557 3453 0604` / CVV: `123` / Exp: `11/25`

---

## 📋 Pre-Launch Checklist (Development)

### Database

- [ ] Verify tables exist (run `backend/scripts/verify-mercadopago-tables.sql`)
- [ ] Seed subscription plans
- [ ] Test subscription creation flow
- [ ] Verify foreign keys and constraints

**Quick verify:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('subscription_plans', 'subscriptions', 'manual_payments', 'webhook_logs');
```

### Backend Configuration

- [ ] `MERCADOPAGO_ACCESS_TOKEN` set in `.env`
- [ ] `BACKEND_URL` configured
- [ ] `FRONTEND_URL` configured
- [ ] MercadoPago service initializes successfully
- [ ] Routes registered in `server.js`
- [ ] Error handling tested

**Quick test:**
```bash
# Check if MP service initializes
cd backend
node -e "require('dotenv').config(); const mp = require('./services/MercadoPagoService'); mp.initialize(); console.log('✓ MP Service OK');"
```

### Frontend Configuration

- [ ] `VITE_MERCADOPAGO_PUBLIC_KEY` set in `.env`
- [ ] `VITE_API_BASE_URL` configured
- [ ] Payment routes registered in `App.tsx`
- [ ] MercadoPago Bricks component loads
- [ ] Payment modal functional

**Quick test:**
```bash
# Check env variables
cd frontend
node -e "console.log('Public Key:', process.env.VITE_MERCADOPAGO_PUBLIC_KEY || '❌ NOT SET')"
```

### Webhook Setup (ngrok for dev)

- [ ] ngrok installed
- [ ] ngrok tunnel running
- [ ] Webhook URL configured in MercadoPago dashboard
- [ ] Webhook endpoint responds to POST
- [ ] Webhook processing logged

**Setup ngrok:**
```bash
# Install
brew install ngrok

# Run
ngrok http 4000

# Configure in MP dashboard:
# https://your-ngrok-url.ngrok.io/api/webhooks/mercadopago
```

### End-to-End Testing

- [ ] User can sign up
- [ ] User can view pricing plans
- [ ] User can select a plan
- [ ] Payment modal opens with Checkout Bricks
- [ ] Test payment succeeds (approved card)
- [ ] User redirected to success page
- [ ] Subscription activated (status = active)
- [ ] Payment recorded in database
- [ ] Test payment rejection (insufficient funds)
- [ ] User redirected to failure page
- [ ] Subscription remains pending_payment

**Run automated test:**
```bash
node backend/scripts/test-payment-flow.js
```

---

## 🚀 Production Deployment Checklist

### 1. MercadoPago Production Setup

- [ ] Switch from TEST to PRODUCTION credentials
- [ ] Request production access (may require business verification)
- [ ] Update credentials in environment variables
- [ ] Test with real payment methods (small amounts)

### 2. Environment Variables (Production)

**Backend:**
```bash
MERCADOPAGO_ACCESS_TOKEN=APP-your-production-token
MERCADOPAGO_PUBLIC_KEY=APP-your-production-public-key
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

**Frontend:**
```bash
VITE_MERCADOPAGO_PUBLIC_KEY=APP-your-production-public-key
VITE_API_BASE_URL=https://api.yourdomain.com
```

### 3. Hosting Configuration

- [ ] Backend deployed (Vercel/Railway/Fly.io)
- [ ] Frontend deployed (Vercel/Netlify)
- [ ] Database accessible (Supabase production)
- [ ] HTTPS enabled on both
- [ ] CORS configured correctly
- [ ] Environment variables set in hosting platform

**Railway Example:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway login
railway init
railway up

# Set environment variables
railway variables set MERCADOPAGO_ACCESS_TOKEN=APP-...
```

**Vercel Example:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel --prod

# Set environment variables via Vercel dashboard or CLI
vercel env add VITE_MERCADOPAGO_PUBLIC_KEY
```

### 4. Webhook Configuration (Production)

- [ ] Configure production webhook URL
- [ ] Format: `https://api.yourdomain.com/api/webhooks/mercadopago`
- [ ] Enable webhook events: "Payments"
- [ ] Test webhook delivery
- [ ] Enable signature verification (recommended)

**In MercadoPago Dashboard:**
1. Go to "Your integrations" → Select your app
2. Navigate to "Webhooks" or "Notifications"
3. Add production webhook URL
4. Save and test

### 5. Security Hardening

- [ ] Enable HTTPS everywhere
- [ ] Implement rate limiting on payment endpoints
- [ ] Add CSRF protection
- [ ] Validate webhook signatures
- [ ] Never log full card details
- [ ] Implement proper error handling (don't leak sensitive info)
- [ ] Set secure session cookies
- [ ] Enable Supabase Row Level Security (RLS)

**Add webhook signature verification:**
```javascript
// backend/controllers/MercadoPagoController.js
const crypto = require('crypto');

const verifyWebhookSignature = (req) => {
  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];

  // Implement signature verification
  // See: https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks#signature-validation
};
```

### 6. Monitoring & Logging

- [ ] Set up error tracking (Sentry/LogRocket)
- [ ] Monitor payment success rate
- [ ] Track webhook delivery rate
- [ ] Alert on failed payments
- [ ] Log all payment attempts
- [ ] Monitor subscription churn

**Monitoring Queries:**
```sql
-- Payment success rate (last 24h)
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM manual_payments
WHERE payment_date >= NOW() - INTERVAL '24 hours';

-- Webhook processing rate
SELECT
  COUNT(*) as total_webhooks,
  SUM(CASE WHEN processed = true THEN 1 ELSE 0 END) as processed,
  ROUND(100.0 * SUM(CASE WHEN processed = true THEN 1 ELSE 0 END) / COUNT(*), 2) as process_rate
FROM webhook_logs
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

### 7. Legal & Compliance

- [ ] Terms of Service created
- [ ] Privacy Policy created
- [ ] Refund Policy defined
- [ ] GDPR compliance (if targeting EU)
- [ ] Data retention policy
- [ ] PCI DSS compliance (handled by MercadoPago)

**Required Legal Pages:**
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy
- `/refund-policy` - Refund Policy

### 8. User Communication

- [ ] Payment confirmation emails
- [ ] Payment failure emails
- [ ] Subscription renewal reminders
- [ ] Invoice generation
- [ ] Receipt emails
- [ ] Cancellation confirmations

**Email Templates Needed:**
- Payment success
- Payment failed
- Payment pending
- Subscription activated
- Subscription cancelled
- Payment retry notification

### 9. Testing Checklist (Production)

- [ ] Small test payment with real card (refund after)
- [ ] Webhook delivery confirmed
- [ ] User receives confirmation email
- [ ] Subscription activates correctly
- [ ] Payment appears in MercadoPago dashboard
- [ ] Database records created correctly
- [ ] Test refund process
- [ ] Test subscription cancellation

### 10. Performance Optimization

- [ ] Optimize payment page load time
- [ ] Lazy load MercadoPago SDK
- [ ] Implement caching where appropriate
- [ ] Optimize database queries
- [ ] Set up CDN for static assets
- [ ] Enable gzip compression

---

## 🔥 Common Issues & Quick Fixes

### Issue: "MercadoPago service not initialized"

```bash
# Check environment variable
echo $MERCADOPAGO_ACCESS_TOKEN

# If empty, set it:
export MERCADOPAGO_ACCESS_TOKEN=TEST-your-token

# Restart backend
```

### Issue: Webhook not working

```bash
# 1. Verify ngrok is running
ngrok http 4000

# 2. Test webhook endpoint manually
curl -X POST http://localhost:4000/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"test"}}'

# 3. Check webhook logs
SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 5;
```

### Issue: Payment Brick not loading

```javascript
// Check browser console for errors
// Verify public key is set:
console.log(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);

// Restart frontend dev server
```

### Issue: Subscription not activating

```sql
-- Check subscription status
SELECT subscription_id, status, payment_provider
FROM subscriptions
WHERE subscription_id = 'your-subscription-id';

-- Check webhook logs
SELECT event_type, processed, event_data
FROM webhook_logs
WHERE event_data->>'external_reference' = 'your-subscription-id'
ORDER BY created_at DESC;
```

---

## 📊 Success Metrics

Track these metrics post-launch:

### Payment Metrics
- **Payment Success Rate**: Target > 90%
- **Average Payment Time**: Target < 30 seconds
- **Webhook Delivery Rate**: Target > 99%

### Business Metrics
- **Trial Conversion Rate**: % of trials that convert to paid
- **Monthly Recurring Revenue (MRR)**: Total monthly revenue
- **Churn Rate**: % of subscriptions cancelled
- **Customer Lifetime Value (LTV)**: Average revenue per customer

### Technical Metrics
- **API Response Time**: Target < 500ms
- **Error Rate**: Target < 1%
- **Uptime**: Target > 99.9%

---

## 🎯 Post-Launch Improvements

### Phase 2 Enhancements
- [ ] Add Stripe as alternative payment gateway
- [ ] Implement automatic payment retries
- [ ] Add proration for mid-cycle upgrades
- [ ] Customer portal for subscription management
- [ ] Multi-currency support
- [ ] Annual billing discount
- [ ] Referral program
- [ ] Usage-based pricing tiers

### Optional Features
- [ ] Payment method management (save multiple cards)
- [ ] Invoice generation and download
- [ ] Payment history export
- [ ] Subscription pause/resume
- [ ] Add-on purchases
- [ ] Coupon/promo codes
- [ ] Team billing (pay for multiple seats)

---

## 📚 Resources

### Documentation
- [MercadoPago Developer Docs](https://www.mercadopago.com.ar/developers)
- [Checkout Bricks Guide](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks)
- [Test Cards](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/test-cards)
- [Webhook Guide](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)

### Internal Docs
- [Full Setup Guide](./MERCADOPAGO_SETUP.md)
- [Payment System Architecture](./architecture/PAYMENT-SYSTEM-ARCHITECTURE.md)
- [Subscription Billing PRD](./prds/PRD-SUBSCRIPTION-BILLING-SYSTEM.md)

### Support
- MercadoPago Support: https://www.mercadopago.com.ar/developers/es/support
- Community Forum: https://www.mercadopago.com.ar/developers/es/community

---

## ✅ Final Check

Before going live, verify:

```bash
# 1. Backend health check
curl https://api.yourdomain.com/health

# 2. Frontend loads
curl https://yourdomain.com

# 3. Payment endpoint accessible
curl https://api.yourdomain.com/api/mercadopago/payment-methods/AR

# 4. Webhook endpoint accessible
curl https://api.yourdomain.com/api/webhooks/mercadopago

# 5. Environment variables set
# Check in your hosting dashboard
```

**All green?** 🎉 **You're ready to launch!**

---

**Status:** ✅ Ready for Production
**Last Updated:** 2025-01-23
**Estimated Setup Time:** 2-3 hours (dev) + 4-6 hours (production)
