/**
 * Role-Based Permissions Testing Script
 * Tests that each role can only perform authorized actions
 *
 * Roles to test:
 * - owner (full control)
 * - admin (manage users, all data)
 * - manager (manage employees, inventory)
 * - employee (standard operations)
 * - viewer (read-only)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Logger } = require('../utils/Logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const logger = new Logger('RolePermissionsTest');

// Test data storage
const testData = {
  organization: null,
  users: {
    owner: null,
    admin: null,
    manager: null,
    employee: null,
    viewer: null
  },
  testResources: {
    product: null,
    warehouse: null,
    purchaseOrder: null
  }
};

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message, error = null) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
  if (error) {
    console.log(`${colors.red}   Error: ${error.message}${colors.reset}`);
  }
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logSection(message) {
  console.log(`\n${colors.cyan}${'='.repeat(70)}`);
  console.log(`${message}`);
  console.log(`${'='.repeat(70)}${colors.reset}\n`);
}

function logRole(role) {
  const roleColors = {
    owner: colors.magenta,
    admin: colors.cyan,
    manager: colors.blue,
    employee: colors.yellow,
    viewer: colors.green
  };
  const color = roleColors[role] || colors.reset;
  console.log(`\n${color}👤 Testing ${role.toUpperCase()} role${colors.reset}`);
}

/**
 * Setup test data - create organization and users with different roles
 */
async function setupTestData() {
  logSection('📦 Setting up test data for role testing');

  try {
    // Get existing organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
      .single();

    if (orgError) throw orgError;
    testData.organization = org;
    logSuccess(`Using organization: ${org.name}`);

    // Get users with different roles
    const { data: userOrgs, error: userOrgError } = await supabase
      .from('user_organizations')
      .select(`
        user_id,
        role,
        users!user_organizations_user_id_fkey(user_id, email, name)
      `)
      .eq('organization_id', org.organization_id);

    if (userOrgError) throw userOrgError;

    // Map users by role
    for (const uo of userOrgs) {
      const role = uo.role;
      if (['owner', 'admin', 'manager', 'employee', 'viewer'].includes(role)) {
        if (!testData.users[role]) {
          testData.users[role] = {
            user_id: uo.user_id,
            email: uo.users.email,
            name: uo.users.name,
            role: role
          };
          logSuccess(`Found ${role}: ${uo.users.email}`);
        }
      }
    }

    // Check which roles we have
    const missingRoles = [];
    for (const role of ['owner', 'admin', 'manager', 'employee', 'viewer']) {
      if (!testData.users[role]) {
        missingRoles.push(role);
      }
    }

    if (missingRoles.length > 0) {
      logWarning(`Missing roles: ${missingRoles.join(', ')}`);
      logInfo('Tests will only run for available roles');
    }

    // Create test resources
    logInfo('\nCreating test resources...');

    // Create test product
    const { data: product, error: prodError } = await supabase
      .from('products')
      .insert([{
        organization_id: org.organization_id,
        name: `Test Product - Roles ${Date.now()}`,
        cost_price: 10,
        sale_price: 20
      }])
      .select()
      .single();

    if (prodError) throw prodError;
    testData.testResources.product = product;
    logSuccess(`Created test product: ${product.name}`);

    // Get or create test warehouse
    const { data: warehouse, error: whError } = await supabase
      .from('warehouse')
      .select('*')
      .eq('organization_id', org.organization_id)
      .limit(1)
      .single();

    if (whError && whError.code === 'PGRST116') {
      const { data: newWh, error: createWhError } = await supabase
        .from('warehouse')
        .insert([{
          organization_id: org.organization_id,
          name: 'Test Warehouse - Roles',
          location: 'Test Location'
        }])
        .select()
        .single();

      if (createWhError) throw createWhError;
      testData.testResources.warehouse = newWh;
      logSuccess(`Created test warehouse: ${newWh.name}`);
    } else {
      testData.testResources.warehouse = warehouse;
      logSuccess(`Using warehouse: ${warehouse.name}`);
    }

    logSuccess('\n✅ Test data setup completed!\n');
    return true;

  } catch (error) {
    logError('Failed to setup test data', error);
    throw error;
  }
}

/**
 * Test product permissions for a specific role
 */
async function testProductPermissions(role, user) {
  logRole(role);
  logInfo('Testing PRODUCT permissions...\n');

  const results = {
    canRead: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false
  };

  try {
    // Test READ
    logInfo('  Testing READ products...');
    const { data: products, error: readError } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', testData.organization.organization_id)
      .limit(1);

    if (!readError && products) {
      results.canRead = true;
      logSuccess('  ✓ Can READ products');
    } else {
      logError('  ✗ Cannot READ products', readError);
    }

    // Test CREATE
    logInfo('  Testing CREATE product...');
    const { data: newProduct, error: createError } = await supabase
      .from('products')
      .insert([{
        organization_id: testData.organization.organization_id,
        name: `Test Product by ${role} ${Date.now()}`,
        cost_price: 5,
        sale_price: 10
      }])
      .select()
      .single();

    if (!createError && newProduct) {
      results.canCreate = true;
      logSuccess('  ✓ Can CREATE products');

      // Clean up
      await supabase.from('products').delete().eq('product_id', newProduct.product_id);
    } else {
      logError('  ✗ Cannot CREATE products', createError);
    }

    // Test UPDATE
    logInfo('  Testing UPDATE product...');
    const { error: updateError } = await supabase
      .from('products')
      .update({ name: `Updated by ${role}` })
      .eq('product_id', testData.testResources.product.product_id)
      .eq('organization_id', testData.organization.organization_id);

    if (!updateError) {
      results.canUpdate = true;
      logSuccess('  ✓ Can UPDATE products');
    } else {
      logError('  ✗ Cannot UPDATE products', updateError);
    }

    // Test DELETE
    logInfo('  Testing DELETE product...');
    // Create a product to delete
    const { data: toDelete, error: createDelError } = await supabase
      .from('products')
      .insert([{
        organization_id: testData.organization.organization_id,
        name: `To Delete by ${role}`,
        cost_price: 1,
        sale_price: 2
      }])
      .select()
      .single();

    if (!createDelError && toDelete) {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('product_id', toDelete.product_id)
        .eq('organization_id', testData.organization.organization_id);

      if (!deleteError) {
        results.canDelete = true;
        logSuccess('  ✓ Can DELETE products');
      } else {
        logError('  ✗ Cannot DELETE products', deleteError);
        // Clean up
        await supabase.from('products').delete().eq('product_id', toDelete.product_id);
      }
    } else {
      logWarning('  ⚠ Could not create product to test deletion');
    }

  } catch (error) {
    logError(`Error testing product permissions for ${role}`, error);
  }

  return results;
}

/**
 * Test purchase order permissions
 */
async function testPurchaseOrderPermissions(role, user) {
  logInfo('\nTesting PURCHASE ORDER permissions...\n');

  const results = {
    canRead: false,
    canCreate: false,
    canApprove: false,
    canReceive: false,
    canCancel: false
  };

  try {
    // Test READ
    logInfo('  Testing READ purchase orders...');
    const { data: pos, error: readError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('organization_id', testData.organization.organization_id)
      .limit(1);

    if (!readError) {
      results.canRead = true;
      logSuccess('  ✓ Can READ purchase orders');
    } else {
      logError('  ✗ Cannot READ purchase orders', readError);
    }

    // Test CREATE
    logInfo('  Testing CREATE purchase order...');
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('supplier_id')
      .eq('organization_id', testData.organization.organization_id)
      .limit(1)
      .single();

    if (supplier) {
      const poNumber = `PO-ROLE-TEST-${role}-${Date.now()}`;
      const { data: newPO, error: createError } = await supabase
        .from('purchase_orders')
        .insert([{
          organization_id: testData.organization.organization_id,
          supplier_id: supplier.supplier_id,
          warehouse_id: testData.testResources.warehouse.warehouse_id,
          user_id: user.user_id,
          created_by: user.user_id,
          status: 'draft',
          purchase_order_number: poNumber,
          order_date: new Date().toISOString(),
          subtotal: 100,
          total: 100,
          notes: `Created by ${role} for testing`
        }])
        .select()
        .single();

      if (!createError && newPO) {
        results.canCreate = true;
        logSuccess('  ✓ Can CREATE purchase orders');

        // Test APPROVE (change to approved status)
        logInfo('  Testing APPROVE purchase order...');
        const { error: approveError } = await supabase
          .from('purchase_orders')
          .update({ status: 'approved' })
          .eq('purchase_order_id', newPO.purchase_order_id)
          .eq('organization_id', testData.organization.organization_id);

        if (!approveError) {
          results.canApprove = true;
          logSuccess('  ✓ Can APPROVE purchase orders');
        } else {
          logError('  ✗ Cannot APPROVE purchase orders', approveError);
        }

        // Test RECEIVE
        logInfo('  Testing RECEIVE purchase order...');
        const { error: receiveError } = await supabase
          .from('purchase_orders')
          .update({ status: 'received', received_date: new Date().toISOString() })
          .eq('purchase_order_id', newPO.purchase_order_id)
          .eq('organization_id', testData.organization.organization_id);

        if (!receiveError) {
          results.canReceive = true;
          logSuccess('  ✓ Can RECEIVE purchase orders');
        } else {
          logError('  ✗ Cannot RECEIVE purchase orders', receiveError);
        }

        // Clean up
        await supabase.from('purchase_orders').delete().eq('purchase_order_id', newPO.purchase_order_id);
      } else {
        logError('  ✗ Cannot CREATE purchase orders', createError);
      }
    } else {
      logWarning('  ⚠ No supplier found to test PO creation');
    }

  } catch (error) {
    logError(`Error testing PO permissions for ${role}`, error);
  }

  return results;
}

/**
 * Test user management permissions
 */
async function testUserManagementPermissions(role, user) {
  logInfo('\nTesting USER MANAGEMENT permissions...\n');

  const results = {
    canViewUsers: false,
    canInviteUsers: false,
    canRemoveUsers: false,
    canChangeRoles: false
  };

  try {
    // Test VIEW users
    logInfo('  Testing VIEW users...');
    const { data: users, error: viewError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('organization_id', testData.organization.organization_id);

    if (!viewError) {
      results.canViewUsers = true;
      logSuccess('  ✓ Can VIEW users');
    } else {
      logError('  ✗ Cannot VIEW users', viewError);
    }

    // Note: We can't fully test INVITE, REMOVE, and CHANGE ROLES without
    // actually creating/modifying user_organizations records, which could
    // break the test environment. These should be tested via API with proper auth.

    logWarning('  ⚠ Full user management tests require API-level testing with auth');

  } catch (error) {
    logError(`Error testing user management for ${role}`, error);
  }

  return results;
}

/**
 * Verify expected permissions match actual permissions
 */
function verifyPermissions(role, actualPermissions, category) {
  const expectedPermissions = {
    owner: {
      products: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      purchaseOrders: { canRead: true, canCreate: true, canApprove: true, canReceive: true },
      users: { canViewUsers: true, canInviteUsers: true, canRemoveUsers: true, canChangeRoles: true }
    },
    admin: {
      products: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      purchaseOrders: { canRead: true, canCreate: true, canApprove: true, canReceive: true },
      users: { canViewUsers: true, canInviteUsers: true, canRemoveUsers: true, canChangeRoles: true }
    },
    manager: {
      products: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      purchaseOrders: { canRead: true, canCreate: true, canApprove: true, canReceive: true },
      users: { canViewUsers: true, canInviteUsers: true, canRemoveUsers: false, canChangeRoles: false }
    },
    employee: {
      products: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      purchaseOrders: { canRead: true, canCreate: true, canApprove: false, canReceive: false },
      users: { canViewUsers: true, canInviteUsers: false, canRemoveUsers: false, canChangeRoles: false }
    },
    viewer: {
      products: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      purchaseOrders: { canRead: true, canCreate: false, canApprove: false, canReceive: false },
      users: { canViewUsers: true, canInviteUsers: false, canRemoveUsers: false, canChangeRoles: false }
    }
  };

  const expected = expectedPermissions[role]?.[category] || {};
  let allMatch = true;
  const mismatches = [];

  for (const [permission, expectedValue] of Object.entries(expected)) {
    const actualValue = actualPermissions[permission];
    if (actualValue !== expectedValue) {
      allMatch = false;
      mismatches.push({
        permission,
        expected: expectedValue,
        actual: actualValue
      });
    }
  }

  return { allMatch, mismatches };
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n');
  logSection('🔐 Role-Based Permissions Testing Suite');
  logInfo('Testing that each role has appropriate access levels...\n');

  const testResults = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  try {
    await setupTestData();

    // Test each available role
    for (const [roleName, user] of Object.entries(testData.users)) {
      if (!user) {
        logWarning(`Skipping ${roleName} - no user with this role found`);
        continue;
      }

      logSection(`Testing ${roleName.toUpperCase()} Role`);

      // Test product permissions
      const productPerms = await testProductPermissions(roleName, user);
      const productVerification = verifyPermissions(roleName, productPerms, 'products');

      if (productVerification.allMatch) {
        logSuccess(`\n✅ ${roleName} product permissions are CORRECT`);
        testResults.passed++;
      } else {
        logError(`\n❌ ${roleName} product permissions MISMATCH:`);
        productVerification.mismatches.forEach(m => {
          logError(`  ${m.permission}: expected ${m.expected}, got ${m.actual}`);
        });
        testResults.failed++;
      }

      // Test purchase order permissions
      const poPerms = await testPurchaseOrderPermissions(roleName, user);
      const poVerification = verifyPermissions(roleName, poPerms, 'purchaseOrders');

      if (poVerification.allMatch) {
        logSuccess(`✅ ${roleName} purchase order permissions are CORRECT`);
        testResults.passed++;
      } else {
        logError(`❌ ${roleName} purchase order permissions MISMATCH:`);
        poVerification.mismatches.forEach(m => {
          logError(`  ${m.permission}: expected ${m.expected}, got ${m.actual}`);
        });
        testResults.failed++;
      }

      // Test user management permissions
      const userPerms = await testUserManagementPermissions(roleName, user);
      testResults.warnings++;
    }

    // Cleanup test resources
    logSection('🧹 Cleaning up test resources');
    if (testData.testResources.product) {
      await supabase
        .from('products')
        .delete()
        .eq('product_id', testData.testResources.product.product_id);
      logSuccess('Cleaned up test product');
    }

  } catch (error) {
    logError('Test suite failed', error);
    testResults.failed++;
  }

  // Results
  logSection('📊 Test Results');
  console.log(`${colors.green}✅ Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${testResults.failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${testResults.warnings}${colors.reset}\n`);

  if (testResults.failed === 0) {
    logSuccess('🎉 All role permission tests passed!');
    logInfo('Note: Database-level permissions tested. API-level auth should also be tested.');
  } else {
    logWarning('⚠️  Some permission tests failed. Review the errors above.');
    logInfo('This may indicate RLS policies need adjustment or roles are not configured correctly.');
  }

  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
