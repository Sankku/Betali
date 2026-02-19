/**
 * Integration test for complete order workflow with stock reservations
 * Tests the full cycle: Create Order → Reserve Stock → Fulfill → Cancel → Restore
 */
const { ServiceFactory } = require('../../config/container');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

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
  productId: null,
  warehouseId: null,
  orderId: null,
  createdOrganization: false,
  createdUser: false,
  createdWarehouse: false
};

let orderService;
let productService;
let warehouseService;
let stockReservationRepository;

/**
 * Setup test data: organization, user, product, warehouse
 */
async function setupTestData() {
  logInfo('Setting up test data...');

  try {
    // Initialize services
    orderService = ServiceFactory.createOrderService();
    productService = ServiceFactory.createProductService();
    warehouseService = ServiceFactory.createWarehouseService();
    stockReservationRepository = ServiceFactory.getStockReservationRepository();

    // Try to get existing organization, or create a test one
    let { data: orgs } = await supabase
      .from('organizations')
      .select('organization_id')
      .limit(1)
      .maybeSingle();

    if (!orgs) {
      logWarning('No organization found. Creating test organization...');

      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: `TEST Org - Order Workflow ${Date.now()}`,
          slug: `test-order-${Date.now()}`,
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

      const testUserId = require('crypto').randomUUID();
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          user_id: testUserId,
          email: `test-order-${Date.now()}@betali.test`,
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

    // Create test warehouse if needed
    const { data: warehouses } = await supabase
      .from('warehouse')
      .select('warehouse_id, name')
      .eq('organization_id', testData.organizationId)
      .limit(1)
      .maybeSingle();

    if (warehouses) {
      testData.warehouseId = warehouses.warehouse_id;
      logInfo(`Using existing warehouse: ${warehouses.name}`);
    } else {
      logWarning('No warehouse found. Creating test warehouse...');

      const { data: newWarehouse, error: whError } = await supabase
        .from('warehouse')
        .insert({
          organization_id: testData.organizationId,
          name: 'Test Warehouse - Order Workflow',
          location: 'Test Location',
          owner_id: testData.userId,
          user_id: testData.userId
        })
        .select()
        .single();

      if (whError) {
        throw new Error(`Failed to create warehouse: ${whError.message}`);
      }

      testData.warehouseId = newWarehouse.warehouse_id;
      testData.createdWarehouse = true;
      logSuccess(`Test warehouse created: ${newWarehouse.warehouse_id}`);
    }

    // Create test product with initial stock
    const { data: newProduct, error: prodError } = await supabase
      .from('products')
      .insert({
        organization_id: testData.organizationId,
        name: 'Test Product - Order Workflow',
        sku: `TEST-ORDER-${Date.now()}`,
        category: 'Test',
        unit: 'unit',
        price: 100.00,
        cost: 50.00
      })
      .select()
      .single();

    if (prodError) throw prodError;

    testData.productId = newProduct.product_id;
    logSuccess(`Test product created: ${newProduct.product_id}`);

    // Add initial stock (100 units)
    const { error: stockError } = await supabase
      .from('stock_movements')
      .insert({
        organization_id: testData.organizationId,
        product_id: testData.productId,
        warehouse_id: testData.warehouseId,
        movement_type: 'entry',
        quantity: 100,
        reason: 'Initial test stock for order workflow',
        user_id: testData.userId
      });

    if (stockError) throw stockError;
    logSuccess('Initial stock added: 100 units\n');

    return true;
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  logInfo('Cleaning up test data...');

  try {
    if (testData.productId) {
      await supabase
        .from('products')
        .delete()
        .eq('product_id', testData.productId);
      logInfo('Deleted test product');
    }

    if (testData.createdWarehouse && testData.warehouseId) {
      await supabase
        .from('warehouse')
        .delete()
        .eq('warehouse_id', testData.warehouseId);
      logInfo('Deleted test warehouse');
    }

    if (testData.createdUser && testData.userId) {
      await supabase
        .from('users')
        .delete()
        .eq('user_id', testData.userId);
      logInfo('Deleted test user');
    }

    if (testData.createdOrganization && testData.organizationId) {
      await supabase
        .from('organizations')
        .delete()
        .eq('organization_id', testData.organizationId);
      logInfo('Deleted test organization');
    }

    logSuccess('Cleanup completed');
  } catch (error) {
    logError(`Cleanup error: ${error.message}`);
  }
}

// ========================================================================
// Test Suite 1: Order Creation with Stock Validation
// ========================================================================

async function test1_CreateOrderWithValidStock() {
  logInfo('TEST 1: Creating order with valid stock');

  try {
    const orderData = {
      user_id: testData.userId,
      warehouse_id: testData.warehouseId,
      status: 'pending',
      items: [
        {
          product_id: testData.productId,
          quantity: 10,
          price: 100.00
        }
      ]
    };

    const result = await orderService.createOrder(orderData, testData.organizationId);

    if (!result || !result.order_id) {
      logError('Order creation failed: No order ID returned');
      return false;
    }

    if (result.status !== 'pending') {
      logError(`Order status incorrect: expected 'pending', got '${result.status}'`);
      return false;
    }

    if (result.total_price <= 0) {
      logError(`Order total price incorrect: ${result.total_price}`);
      return false;
    }

    testData.orderId = result.order_id;
    logSuccess(`Order created: ${testData.orderId}`);
    return true;
  } catch (error) {
    logError(`TEST 1 FAILED: ${error.message}`);
    return false;
  }
}

async function test2_RejectInsufficientStock() {
  logInfo('TEST 2: Rejecting order with insufficient stock');

  try {
    const orderData = {
      user_id: testData.userId,
      warehouse_id: testData.warehouseId,
      status: 'pending',
      items: [
        {
          product_id: testData.productId,
          quantity: 1000, // More than available (100)
          price: 100.00
        }
      ]
    };

    try {
      await orderService.createOrder(orderData, testData.organizationId);
      logError('Order was created with insufficient stock - should have been rejected!');
      return false;
    } catch (error) {
      logSuccess(`Order correctly rejected: ${error.message}`);
      return true;
    }
  } catch (error) {
    logError(`TEST 2 FAILED: ${error.message}`);
    return false;
  }
}

// ========================================================================
// Test Suite 2: Stock Reservation
// ========================================================================

async function test3_ReserveStockWhenProcessing() {
  logInfo('TEST 3: Reserving stock when order changes to processing');

  try {
    // Change order status to processing
    await orderService.updateOrderStatus(
      testData.orderId,
      testData.organizationId,
      'processing'
    );

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if reservations were created
    const reservations = await stockReservationRepository.getActiveReservationsByOrder(
      testData.orderId,
      testData.organizationId
    );

    if (!reservations || reservations.length === 0) {
      logError('No reservations created');
      return false;
    }

    if (reservations[0].status !== 'active') {
      logError(`Reservation status incorrect: ${reservations[0].status}`);
      return false;
    }

    if (reservations[0].quantity !== 10) {
      logError(`Reservation quantity incorrect: expected 10, got ${reservations[0].quantity}`);
      return false;
    }

    logSuccess(`Reserved ${reservations[0].quantity} units`);
    return true;
  } catch (error) {
    logError(`TEST 3 FAILED: ${error.message}`);
    return false;
  }
}

async function test4_CalculateAvailableStock() {
  logInfo('TEST 4: Calculating available stock (physical - reserved)');

  try {
    const availableStock = await stockReservationRepository.getAvailableStock(
      testData.productId,
      testData.warehouseId,
      testData.organizationId
    );

    // Should be 100 (initial) - 10 (reserved) = 90
    if (availableStock !== 90) {
      logError(`Available stock incorrect: expected 90, got ${availableStock}`);
      return false;
    }

    logSuccess(`Available stock: ${availableStock} (100 - 10 reserved)`);
    return true;
  } catch (error) {
    logError(`TEST 4 FAILED: ${error.message}`);
    return false;
  }
}

async function test5_PreventDoubleReservation() {
  logInfo('TEST 5: Preventing double reservation for same order');

  try {
    const result = await orderService.reserveStockForOrder(
      testData.orderId,
      testData.organizationId,
      testData.userId
    );

    // Should return existing reservations, not create new ones
    if (!result || result.length !== 1) {
      logError(`Double reservation created: ${result?.length} reservations`);
      return false;
    }

    logSuccess('Prevented double reservation');
    return true;
  } catch (error) {
    logError(`TEST 5 FAILED: ${error.message}`);
    return false;
  }
}

// ========================================================================
// Test Suite 3: Order Fulfillment
// ========================================================================

async function test6_FulfillOrderAndDeductStock() {
  logInfo('TEST 6: Fulfilling order and deducting physical stock');

  try {
    // Get stock before fulfillment
    const { data: stockBefore } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', testData.productId)
      .eq('warehouse_id', testData.warehouseId);

    // Fulfill the order
    await orderService.fulfillOrder(testData.orderId, testData.organizationId);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check order status
    const order = await orderService.getOrderById(testData.orderId, testData.organizationId);

    if (order.status !== 'shipped') {
      logError(`Order status incorrect: expected 'shipped', got '${order.status}'`);
      return false;
    }

    // Check that stock was deducted
    const { data: stockAfter } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', testData.productId)
      .eq('warehouse_id', testData.warehouseId);

    if (stockAfter.length <= stockBefore.length) {
      logError('No stock movement created for fulfillment');
      return false;
    }

    logSuccess('Order fulfilled, physical stock deducted');
    return true;
  } catch (error) {
    logError(`TEST 6 FAILED: ${error.message}`);
    return false;
  }
}

async function test7_MarkReservationsAsFulfilled() {
  logInfo('TEST 7: Marking reservations as fulfilled');

  try {
    const reservations = await stockReservationRepository.getReservationsByOrder(
      testData.orderId,
      testData.organizationId
    );

    if (!reservations || reservations.length === 0) {
      logError('No reservations found');
      return false;
    }

    if (reservations[0].status !== 'fulfilled') {
      logError(`Reservation status incorrect: expected 'fulfilled', got '${reservations[0].status}'`);
      return false;
    }

    if (!reservations[0].released_at) {
      logError('Reservation released_at not set');
      return false;
    }

    logSuccess('Reservations marked as fulfilled');
    return true;
  } catch (error) {
    logError(`TEST 7 FAILED: ${error.message}`);
    return false;
  }
}

// ========================================================================
// Test Suite 4: Order Cancellation with Stock Restoration
// ========================================================================

async function test8_RestoreStockWhenCancelled() {
  logInfo('TEST 8: Restoring stock when shipped order is cancelled');

  try {
    // Get stock movements before cancellation
    const { data: movementsBefore } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', testData.productId)
      .eq('warehouse_id', testData.warehouseId);

    const stockBefore = movementsBefore.reduce((sum, m) => {
      return sum + (m.movement_type === 'entry' ? m.quantity : -m.quantity);
    }, 0);

    // Cancel the order
    await orderService.updateOrderStatus(
      testData.orderId,
      testData.organizationId,
      'cancelled'
    );

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get stock movements after cancellation
    const { data: movementsAfter } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', testData.productId)
      .eq('warehouse_id', testData.warehouseId);

    const stockAfter = movementsAfter.reduce((sum, m) => {
      return sum + (m.movement_type === 'entry' ? m.quantity : -m.quantity);
    }, 0);

    // Stock should be restored
    if (stockAfter <= stockBefore) {
      logError(`Stock not restored: ${stockBefore} → ${stockAfter}`);
      return false;
    }

    if (stockAfter !== 100) {
      logError(`Stock not fully restored: expected 100, got ${stockAfter}`);
      return false;
    }

    logSuccess(`Stock restored: ${stockBefore} → ${stockAfter}`);
    return true;
  } catch (error) {
    logError(`TEST 8 FAILED: ${error.message}`);
    return false;
  }
}

async function test9_MarkReservationsAsCancelled() {
  logInfo('TEST 9: Marking reservations as cancelled');

  try {
    const reservations = await stockReservationRepository.getReservationsByOrder(
      testData.orderId,
      testData.organizationId
    );

    if (!reservations || reservations.length === 0) {
      logError('No reservations found');
      return false;
    }

    if (reservations[0].status !== 'cancelled') {
      logError(`Reservation status incorrect: expected 'cancelled', got '${reservations[0].status}'`);
      return false;
    }

    if (!reservations[0].released_at) {
      logError('Reservation released_at not set');
      return false;
    }

    logSuccess('Reservations marked as cancelled');
    return true;
  } catch (error) {
    logError(`TEST 9 FAILED: ${error.message}`);
    return false;
  }
}

// ========================================================================
// Test Suite 5: Available Stock API Endpoint
// ========================================================================

async function test10_AvailableStockAPI() {
  logInfo('TEST 10: Testing productService.getAvailableStock API');

  try {
    const availableStock = await productService.getAvailableStock(
      testData.productId,
      testData.warehouseId,
      testData.organizationId
    );

    // Back to full stock after cancellation
    if (availableStock !== 100) {
      logError(`Available stock incorrect: expected 100, got ${availableStock}`);
      return false;
    }

    logSuccess(`Available stock API: ${availableStock} units`);
    return true;
  } catch (error) {
    logError(`TEST 10 FAILED: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.clear();
  log('\n🧪 ORDER WORKFLOW INTEGRATION TESTS', 'cyan');
  log('='.repeat(70), 'cyan');
  log(`Started at: ${new Date().toLocaleString()}\n`, 'blue');

  // Setup
  const setupSuccess = await setupTestData();
  if (!setupSuccess) {
    logError('Setup failed. Aborting tests.');
    process.exit(1);
  }

  // Run tests
  const results = {
    test1: await test1_CreateOrderWithValidStock(),
    test2: await test2_RejectInsufficientStock(),
    test3: await test3_ReserveStockWhenProcessing(),
    test4: await test4_CalculateAvailableStock(),
    test5: await test5_PreventDoubleReservation(),
    test6: await test6_FulfillOrderAndDeductStock(),
    test7: await test7_MarkReservationsAsFulfilled(),
    test8: await test8_RestoreStockWhenCancelled(),
    test9: await test9_MarkReservationsAsCancelled(),
    test10: await test10_AvailableStockAPI()
  };

  // Summary
  console.log('\n' + '='.repeat(70));
  log('📊 TEST SUMMARY', 'cyan');
  console.log('='.repeat(70));

  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅ PASSED' : '❌ FAILED';
    const color = result ? 'green' : 'red';
    log(`${test.toUpperCase()}: ${status}`, color);
  });

  console.log('='.repeat(70));
  log(`\nTotal: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  log(`Success rate: ${Math.round((passed / total) * 100)}%\n`, passed === total ? 'green' : 'yellow');

  // Cleanup
  await cleanupTestData();

  log(`\nCompleted at: ${new Date().toLocaleString()}`, 'blue');

  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Jest test wrapper
describe('Order Workflow Integration Tests', () => {
  beforeAll(async () => {
    const setupSuccess = await setupTestData();
    if (!setupSuccess) {
      throw new Error('Setup failed');
    }
  }, 30000);

  afterAll(async () => {
    await cleanupTestData();
  }, 30000);

  test('Test 1: Create order with valid stock', async () => {
    const result = await test1_CreateOrderWithValidStock();
    expect(result).toBe(true);
  }, 30000);

  test('Test 2: Reject order with insufficient stock', async () => {
    const result = await test2_RejectInsufficientStock();
    expect(result).toBe(true);
  }, 30000);

  test('Test 3: Reserve stock when order changes to processing', async () => {
    const result = await test3_ReserveStockWhenProcessing();
    expect(result).toBe(true);
  }, 30000);

  test('Test 4: Calculate available stock correctly', async () => {
    const result = await test4_CalculateAvailableStock();
    expect(result).toBe(true);
  }, 30000);

  test('Test 5: Prevent double reservation for same order', async () => {
    const result = await test5_PreventDoubleReservation();
    expect(result).toBe(true);
  }, 30000);

  test('Test 6: Fulfill order and deduct physical stock', async () => {
    const result = await test6_FulfillOrderAndDeductStock();
    expect(result).toBe(true);
  }, 30000);

  test('Test 7: Mark reservations as fulfilled', async () => {
    const result = await test7_MarkReservationsAsFulfilled();
    expect(result).toBe(true);
  }, 30000);

  test('Test 8: Restore stock when shipped order is cancelled', async () => {
    const result = await test8_RestoreStockWhenCancelled();
    expect(result).toBe(true);
  }, 30000);

  test('Test 9: Mark reservations as cancelled', async () => {
    const result = await test9_MarkReservationsAsCancelled();
    expect(result).toBe(true);
  }, 30000);

  test('Test 10: Available stock API returns correct value', async () => {
    const result = await test10_AvailableStockAPI();
    expect(result).toBe(true);
  }, 30000);
});

// Keep standalone execution for manual testing (but not when running through Jest)
if (require.main === module && !process.env.JEST_WORKER_ID) {
  runAllTests().catch(error => {
    logError(`Fatal error: ${error.message}`);
    cleanupTestData().then(() => process.exit(1));
  });
}
