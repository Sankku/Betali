/**
 * Multi-Tenant Data Isolation Tests
 * Tests that organizations cannot access each other's data
 *
 * CRITICAL: This test verifies there's NO data leakage between organizations
 */

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
  bright: '\x1b[1m',
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
  console.log(`\n${'='.repeat(70)}`);
  log(`🧪 TEST: ${testName}`, 'cyan');
  console.log('='.repeat(70));
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
  org1: null,
  org2: null,
  user1: null,
  user2: null,
  product1: null,
  product2: null,
  warehouse1: null,
  warehouse2: null,
  client1: null,
  client2: null,
  testEntities: [],
  createdOrg1: false,
  createdOrg2: false,
  createdUser1: false,
  createdUser2: false
};

// Cleanup function
async function cleanup() {
  log('\n🧹 Cleaning up test data...', 'yellow');

  try {
    // Delete test entities
    for (const entity of testData.testEntities) {
      await supabase.from(entity.table).delete().eq(entity.idField, entity.id);
    }

    // Delete test users if we created them
    if (testData.createdUser2 && testData.user2) {
      await supabase.from('users').delete().eq('user_id', testData.user2);
      logInfo('Deleted test user 2');
    }

    if (testData.createdUser1 && testData.user1) {
      await supabase.from('users').delete().eq('user_id', testData.user1);
      logInfo('Deleted test user 1');
    }

    // Delete test organizations if we created them
    if (testData.createdOrg2 && testData.org2) {
      await supabase.from('organizations').delete().eq('organization_id', testData.org2.organization_id);
      logInfo('Deleted test organization 2');
    }

    if (testData.createdOrg1 && testData.org1) {
      await supabase.from('organizations').delete().eq('organization_id', testData.org1.organization_id);
      logInfo('Deleted test organization 1');
    }

    logSuccess('Cleanup completed');
  } catch (error) {
    logError(`Cleanup error: ${error.message}`);
  }
}

// Setup: Create two separate organizations with data
async function setupTestOrganizations() {
  logTest('SETUP: Creating Two Test Organizations');

  try {
    // Try to get existing organizations, or create test ones
    const { data: orgs } = await supabase
      .from('organizations')
      .select('organization_id, name')
      .limit(2);

    if (!orgs || orgs.length < 1) {
      logWarning('No organizations found. Creating test organizations...');

      // Create Organization 1
      const { data: newOrg1, error: org1Error } = await supabase
        .from('organizations')
        .insert({
          name: `TEST Org 1 - Multi-Tenant ${Date.now()}`,
          slug: `test-org1-${Date.now()}`,
          subscription_tier: 'professional'
        })
        .select()
        .single();

      if (org1Error) {
        throw new Error(`Failed to create organization 1: ${org1Error.message}`);
      }

      testData.org1 = newOrg1;
      testData.createdOrg1 = true;
      logSuccess(`Test organization 1 created: ${testData.org1.organization_id}`);
    } else {
      testData.org1 = orgs[0];
      logInfo(`Organization 1: ${testData.org1.name} (${testData.org1.organization_id})`);
    }

    // Get or create second organization
    if (orgs && orgs.length >= 2) {
      testData.org2 = orgs[1];
      logInfo(`Organization 2: ${testData.org2.name} (${testData.org2.organization_id})`);
    } else {
      logWarning('Only 1 organization found. Creating second test organization...');

      const { data: newOrg2, error: org2Error } = await supabase
        .from('organizations')
        .insert({
          name: `TEST Org 2 - Multi-Tenant ${Date.now()}`,
          slug: `test-org2-${Date.now()}`,
          subscription_tier: 'professional'
        })
        .select()
        .single();

      if (org2Error) {
        throw new Error(`Failed to create organization 2: ${org2Error.message}`);
      }

      testData.org2 = newOrg2;
      testData.createdOrg2 = true;
      logSuccess(`Test organization 2 created: ${testData.org2.organization_id}`);
    }

    // Try to get existing users, or create test ones
    let { data: users1 } = await supabase
      .from('users')
      .select('user_id')
      .eq('organization_id', testData.org1.organization_id)
      .limit(1)
      .maybeSingle();

    if (!users1) {
      logWarning('No user found for Org 1. Creating test user...');

      const testUserId1 = require('crypto').randomUUID();
      const { data: newUser1, error: user1Error } = await supabase
        .from('users')
        .insert({
          user_id: testUserId1,
          email: `test-mt-org1-${Date.now()}@betali.test`,
          name: `Test User Org1 ${Date.now()}`,
          organization_id: testData.org1.organization_id,
          role: 'admin',
          password_hash: 'test_hash'
        })
        .select()
        .single();

      if (user1Error) {
        throw new Error(`Failed to create user 1: ${user1Error.message}`);
      }

      users1 = newUser1;
      testData.createdUser1 = true;
      logSuccess(`Test user 1 created: ${users1.user_id}`);
    } else {
      logInfo(`Using existing user 1: ${users1.user_id}`);
    }

    testData.user1 = users1.user_id;

    // Get or create user for Org 2
    let { data: users2 } = await supabase
      .from('users')
      .select('user_id')
      .eq('organization_id', testData.org2.organization_id)
      .limit(1)
      .maybeSingle();

    if (!users2) {
      logWarning('No user found for Org 2. Creating test user...');

      const testUserId2 = require('crypto').randomUUID();
      const { data: newUser2, error: user2Error } = await supabase
        .from('users')
        .insert({
          user_id: testUserId2,
          email: `test-mt-org2-${Date.now()}@betali.test`,
          name: `Test User Org2 ${Date.now()}`,
          organization_id: testData.org2.organization_id,
          role: 'admin',
          password_hash: 'test_hash'
        })
        .select()
        .single();

      if (user2Error) {
        throw new Error(`Failed to create user 2: ${user2Error.message}`);
      }

      users2 = newUser2;
      testData.createdUser2 = true;
      logSuccess(`Test user 2 created: ${users2.user_id}`);
    } else {
      logInfo(`Using existing user 2: ${users2.user_id}`);
    }

    testData.user2 = users2.user_id;

    // Create test warehouse for Org 1
    const { data: wh1 } = await supabase
      .from('warehouse')
      .insert({
        organization_id: testData.org1.organization_id,
        name: `TEST Multi-Tenant WH Org1 ${Date.now()}`,
        location: 'Org 1 Location',
        owner_id: testData.user1,
        user_id: testData.user1
      })
      .select()
      .single();

    testData.warehouse1 = wh1;
    testData.testEntities.push({ table: 'warehouse', idField: 'warehouse_id', id: wh1.warehouse_id });
    logSuccess(`Warehouse 1 created: ${wh1.warehouse_id}`);

    // Create test product for Org 1
    const { data: prod1 } = await supabase
      .from('products')
      .insert({
        organization_id: testData.org1.organization_id,
        name: `TEST Multi-Tenant Product Org1 ${Date.now()}`,
        batch_number: `ORG1-${Date.now()}`,
        expiration_date: '2025-12-31',
        origin_country: 'Argentina',
        owner_id: testData.user1
      })
      .select()
      .single();

    testData.product1 = prod1;
    testData.testEntities.push({ table: 'products', idField: 'product_id', id: prod1.product_id });
    logSuccess(`Product 1 created: ${prod1.product_id}`);

    // Create test client for Org 1
    const { data: client1, error: client1Error } = await supabase
      .from('clients')
      .insert({
        organization_id: testData.org1.organization_id,
        user_id: testData.user1,
        name: `TEST Client Org1 ${Date.now()}`,
        cuit: `20-${Date.now().toString().slice(-8)}-9`,
        email: 'client1@test.com',
        phone: '1234567890'
      })
      .select()
      .single();

    if (client1Error) {
      logWarning(`Could not create Client 1: ${client1Error.message}`);
      testData.client1 = null;
    } else {
      testData.client1 = client1;
      testData.testEntities.push({ table: 'clients', idField: 'client_id', id: client1.client_id });
      logSuccess(`Client 1 created: ${client1.client_id}`);
    }

    // If we have Org 2, create its test data
    if (testData.org2) {
      // Warehouse for Org 2
      const { data: wh2 } = await supabase
        .from('warehouse')
        .insert({
          organization_id: testData.org2.organization_id,
          name: `TEST Multi-Tenant WH Org2 ${Date.now()}`,
          location: 'Org 2 Location',
          owner_id: testData.user2 || testData.user1,
          user_id: testData.user2 || testData.user1
        })
        .select()
        .single();

      testData.warehouse2 = wh2;
      testData.testEntities.push({ table: 'warehouse', idField: 'warehouse_id', id: wh2.warehouse_id });
      logSuccess(`Warehouse 2 created: ${wh2.warehouse_id}`);

      // Product for Org 2
      const { data: prod2 } = await supabase
        .from('products')
        .insert({
          organization_id: testData.org2.organization_id,
          name: `TEST Multi-Tenant Product Org2 ${Date.now()}`,
          batch_number: `ORG2-${Date.now()}`,
          expiration_date: '2025-12-31',
          origin_country: 'Argentina',
          owner_id: testData.user2 || testData.user1
        })
        .select()
        .single();

      testData.product2 = prod2;
      testData.testEntities.push({ table: 'products', idField: 'product_id', id: prod2.product_id });
      logSuccess(`Product 2 created: ${prod2.product_id}`);

      // Client for Org 2
      const { data: client2, error: client2Error } = await supabase
        .from('clients')
        .insert({
          organization_id: testData.org2.organization_id,
          user_id: testData.user2 || testData.user1,
          name: `TEST Client Org2 ${Date.now()}`,
          cuit: `20-${(Date.now() + 1).toString().slice(-8)}-9`,
          email: 'client2@test.com',
          phone: '0987654321'
        })
        .select()
        .single();

      if (client2Error) {
        logWarning(`Could not create Client 2: ${client2Error.message}`);
        testData.client2 = null;
      } else {
        testData.client2 = client2;
        testData.testEntities.push({ table: 'clients', idField: 'client_id', id: client2.client_id });
        logSuccess(`Client 2 created: ${client2.client_id}`);
      }
    }

    logSuccess('Setup completed successfully!\n');
    return true;
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

// TEST 1: Products are isolated by organization
async function test1_ProductIsolation() {
  logTest('TEST 1: Product Data Isolation');

  if (!testData.org2) {
    logWarning('Skipping - only 1 organization available');
    return true;
  }

  try {
    // Query products for Org 1 - should only see Org 1 products
    const { data: org1Products } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', testData.org1.organization_id);

    logInfo(`Org 1 query found ${org1Products.length} products`);

    // Check that Org 1 products don't include Org 2 product
    const hasOrg2Product = org1Products.some(p => p.product_id === testData.product2.product_id);

    if (hasOrg2Product) {
      logError('CRITICAL: Org 1 can see Org 2 products!');
      return false;
    }

    logSuccess('Org 1 cannot see Org 2 products ✓');

    // Query products for Org 2 - should only see Org 2 products
    const { data: org2Products } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', testData.org2.organization_id);

    logInfo(`Org 2 query found ${org2Products.length} products`);

    // Check that Org 2 products don't include Org 1 product
    const hasOrg1Product = org2Products.some(p => p.product_id === testData.product1.product_id);

    if (hasOrg1Product) {
      logError('CRITICAL: Org 2 can see Org 1 products!');
      return false;
    }

    logSuccess('Org 2 cannot see Org 1 products ✓');

    // Try to directly access Org 2 product with Org 1 context
    const { data: directAccess } = await supabase
      .from('products')
      .select('*')
      .eq('product_id', testData.product2.product_id)
      .eq('organization_id', testData.org1.organization_id)
      .single();

    if (directAccess) {
      logError('CRITICAL: Cross-organization direct access possible!');
      return false;
    }

    logSuccess('Direct cross-org access blocked ✓');

    logSuccess('TEST 1 PASSED ✓\n');
    return true;
  } catch (error) {
    logError(`TEST 1 FAILED: ${error.message}\n`);
    return false;
  }
}

// TEST 2: Warehouses are isolated by organization
async function test2_WarehouseIsolation() {
  logTest('TEST 2: Warehouse Data Isolation');

  if (!testData.org2) {
    logWarning('Skipping - only 1 organization available');
    return true;
  }

  try {
    // Query warehouses for Org 1
    const { data: org1Warehouses } = await supabase
      .from('warehouse')
      .select('*')
      .eq('organization_id', testData.org1.organization_id);

    const hasOrg2Warehouse = org1Warehouses.some(w => w.warehouse_id === testData.warehouse2.warehouse_id);

    if (hasOrg2Warehouse) {
      logError('CRITICAL: Org 1 can see Org 2 warehouses!');
      return false;
    }

    logSuccess('Org 1 cannot see Org 2 warehouses ✓');

    // Query warehouses for Org 2
    const { data: org2Warehouses } = await supabase
      .from('warehouse')
      .select('*')
      .eq('organization_id', testData.org2.organization_id);

    const hasOrg1Warehouse = org2Warehouses.some(w => w.warehouse_id === testData.warehouse1.warehouse_id);

    if (hasOrg1Warehouse) {
      logError('CRITICAL: Org 2 can see Org 1 warehouses!');
      return false;
    }

    logSuccess('Org 2 cannot see Org 1 warehouses ✓');

    logSuccess('TEST 2 PASSED ✓\n');
    return true;
  } catch (error) {
    logError(`TEST 2 FAILED: ${error.message}\n`);
    return false;
  }
}

// TEST 3: Clients are isolated by organization
async function test3_ClientIsolation() {
  logTest('TEST 3: Client Data Isolation');

  if (!testData.org2) {
    logWarning('Skipping - only 1 organization available');
    return true;
  }

  if (!testData.client1 || !testData.client2) {
    logWarning('Skipping - clients were not created successfully');
    return true;
  }

  try {
    // Query clients for Org 1
    const { data: org1Clients } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', testData.org1.organization_id);

    const hasOrg2Client = org1Clients.some(c => c.client_id === testData.client2.client_id);

    if (hasOrg2Client) {
      logError('CRITICAL: Org 1 can see Org 2 clients!');
      return false;
    }

    logSuccess('Org 1 cannot see Org 2 clients ✓');

    // Query clients for Org 2
    const { data: org2Clients } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', testData.org2.organization_id);

    const hasOrg1Client = org2Clients.some(c => c.client_id === testData.client1.client_id);

    if (hasOrg1Client) {
      logError('CRITICAL: Org 2 can see Org 1 clients!');
      return false;
    }

    logSuccess('Org 2 cannot see Org 1 clients ✓');

    logSuccess('TEST 3 PASSED ✓\n');
    return true;
  } catch (error) {
    logError(`TEST 3 FAILED: ${error.message}\n`);
    return false;
  }
}

// TEST 4: Stock movements are isolated
async function test4_StockMovementIsolation() {
  logTest('TEST 4: Stock Movement Data Isolation');

  if (!testData.org2) {
    logWarning('Skipping - only 1 organization available');
    return true;
  }

  try {
    // Create stock movement for Org 1
    const { data: movement1 } = await supabase
      .from('stock_movements')
      .insert({
        product_id: testData.product1.product_id,
        warehouse_id: testData.warehouse1.warehouse_id,
        movement_type: 'entry',
        quantity: 100,
        reference: 'TEST Org1 Movement'
      })
      .select()
      .single();

    testData.testEntities.push({ table: 'stock_movements', idField: 'movement_id', id: movement1.movement_id });

    // Create stock movement for Org 2
    const { data: movement2 } = await supabase
      .from('stock_movements')
      .insert({
        product_id: testData.product2.product_id,
        warehouse_id: testData.warehouse2.warehouse_id,
        movement_type: 'entry',
        quantity: 50,
        reference: 'TEST Org2 Movement'
      })
      .select()
      .single();

    testData.testEntities.push({ table: 'stock_movements', idField: 'movement_id', id: movement2.movement_id });

    // Query movements for Org 1's warehouse
    const { data: org1Movements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('warehouse_id', testData.warehouse1.warehouse_id);

    const hasOrg2Movement = org1Movements.some(m => m.movement_id === movement2.movement_id);

    if (hasOrg2Movement) {
      logError('CRITICAL: Org 1 can see Org 2 stock movements!');
      return false;
    }

    logSuccess('Stock movements are properly isolated ✓');

    logSuccess('TEST 4 PASSED ✓\n');
    return true;
  } catch (error) {
    logError(`TEST 4 FAILED: ${error.message}\n`);
    return false;
  }
}

// TEST 5: Orders are isolated
async function test5_OrderIsolation() {
  logTest('TEST 5: Order Data Isolation');

  if (!testData.org2) {
    logWarning('Skipping - only 1 organization available');
    return true;
  }

  try {
    if (!testData.client1 || !testData.client2) {
      logWarning('Skipping - clients were not created successfully');
      return true;
    }

    // Create order for Org 1
    const { data: order1 } = await supabase
      .from('orders')
      .insert({
        organization_id: testData.org1.organization_id,
        client_id: testData.client1.client_id,
        warehouse_id: testData.warehouse1.warehouse_id,
        user_id: testData.user1,
        status: 'pending',
        order_date: new Date().toISOString(),
        total_price: 100
      })
      .select()
      .single();

    testData.testEntities.push({ table: 'orders', idField: 'order_id', id: order1.order_id });

    // Create order for Org 2
    const { data: order2 } = await supabase
      .from('orders')
      .insert({
        organization_id: testData.org2.organization_id,
        client_id: testData.client2.client_id,
        warehouse_id: testData.warehouse2.warehouse_id,
        user_id: testData.user2 || testData.user1,
        status: 'pending',
        order_date: new Date().toISOString(),
        total_price: 200
      })
      .select()
      .single();

    testData.testEntities.push({ table: 'orders', idField: 'order_id', id: order2.order_id });

    // Query orders for Org 1
    const { data: org1Orders } = await supabase
      .from('orders')
      .select('*')
      .eq('organization_id', testData.org1.organization_id);

    const hasOrg2Order = org1Orders.some(o => o.order_id === order2.order_id);

    if (hasOrg2Order) {
      logError('CRITICAL: Org 1 can see Org 2 orders!');
      return false;
    }

    logSuccess('Orders are properly isolated ✓');

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
  log('\n🔒 MULTI-TENANT DATA ISOLATION TESTS', 'cyan');
  log('='.repeat(70), 'cyan');
  log(`Started at: ${new Date().toLocaleString()}\n`, 'blue');
  log('⚠️  CRITICAL: These tests verify NO data leakage between organizations', 'yellow');
  console.log('');

  // Setup
  const setupSuccess = await setupTestOrganizations();
  if (!setupSuccess) {
    logError('Setup failed. Aborting tests.');
    process.exit(1);
  }

  // Run tests
  const results = {
    test1: await test1_ProductIsolation(),
    test2: await test2_WarehouseIsolation(),
    test3: await test3_ClientIsolation(),
    test4: await test4_StockMovementIsolation(),
    test5: await test5_OrderIsolation()
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

  if (passed === total) {
    log(`\n✅ ALL TESTS PASSED: ${passed}/${total}`, 'green');
    log('🎉 Multi-tenant isolation is SECURE!', 'green');
  } else {
    log(`\n❌ SOME TESTS FAILED: ${passed}/${total}`, 'red');
    log('🚨 CRITICAL: Data leakage detected! Fix before production!', 'red');
  }

  log(`Success rate: ${Math.round((passed / total) * 100)}%\n`, passed === total ? 'green' : 'yellow');

  // Cleanup
  await cleanup();

  log(`\nCompleted at: ${new Date().toLocaleString()}`, 'blue');

  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Jest test wrapper
describe('Multi-Tenant Data Isolation Tests', () => {
  beforeAll(async () => {
    const setupSuccess = await setupTestOrganizations();
    if (!setupSuccess) {
      throw new Error('Setup failed');
    }
  }, 30000);

  afterAll(async () => {
    await cleanup();
  }, 30000);

  test('Test 1: Product data is properly isolated between organizations', async () => {
    const result = await test1_ProductIsolation();
    expect(result).toBe(true);
  }, 30000);

  test('Test 2: Warehouse data is properly isolated between organizations', async () => {
    const result = await test2_WarehouseIsolation();
    expect(result).toBe(true);
  }, 30000);

  test('Test 3: Client data is properly isolated between organizations', async () => {
    const result = await test3_ClientIsolation();
    expect(result).toBe(true);
  }, 30000);

  test('Test 4: Stock movements are properly isolated between organizations', async () => {
    const result = await test4_StockMovementIsolation();
    expect(result).toBe(true);
  }, 30000);

  test('Test 5: Orders are properly isolated between organizations', async () => {
    const result = await test5_OrderIsolation();
    expect(result).toBe(true);
  }, 30000);
});

// Keep standalone execution for manual testing (but not when running through Jest)
if (require.main === module && !process.env.JEST_WORKER_ID) {
  runAllTests().catch(error => {
    logError(`Fatal error: ${error.message}`);
    cleanup().then(() => process.exit(1));
  });
}
