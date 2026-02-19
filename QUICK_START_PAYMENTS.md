# ⚡ Quick Start - Payment System

**Get your payment system running in 5 minutes!**

---

## 🚀 Steps to Launch

### 1️⃣ Get MercadoPago Credentials (2 min)

1. Visit: https://www.mercadopago.com.ar/developers
2. Log in / Sign up
3. Create a new application
4. Go to **Credentials** → Copy **TEST** credentials:
   - **Public Key**: `TEST-abc123...`
   - **Access Token**: `TEST-xyz789...`

### 2️⃣ Configure Environment (1 min)

**Backend:**
```bash
# Edit: /backend/.env
MERCADOPAGO_ACCESS_TOKEN=TEST-paste-your-access-token-here
BACKEND_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
```

**Frontend:**
```bash
# Edit: /frontend/.env (create if doesn't exist)
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-paste-your-public-key-here
VITE_API_BASE_URL=http://localhost:4000
```

### 3️⃣ Install Dependencies (if needed)

```bash
# Backend (already installed)
cd backend
bun install

# Frontend
cd frontend
bun install
```

### 4️⃣ Start Development Servers (1 min)

```bash
# Terminal 1: Backend
cd backend
bun run dev

# Terminal 2: Frontend
cd frontend
bun run dev
```

Your app is now running:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:4000

### 5️⃣ Test Payment (1 min)

1. Go to http://localhost:3000
2. Sign up or log in
3. Click **Pricing** in menu
4. Click **Upgrade** on **Basic** plan
5. In payment form, use:
   - **Card:** `5031 7557 3453 0604`
   - **CVV:** `123`
   - **Expiry:** `11/25`
   - **Name:** Any name
6. Click **Pay**

✅ **Success!** You should be redirected to the success page.

---

## 🧪 Testing Webhooks (Optional - for full testing)

Webhooks allow MercadoPago to notify your server when payment completes.

### Install ngrok

```bash
# macOS
brew install ngrok

# Or download: https://ngrok.com/download
```

### Start ngrok

```bash
# In a new terminal (Terminal 3)
ngrok http 4000
```

You'll see:
```
Forwarding https://abc123.ngrok.io -> http://localhost:4000
```

### Configure Webhook in MercadoPago

1. Go to: https://www.mercadopago.com.ar/developers
2. Select your application
3. Go to **Webhooks** or **Notifications**
4. Add webhook URL: `https://abc123.ngrok.io/api/webhooks/mercadopago`
5. Select event: **Payments**
6. Save

Now when you make a test payment, MercadoPago will send a webhook to your local server!

---

## 📊 Verify It Works

### Check Subscription Status

```sql
-- In Supabase SQL Editor
SELECT subscription_id, status, plan_id, current_period_end
FROM subscriptions
WHERE organization_id = 'your-org-id'
ORDER BY created_at DESC
LIMIT 1;
```

Expected result:
- `status` = `'active'` or `'trialing'`
- `plan_id` = `'basic'`

### Check Payment Record

```sql
SELECT payment_id, amount, status, payment_date
FROM manual_payments
WHERE subscription_id = 'your-subscription-id'
ORDER BY payment_date DESC
LIMIT 1;
```

Expected result:
- `status` = `'confirmed'`
- `amount` = `29000` (for Basic plan in ARS)

---

## 🎯 Test Cards

### Argentina (ARS)

| Purpose | Card Number | CVV | Result |
|---------|-------------|-----|--------|
| **Approved** | `5031 7557 3453 0604` | 123 | ✅ Success |
| **Approved** | `4509 9535 6623 3704` | 123 | ✅ Success |
| **Rejected** | `5031 4332 1540 6351` | 123 | ❌ Insufficient funds |
| **Rejected** | `5031 7557 3453 0604` | 123 | ❌ Invalid CVV (use 999) |

**Expiry:** Any future date (e.g., `11/25`)
**Name:** Any name

More test cards: https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/test-cards

---

## ❓ Troubleshooting

### "MercadoPago service not initialized"

**Problem:** Access token not set

**Fix:**
```bash
# Check environment variable
cd backend
cat .env | grep MERCADOPAGO_ACCESS_TOKEN

# Should show: MERCADOPAGO_ACCESS_TOKEN=TEST-...
# If not, add it and restart backend
```

### Payment Brick not loading

**Problem:** Public key not set or frontend not restarted

**Fix:**
```bash
# Check environment variable
cd frontend
cat .env | grep VITE_MERCADOPAGO_PUBLIC_KEY

# Should show: VITE_MERCADOPAGO_PUBLIC_KEY=TEST-...
# If not, add it and restart frontend:
bun run dev
```

### Payment succeeds but subscription not activated

**Problem:** Webhook not configured or not processed

**Fix:**

1. **Without ngrok (normal for dev):**
   - This is expected! Webhooks won't work without ngrok
   - Subscription will stay `pending_payment`
   - You can manually activate:
   ```sql
   UPDATE subscriptions
   SET status = 'active',
       current_period_start = NOW(),
       current_period_end = NOW() + INTERVAL '30 days'
   WHERE subscription_id = 'your-subscription-id';
   ```

2. **With ngrok:**
   - Check ngrok is running: `ngrok http 4000`
   - Check webhook is configured in MP dashboard
   - Check `webhook_logs` table:
   ```sql
   SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 5;
   ```

---

## 📚 Next Steps

### Ready for More?

- **Full Setup Guide:** [docs/MERCADOPAGO_SETUP.md](./docs/MERCADOPAGO_SETUP.md)
- **MVP Checklist:** [docs/PAYMENT_MVP_CHECKLIST.md](./docs/PAYMENT_MVP_CHECKLIST.md)
- **Main README:** [PAYMENT_SYSTEM_README.md](./PAYMENT_SYSTEM_README.md)

### Going to Production?

See [Production Deployment Checklist](./docs/PAYMENT_MVP_CHECKLIST.md#production-deployment-checklist)

Key changes:
- Switch from TEST to PRODUCTION credentials
- Deploy to hosting (Vercel/Railway)
- Configure production webhook URL
- Test with real payment

---

## ✅ Checklist

- [ ] Got MercadoPago TEST credentials
- [ ] Set `MERCADOPAGO_ACCESS_TOKEN` in backend/.env
- [ ] Set `VITE_MERCADOPAGO_PUBLIC_KEY` in frontend/.env
- [ ] Backend running on http://localhost:4000
- [ ] Frontend running on http://localhost:3000
- [ ] Made test payment with test card
- [ ] Saw payment success page
- [ ] (Optional) Configured ngrok for webhooks
- [ ] (Optional) Verified subscription activated

---

**🎉 Congratulations!** Your payment system is working!

**Questions?** Check the [Full Documentation](./PAYMENT_SYSTEM_README.md)

---

**Last Updated:** 2025-01-23
