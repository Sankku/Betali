# Production Setup Guide

This guide covers the configuration needed to deploy the billing/subscription system to production.

## Environment Variables

### Backend (.env)

```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=your-production-access-token
MERCADOPAGO_PUBLIC_KEY=your-production-public-key

# Application URLs
FRONTEND_URL=https://your-app.com
BACKEND_URL=https://api.your-app.com

# Email (Resend)
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=Betali <noreply@your-domain.com>

# Cron Security
CRON_SECRET=your-secure-random-string

# General
NODE_ENV=production
PORT=4000
```

### Frontend (.env)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://api.your-app.com
VITE_MERCADOPAGO_PUBLIC_KEY=your-production-public-key
```

## MercadoPago Setup

### 1. Create Production Credentials

1. Go to [MercadoPago Developers](https://www.mercadopago.com.ar/developers/panel)
2. Create a new application or select existing one
3. Go to "Credenciales de producción"
4. Copy the Access Token and Public Key

### 2. Configure Webhooks

1. In MercadoPago Developers panel, go to "Webhooks"
2. Add a new webhook:
   - URL: `https://api.your-app.com/api/webhooks/mercadopago`
   - Events: Select "Pagos" (Payments)
3. Save and note the webhook secret for verification (optional)

### 3. Required MercadoPago Scopes

Ensure your application has these scopes:
- `read` - Read payment information
- `write` - Create payments and preferences
- `offline_access` - For webhook notifications

## Email Configuration (Resend)

### 1. Setup Resend Account

1. Sign up at [Resend](https://resend.com)
2. Verify your domain (recommended for production)
3. Create an API key with "Sending access"

### 2. Domain Verification

For better deliverability:
1. Add your domain in Resend dashboard
2. Add the required DNS records (SPF, DKIM, DMARC)
3. Wait for verification (usually 24-48 hours)

### 3. Email Templates

The system sends these email types:
- Payment success confirmation
- Payment failure notification
- Trial ending soon (3 days before)
- Subscription expiring soon (7 days before)
- Subscription cancelled/downgraded

## Cron Jobs Setup

### Option 1: System Cron (Linux/Mac)

Add to crontab (`crontab -e`):

```bash
# Run subscription cron daily at midnight
0 0 * * * cd /path/to/backend && node scripts/run-subscription-cron.js >> /var/log/betali-cron.log 2>&1

# Or run every 6 hours for more frequent processing
0 */6 * * * cd /path/to/backend && node scripts/run-subscription-cron.js >> /var/log/betali-cron.log 2>&1
```

### Option 2: HTTP Endpoint (Cloud Scheduler)

Use a cloud scheduler (AWS CloudWatch, Google Cloud Scheduler, Vercel Cron, etc.) to call:

```bash
curl -X POST https://api.your-app.com/api/cron/subscriptions/process \
  -H "x-cron-secret: your-cron-secret"
```

### Option 3: Vercel Cron (if using Vercel)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/subscriptions/process",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## Database Migrations

Ensure these tables exist in your Supabase database:

1. `subscription_plans` - Plan definitions
2. `subscriptions` - Active subscriptions
3. `subscription_history` - Change history
4. `manual_payments` - Payment records
5. `webhook_logs` - MercadoPago webhook logs

Run migrations:
```bash
cd backend
node scripts/migrations/002_create_subscriptions_table.sql
```

## Security Checklist

### MercadoPago
- [ ] Use production credentials (not sandbox)
- [ ] Webhook URL uses HTTPS
- [ ] Never expose Access Token in frontend code

### API Security
- [ ] CRON_SECRET is set and strong (32+ characters)
- [ ] CORS configured for your domain only
- [ ] Rate limiting enabled
- [ ] Request validation middleware active

### Email
- [ ] Domain verified in Resend
- [ ] SPF, DKIM, DMARC configured
- [ ] Unsubscribe mechanism (for marketing emails)

### Database
- [ ] Row Level Security (RLS) enabled
- [ ] Service key not exposed to frontend
- [ ] Proper indexes on frequently queried columns

## Monitoring

### Recommended Logs to Monitor

1. **Payment failures**
   ```
   grep "Error processing payment" /var/log/betali.log
   ```

2. **Webhook processing**
   ```
   grep "MercadoPago webhook" /var/log/betali.log
   ```

3. **Cron job results**
   ```
   grep "Subscription cron" /var/log/betali-cron.log
   ```

### Key Metrics

- Payment success rate
- Webhook processing time
- Failed email count
- Trial conversion rate
- Churn rate (cancellations)

## Testing in Production

### 1. Test Payment Flow

1. Create a test subscription with a real card
2. Verify webhook received
3. Check subscription status updated
4. Verify confirmation email received

### 2. Test Cron Jobs

```bash
# Test individual tasks
curl -X POST https://api.your-app.com/api/cron/subscriptions/trial-expiring \
  -H "x-cron-secret: your-secret"
```

### 3. Test Email Delivery

Check Resend dashboard for:
- Delivery status
- Bounce rate
- Spam complaints

## Troubleshooting

### Payment Not Processing

1. Check MercadoPago credentials are production (not test)
2. Verify webhook URL is accessible
3. Check backend logs for errors
4. Verify subscription exists and is in correct status

### Emails Not Sending

1. Verify RESEND_API_KEY is set
2. Check domain verification status
3. Review Resend dashboard for errors
4. Check spam folder

### Cron Not Running

1. Verify CRON_SECRET matches
2. Check script permissions
3. Verify environment variables loaded
4. Check crontab syntax

## Support

For MercadoPago issues:
- [MercadoPago Developers Documentation](https://www.mercadopago.com.ar/developers/es/docs)
- [MercadoPago Support](https://www.mercadopago.com.ar/ayuda)

For Resend issues:
- [Resend Documentation](https://resend.com/docs)
- [Resend Support](https://resend.com/support)
