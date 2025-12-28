# 💳 Betali - Payment & Subscription System Architecture

**Date**: December 20, 2025
**Priority**: 🔴 CRITICAL for SaaS Model
**Status**: Design Phase

---

## 🎯 Overview

Betali needs a **dual payment gateway system** to handle subscriptions globally:
- **Stripe** - International payments (USD, EUR, etc.)
- **Mercado Pago** - Latin America payments (ARS, BRL, CLP, etc.)

---

## 📊 Subscription Plans

### Plan Structure

| Plan | Price (USD/mo) | Price (ARS/mo) | Users | Organizations | Storage | Features |
|------|----------------|----------------|-------|---------------|---------|----------|
| **Free** | $0 | $0 | 1 | 1 | 100 MB | Basic features |
| **Basic** | $29 | $29,000 | 5 | 1 | 1 GB | + Purchase orders |
| **Professional** | $79 | $79,000 | 15 | 3 | 10 GB | + Advanced reports |
| **Enterprise** | $199 | $199,000 | Unlimited | Unlimited | Unlimited | + API access |

### Feature Matrix

| Feature | Free | Basic | Professional | Enterprise |
|---------|------|-------|--------------|------------|
| **Core** |
| Products | ✅ | ✅ | ✅ | ✅ |
| Warehouses | 1 | 3 | 10 | Unlimited |
| Stock Movements | ✅ | ✅ | ✅ | ✅ |
| **Orders** |
| Sales Orders | 10/mo | Unlimited | Unlimited | Unlimited |
| Purchase Orders | ❌ | ✅ | ✅ | ✅ |
| Bulk Operations | ❌ | ✅ | ✅ | ✅ |
| **Advanced** |
| Inventory Alerts | ❌ | ✅ | ✅ | ✅ |
| Reports & Export | ❌ | Basic | Advanced | Custom |
| API Access | ❌ | ❌ | ❌ | ✅ |
| **Support** |
| Support Level | Community | Email | Priority | Dedicated |
| Onboarding | Self | Email | Video call | White-glove |

---

## 🏗️ Database Schema

### Subscriptions Table

```sql
CREATE TABLE subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Plan details
  plan_id VARCHAR(50) NOT NULL, -- 'free', 'basic', 'professional', 'enterprise'
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'past_due', 'cancelled', 'trialing'

  -- Payment gateway
  payment_provider VARCHAR(20), -- 'stripe', 'mercadopago', 'manual'
  provider_subscription_id VARCHAR(255), -- Stripe/MP subscription ID
  provider_customer_id VARCHAR(255), -- Stripe/MP customer ID

  -- Billing
  currency VARCHAR(3) DEFAULT 'USD', -- 'USD', 'ARS', 'BRL', etc.
  amount DECIMAL(10,2) NOT NULL,
  billing_period VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'yearly'

  -- Dates
  trial_ends_at TIMESTAMP,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancelled_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_active_subscription
    UNIQUE(organization_id)
    WHERE status = 'active'
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_provider ON subscriptions(payment_provider, provider_subscription_id);
```

### Payment History Table

```sql
CREATE TABLE payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(subscription_id),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),

  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'succeeded', 'failed', 'pending', 'refunded'

  -- Provider info
  payment_provider VARCHAR(20) NOT NULL,
  provider_payment_id VARCHAR(255),
  provider_invoice_id VARCHAR(255),

  -- Metadata
  payment_method VARCHAR(50), -- 'card', 'bank_transfer', 'pix', etc.
  failure_reason TEXT,
  receipt_url TEXT,

  -- Dates
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_payments_subscription FOREIGN KEY (subscription_id)
    REFERENCES subscriptions(subscription_id) ON DELETE CASCADE
);

CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
```

### Plan Features Table

```sql
CREATE TABLE plan_features (
  feature_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id VARCHAR(50) NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  feature_value JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(plan_id, feature_key)
);

-- Seed initial features
INSERT INTO plan_features (plan_id, feature_key, feature_value) VALUES
('free', 'max_users', '1'),
('free', 'max_warehouses', '1'),
('free', 'max_monthly_orders', '10'),
('free', 'purchase_orders', 'false'),
('free', 'advanced_reports', 'false'),

('basic', 'max_users', '5'),
('basic', 'max_warehouses', '3'),
('basic', 'max_monthly_orders', 'unlimited'),
('basic', 'purchase_orders', 'true'),
('basic', 'advanced_reports', 'false'),

('professional', 'max_users', '15'),
('professional', 'max_warehouses', '10'),
('professional', 'max_monthly_orders', 'unlimited'),
('professional', 'purchase_orders', 'true'),
('professional', 'advanced_reports', 'true'),

('enterprise', 'max_users', 'unlimited'),
('enterprise', 'max_warehouses', 'unlimited'),
('enterprise', 'max_monthly_orders', 'unlimited'),
('enterprise', 'purchase_orders', 'true'),
('enterprise', 'advanced_reports', 'true'),
('enterprise', 'api_access', 'true');
```

---

## 🔌 Payment Gateway Integration

### Stripe Integration (International)

#### Setup

```javascript
// /backend/services/StripeService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {

  /**
   * Create customer in Stripe
   */
  async createCustomer(organization) {
    const customer = await stripe.customers.create({
      email: organization.owner_email,
      name: organization.name,
      metadata: {
        organization_id: organization.organization_id
      }
    });

    return customer.id;
  }

  /**
   * Create subscription
   */
  async createSubscription(customerId, priceId, trialDays = 14) {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: trialDays,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent']
    });

    return subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId) {
    return await stripe.subscriptions.cancel(subscriptionId);
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(subscriptionId, newPriceId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId
      }],
      proration_behavior: 'create_prorations'
    });
  }

  /**
   * Create checkout session
   */
  async createCheckoutSession(organization, priceId, successUrl, cancelUrl) {
    const session = await stripe.checkout.sessions.create({
      customer_email: organization.owner_email,
      client_reference_id: organization.organization_id,
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organization_id: organization.organization_id
        }
      }
    });

    return session;
  }
}

module.exports = StripeService;
```

#### Webhooks

```javascript
// /backend/routes/stripe-webhooks.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;

    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object);
      break;
  }

  res.json({ received: true });
});

module.exports = router;
```

---

### Mercado Pago Integration (Latin America)

#### Setup

```javascript
// /backend/services/MercadoPagoService.js
const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

class MercadoPagoService {

  /**
   * Create subscription plan
   */
  async createPlan(planData) {
    const plan = await mercadopago.plan.create({
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: planData.amount,
        currency_id: planData.currency || 'ARS'
      },
      back_url: planData.backUrl,
      reason: planData.name
    });

    return plan;
  }

  /**
   * Create subscription
   */
  async createSubscription(planId, customerEmail, organizationId) {
    const subscription = await mercadopago.subscriptions.create({
      plan_id: planId,
      payer: {
        email: customerEmail
      },
      external_reference: organizationId,
      back_url: process.env.FRONTEND_URL + '/billing/success',
      auto_recurring: {
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 day trial
      }
    });

    return subscription;
  }

  /**
   * Create preference for one-time payment
   */
  async createPreference(item, organizationId) {
    const preference = await mercadopago.preferences.create({
      items: [item],
      external_reference: organizationId,
      back_urls: {
        success: process.env.FRONTEND_URL + '/billing/success',
        failure: process.env.FRONTEND_URL + '/billing/failure',
        pending: process.env.FRONTEND_URL + '/billing/pending'
      },
      auto_return: 'approved',
      statement_descriptor: 'Betali Subscription'
    });

    return preference;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId) {
    return await mercadopago.subscriptions.update({
      id: subscriptionId,
      status: 'cancelled'
    });
  }
}

module.exports = MercadoPagoService;
```

#### Webhooks

```javascript
// /backend/routes/mercadopago-webhooks.js
const express = require('express');
const router = express.Router();

router.post('/webhooks/mercadopago', async (req, res) => {
  const { type, data } = req.body;

  // Handle different event types
  switch (type) {
    case 'payment':
      await handleMPPayment(data.id);
      break;

    case 'subscription':
      await handleMPSubscription(data.id);
      break;
  }

  res.sendStatus(200);
});

module.exports = router;
```

---

## 🎨 Frontend Components

### Pricing Page

```typescript
// /frontend/src/pages/Pricing.tsx
export default function PricingPage() {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: { usd: 0, ars: 0 },
      features: [
        '1 usuario',
        '1 almacén',
        '10 órdenes/mes',
        'Features básicas'
      ]
    },
    {
      id: 'basic',
      name: 'Basic',
      price: { usd: 29, ars: 29000 },
      features: [
        '5 usuarios',
        '3 almacenes',
        'Órdenes ilimitadas',
        'Órdenes de compra',
        'Alertas de inventario'
      ],
      popular: true
    },
    {
      id: 'professional',
      name: 'Professional',
      price: { usd: 79, ars: 79000 },
      features: [
        '15 usuarios',
        '10 almacenes',
        'Todo de Basic +',
        'Reportes avanzados',
        'Soporte prioritario'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: { usd: 199, ars: 199000 },
      features: [
        'Usuarios ilimitados',
        'Almacenes ilimitados',
        'Todo de Professional +',
        'API access',
        'Soporte dedicado'
      ]
    }
  ];

  return (
    <div className="grid md:grid-cols-4 gap-6">
      {plans.map(plan => (
        <PricingCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}
```

### Billing Dashboard

```typescript
// /frontend/src/pages/Billing.tsx
export default function BillingPage() {
  const { subscription } = useSubscription();
  const { paymentMethod } = usePaymentMethod();

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <h3>Plan Actual: {subscription.plan_name}</h3>
        <p>Estado: {subscription.status}</p>
        <p>Próximo pago: {subscription.next_billing_date}</p>
        <Button onClick={handleChangePlan}>Cambiar Plan</Button>
        <Button onClick={handleCancelSubscription}>Cancelar Suscripción</Button>
      </Card>

      {/* Payment Method */}
      <Card>
        <h3>Método de Pago</h3>
        {paymentMethod ? (
          <div>
            <p>Tarjeta: **** **** **** {paymentMethod.last4}</p>
            <Button onClick={handleUpdatePaymentMethod}>Actualizar</Button>
          </div>
        ) : (
          <Button onClick={handleAddPaymentMethod}>Agregar Método de Pago</Button>
        )}
      </Card>

      {/* Billing History */}
      <Card>
        <h3>Historial de Pagos</h3>
        <PaymentHistoryTable />
      </Card>
    </div>
  );
}
```

---

## 🔐 Feature Gating Middleware

```javascript
// /backend/middleware/featureGating.js
const { supabase } = require('../lib/supabase');

async function checkFeatureAccess(organizationId, featureKey) {
  // Get organization's subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single();

  if (!subscription) {
    return false; // No active subscription = free plan
  }

  // Check if plan has feature
  const { data: feature } = await supabase
    .from('plan_features')
    .select('feature_value')
    .eq('plan_id', subscription.plan_id)
    .eq('feature_key', featureKey)
    .single();

  if (!feature) return false;

  // Handle different feature types
  if (typeof feature.feature_value === 'boolean') {
    return feature.feature_value === 'true';
  }

  if (feature.feature_value === 'unlimited') {
    return true;
  }

  return parseInt(feature.feature_value) > 0;
}

const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    const organizationId = req.organizationContext?.organization?.organization_id;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const hasAccess = await checkFeatureAccess(organizationId, featureKey);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Feature not available',
        feature: featureKey,
        message: 'Upgrade your plan to access this feature'
      });
    }

    next();
  };
};

module.exports = { checkFeatureAccess, requireFeature };
```

---

## 🚀 Implementation Roadmap

### Phase 1: Database & Core (Week 1)
- [ ] Create subscription tables
- [ ] Create payment tables
- [ ] Seed plan features
- [ ] Implement subscription service
- [ ] Add feature gating middleware

### Phase 2: Stripe Integration (Week 2)
- [ ] Setup Stripe account
- [ ] Create product prices in Stripe
- [ ] Implement StripeService
- [ ] Setup webhook endpoints
- [ ] Test subscription flow

### Phase 3: Mercado Pago Integration (Week 2-3)
- [ ] Setup Mercado Pago account
- [ ] Create subscription plans in MP
- [ ] Implement MercadoPagoService
- [ ] Setup webhook endpoints
- [ ] Test subscription flow

### Phase 4: Frontend (Week 3-4)
- [ ] Pricing page
- [ ] Billing dashboard
- [ ] Payment method management
- [ ] Plan upgrade/downgrade flow
- [ ] Feature gates in UI

### Phase 5: Testing & Launch (Week 4)
- [ ] End-to-end testing
- [ ] Webhook testing
- [ ] Payment failure scenarios
- [ ] Refund handling
- [ ] Documentation

---

## 💡 Recommendations

### Immediate Actions
1. **Choose Primary Gateway**: Start with Stripe (easier, better docs)
2. **MVP Plans**: Launch with Free + Basic + Professional
3. **Trial Period**: Offer 14-day free trial on paid plans
4. **Billing Cycle**: Monthly only initially, add yearly later

### Best Practices
- **Graceful Degradation**: If payment fails, downgrade to Free instead of locking out
- **Prorated Upgrades**: Always prorate when upgrading mid-cycle
- **Cancellation**: Allow immediate cancellation, keep access until period ends
- **Invoices**: Auto-generate and email invoices
- **Failed Payments**: Retry 3 times over 2 weeks before downgrading

### Legal Requirements
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Refund Policy
- [ ] Tax compliance (VAT, sales tax)
- [ ] PCI compliance (handled by Stripe/MP)

---

## 📊 Success Metrics

### Key Metrics to Track
- MRR (Monthly Recurring Revenue)
- Churn rate
- Upgrade rate
- Trial conversion rate
- Payment failure rate
- Customer Lifetime Value (LTV)

---

**Status**: Architecture Complete ✅
**Next Step**: Database migrations & backend implementation
**Priority**: 🔴 CRITICAL for SaaS launch
