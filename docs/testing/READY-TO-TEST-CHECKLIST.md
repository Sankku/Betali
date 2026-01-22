# ✅ Ready to Test - Stock Reservation System

## 🎯 Pre-requisites

### 1. Database Migration Applied ⏳
**Status**: Waiting for you to apply

**Quick Apply**:
```
1. Go to: https://supabase.com/dashboard/project/gzqjhtzuongvbtdwvzaz/sql/new
2. Copy: backend/scripts/migrations/006_create_stock_reservations_table.sql
3. Paste & Run
```

**Verify it worked**:
```bash
node backend/scripts/test-stock-reservations.js
```

Expected output:
```
✅ stock_reservations table exists
✅ get_available_stock() works!
✅ get_reserved_stock() works!
```

---

## 🧪 Testing Sequence

### Phase 1: Database Verification ✅
```bash
# Run this AFTER applying migration
node backend/scripts/test-stock-reservations.js
```

**What it checks**:
- ✅ Table `stock_reservations` exists
- ✅ Function `get_available_stock()` works
- ✅ Function `get_reserved_stock()` works
- ✅ Can query and insert data

---

### Phase 2: API Endpoint Testing 🔄

#### Test 1: Check Available Stock
```bash
# Start the backend server first
cd backend && node server.js

# In another terminal, test the endpoint
curl -X GET \
  "http://localhost:4000/api/products/{PRODUCT_ID}/available-stock?warehouse_id={WAREHOUSE_ID}" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -H "x-organization-id: {YOUR_ORG_ID}"
```

**Expected Response**:
```json
{
  "product_id": "uuid",
  "warehouse_id": "uuid",
  "organization_id": "uuid",
  "available_stock": 100,
  "timestamp": "2025-12-06T..."
}
```

#### Test 2: Create Order with Stock Validation
```bash
curl -X POST \
  "http://localhost:4000/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -H "x-organization-id: {YOUR_ORG_ID}" \
  -d '{
    "warehouse_id": "uuid",
    "user_id": "uuid",
    "status": "pending",
    "items": [
      {
        "product_id": "uuid",
        "quantity": 10,
        "price": 100.00
      }
    ]
  }'
```

**What should happen**:
- ✅ Order created successfully
- ✅ No stock reserved yet (status = pending)

#### Test 3: Change Order to Processing (Auto-Reserve Stock)
```bash
curl -X PATCH \
  "http://localhost:4000/api/orders/{ORDER_ID}/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -H "x-organization-id: {YOUR_ORG_ID}" \
  -d '{
    "status": "processing"
  }'
```

**What should happen**:
- ✅ Order status changed to "processing"
- ✅ **Stock automatically reserved** (10 units)
- ✅ Available stock reduced (100 → 90)

#### Test 4: Check Available Stock Again
```bash
# Same as Test 1
curl -X GET \
  "http://localhost:4000/api/products/{PRODUCT_ID}/available-stock?warehouse_id={WAREHOUSE_ID}" \
  ...
```

**Expected Response**:
```json
{
  "available_stock": 90  // ✅ Reduced by 10!
}
```

#### Test 5: Fulfill Order (Deduct Physical Stock)
```bash
curl -X POST \
  "http://localhost:4000/api/orders/{ORDER_ID}/fulfill" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -H "x-organization-id: {YOUR_ORG_ID}"
```

**What should happen**:
- ✅ Order status changed to "shipped"
- ✅ Physical stock deducted (100 → 90)
- ✅ Reservations marked as "fulfilled"
- ✅ Available stock stays 90

#### Test 6: Cancel Order (Restore Stock)
```bash
curl -X PATCH \
  "http://localhost:4000/api/orders/{ORDER_ID}/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -H "x-organization-id: {YOUR_ORG_ID}" \
  -d '{
    "status": "cancelled"
  }'
```

**What should happen**:
- ✅ Order status changed to "cancelled"
- ✅ Physical stock **restored** (90 → 100)
- ✅ Reservations marked as "cancelled"
- ✅ Stock movements created (entry type)

---

### Phase 3: Integration Testing 🧪

```bash
# Run the full integration test suite
cd backend
npm test tests/integration/order-workflow.integration.test.js
```

**What it tests**:
1. ✅ Create order with valid stock
2. ✅ Reject order with insufficient stock
3. ✅ Reserve stock when status = processing
4. ✅ Calculate available stock correctly
5. ✅ Prevent double reservation
6. ✅ Fulfill order and deduct stock
7. ✅ Mark reservations as fulfilled
8. ✅ Restore stock on cancellation
9. ✅ Mark reservations as cancelled
10. ✅ Available stock API accuracy

---

## 📊 Test Data Setup

### Option 1: Use Existing Data
If you already have products, warehouses, and orders in your database, you can use them for testing.

### Option 2: Create Test Data
Run this script to create test data:

```bash
node backend/scripts/create-test-data.js
```

This will create:
- 1 test product
- Initial stock (100 units)
- 1 test warehouse

---

## 🔍 Verification Queries

### Check Stock Reservations
```sql
SELECT * FROM stock_reservations
WHERE organization_id = 'YOUR_ORG_ID'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Available vs Reserved Stock
```sql
SELECT
  p.name as product_name,
  get_reserved_stock(p.product_id, w.warehouse_id, p.organization_id) as reserved,
  get_available_stock(p.product_id, w.warehouse_id, p.organization_id) as available
FROM products p
CROSS JOIN warehouse w
WHERE p.organization_id = 'YOUR_ORG_ID'
  AND w.organization_id = 'YOUR_ORG_ID'
LIMIT 5;
```

### Check Stock Movements
```sql
SELECT
  product_id,
  movement_type,
  quantity,
  reference,
  movement_date
FROM stock_movements
WHERE organization_id = 'YOUR_ORG_ID'
ORDER BY movement_date DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Issue: "Table does not exist"
**Solution**: Migration not applied. Go back to step 1.

### Issue: "Function get_available_stock does not exist"
**Solution**: Migration partially applied. Re-run the entire migration file.

### Issue: "Stock not reserved when order status changed"
**Check**:
1. Order status changed to "processing"? (not "pending")
2. `OrderService.applyStatusChangeRules()` is being called?
3. Check logs: `grep "Reserving stock" backend/logs/*.log`

### Issue: "Available stock calculation wrong"
**Check**:
1. Run SQL query to verify:
   ```sql
   SELECT get_available_stock('PRODUCT_ID', 'WAREHOUSE_ID', 'ORG_ID');
   ```
2. Compare with manual calculation:
   ```sql
   -- Physical stock
   SELECT SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE -quantity END)
   FROM stock_movements
   WHERE product_id = 'PRODUCT_ID' AND warehouse_id = 'WAREHOUSE_ID';

   -- Reserved stock
   SELECT SUM(quantity)
   FROM stock_reservations
   WHERE product_id = 'PRODUCT_ID'
     AND warehouse_id = 'WAREHOUSE_ID'
     AND status = 'active';
   ```

### Issue: "Stock not restored on cancellation"
**Check**:
1. Order was in "shipped" or "completed" status before cancellation?
2. Check stock_movements for new "entry" type movements
3. Check logs: `grep "Restoring stock" backend/logs/*.log`

---

## ✅ Success Criteria

After all tests pass, you should see:

1. **Database**:
   - ✅ stock_reservations table populated
   - ✅ Correct reservation statuses (active/fulfilled/cancelled)
   - ✅ Stock movements match order actions

2. **API**:
   - ✅ Available stock endpoint returns correct values
   - ✅ Order creation validates stock
   - ✅ Status changes trigger reservations
   - ✅ Fulfillment deducts stock
   - ✅ Cancellation restores stock

3. **Business Logic**:
   - ✅ Can't oversell (insufficient stock error)
   - ✅ Available stock = physical - reserved
   - ✅ Reservations prevent concurrent overselling
   - ✅ Stock restoration works correctly

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. ✅ Implement frontend real-time validation
2. ✅ Add UI warnings for low stock
3. ✅ Create order history/audit log
4. ✅ Add email notifications
5. ✅ Performance testing with large datasets

---

**Ready to test?** Start with Phase 1 after applying the migration! 🎉
