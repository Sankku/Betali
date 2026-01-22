# 🚀 Phase 1: Subscription Plans Foundation - Implementation Guide

> **Status**: ✅ Implementation Complete
> **Date**: 2025-11-05
> **Phase**: 1 of 9 (Foundation & Plan Management)

---

## 📋 Table of Contents

- [Overview](#overview)
- [What Was Implemented](#what-was-implemented)
- [File Structure](#file-structure)
- [Setup Instructions](#setup-instructions)
- [Testing](#testing)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Next Steps](#next-steps)

---

## 🎯 Overview

Phase 1 implements the foundation of the subscription system:
- ✅ Database schema for subscription plans
- ✅ API endpoints to fetch plans
- ✅ Frontend hooks for plan management
- ✅ Limit enforcement middleware (ready to use)

This phase enables you to:
1. Display subscription plans on a pricing page
2. Check plan limits programmatically
3. Enforce resource limits via middleware
4. Build the foundation for payment integration (Phase 3-4)

---

## 🏗️ What Was Implemented

### **Backend**

#### **Database Migrations** (`/backend/scripts/migrations/`)
1. `001_create_subscription_plans_table.sql`
   - Creates `subscription_plans` table
   - Seeds 4 plans: Free, Starter, Professional, Enterprise
   - Includes limits, pricing, features

2. `002_create_subscriptions_table.sql`
   - Creates `subscriptions` table for active subscriptions
   - Links organizations to plans
   - Tracks trial periods, billing cycles

3. `003_create_usage_tracking_table.sql`
   - Creates `usage_tracking` table for monthly usage
   - Includes helper functions: `increment_usage()`, `get_or_create_current_usage()`

4. `004_update_organizations_table.sql`
   - Adds subscription fields to `organizations`
   - Foreign key to `subscription_plans`

#### **Repository Layer**
- **`SubscriptionPlanRepository.js`**
  - CRUD operations for plans
  - Helper methods: `getPlanLimits()`, `hasFeature()`, `getPlansComparison()`

#### **Service Layer**
- **`SubscriptionPlanService.js`**
  - Business logic for plans
  - Plan validation, recommendations
  - Proration calculations

#### **Controller Layer**
- **`SubscriptionPlanController.js`**
  - HTTP handlers for plan endpoints
  - Public and authenticated routes

#### **Middleware**
- **`limitEnforcement.js`**
  - `checkOrganizationLimit(resourceType)` - Enforce limits
  - `requireFeature(featureName)` - Require plan feature
  - `incrementUsage()` - Track usage
  - `getUsageSummary()` - Get current usage

#### **Routes**
- **`subscriptionPlans.js`**
  - Public routes (no auth)
  - Protected routes (with auth)
  - Admin routes (super_admin only)

### **Frontend**

#### **Services** (`/frontend/src/services/api/`)
- **`subscriptionService.ts`**
  - API client for subscription plans
  - Type definitions for plans, limits, features
  - Helper methods: `formatPrice()`, `calculateYearlySavings()`

#### **Hooks** (`/frontend/src/hooks/`)
- **`useSubscriptionPlans.ts`**
  - React Query hooks for fetching plans
  - `useSubscriptionPlans()` - Get all plans
  - `usePlansComparison()` - For pricing page
  - `usePlanLimits()` - Get plan limits
  - `usePlanFeature()` - Check feature availability
  - `useCanUpgrade()` - Check upgrade eligibility
  - `useLimitEnforcement()` - Handle limit errors
  - `useUsageStatus()` - Calculate usage percentage

---

## 📁 File Structure

```
backend/
├── scripts/
│   ├── migrations/
│   │   ├── 001_create_subscription_plans_table.sql
│   │   ├── 002_create_subscriptions_table.sql
│   │   ├── 003_create_usage_tracking_table.sql
│   │   └── 004_update_organizations_table.sql
│   ├── run-subscription-migrations.js
│   └── test-subscription-api.js
├── repositories/
│   └── SubscriptionPlanRepository.js
├── services/
│   └── SubscriptionPlanService.js
├── controllers/
│   └── SubscriptionPlanController.js
├── middleware/
│   └── limitEnforcement.js
└── routes/
    └── subscriptionPlans.js

frontend/
├── src/
│   ├── services/
│   │   └── api/
│   │       └── subscriptionService.ts
│   └── hooks/
│       └── useSubscriptionPlans.ts
```

---

## 🛠️ Setup Instructions

### **Step 1: Run Database Migrations**

**Option A: Using Supabase CLI** (Recommended)

```bash
cd backend

# Make sure you have Supabase CLI installed
# https://supabase.com/docs/guides/cli

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations manually
psql postgresql://USER:PASSWORD@HOST:PORT/DATABASE < scripts/migrations/001_create_subscription_plans_table.sql
psql postgresql://USER:PASSWORD@HOST:PORT/DATABASE < scripts/migrations/002_create_subscriptions_table.sql
psql postgresql://USER:PASSWORD@HOST:PORT/DATABASE < scripts/migrations/003_create_usage_tracking_table.sql
psql postgresql://USER:PASSWORD@HOST:PORT/DATABASE < scripts/migrations/004_update_organizations_table.sql
```

**Option B: Manual SQL Execution**

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of each migration file (in order)
3. Execute each migration

**Option C: Using Migration Script**

```bash
cd backend
node scripts/run-subscription-migrations.js
```

### **Step 2: Verify Tables**

Check that tables were created:

```sql
-- In Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('subscription_plans', 'subscriptions', 'usage_tracking');

-- Check seeded plans
SELECT name, display_name, price_monthly, price_yearly
FROM subscription_plans;
```

You should see 4 plans:
- free ($0/mo)
- starter ($29/mo)
- professional ($79/mo)
- enterprise ($199/mo)

### **Step 3: Start Backend Server**

```bash
cd backend
bun run dev
# or
npm run dev
```

Server should start on `http://localhost:4000`

### **Step 4: Test API Endpoints**

```bash
cd backend
node scripts/test-subscription-api.js
```

This will test all subscription plan endpoints.

---

## 🧪 Testing

### **Backend API Tests**

Run the comprehensive test suite:

```bash
cd backend
node scripts/test-subscription-api.js
```

**Expected Output:**
```
🚀 Starting Subscription Plans API Tests

📋 Testing: GET /api/subscription-plans
   Found 4 plans
      - Free: $0/mo
      - Starter: $29/mo
      - Professional: $79/mo
      - Enterprise: $199/mo
✅ PASS: GET /api/subscription-plans

... (more tests)

📊 Test Summary:
   ✅ Passed: 9
   ❌ Failed: 0
   📋 Total:  9

🎉 All tests passed!
```

### **Manual API Testing**

Using `curl`:

```bash
# Get all plans
curl http://localhost:4000/api/subscription-plans

# Get plans comparison
curl http://localhost:4000/api/subscription-plans/comparison

# Get specific plan
curl http://localhost:4000/api/subscription-plans/name/professional

# Get plan limits
curl http://localhost:4000/api/subscription-plans/professional/limits

# Check feature
curl http://localhost:4000/api/subscription-plans/professional/features/api_access
```

### **Frontend Testing**

1. Start frontend dev server:
```bash
cd frontend
bun run dev
```

2. Use React Query DevTools to inspect queries

3. Example component:
```tsx
import { usePlansComparison } from '@/hooks/useSubscriptionPlans';

function PricingPage() {
  const { data: plans, isLoading, error } = usePlansComparison();

  if (isLoading) return <div>Loading plans...</div>;
  if (error) return <div>Error loading plans</div>;

  return (
    <div>
      {plans?.map(plan => (
        <div key={plan.id}>
          <h3>{plan.displayName}</h3>
          <p>${plan.pricing.monthly}/month</p>
          <p>{plan.description}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 📡 API Endpoints

### **Public Endpoints** (No authentication required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscription-plans` | Get all public plans |
| GET | `/api/subscription-plans/comparison` | Get plans formatted for pricing page |
| GET | `/api/subscription-plans/:planId` | Get plan by ID |
| GET | `/api/subscription-plans/name/:planName` | Get plan by name |
| GET | `/api/subscription-plans/:planName/limits` | Get plan limits |
| GET | `/api/subscription-plans/:planName/features/:featureName` | Check if plan has feature |

### **Protected Endpoints** (Require authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subscription-plans/can-upgrade` | Check upgrade eligibility |
| POST | `/api/subscription-plans/recommend` | Get recommended plan based on usage |
| POST | `/api/subscription-plans/calculate-proration` | Calculate proration for plan change |

### **Admin Endpoints** (Require super_admin role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscription-plans/admin/all` | Get all plans (including inactive) |
| POST | `/api/subscription-plans/admin` | Create new plan |
| PUT | `/api/subscription-plans/admin/:planId` | Update plan |

---

## 💡 Usage Examples

### **Backend: Enforce Limits on Product Creation**

```javascript
// In routes/products.js
const { checkOrganizationLimit } = require('../middleware/limitEnforcement');

router.post(
  '/products',
  authenticateUser,
  requireOrganizationContext,
  checkOrganizationLimit('products'), // ✨ Add this line
  productController.create
);
```

When a user hits their limit:
```json
{
  "success": false,
  "error": "You have reached the products limit for your plan",
  "code": "LIMIT_EXCEEDED",
  "details": {
    "resource": "products",
    "current": 50,
    "limit": 50,
    "plan": "free",
    "upgradeAvailable": true
  }
}
```

### **Backend: Require Feature for API Access**

```javascript
const { requireFeature } = require('../middleware/limitEnforcement');

router.get(
  '/api/v1/data',
  authenticateUser,
  requireFeature('api_access'), // ✨ Check feature
  apiController.getData
);
```

### **Backend: Track Usage After Creation**

```javascript
const { incrementUsage } = require('../middleware/limitEnforcement');

// In ProductService.js
async createProduct(organizationId, productData) {
  const product = await ProductRepository.create(productData);

  // Increment usage counter
  await incrementUsage(organizationId, 'products');

  return product;
}
```

### **Frontend: Display Pricing Page**

```tsx
import { usePlansComparison, useFormatLimit } from '@/hooks/useSubscriptionPlans';

function PricingPage() {
  const { data: plans, isLoading } = usePlansComparison();
  const { formatLimit } = useFormatLimit();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="pricing-grid">
      {plans?.map(plan => (
        <PricingCard key={plan.id}>
          <h2>{plan.displayName}</h2>
          <p className="price">
            ${plan.pricing.monthly}
            <span>/month</span>
          </p>

          {plan.pricing.yearly > 0 && (
            <p className="savings">
              Save {plan.pricing.savings}% with annual billing
            </p>
          )}

          <ul>
            <li>👥 {formatLimit(plan.limits.users)} users</li>
            <li>📦 {formatLimit(plan.limits.products)} products</li>
            <li>🏢 {formatLimit(plan.limits.warehouses)} warehouses</li>
          </ul>

          <ul className="features">
            {plan.features.api_access && <li>✅ API Access</li>}
            {plan.features.advanced_analytics && <li>✅ Advanced Analytics</li>}
            {plan.features.priority_support && <li>✅ Priority Support</li>}
          </ul>

          <button>
            {plan.trial.available ? `Start ${plan.trial.days}-Day Trial` : 'Get Started'}
          </button>
        </PricingCard>
      ))}
    </div>
  );
}
```

### **Frontend: Check Usage Status**

```tsx
import { usePlanLimits, useUsageStatus } from '@/hooks/useSubscriptionPlans';
import { useOrganization } from '@/context/OrganizationContext';

function UsageDashboard() {
  const { currentOrganization } = useOrganization();
  const { data: limits } = usePlanLimits(currentOrganization?.subscription_plan);

  // Assume we fetch current usage from API
  const currentUsage = {
    products: 45,
    users: 2
  };

  const productsStatus = useUsageStatus(currentUsage.products, limits?.max_products);
  const usersStatus = useUsageStatus(currentUsage.users, limits?.max_users);

  return (
    <div>
      <UsageBar
        label="Products"
        current={currentUsage.products}
        limit={limits?.max_products}
        percentage={productsStatus.percentage}
        status={productsStatus.status}
      />

      {productsStatus.isApproachingLimit && (
        <Alert variant="warning">
          You're approaching your products limit. Consider upgrading.
        </Alert>
      )}

      {productsStatus.isAtLimit && (
        <Alert variant="error">
          You've reached your products limit. Upgrade to add more.
          <Button onClick={() => navigate('/billing')}>Upgrade Now</Button>
        </Alert>
      )}
    </div>
  );
}
```

### **Frontend: Handle Limit Errors**

```tsx
import { useLimitEnforcement } from '@/hooks/useSubscriptionPlans';
import { useMutation } from '@tanstack/react-query';

function CreateProductForm() {
  const { handleLimitError } = useLimitEnforcement();

  const createProduct = useMutation({
    mutationFn: (data) => productService.create(data),
    onError: (error) => {
      // Check if it's a limit error
      const wasLimitError = handleLimitError(error);

      if (!wasLimitError) {
        // Handle other errors
        toast.error('Failed to create product');
      }
    }
  });

  // ... rest of component
}
```

---

## 🎯 Next Steps

### **Immediate Actions**

1. ✅ **Run Migrations**: Execute all 4 SQL migration files
2. ✅ **Test API**: Run `test-subscription-api.js`
3. ✅ **Start Backend**: Verify endpoints work
4. ⚠️ **Apply Limit Middleware**: Add to existing routes (see examples above)

### **Phase 2: Usage Tracking & Enforcement** (Next)

Now that we have the foundation, Phase 2 will:
- Add limit checks to ALL resource creation endpoints
- Implement usage tracking hooks
- Create usage dashboard UI
- Add "Upgrade" CTAs when approaching limits

**Key files to modify in Phase 2:**
- `/backend/routes/products.js` - Add `checkOrganizationLimit('products')`
- `/backend/routes/users.js` - Add `checkOrganizationLimit('users')`
- `/backend/routes/warehouse.js` - Add `checkOrganizationLimit('warehouses')`
- `/backend/routes/clients.js` - Add `checkOrganizationLimit('clients')`
- `/backend/routes/suppliers.js` - Add `checkOrganizationLimit('suppliers')`
- `/backend/routes/orders.js` - Add `checkOrganizationLimit('orders_per_month')`
- `/backend/routes/stockMovements.js` - Add `checkOrganizationLimit('stock_movements_per_month')`

---

## 📚 Reference

### **Plan Structure**

```typescript
interface SubscriptionPlan {
  plan_id: string;
  name: 'free' | 'starter' | 'professional' | 'enterprise';
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;

  // Limits (-1 = unlimited)
  max_users: number;
  max_products: number;
  max_warehouses: number;
  max_stock_movements_per_month: number;
  max_orders_per_month: number;
  max_clients: number;
  max_suppliers: number;
  max_storage_mb: number;

  // Features
  features: {
    api_access: boolean;
    advanced_analytics: boolean;
    custom_reports: boolean;
    audit_logs: boolean;
    sso: boolean;
    priority_support: boolean;
  };

  trial_days: number;
  is_active: boolean;
  is_public: boolean;
}
```

### **Limit Error Response**

```json
{
  "success": false,
  "error": "You have reached the products limit for your plan",
  "code": "LIMIT_EXCEEDED",
  "details": {
    "resource": "products",
    "current": 50,
    "limit": 50,
    "plan": "free",
    "upgradeAvailable": true
  }
}
```

---

## ❓ Troubleshooting

### **Migration fails with "table already exists"**

Drop existing tables first:
```sql
DROP TABLE IF EXISTS usage_tracking CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
```

### **API returns 404**

- Check server is running: `curl http://localhost:4000/health`
- Check routes are registered in `server.js`
- Look for errors in server logs

### **Frontend can't fetch plans**

- Check CORS settings in backend
- Verify API_URL in frontend `.env`
- Check Network tab in browser DevTools

---

## 🎉 Congratulations!

You've successfully completed **Phase 1** of the subscription system!

Your app now has:
✅ Complete plan structure
✅ API to fetch plans
✅ Frontend hooks ready to use
✅ Limit enforcement middleware ready

**Ready for Phase 2?** Let me know when you want to proceed with adding usage tracking to all endpoints!

---

**Questions?** Review the [PRD-SUBSCRIPTION-BILLING-SYSTEM.md](PRD-SUBSCRIPTION-BILLING-SYSTEM.md) for the complete roadmap.
