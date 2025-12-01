# 🚀 Phase 1 - Quick Start Guide

## ✅ Status: Ready to Test

All files have been created and syntax validated. Follow these steps to get started:

---

## 📋 Pre-flight Checklist

- [ ] Backend dependencies installed (`cd backend && bun install`)
- [ ] Frontend dependencies installed (`cd frontend && bun install`)
- [ ] Supabase credentials in `.env` files
- [ ] Backend server can start

---

## 🔧 Step 1: Run Database Migrations

Choose ONE method:

### **Method A: Supabase Dashboard (Recommended for beginners)**

1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste each file in order:
   - `backend/scripts/migrations/001_create_subscription_plans_table.sql`
   - `backend/scripts/migrations/002_create_subscriptions_table.sql`
   - `backend/scripts/migrations/003_create_usage_tracking_table.sql`
   - `backend/scripts/migrations/004_update_organizations_table.sql`
3. Execute each one
4. Verify tables exist in Table Editor

### **Method B: Using psql (Advanced)**

```bash
cd backend

# Replace with your Supabase connection string
export DB_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"

psql $DB_URL < scripts/migrations/001_create_subscription_plans_table.sql
psql $DB_URL < scripts/migrations/002_create_subscriptions_table.sql
psql $DB_URL < scripts/migrations/003_create_usage_tracking_table.sql
psql $DB_URL < scripts/migrations/004_update_organizations_table.sql
```

### **Verify Migration Success**

Run this SQL query in Supabase:

```sql
-- Should return 4 plans: free, starter, professional, enterprise
SELECT name, display_name, price_monthly, price_yearly
FROM subscription_plans
ORDER BY sort_order;
```

Expected output:
```
free         | Free         |  0.00 |    0.00
starter      | Starter      | 29.00 |  279.00
professional | Professional | 79.00 |  758.00
enterprise   | Enterprise   | 199.00 | 1910.00
```

---

## 🚀 Step 2: Start Backend Server

```bash
cd backend
bun run dev
```

You should see:
```
🚀 Server running on port 4000
✅ All middleware configured
✅ Routes registered
```

---

## 🧪 Step 3: Test API Endpoints

```bash
cd backend
node scripts/test-subscription-api.js
```

**Expected:**
```
✅ PASS: GET /api/subscription-plans
✅ PASS: GET /api/subscription-plans/comparison
✅ PASS: GET /api/subscription-plans/name/free
... (9 tests total)

🎉 All tests passed!
```

---

## 🎨 Step 4: Test Frontend (Optional)

```bash
cd frontend
bun run dev
```

Create a test component:

```tsx
// frontend/src/pages/TestPlans.tsx
import { usePlansComparison } from '@/hooks/useSubscriptionPlans';

export function TestPlans() {
  const { data: plans, isLoading, error } = usePlansComparison();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Subscription Plans</h1>
      {plans?.map(plan => (
        <div key={plan.id} style={{ border: '1px solid #ccc', padding: '20px', margin: '10px' }}>
          <h2>{plan.displayName}</h2>
          <p>${plan.pricing.monthly}/month</p>
          <p>{plan.description}</p>
          <ul>
            <li>Users: {plan.limits.users}</li>
            <li>Products: {plan.limits.products}</li>
            <li>Warehouses: {plan.limits.warehouses}</li>
          </ul>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔍 Troubleshooting

### ❌ "Cannot find module '../config/logger'"

**Fixed!** All logger imports corrected to use `../utils/Logger`

### ❌ "Cannot find module '../middleware/authMiddleware'"

**Fixed!** Routes updated to use `../middleware/auth`

### ❌ Server won't start

```bash
# Check for syntax errors
cd backend
node -c server.js

# Check environment variables
cat .env | grep SUPABASE
```

### ❌ API returns 404

Make sure `server.js` has this line:
```javascript
this.app.use('/api/subscription-plans', subscriptionPlanRoutes);
```

**Status:** ✅ Already added in line 199

---

## 📊 What You Can Do Now

### 1️⃣ **Display Plans on Pricing Page**

```tsx
import { usePlansComparison } from '@/hooks/useSubscriptionPlans';

function PricingPage() {
  const { data: plans } = usePlansComparison();
  return (
    <div className="pricing-grid">
      {plans?.map(plan => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}
```

### 2️⃣ **Enforce Limits on Product Creation**

```javascript
// backend/routes/products.js
const { checkOrganizationLimit } = require('../middleware/limitEnforcement');

router.post('/products',
  authenticateUser,
  checkOrganizationLimit('products'), // ✨ Add this
  productController.create
);
```

### 3️⃣ **Show Usage in Dashboard**

```tsx
import { usePlanLimits, useUsageStatus } from '@/hooks/useSubscriptionPlans';

function UsageDashboard() {
  const { data: limits } = usePlanLimits('free');
  const currentUsage = 45; // From your API

  const status = useUsageStatus(currentUsage, limits?.max_products);

  return (
    <div>
      <ProgressBar
        percentage={status.percentage}
        label={`Products: ${currentUsage} / ${limits?.max_products}`}
      />
      {status.isApproachingLimit && (
        <Alert>You're approaching your limit!</Alert>
      )}
    </div>
  );
}
```

---

## ✅ Verification Checklist

- [ ] Database migrations ran successfully
- [ ] Backend server starts without errors
- [ ] Test script passes all 9 tests
- [ ] Can fetch plans via API: `curl http://localhost:4000/api/subscription-plans`
- [ ] Plans show correct pricing and limits
- [ ] Frontend hook can fetch plans (if tested)

---

## 🎯 Next: Phase 2

Once Phase 1 is working:

1. **Add limit checks to ALL routes**:
   - Products
   - Users
   - Warehouses
   - Clients
   - Suppliers
   - Orders
   - Stock Movements

2. **Implement usage tracking**:
   - Auto-increment counters
   - Monthly reset
   - Usage dashboard

3. **Build UI components**:
   - Usage metrics cards
   - Upgrade prompts
   - Limit warnings

---

## 📚 Key Files

**Backend:**
- Routes: `/backend/routes/subscriptionPlans.js`
- Controller: `/backend/controllers/SubscriptionPlanController.js`
- Service: `/backend/services/SubscriptionPlanService.js`
- Repository: `/backend/repositories/SubscriptionPlanRepository.js`
- Middleware: `/backend/middleware/limitEnforcement.js`

**Frontend:**
- Service: `/frontend/src/services/api/subscriptionService.ts`
- Hooks: `/frontend/src/hooks/useSubscriptionPlans.ts`

**Scripts:**
- Migrations: `/backend/scripts/migrations/` (4 files)
- Test: `/backend/scripts/test-subscription-api.js`

---

## 🆘 Need Help?

1. Check [PHASE1-IMPLEMENTATION-GUIDE.md](PHASE1-IMPLEMENTATION-GUIDE.md) for detailed docs
2. Review [PRD-SUBSCRIPTION-BILLING-SYSTEM.md](PRD-SUBSCRIPTION-BILLING-SYSTEM.md) for the full plan
3. Check syntax: `node -c filename.js`
4. Check logs: Look at backend console output

---

**Status:** ✅ Phase 1 implementation complete and ready for testing!
**Next Steps:** Run migrations → Test API → Start Phase 2
