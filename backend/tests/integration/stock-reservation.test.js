/**
 * Integration Tests - Stock Reservation System
 * Tests the complete flow of stock reservations during order lifecycle
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log(`\n${'='.repeat(60)}`);
  log(`🧪 TEST: ${testName}`, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test data storage
let testData = {
  organizationId: null,
  userId: null,
  warehouseId: null,
  productId: null,
  clientId: null,
  testOrders: [],
  createdOrganization: false,
  createdUser: false,
  createdWarehouse: false,
  createdClient: false
};

// Cleanup function
async function cleanup() {
  log('\n🧹 Cleaning up test data...', 'yellow');

  try {
    // Delete test orders
    for (const orderId of testData.testOrders) {
      await supabase.from('orders').delete().eq('order_id', orderId);
    }

    // Delete test product
    if (testData.productId) {
      await supabase.from('products').delete().eq('product_id', testData.productId);
    }

    // Delete test warehouse if we created it
    if (testData.createdWarehouse && testData.warehouseId) {
      await supabase.from('warehouse').delete().eq('warehouse_id', testData.warehouseId);
      logInfo('Deleted test warehouse');
    }

    // Delete test client if we created it
    if (testData.createdClient && testData.clientId) {
      await supabase.from('clients').delete().eq('client_id', testData.clientId);
      logInfo('Deleted test client');
    }

    // Delete test user if we created it
    if (testData.createdUser && testData.userId) {
      await supabase.from('users').delete().eq('user_id', testData.userId);
      logInfo('Deleted test user');
    }

    // Delete test organization if we created it
    if (testData.createdOrganization && testData.organizationId) {
      await supabase.from('organizations').delete().eq('organization_id', testData.organizationId);
      logInfo('Deleted test organization');
    }

    logSuccess('Cleanup completed');
  } catch (error) {
    logError(`Cleanup error: ${error.message}`);
  }
}

// Setup test data
async function setupTestData() {
  logTest('SETUP: Creating test data');

  try {
    // Try to get existing organization, or create a test one
    let { data: orgs } = await supabase
      .from('organizations')
      .select('organization_id')
      .limit(1)
      .maybeSingle();

    if (!orgs) {
      logWarning('No organization found. Creating test organization...');

      // Create test organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: `TEST Org - Stock Reservation ${Date.now()}`,
          slug: `test-stock-${Date.now()}`,
          subscription_tier: 'professional'
        })
        .select()
        .single();

      if (orgError) {
        throw new Error(`Failed to create organization: ${orgError.message}`);
      }

      orgs = newOrg;
      testData.createdOrganization = true;
      logSuccess(`Test organization created: ${orgs.organization_id}`);
    } else {
      logInfo(`Using existing organization: ${orgs.organization_id}`);
    }

    testData.organizationId = orgs.organization_id;

    // Try to get existing user, or create a test one
    let { data: users } = await supabase
      .from('users')
      .select('user_id')
      .eq('organization_id', testData.organizationId)
      .limit(1)
      .maybeSingle();

    if (!users) {
      logWarning('No user found. Creating test user...');

      // Create test user in users table
      const testUserId = require('crypto').randomUUID();
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          user_id: testUserId,
          email: `test-stock-${Date.now()}@betali.test`,
          name: `Test User ${Date.now()}`,
          organization_id: testData.organizationId,
          role: 'admin',
          password_hash: 'test_hash'
        })
        .select()
        .single();

      if (userError) {
        throw new Error(`Failed to create user: ${userError.message}`);
      }

      users = newUser;
      testData.createdUser = true;
      logSuccess(`Test user created: ${users.user_id}`);
    } else {
      logInfo(`Using existing user: ${users.user_id}`);
    }

    testData.userId = users.user_id;

    // Try to get existing warehouse, or create a test one
    let { data: warehouses } = await supabase
      .from('warehouse')
      .select('warehouse_id')
      .eq('organization_id', testData.organizationId)
      .limit(1)
      .maybeSingle();

    if (!warehouses) {
      logWarning('No warehouse found. Creating test warehouse...');

      const { data: newWarehouse, error: whError } = await supabase
        .from('warehouse')
        .insert({
          organization_id: testData.organizationId,
          name: `TEST Warehouse - Stock Reservation ${Date.now()}`,
          location: 'Test Location',
          owner_id: testData.userId,
          user_id: testData.userId
        })
        .select()
        .single();

      if (whError) throw new Error(`Failed to create warehouse: ${whError.message}`);

      warehouses = newWarehouse;
      testData.createdWarehouse = true;
      logSuccess(`Test warehouse created: ${warehouses.warehouse_id}`);
    } else {
      logInfo(`Using existing warehouse: ${warehouses.warehouse_id}`);
    }

    testData.warehouseId = warehouses.warehouse_id;

    // Create test product
    const { data: product, error: prodError } = await supabase
      .from('products')
      .insert({
        name: `TEST Product - Stock Reservation ${Date.now()}`,
        batch_number: `BATCH-${Date.now()}`,
        expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        origin_country: 'Test Country',
        owner_id: testData.userId,
        description: 'Test product for stock reservation tests'
      })
      .select()
      .single();

    if (prodError) throw new Error(`Failed to create product: ${prodError.message}`);
    testData.productId = product.product_id;
    logSuccess(`Product created: ${testData.productId}`);

    // Add initial stock (100 units)
    const { error: stockError } = await supabase
      .from('stock_movements')
      .insert({
        warehouse_id: testData.warehouseId,
        product_id: testData.productId,
        movement_type: 'entry',
        quantity: 100,
        reference: 'Initial stock for testing'
      });

    if (stockError) throw new Error(`Failed to add initial stock: ${stockError.message}`);
    logSuccess('Initial stock added: 100 units');

    // Try to get existing client, or create a test one
    let { data: clients } = await supabase
      .from('clients')
      .select('client_id')
      .eq('organization_id', testData.organizationId)
      .limit(1)
      .maybeSingle();

    if (!clients) {
      logWarning('No client found. Creating test client...');

      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          organization_id: testData.organizationId,
          name: `TEST Client - Stock Reservation ${Date.now()}`,
          email: `test-client-${Date.now()}@example.com`,
          phone: '1234567890',
          cuit: `20-${Date.now().toString().substring(0, 8)}-5`,
          user_id: testData.userId
        })
        .select()
        .single();

      if (clientError) throw new Error(`Failed to create client: ${clientError.message}`);

      clients = newClient;
      testData.createdClient = true;
      logSuccess(`Test client created: ${clients.client_id}`);
    } else {
      logInfo(`Using existing client: ${clients.client_id}`);
    }

    testData.clientId = clients.client_id;

    logSuccess('Setup completed successfully!\n');
    return true;
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    return false;
  }
}

// Get available stock
async function getAvailableStock() {
  const { data, error } = await supabase
    .rpc('get_available_stock', {
      p_product_id: testData.productId,
      p_warehouse_id: testData.warehouseId,
      p_organization_id: testData.organizationId
    });

  if (error) throw error;
  return data;
}

// Get physical stock
async function getPhysicalStock() {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('quantity, movement_type')
    .eq('warehouse_id', testData.warehouseId)
    .eq('product_id', testData.productId);

  if (error) throw error;

  return data.reduce((total, movement) => {
    return movement.movement_type === 'entry'
      ? total + movement.quantity
      : total - movement.quantity;
  }, 0);
}

// Get active reservations count
async function getActiveReservations(orderId = null) {
  let query = supabase
    .from('stock_reservations')
    .select('*')
    .eq('organization_id', testData.organizationId)
    .eq('product_id', testData.productId)
    .eq('status', 'active');

  if (orderId) {
    query = query.eq('order_id', orderId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Create order
async function createOrder(quantity, status = 'pending') {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      client_id: testData.clientId,
      warehouse_id: testData.warehouseId,
      user_id: testData.userId,
      status: status,
      order_date: new Date().toISOString(),
      total_price: quantity * 100
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create order: ${error.message}`);

  // Add order detail
  const { error: detailError } = await supabase
    .from('order_details')
    .insert({
      order_id: data.order_id,
      product_id: testData.productId,
      quantity: quantity,
      price: 100.00
    });

  if (detailError) throw new Error(`Failed to create order detail: ${detailError.message}`);

  testData.testOrders.push(data.order_id);
  return data;
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('order_id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// TEST 1: Pending order should NOT create reservation
async function test1_PendingOrder() {
  logTest('TEST 1: Pending Order - No Reservation');

  try {
    const initialStock = await getPhysicalStock();
    const initialAvailable = await getAvailableStock();

    logInfo(`Initial physical stock: ${initialStock}`);
    logInfo(`Initial available stock: ${initialAvailable}`);

    // Create order in pending status
    const order = await createOrder(10, 'pending');
    logInfo(`Order created: ${order.order_id} (status: pending)`);

    // Wait a bit for any async operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    const afterStock = await getPhysicalStock();
    const afterAvailable = await getAvailableStock();
    const reservations = await getActiveReservations(order.order_id);

    logInfo(`After physical stock: ${afterStock}`);
    logInfo(`After available stock: ${afterAvailable}`);
    logInfo(`Active reservations: ${reservations.length}`);

    // Assertions
    if (afterStock === initialStock) {
      logSuccess('Physical stock unchanged ✓');
    } else {
      logError(`Physical stock changed: ${initialStock} → ${afterStock}`);
      return false;
    }

    if (afterAvailable === initialAvailable) {
      logSuccess('Available stock unchanged ✓');
    } else {
      logError(`Available stock changed: ${initialAvailable} → ${afterAvailable}`);
      return false;
    }

    if (reservations.length === 0) {
      logSuccess('No reservations created ✓');
    } else {
      logError(`Unexpected reservations created: ${reservations.length}`);
      return false;
    }

    logSuccess('TEST 1 PASSED ✓\n');
    return true;
  } catch (error) {
    logError(`TEST 1 FAILED: ${error.message}\n`);
    return false;
  }
}

// TEST 2: Processing status should create reservation
async function test2_ProcessingReservation() {
  logTest('TEST 2: Processing Status - Create Reservation');

  try {
    const initialStock = await getPhysicalStock();
    const initialAvailable = await getAvailableStock();

    logInfo(`Initial physical stock: ${initialStock}`);
    logInfo(`Initial available stock: ${initialAvailable}`);

    // Create order and immediately move to processing
    const order = await createOrder(15, 'pending');
    logInfo(`Order created: ${order.order_id}`);

    // Change to processing
    await updateOrderStatus(order.order_id, 'processing');
    logInfo('Order status changed to: processing');

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    const afterStock = await getPhysicalStock();
    const afterAvailable = await getAvailableStock();
    const reservations = await getActiveReservations(order.order_id);

    logInfo(`After physical stock: ${afterStock}`);
    logInfo(`After available stock: ${afterAvailable}`);
    logInfo(`Active reservations: ${reservations.length}`);

    // Assertions
    if (afterStock === initialStock) {
      logSuccess('Physical stock unchanged ✓');
    } else {
      logError(`Physical stock changed unexpectedly: ${initialStock} → ${afterStock}`);
      return false;
    }

    if (afterAvailable === initialAvailable - 15) {
      logSuccess(`Available stock reduced by 15: ${initialAvailable} → ${afterAvailable} ✓`);
    } else {
      logError(`Available stock incorrect: expected ${initialAvailable - 15}, got ${afterAvailable}`);
      return false;
    }

    if (reservations.length === 1) {
      logSuccess('Reservation created ✓');
      logInfo(`Reservation quantity: ${reservations[0].quantity}`);

      if (reservations[0].quantity === 15) {
        logSuccess('Reservation quantity correct ✓');
      } else {
        logError(`Reservation quantity incorrect: expected 15, got ${reservations[0].quantity}`);
        return false;
      }
    } else {
      logError(`Expected 1 reservation, found ${reservations.length}`);
      return false;
    }

    logSuccess('TEST 2 PASSED ✓\n');
    return true;
  } catch (error) {
    logError(`TEST 2 FAILED: ${error.message}\n`);
    return false;
  }
}

// TEST 3: Shipped status should deduct physical stock
async function test3_ShippedDeduction() {
  logTest('TEST 3: Shipped Status - Deduct Physical Stock');

  try {
    const initialStock = await getPhysicalStock();
    const initialAvailable = await getAvailableStock();

    logInfo(`Initial physical stock: ${initialStock}`);
    logInfo(`Initial available stock: ${initialAvailable}`);

    // Create order, move to processing, then to shipped
    const order = await createOrder(20, 'pending');
    logInfo(`Order created: ${order.order_id}`);

    await updateOrderStatus(order.order_id, 'processing');
    logInfo('Order status: processing');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const afterProcessing = await getAvailableStock();
    logInfo(`Available after processing: ${afterProcessing}`);

    // Now ship it
    await updateOrderStatus(order.order_id, 'shipped');
    logInfo('Order status: shipped');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const finalStock = await getPhysicalStock();
    const finalAvailable = await getAvailableStock();
    const reservations = await getActiveReservations(order.order_id);

    logInfo(`Final physical stock: ${finalStock}`);
    logInfo(`Final available stock: ${finalAvailable}`);
    logInfo(`Active reservations: ${reservations.length}`);

    // Assertions
    if (finalStock === initialStock - 20) {
      logSuccess(`Physical stock deducted: ${initialStock} → ${finalStock} ✓`);
    } else {
      logError(`Physical stock incorrect: expected ${initialStock - 20}, got ${finalStock}`);
      return false;
    }

    if (finalAvailable === finalStock) {
      logSuccess(`Available stock equals physical stock ✓`);
    } else {
      logError(`Available stock mismatch: physical=${finalStock}, available=${finalAvailable}`);
      return false;
    }

    if (reservations.length === 0) {
      logSuccess('Reservation fulfilled (no active reservations) ✓');
    } else {
      logWarning(`Still has ${reservations.length} active reservation(s) - checking status...`);

      // Check if reservation was marked as fulfilled
      const { data: allReservations } = await supabase
        .from('stock_reservations')
        .select('status')
        .eq('order_id', order.order_id);

      const fulfilledReservations = allReservations.filter(r => r.status === 'fulfilled');

      if (fulfilledReservations.length > 0) {
        logSuccess(`Reservation marked as fulfilled ✓`);
      } else {
        logError('Reservation not properly fulfilled');
        return false;
      }
    }

    logSuccess('TEST 3 PASSED ✓\n');
    return true;
  } catch (error) {
    logError(`TEST 3 FAILED: ${error.message}\n`);
    return false;
  }
}

// TEST 4: Cancel from processing should release stock
async function test4_CancelFromProcessing() {
  logTest('TEST 4: Cancel from Processing - Release Stock');

  try {
    const initialStock = await getPhysicalStock();
    const initialAvailable = await getAvailableStock();

    logInfo(`Initial physical stock: ${initialStock}`);
    logInfo(`Initial available stock: ${initialAvailable}`);

    // Create order and move to processing
    const order = await createOrder(10, 'pending');
    await updateOrderStatus(order.order_id, 'processing');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const afterProcessing = await getAvailableStock();
    logInfo(`Available after processing: ${afterProcessing} (should be ${initialAvailable - 10})`);

    // Now cancel
    await updateOrderStatus(order.order_id, 'cancelled');
    logInfo('Order status: cancelled');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const finalStock = await getPhysicalStock();
    const finalAvailable = await getAvailableStock();
    const activeReservations = await getActiveReservations(order.order_id);

    logInfo(`Final physical stock: ${finalStock}`);
    logInfo(`Final available stock: ${finalAvailable}`);
    logInfo(`Active reservations: ${activeReservations.length}`);

    // Assertions
    if (finalStock === initialStock) {
      logSuccess('Physical stock unchanged ✓');
    } else {
      logError(`Physical stock changed: ${initialStock} → ${finalStock}`);
      return false;
    }

    if (finalAvailable === initialAvailable) {
      logSuccess(`Available stock restored: ${finalAvailable} ✓`);
    } else {
      logError(`Available stock not restored: expected ${initialAvailable}, got ${finalAvailable}`);
      return false;
    }

    if (activeReservations.length === 0) {
      logSuccess('No active reservations ✓');
    } else {
      logError(`Still has ${activeReservations.length} active reservation(s)`);
      return false;
    }

    logSuccess('TEST 4 PASSED ✓\n');
    return true;
  } catch (error) {
    logError(`TEST 4 FAILED: ${error.message}\n`);
    return false;
  }
}

// TEST 5: Cancel from shipped should restore stock
async function test5_CancelFromShipped() {
  logTest('TEST 5: Cancel from Shipped - Restore Stock');

  try {
    const initialStock = await getPhysicalStock();
    const initialAvailable = await getAvailableStock();

    logInfo(`Initial physical stock: ${initialStock}`);
    logInfo(`Initial available stock: ${initialAvailable}`);

    // Create order, process, and ship
    const order = await createOrder(12, 'pending');
    await updateOrderStatus(order.order_id, 'processing');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await updateOrderStatus(order.order_id, 'shipped');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const afterShipping = await getPhysicalStock();
    logInfo(`Stock after shipping: ${afterShipping} (should be ${initialStock - 12})`);

    // Now cancel
    await updateOrderStatus(order.order_id, 'cancelled');
    logInfo('Order status: cancelled');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const finalStock = await getPhysicalStock();
    const finalAvailable = await getAvailableStock();

    logInfo(`Final physical stock: ${finalStock}`);
    logInfo(`Final available stock: ${finalAvailable}`);

    // Assertions
    if (finalStock === initialStock) {
      logSuccess(`Physical stock restored: ${afterShipping} → ${finalStock} ✓`);
    } else {
      logError(`Physical stock not restored: expected ${initialStock}, got ${finalStock}`);
      return false;
    }

    if (finalAvailable === initialAvailable) {
      logSuccess(`Available stock restored: ${finalAvailable} ✓`);
    } else {
      logError(`Available stock not restored: expected ${initialAvailable}, got ${finalAvailable}`);
      return false;
    }

    logSuccess('TEST 5 PASSED ✓\n');
    return true;
  } catch (error) {
    logError(`TEST 5 FAILED: ${error.message}\n`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.clear();
  log('\n🚀 STOCK RESERVATION SYSTEM - INTEGRATION TESTS', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Started at: ${new Date().toLocaleString()}\n`, 'blue');

  // Setup
  const setupSuccess = await setupTestData();
  if (!setupSuccess) {
    logError('Setup failed. Aborting tests.');
    process.exit(1);
  }

  // Run tests
  const results = {
    test1: await test1_PendingOrder(),
    test2: await test2_ProcessingReservation(),
    test3: await test3_ShippedDeduction(),
    test4: await test4_CancelFromProcessing(),
    test5: await test5_CancelFromShipped()
  };

  // Summary
  console.log('\n' + '='.repeat(60));
  log('📊 TEST SUMMARY', 'cyan');
  console.log('='.repeat(60));

  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅ PASSED' : '❌ FAILED';
    const color = result ? 'green' : 'red';
    log(`${test.toUpperCase()}: ${status}`, color);
  });

  console.log('='.repeat(60));
  log(`\nTotal: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  log(`Success rate: ${Math.round((passed / total) * 100)}%\n`, passed === total ? 'green' : 'yellow');

  // Cleanup
  await cleanup();

  log(`\nCompleted at: ${new Date().toLocaleString()}`, 'blue');

  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Jest test wrapper
describe('Stock Reservation System - Integration Tests', () => {
  beforeAll(async () => {
    const setupSuccess = await setupTestData();
    if (!setupSuccess) {
      throw new Error('Setup failed');
    }
  }, 30000);

  afterEach(async () => {
    // Clean up orders, reservations and movements between tests
    try {
      // Delete all test orders
      for (const orderId of testData.testOrders) {
        // Delete order details first
        await supabase.from('order_details').delete().eq('order_id', orderId);
        // Delete stock reservations
        await supabase.from('stock_reservations').delete().eq('order_id', orderId);
        // Delete the order
        await supabase.from('orders').delete().eq('order_id', orderId);
      }

      // Delete all stock movements for this product
      if (testData.productId && testData.warehouseId) {
        await supabase.from('stock_movements')
          .delete()
          .eq('product_id', testData.productId)
          .eq('warehouse_id', testData.warehouseId)
          .neq('reference', 'Initial stock for testing'); // Keep initial stock
      }

      // Clear the test orders array
      testData.testOrders = [];
    } catch (error) {
      console.error('Cleanup between tests failed:', error);
    }
  }, 10000);

  afterAll(async () => {
    await cleanup();
  }, 30000);

  test('Test 1: Pending order should not reserve stock', async () => {
    const result = await test1_PendingOrder();
    expect(result).toBe(true);
  }, 30000);

  test('Test 2: Processing order should reserve stock', async () => {
    const result = await test2_ProcessingReservation();
    expect(result).toBe(true);
  }, 30000);

  test('Test 3: Shipped order should deduct physical stock', async () => {
    const result = await test3_ShippedDeduction();
    expect(result).toBe(true);
  }, 30000);

  test('Test 4: Cancel from processing should restore availability', async () => {
    const result = await test4_CancelFromProcessing();
    expect(result).toBe(true);
  }, 30000);

  test('Test 5: Cancel from shipped should restore physical stock', async () => {
    const result = await test5_CancelFromShipped();
    expect(result).toBe(true);
  }, 30000);
});

// Standalone execution disabled - use Jest/Bun test instead
// Uncomment for manual standalone testing:
/*
if (require.main === module) {
  runAllTests().catch(error => {
    logError(`Fatal error: ${error.message}`);
    cleanup().then(() => process.exit(1));
  });
}
*/
