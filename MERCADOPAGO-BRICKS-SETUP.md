# 🧱 Mercado Pago Checkout Bricks - Setup Guide

**Date**: December 30, 2025
**Status**: ✅ Ready to Configure
**Integration Type**: Checkout Bricks (In-page payment)

---

## 🎯 What's Different with Bricks

### **Checkout Pro** (Previous)
- User redirects to mercadopago.com
- MP handles entire payment UI
- User returns to your site

### **Checkout Bricks** (Current) ✅
- **Payment form stays in your site**
- Modal with MP payment form
- Better UX - no redirects
- **You already have all the form components!**

---

## 📁 New Files Created

### Frontend Components:
1. ✅ `MercadoPagoBricks.tsx` - Payment form component
2. ✅ `PaymentModal.tsx` - Modal wrapper for payment
3. ✅ `CheckoutButtonBricks.tsx` - Button that opens modal
4. ✅ `Pricing.tsx` - **UPDATED** to use new button

### Backend:
- ✅ **No changes needed!** Same API as before

---

## 🔧 Configuration Steps

### 1. Environment Variables

Tu credencial de prueba que compartiste:
```
TEST-bfcb63e5-4a9d-4015-8617-d5a334555e85
```

#### Frontend `.env`
```bash
# Add this to frontend/.env
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-bfcb63e5-4a9d-4015-8617-d5a334555e85
VITE_API_URL=http://localhost:4000/api
```

#### Backend `.env`
```bash
# You need the ACCESS TOKEN (not the public key)
# Get it from: https://www.mercadopago.com.ar/developers/panel/app
MERCADOPAGO_ACCESS_TOKEN=TEST-your-access-token-here
BACKEND_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000

# Existing vars
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
PORT=4000
```

### 2. Get Your Access Token

1. Go to https://www.mercadopago.com.ar/developers
2. Click on your application
3. Go to "Credenciales"
4. Copy the **Access Token** (NOT Public Key)
   - Format: `TEST-xxxxx-xxxxx-xxxxx-xxxxx`
5. Add to backend `.env`

### 3. Apply Database Migration

Same as before:

```bash
# In Supabase SQL Editor, run:
backend/migrations/add_mercadopago_fields.sql
```

### 4. Configure Webhook (Same as before)

**For Development (ngrok):**
```bash
# Terminal 1
ngrok http 4000

# Copy the https URL
# Add to Mercado Pago Dashboard → Webhooks:
https://abc123.ngrok.io/api/webhooks/mercadopago
```

---

## 🎨 How the New Flow Works

### User Experience:

```
1. User at /dashboard/pricing
   ↓
2. Clicks "Upgrade Now"
   ↓
3. Card shows: "Listo para proceder con el pago"
   + Button: "Pagar Ahora"
   ↓
4. Click "Pagar Ahora"
   ↓
5. **Modal opens on same page** 🎉
   ↓
6. MP Brick loads payment form inside modal
   ↓
7. User enters card:
   - Card number
   - CVV
   - Expiration
   - Cardholder name
   - ID number
   ↓
8. Click "Pagar" button in form
   ↓
9. MP processes payment (in background)
   ↓
10. Success! Modal closes
    ↓
11. Redirects to /payment/success
    ↓
12. Webhook activates subscription
    ↓
13. User sees success page
```

**No redirects to MP site! Everything in your app! 🚀**

---

## 🧪 Testing

### 1. Start Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - ngrok (for webhooks)
ngrok http 4000
```

### 2. Test Flow

1. **Go to Pricing**
   ```
   http://localhost:3000/dashboard/pricing
   ```

2. **Select Plan**
   - Click "Upgrade Now" on any paid plan
   - Wait for overlay: "Listo para proceder con el pago"

3. **Open Payment Modal**
   - Click "Pagar Ahora"
   - Modal should open with MP payment form

4. **Fill Payment Form**
   ```
   Card Number: 5031 7557 3453 0604
   CVV: 123
   Expiration: 11/25
   Name: APRO
   DNI: 12345678
   ```

5. **Submit Payment**
   - Click "Pagar" in the form
   - Modal closes
   - Should redirect to `/payment/success`

6. **Verify**
   - Check success page shows payment details
   - Check database:
     ```sql
     SELECT * FROM subscriptions WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1;
     SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 1;
     ```

---

## 🎨 UI Components Details

### PaymentModal Features:

✅ Security badge with Mercado Pago logo
✅ Payment summary before form
✅ MP Brick loaded dynamically
✅ Loading states
✅ Error handling
✅ SSL/Security indicators
✅ Responsive design
✅ Close button (ESC key works)

### Modal Sections:

1. **Header**
   - Plan name
   - Total amount
   - Close button

2. **Security Notice**
   - Green badge
   - "Pago seguro con Mercado Pago"
   - Encryption info

3. **Payment Summary**
   - Plan details
   - Billing cycle
   - Total amount

4. **Payment Brick**
   - MP form (loads from their CDN)
   - Card inputs
   - Other payment methods (if available)

5. **Footer**
   - SSL badge
   - MP logo
   - Trust indicators

---

## 🔧 Customization Options

### Change Theme

In `MercadoPagoBricks.tsx`:

```typescript
const settings = {
  customization: {
    visual: {
      style: {
        theme: 'default', // ← Change to: 'dark', 'bootstrap', or 'flat'
      },
    },
  },
};
```

### Change Locale

```typescript
const mp = new window.MercadoPago(publicKey, {
  locale: 'es-AR' // ← Change to: 'pt-BR', 'en-US', 'es-MX', etc.
});
```

### Max Installments

```typescript
paymentMethods: {
  maxInstallments: 12, // ← Change max installments
  minInstallments: 1,
},
```

---

## 🐛 Troubleshooting

### Issue: Modal opens but form doesn't load

**Solutions:**
1. Check console for errors
2. Verify `VITE_MERCADOPAGO_PUBLIC_KEY` is set
3. Make sure key starts with `TEST-` or `APP_USR-`
4. Check internet connection (SDK loads from MP CDN)

### Issue: "Payment failed" but card is valid

**Solutions:**
1. Verify Access Token in backend `.env`
2. Check backend logs for API errors
3. Make sure you're using TEST credentials for testing
4. Verify webhook is receiving notifications

### Issue: Webhook not received

**Solutions:**
1. Check ngrok is running
2. Verify webhook URL in MP Dashboard
3. Check webhook_logs table:
   ```sql
   SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 5;
   ```

### Issue: Modal stays open after payment

**Solutions:**
1. Check `onPaymentSuccess` callback fires
2. Verify navigation works
3. Check console for errors
4. Make sure payment routes exist

---

## 📊 Supported Payment Methods

Depending on the country, Bricks supports:

### Argentina (ARS):
- 💳 Credit cards (Visa, Mastercard, Amex)
- 💳 Debit cards
- 🏪 Cash (Rapipago, Pago Fácil)
- 🏦 Bank transfer

### Brazil (BRL):
- 💳 Credit/Debit cards
- 🧾 Boleto bancário
- 💰 PIX

### Mexico (MXN):
- 💳 Credit/Debit cards
- 🏪 OXXO
- 🏦 Bank transfer

And more...

---

## 🔐 Security Features

✅ **PCI DSS Compliance** - Handled by Mercado Pago
✅ **No card data in your server** - MP processes directly
✅ **3D Secure** - Automatic fraud prevention
✅ **Tokenization** - Card data never touches your code
✅ **SSL/TLS** - Encrypted communication
✅ **Webhook validation** - Signature verification

---

## 🚀 Production Checklist

Before going live:

- [ ] Replace TEST credentials with PROD credentials
- [ ] Configure production webhook URL (HTTPS required)
- [ ] Test with real small amounts
- [ ] Configure SSL certificate
- [ ] Add error monitoring (Sentry)
- [ ] Set up email notifications
- [ ] Test all payment methods
- [ ] Test failed payments flow
- [ ] Test pending payments (cash/transfer)
- [ ] Add Terms of Service link in modal
- [ ] Add Privacy Policy link

---

## 📈 Advantages of Bricks vs Pro

### ✅ Better User Experience
- No redirect - stays in your site
- Faster - no page load
- Feels more integrated

### ✅ Better Conversion
- Less friction = more sales
- Trust - users see your branding
- Mobile friendly

### ✅ Customizable
- Match your design
- Control the flow
- Add your messaging

### ⚠️ Trade-offs
- Slightly more code to maintain
- SDK dependency (loaded from MP CDN)
- Need to handle more UI states

---

## 🎯 Summary

**Checkout Bricks is now fully integrated! 🎉**

### What Changed:
- ✅ `CheckoutButtonBricks` - Opens modal instead of redirect
- ✅ `PaymentModal` - Beautiful modal with MP form
- ✅ `MercadoPagoBricks` - MP SDK integration
- ✅ Same backend - no changes needed
- ✅ Same webhooks - automatic activation

### Configuration Needed:
1. Add `VITE_MERCADOPAGO_PUBLIC_KEY` to frontend `.env`
2. Add `MERCADOPAGO_ACCESS_TOKEN` to backend `.env`
3. Apply database migration (if not done)
4. Configure webhook with ngrok
5. Test with test card

**Time to test**: ~15 minutes
**Time to production**: Same as before (1 hour)

---

## 🎨 Next Steps

1. **Test the modal** - Make sure it opens and loads
2. **Complete a test payment** - Use test card
3. **Verify webhook** - Check subscription activates
4. **Customize styling** - Match your brand (optional)
5. **Add error messages** - Custom error handling (optional)

---

**Your Public Key:**
```
TEST-bfcb63e5-4a9d-4015-8617-d5a334555e85
```

**Don't forget to get your Access Token from MP Dashboard!**

🚀 Ready to test! Let me know if you need help with any step.
