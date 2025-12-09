# 🚀 Next Session - Day 10 START HERE

**Session**: Day 10 - Purchase Orders Testing & Polish
**Status**: Ready to begin
**Current Progress**: 88%
**Goal**: Reach 90%+

---

## ✅ What Was Completed (Day 6-9)

### Backend (Day 6-7) ✅
- Database migration (3 tables: suppliers, purchase_orders, purchase_order_details)
- Repositories (PurchaseOrderRepository, PurchaseOrderDetailRepository)
- Service with business logic (stock integration!)
- Controller with 5 endpoints
- Routes with authentication and permissions
- Full multi-tenant isolation

### Frontend (Day 8-9) ✅
- TypeScript types and interfaces
- API service (purchaseOrdersService)
- Custom hooks (usePurchaseOrders)
- Form component (PurchaseOrderForm)
- Modal component (PurchaseOrderModal)
- List page component (PurchaseOrdersPage)
- Routing and navigation menu

**Total**: 17 files created, ~3,600 lines of code

---

## 🎯 Day 10 Goals

### Primary Goal

Complete testing of the Purchase Orders feature and ensure:
1. ✅ Migration applied successfully
2. ✅ Backend API works correctly
3. ✅ Frontend UI works correctly
4. ✅ Stock integration works (CRITICAL!)
5. ✅ Multi-tenant isolation works

---

## 📋 Step-by-Step Checklist

### Step 1: Apply Database Migration ⚠️ CRITICAL

**Location**: `backend/scripts/migrations/007_create_purchase_orders.sql`

**Option A: Supabase Dashboard** (Recommended)
```bash
# 1. Go to your Supabase project dashboard
# 2. Click "SQL Editor" in the left sidebar
# 3. Copy the entire contents of:
#    backend/scripts/migrations/007_create_purchase_orders.sql
# 4. Paste into the SQL Editor
# 5. Click "Run" (or press Ctrl+Enter)
# 6. Verify success message appears
```

**Option B: psql Command Line**
```bash
# Set your Supabase connection string
export DATABASE_URL="your_supabase_connection_string"

# Apply migration
psql $DATABASE_URL -f backend/scripts/migrations/007_create_purchase_orders.sql
```

**Option C: Node Script**
```bash
cd backend
node scripts/apply-purchase-orders-migration.js
```

**Verify Migration Success**
```bash
cd backend
node scripts/verify-purchase-orders-tables.js
```

Expected output:
```
✅ suppliers table exists
✅ purchase_orders table exists
✅ purchase_order_details table exists
✅ All tables created successfully!
```

### Step 2: Restart Backend Server

```bash
cd backend
node server.js
```

Expected output:
```
Server started on port 4000
✅ Purchase orders routes loaded
```

### Step 3: Start Frontend

```bash
cd frontend
npm run dev
```

Expected output:
```
Vite dev server running on http://localhost:3000
```

### Step 4: Manual Testing - Backend API

Use Postman, Insomnia, or curl to test the API directly.

**A. Get Auth Token**
```bash
# Login to get token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'
```

**B. Create a Supplier (if needed)**
```bash
curl -X POST http://localhost:4000/api/suppliers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Supplier Inc",
    "contact_name": "John Doe",
    "email": "supplier@test.com",
    "phone": "+1234567890",
    "cuit": "20-12345678-9"
  }'

# Save the supplier_id from the response
```

**C. Get Warehouse ID**
```bash
curl -X GET http://localhost:4000/api/warehouse \
  -H "Authorization: Bearer YOUR_TOKEN"

# Save a warehouse_id from the response
```

**D. Get Product IDs**
```bash
curl -X GET http://localhost:4000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"

# Save some product_ids from the response
```

**E. Create Purchase Order**
```bash
curl -X POST http://localhost:4000/api/purchase-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "supplier_id": "YOUR_SUPPLIER_ID",
    "warehouse_id": "YOUR_WAREHOUSE_ID",
    "expected_delivery_date": "2025-12-15",
    "status": "draft",
    "items": [
      {
        "product_id": "YOUR_PRODUCT_ID_1",
        "quantity": 100,
        "unit_price": 10.50
      },
      {
        "product_id": "YOUR_PRODUCT_ID_2",
        "quantity": 50,
        "unit_price": 25.00
      }
    ],
    "discount_amount": 0,
    "tax_amount": 0,
    "shipping_amount": 0,
    "notes": "Test purchase order"
  }'

# Expected response:
# - purchase_order_id
# - purchase_order_number (e.g., "PO-000001")
# - status: "draft"
# - total calculated correctly

# Save the purchase_order_id
```

**F. Get All Purchase Orders**
```bash
curl -X GET http://localhost:4000/api/purchase-orders \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should see the PO you just created
```

**G. Get Single Purchase Order**
```bash
curl -X GET http://localhost:4000/api/purchase-orders/YOUR_PURCHASE_ORDER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should include:
# - Purchase order details
# - Supplier info
# - Warehouse info
# - Line items (purchase_order_details)
```

**H. Update Status to Pending**
```bash
curl -X PATCH http://localhost:4000/api/purchase-orders/YOUR_PURCHASE_ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "pending"
  }'

# Expected: status updated to "pending"
```

**I. Approve Purchase Order**
```bash
curl -X PATCH http://localhost:4000/api/purchase-orders/YOUR_PURCHASE_ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "approved"
  }'

# Expected: status updated to "approved"
```

**J. Mark as Received (CRITICAL TEST!)** ⚠️
```bash
curl -X PATCH http://localhost:4000/api/purchase-orders/YOUR_PURCHASE_ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "received"
  }'

# Expected:
# - status updated to "received"
# - received_date set
# - Stock movements created! (verify in next step)
```

**K. Verify Stock Movements Created** ⚠️
```bash
curl -X GET http://localhost:4000/api/stock-movements \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected:
# - New stock movements with movement_type: "entry"
# - reference_type: "purchase_order"
# - reference_id: YOUR_PURCHASE_ORDER_ID
# - Quantities match your PO line items
```

**L. Verify Stock Increased**
```bash
curl -X GET http://localhost:4000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected:
# - Products in the PO should have increased stock
# - Check physical_stock values
```

### Step 5: Manual Testing - Frontend UI

Now test the complete flow via the UI:

**A. Navigate to Purchase Orders**
1. Open browser: http://localhost:3000
2. Login with your credentials
3. Click "Órdenes de Compra" in the sidebar
4. Verify page loads correctly

**B. Test Filters**
1. Search by PO number
2. Filter by status dropdown
3. Filter by supplier dropdown
4. Filter by warehouse dropdown
5. Verify table updates correctly

**C. Create Purchase Order**
1. Click "Nueva Orden de Compra"
2. Modal should open
3. Fill in form:
   - Select supplier
   - Select warehouse
   - Set expected delivery date
   - Add 2-3 products
   - Enter quantities and prices
   - Add discount/tax (optional)
   - Add notes (optional)
4. Click "Crear"
5. Verify:
   - Toast notification appears
   - Modal closes
   - Table refreshes
   - New PO appears in list

**D. Test Status Transitions**
1. Find your draft PO in the list
2. Click "Enviar" (Submit)
   - Confirm action
   - Verify status badge changes to "Pending"
3. Click "Aprobar" (Approve)
   - Confirm action
   - Verify status badge changes to "Approved"
4. Click "Recibir" (Receive) ⚠️ CRITICAL!
   - Read warning message about stock movements
   - Confirm action
   - Verify status badge changes to "Received"

**E. Verify Stock Updated**
1. Navigate to "Products" page
2. Find products from your PO
3. Verify stock increased by PO quantities
4. Navigate to "Stock Movements" page
5. Verify entry movements created with:
   - Type: "entry"
   - Reference: "purchase_order"
   - Correct quantities

**F. Test View Mode**
1. Click eye icon on any PO
2. Modal opens in view mode
3. All fields should be read-only
4. Verify data displays correctly

**G. Test Edit Mode** (draft only)
1. Create a new draft PO
2. Click edit icon
3. Modify some fields
4. Click "Guardar Cambios"
5. Verify changes saved

**H. Test Cancel**
1. Create a new draft PO
2. Click "Cancelar" button
3. Confirm cancellation
4. Verify status changes to "Cancelled"

### Step 6: Test Multi-Tenant Isolation

**Critical**: Ensure organizations cannot see each other's data!

**A. Create Second Organization** (if you don't have one)
1. Register new user with different email
2. Create new organization

**B. Test Isolation**
1. Login as User 1 (Organization A)
2. Create purchase order in Org A
3. Logout
4. Login as User 2 (Organization B)
5. Navigate to purchase orders
6. **Verify**: User 2 CANNOT see User 1's purchase orders
7. Create purchase order in Org B
8. Logout
9. Login as User 1 (Organization A)
10. **Verify**: User 1 CANNOT see User 2's purchase orders

### Step 7: Bug Fixes (if any)

If you encounter any issues:

1. **Check browser console** for errors
2. **Check backend logs** for errors
3. **Fix bugs** as needed
4. **Re-test** the fixed functionality

Common issues to check:
- [ ] Missing suppliers/warehouses/products
- [ ] Form validation errors
- [ ] API response errors
- [ ] Stock calculation errors
- [ ] Multi-tenant isolation bugs
- [ ] UI/UX issues

### Step 8: Polish & Improvements

**Optional improvements**:
- [ ] Add loading spinners where missing
- [ ] Improve error messages
- [ ] Add keyboard shortcuts
- [ ] Improve mobile responsiveness
- [ ] Add data-testid attributes for E2E tests

### Step 9: Create E2E Tests (Optional)

**Location**: `frontend/tests/e2e/purchase-orders/`

Create Playwright tests:

**`create-purchase-order.spec.ts`**
```typescript
test('should create and receive purchase order', async ({ page, authHelper }) => {
  // Login
  await authHelper.login('user@test.com', 'password');

  // Navigate to purchase orders
  await page.goto('/dashboard/purchase-orders');

  // Click "New Purchase Order"
  await page.click('button:has-text("Nueva Orden de Compra")');

  // Fill form
  await page.selectOption('select[name="supplier_id"]', 'supplier-uuid');
  await page.selectOption('select[name="warehouse_id"]', 'warehouse-uuid');

  // Add product
  await page.selectOption('select[name="items.0.product_id"]', 'product-uuid');
  await page.fill('input[name="items.0.quantity"]', '100');
  await page.fill('input[name="items.0.unit_price"]', '10.50');

  // Submit
  await page.click('button[type="submit"]');

  // Verify created
  await expect(page.locator('text=/PO-\\d{6}/').first()).toBeVisible();

  // Submit for approval
  await page.click('button:has-text("Enviar")');
  await page.click('button:has-text("Confirmar")');

  // Approve
  await page.click('button:has-text("Aprobar")');
  await page.click('button:has-text("Confirmar")');

  // Receive
  await page.click('button:has-text("Recibir")');
  await page.click('button:has-text("Confirmar")');

  // Verify stock updated
  await page.goto('/dashboard/stock-movements');
  await expect(page.locator('text=entry').first()).toBeVisible();
});
```

Run tests:
```bash
cd frontend
npm run test:e2e:ui
```

### Step 10: Documentation Update

Update the roadmap and progress:

1. Mark Day 10 as complete in roadmap
2. Update progress percentage (88% → 90%+)
3. Create summary of Day 10 work
4. Plan Week 3 tasks

---

## 🎯 Success Criteria

Day 10 is complete when:

✅ **Migration Applied**
- [ ] All 3 tables created
- [ ] Verification script passes

✅ **Backend Works**
- [ ] Can create purchase orders
- [ ] Can retrieve purchase orders
- [ ] Can update status
- [ ] Stock movements created on receive
- [ ] Multi-tenant isolation works

✅ **Frontend Works**
- [ ] Can create purchase orders via UI
- [ ] Can view purchase order details
- [ ] Can update status via actions
- [ ] Filters work correctly
- [ ] Stock updates visible in products page

✅ **No Critical Bugs**
- [ ] No console errors
- [ ] No server errors
- [ ] All flows work smoothly

✅ **Documentation**
- [ ] Day 10 summary created
- [ ] Roadmap updated
- [ ] Any bugs documented

---

## 📊 Expected Progress

**Before Day 10**: 88%
**After Day 10**: 90-92%

```
Before: █████████████████░░░ 88%
After:  ██████████████████░░ 90%+
```

---

## 🚨 Critical Tests

These are the most important tests - DO NOT SKIP:

1. **Stock Integration Test** ⚠️
   - Create PO
   - Mark as received
   - **Verify stock movements created**
   - **Verify stock increased in products**

2. **Multi-Tenant Isolation Test** ⚠️
   - Login as Org A
   - Create PO
   - Login as Org B
   - **Verify cannot see Org A's PO**

3. **Status Transition Test**
   - Test all valid transitions
   - **Verify invalid transitions rejected**

---

## 💡 Tips

1. **Use the documentation**:
   - `PURCHASE-ORDERS-BACKEND-COMPLETE.md`
   - `PURCHASE-ORDERS-FRONTEND-COMPLETE.md`

2. **Check existing data**:
   - Make sure you have suppliers, warehouses, and products before creating POs

3. **Use Supabase Dashboard**:
   - View tables directly
   - Check stock_movements table after receiving PO
   - Verify RLS policies active

4. **Browser DevTools**:
   - Network tab to see API calls
   - Console for errors
   - React DevTools to debug state

---

## 📝 After Testing

Create a summary document:

**`PURCHASE-ORDERS-TESTING-COMPLETE.md`**
```markdown
# Purchase Orders Testing - Day 10

## Tests Performed
- [x] Backend API tests
- [x] Frontend UI tests
- [x] Stock integration
- [x] Multi-tenant isolation

## Bugs Found
1. [Bug description]
   - Status: Fixed/In Progress
   - Fix: [What was done]

## Test Results
- Backend: ✅ All tests passed
- Frontend: ✅ All tests passed
- Stock: ✅ Movements created correctly
- Multi-tenant: ✅ Isolation working

## Screenshots
[Add screenshots of working features]

## Next Steps
- Week 3 planning
- Inventory alerts
- Help system
```

---

## 🎉 Ready to Start!

You have everything you need to complete Day 10:

✅ Complete backend implementation
✅ Complete frontend implementation
✅ Comprehensive documentation
✅ Step-by-step testing guide

**Good luck! 🚀**

---

**Last updated**: 2025-12-08
**Status**: Ready for Day 10
**Progress**: 88% → Target: 90%+
