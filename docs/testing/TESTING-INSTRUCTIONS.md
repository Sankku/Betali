# 🧪 Testing Instructions - Stock Validation System

## ✅ System Status

**Date**: 2025-12-06
**Status**: Ready to Test
**Implementation**: 100% Complete

---

## 🚀 Quick Start

### **Step 1: Start the Servers**

```bash
# Terminal 1 - Backend
cd backend
node server.js

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### **Step 2: Login**

- Go to http://localhost:3000
- Login with: `betali.business@gmail.com`
- Use your password

### **Step 3: Create Test Data**

Before testing, you need:
1. At least 1 warehouse
2. At least 1 product with stock

**Option A - Use existing data** (if you already have warehouses/products)

**Option B - Create via UI**:
1. Go to Warehouses → Create new warehouse
2. Go to Products → Create new product
3. Go to Stock Movements → Add stock to product

**Option C - Use script** (requires warehouse exists):
```bash
cd backend
node scripts/create-test-data.js
```

---

## 🧪 Test Cases

### **Test 1: Sufficient Stock** ✅

**Steps**:
1. Go to Orders → Create New Order
2. Select warehouse
3. Select product with 100+ units
4. Enter quantity: 50
5. **Expected**: Green message "✓ Stock available"

---

### **Test 2: Low Stock Warning** ⚠️

**Steps**:
1. Create order
2. Select warehouse
3. Select product with 8 units available
4. Enter quantity: 5
5. **Expected**: Yellow warning "⚠️ Low stock: Only 8 units available"

---

### **Test 3: Insufficient Stock** ❌

**Steps**:
1. Create order
2. Select warehouse
3. Select product with 5 units available
4. Enter quantity: 10
5. **Expected**:
   - Red error message "Only 5 units available. You're trying to order 10."
   - Input border turns red

---

### **Test 4: Out of Stock** ❌

**Steps**:
1. Create order
2. Select warehouse
3. Select product with 0 units
4. Enter any quantity
5. **Expected**: Red error "Product is out of stock"

---

### **Test 5: No Warehouse Selected**

**Steps**:
1. Create order
2. Don't select warehouse (leave as "No warehouse")
3. Select product
4. Enter quantity
5. **Expected**: No validation shown (graceful degradation)

---

### **Test 6: Loading State** ⏳

**Steps**:
1. Create order
2. Select warehouse
3. Select product
4. **Expected**: Brief "Checking stock..." message while loading

---

### **Test 7: Real-time Updates** 🔄

**Steps**:
1. Create order with product (quantity: 5)
2. See green "✓ Stock available"
3. Change quantity to 200
4. **Expected**: Error appears immediately (no page refresh needed)

---

### **Test 8: Available Stock Display**

**Steps**:
1. Create order
2. Select warehouse and product
3. **Expected**: Shows "(X available)" next to "Quantity *" label
4. Example: "Quantity * (150 available)"

---

## 🔍 Visual Examples

### **Green (Sufficient)**:
```
Quantity *  (150 available)
┌─────────┐
│   50    │
└─────────┘
✓ Stock available
```

### **Yellow (Low Stock)**:
```
Quantity *  (8 available)
┌─────────┐
│    5    │
└─────────┘
┌─────────────────────────────────────┐
│ ⚠️ Low stock: Only 8 units available│
└─────────────────────────────────────┘
```

### **Red (Insufficient)**:
```
Quantity *  (5 available)
┌─────────┐  ← Red border
│   10    │
└─────────┘
┌───────────────────────────────────────────────┐
│ ❌ Only 5 units available. You're trying to  │
│    order 10.                                  │
└───────────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### **Issue: No validation showing**

**Possible causes**:
1. Warehouse not selected → Select a warehouse
2. Product not selected → Select a product
3. Backend not running → Start backend server
4. Migration not applied → Apply stock_reservations migration

**Check**:
```bash
# Terminal 1: Check backend is running
curl http://localhost:4000/health

# Terminal 2: Check if warehouse selected
# Open browser console, type: console.log(document.querySelector('[name="warehouse_id"]').value)
```

---

### **Issue: Always shows "Checking stock..."**

**Possible causes**:
1. API endpoint error
2. Network timeout
3. Invalid product/warehouse ID

**Debug**:
```bash
# Open browser console (F12)
# Look for errors in Network tab
# Check API call: GET /api/products/:id/available-stock
```

---

### **Issue: Error "relation stock_reservations does not exist"**

**Solution**: Apply migration
```bash
# Go to Supabase SQL Editor
# Run: backend/scripts/migrations/006_create_stock_reservations_table.sql
```

---

## 📊 Backend API Testing

### **Test API Directly** (Optional):

```bash
# Get access token first
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "betali.business@gmail.com",
    "password": "YOUR_PASSWORD"
  }'

# Use token in next request
curl -X GET \
  "http://localhost:4000/api/products/PRODUCT_ID/available-stock?warehouse_id=WAREHOUSE_ID" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "x-organization-id: ORG_ID"
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

---

## ✅ Success Checklist

After testing, verify:

- [ ] Green message appears for sufficient stock
- [ ] Yellow warning appears for low stock (< 10 units)
- [ ] Red error appears for insufficient stock
- [ ] Red error appears for out of stock
- [ ] Available stock count is shown in label
- [ ] Input border turns red on error
- [ ] Loading state appears briefly
- [ ] No validation when warehouse not selected
- [ ] Real-time updates work (no page refresh)
- [ ] Can still submit when stock is sufficient
- [ ] Can't submit when stock insufficient (form validation)

---

## 📝 Known Limitations

1. **Auto-refresh**: Stock updates every 10 seconds (configurable)
2. **Warehouse Required**: Validation only works when warehouse selected
3. **Single Warehouse**: Only checks stock in selected warehouse (not across all warehouses)

---

## 🎯 Next Steps After Testing

Once all tests pass:

1. ✅ Test with real production data
2. ✅ User acceptance testing
3. ✅ Performance testing with large datasets
4. ✅ Deploy to staging
5. ✅ Deploy to production

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Check backend logs
3. Verify migration was applied
4. Check that warehouse has stock data

**Files to check**:
- Frontend: `OrderItemWithStockValidation.tsx`
- Hook: `useAvailableStock.ts`
- Backend: `ProductController.js:getAvailableStock()`
- Database: Check `stock_reservations` table exists

---

**Happy Testing!** 🎉

If everything works as expected, the stock validation system is ready for production use!
