# 🔥 Manual Smoke Test - Pricing System

## 📋 Pre-Test Setup

### ✅ **Before Starting:**
1. Ensure backend server is running (`bun run back`)
2. Ensure frontend is running (`bun run front`) 
3. Have a REST client ready (Postman, Insomnia, or curl)
4. Have valid authentication token
5. Know your organization ID

### 🔧 **Get Authentication Token:**
```bash
# Login to get token
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Expected Response:** Token in `data.token` field
**Mark as:** ✅ Pass / ❌ Fail / ⚠️ Partial

---

## 🧪 Test Section 1: Basic Server Health

### **Test 1.1: Server Status**
```bash
GET http://localhost:4000/health
```
**Expected:** `200 OK` with health status  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Write any issues here_

### **Test 1.2: Authentication Middleware**
```bash
GET http://localhost:4000/api/pricing/overview
Authorization: Bearer YOUR_TOKEN_HERE
```
**Expected:** `200 OK` or validation error (not 401 Unauthorized)  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Write any issues here_

---

## 🎯 Test Section 2: Pricing Calculations

### **Test 2.1: Basic Order Pricing Calculation**
```bash
POST http://localhost:4000/api/pricing/calculate
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "client_id": "test-client-123",
  "warehouse_id": "test-warehouse-456", 
  "items": [
    {
      "product_id": "test-product-789",
      "quantity": 10,
      "price": 25.00
    },
    {
      "product_id": "test-product-101",
      "quantity": 5, 
      "price": 50.00
    }
  ]
}
```
**Expected:** JSON response with `subtotal`, `tax_amount`, `total`, `line_items`  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record actual response or error_

### **Test 2.2: Order Pricing via Orders Endpoint**
```bash
POST http://localhost:4000/api/orders/calculate-pricing
Authorization: Bearer YOUR_TOKEN_HERE  
Content-Type: application/json

{
  "client_id": "test-client-123",
  "items": [
    {
      "product_id": "test-product-789",
      "quantity": 15,
      "price": 30.00
    }
  ]
}
```
**Expected:** Pricing calculation response  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record response_

---

## 🏷️ Test Section 3: Coupon Validation

### **Test 3.1: Valid Coupon Test**
```bash
POST http://localhost:4000/api/pricing/validate-coupon
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "coupon_code": "SAVE10",
  "order_data": {
    "items": [
      {
        "product_id": "test-product-789", 
        "quantity": 10,
        "price": 25.00
      }
    ]
  }
}
```
**Expected:** `valid: true/false` with discount details or error reason  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record validation result_

### **Test 3.2: Invalid Coupon Test**
```bash
POST http://localhost:4000/api/pricing/validate-coupon
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "coupon_code": "INVALID123",
  "order_data": {
    "items": [
      {
        "product_id": "test-product-789",
        "quantity": 5,
        "price": 20.00
      }
    ]
  }
}
```
**Expected:** `valid: false` with reason  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record response_

---

## 🏢 Test Section 4: Management Endpoints

### **Test 4.1: Get Pricing Overview**  
```bash
GET http://localhost:4000/api/pricing/overview
Authorization: Bearer YOUR_TOKEN_HERE
```
**Expected:** JSON with pricing system counts/overview  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record response structure_

### **Test 4.2: Get Tax Rates**
```bash
GET http://localhost:4000/api/pricing/taxes/rates
Authorization: Bearer YOUR_TOKEN_HERE
```
**Expected:** Array of tax rates (empty array is OK)  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record response_

### **Test 4.3: Create Tax Rate**
```bash
POST http://localhost:4000/api/pricing/taxes/rates
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Standard Tax",
  "description": "Standard sales tax",
  "rate": 0.08,
  "is_inclusive": false,
  "is_active": true
}
```
**Expected:** `201 Created` with created tax rate  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record tax_rate_id for next test_

### **Test 4.4: Get Discount Rules**
```bash
GET http://localhost:4000/api/pricing/discounts/rules
Authorization: Bearer YOUR_TOKEN_HERE
```
**Expected:** Array of discount rules (empty array is OK)  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record response_

---

## 📦 Test Section 5: Order Integration

### **Test 5.1: Create Order with Pricing**
```bash
POST http://localhost:4000/api/orders
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "client_id": "test-client-123",
  "warehouse_id": "test-warehouse-456",
  "notes": "Test order with pricing integration",
  "items": [
    {
      "product_id": "test-product-789",
      "quantity": 8,
      "price": 35.00
    }
  ]
}
```
**Expected:** `201 Created` with order including pricing fields  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record order_id and pricing fields_

### **Test 5.2: Get Created Order**
```bash
GET http://localhost:4000/api/orders/ORDER_ID_FROM_PREVIOUS_TEST
Authorization: Bearer YOUR_TOKEN_HERE
```
**Expected:** Order details with pricing breakdown  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Verify pricing fields are present_

---

## 🎯 Test Section 6: Product-Specific Features

### **Test 6.1: Get Product Pricing Tiers**
```bash
GET http://localhost:4000/api/pricing/products/test-product-789/tiers
Authorization: Bearer YOUR_TOKEN_HERE
```
**Expected:** Array of pricing tiers for product (empty is OK)  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record response_

### **Test 6.2: Create Pricing Tier**
```bash
POST http://localhost:4000/api/pricing/products/test-product-789/tiers
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "tier_name": "Bulk Discount",
  "min_quantity": 50,
  "max_quantity": 999,
  "price": 20.00,
  "is_active": true
}
```
**Expected:** `201 Created` with pricing tier  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record pricing_tier_id_

---

## 👥 Test Section 7: Customer-Specific Pricing

### **Test 7.1: Get Customer Pricing**
```bash
GET http://localhost:4000/api/pricing/customers/test-client-123
Authorization: Bearer YOUR_TOKEN_HERE
```
**Expected:** Array of customer pricing (empty is OK)  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record response_

### **Test 7.2: Create Customer Pricing**
```bash
POST http://localhost:4000/api/pricing/customers/test-client-123
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "product_id": "test-product-789",
  "price": 22.50,
  "is_active": true,
  "notes": "VIP customer discount"
}
```
**Expected:** `201 Created` with customer pricing  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record customer_pricing_id_

---

## ❌ Test Section 8: Error Handling

### **Test 8.1: Invalid Authentication**
```bash
GET http://localhost:4000/api/pricing/overview
Authorization: Bearer INVALID_TOKEN
```
**Expected:** `401 Unauthorized`  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record error response_

### **Test 8.2: Missing Required Fields**
```bash
POST http://localhost:4000/api/pricing/calculate
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "client_id": "test-client-123"
  // Missing items array
}
```
**Expected:** `400 Bad Request` with validation error  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record validation message_

### **Test 8.3: Invalid Product ID**
```bash
POST http://localhost:4000/api/pricing/calculate  
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "client_id": "test-client-123",
  "items": [
    {
      "product_id": "non-existent-product",
      "quantity": 1,
      "price": 10.00
    }
  ]
}
```
**Expected:** Appropriate error handling (404 or calculation with defaults)  
**Result:** ✅ Pass / ❌ Fail / ⚠️ Partial  
**Notes:** _Record how system handles missing products_

---

## 📊 Final Results Summary

### **System Health:**
- Server Status: ✅ Pass / ❌ Fail / ⚠️ Partial
- Authentication: ✅ Pass / ❌ Fail / ⚠️ Partial  
- Database Connection: ✅ Pass / ❌ Fail / ⚠️ Partial

### **Core Pricing Features:**
- Basic Calculations: ✅ Pass / ❌ Fail / ⚠️ Partial
- Coupon Validation: ✅ Pass / ❌ Fail / ⚠️ Partial
- Tax Calculations: ✅ Pass / ❌ Fail / ⚠️ Partial
- Order Integration: ✅ Pass / ❌ Fail / ⚠️ Partial

### **Management Features:**
- Pricing Tiers: ✅ Pass / ❌ Fail / ⚠️ Partial
- Customer Pricing: ✅ Pass / ❌ Fail / ⚠️ Partial
- Tax Management: ✅ Pass / ❌ Fail / ⚠️ Partial
- Discount Rules: ✅ Pass / ❌ Fail / ⚠️ Partial

### **Error Handling:**
- Authentication Errors: ✅ Pass / ❌ Fail / ⚠️ Partial
- Validation Errors: ✅ Pass / ❌ Fail / ⚠️ Partial
- Not Found Errors: ✅ Pass / ❌ Fail / ⚠️ Partial

### **Overall Assessment:**
**Status:** ✅ Ready for Production / ⚠️ Needs Fixes / ❌ Major Issues  

### **Issues Found:**
_List all issues, errors, or unexpected behaviors here:_

1. 
2. 
3. 

### **Working Features:**
_List confirmed working features:_

1.
2. 
3.

### **Next Steps:**
- [ ] Fix identified issues
- [ ] Implement unit tests for working features
- [ ] Add integration tests for failing scenarios  
- [ ] Update documentation with actual behavior
- [ ] Plan frontend integration

---

**Test Date:** ___________  
**Tester:** ___________  
**Environment:** Development  
**Backend Version:** Latest  
**Database:** Supabase