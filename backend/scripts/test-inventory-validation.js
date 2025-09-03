#!/usr/bin/env node

require('dotenv').config();
const { container } = require('../config/container');

async function testInventoryValidation() {
  console.log('🧪 Testing Inventory Validation in Orders\n');
  
  // Get the OrderService
  const orderService = container.get('orderService');
  const stockMovementRepository = container.get('stockMovementRepository');
  
  const organizationId = 'cb4f0529-a879-47da-a54e-cdc80a90c7c4';
  const productId = 'b11244a4-7400-4a9a-8f97-597aee62b75b';
  const warehouseId = '3418c14d-7d75-4d9c-ab70-adafa814ae67';
  
  try {
    // 1. Check current stock
    console.log('📦 Step 1: Checking current stock...');
    const currentStock = await stockMovementRepository.getCurrentStock(productId, warehouseId, organizationId);
    console.log(`Current stock for product: ${currentStock} units\n`);
    
    // 2. Test Case 1: Valid order (5 units out of 10 available)
    console.log('✅ Test Case 1: Valid order (5 units)');
    try {
      const validOrder = {
        client_id: null,
        warehouse_id: warehouseId,
        user_id: 'bc8e5699-fb06-4f0b-bffe-65af117c0259',
        notes: 'Testing inventory validation - VALID order',
        items: [
          {
            product_id: productId,
            quantity: 5,
            price: 90.02
          }
        ]
      };
      
      const result = await orderService.createOrder(validOrder, organizationId);
      console.log('✅ SUCCESS: Valid order created successfully');
      console.log(`Order ID: ${result.order_id}`);
      console.log(`Total: $${result.totals.total}\n`);
    } catch (error) {
      console.log('❌ UNEXPECTED ERROR:', error.message, '\n');
    }
    
    // 3. Test Case 2: Invalid order (15 units exceeds available stock)
    console.log('❌ Test Case 2: Invalid order (15 units - should fail)');
    try {
      const invalidOrder = {
        client_id: null,
        warehouse_id: warehouseId,
        user_id: 'bc8e5699-fb06-4f0b-bffe-65af117c0259',
        notes: 'Testing inventory validation - INVALID order',
        items: [
          {
            product_id: productId,
            quantity: 15,
            price: 90.02
          }
        ]
      };
      
      const result = await orderService.createOrder(invalidOrder, organizationId);
      console.log('❌ UNEXPECTED SUCCESS: Order should have failed due to insufficient stock\n');
    } catch (error) {
      console.log('✅ EXPECTED ERROR:', error.message);
      console.log('✅ SUCCESS: Inventory validation working correctly\n');
    }
    
    // 4. Test Case 3: Multiple products with mixed availability
    console.log('📋 Test Case 3: Multiple products order');
    try {
      const multiOrder = {
        client_id: null,
        warehouse_id: warehouseId,
        user_id: 'bc8e5699-fb06-4f0b-bffe-65af117c0259',
        notes: 'Testing multiple products',
        items: [
          {
            product_id: productId,
            quantity: 3,
            price: 90.02
          },
          {
            product_id: productId, // Same product, testing cumulative quantity
            quantity: 2,
            price: 90.02
          }
        ]
      };
      
      const result = await orderService.createOrder(multiOrder, organizationId);
      console.log('✅ SUCCESS: Multiple items order created');
      console.log(`Order ID: ${result.order_id}`);
      console.log(`Total items: ${result.order_details.length}`);
      console.log(`Total: $${result.totals.total}\n`);
    } catch (error) {
      console.log('❌ ERROR with multiple items:', error.message, '\n');
    }
    
    console.log('🎉 Inventory validation testing completed!');
    
  } catch (error) {
    console.error('💥 Test setup error:', error);
  }
}

// Run the test
testInventoryValidation();