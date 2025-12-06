#!/usr/bin/env node

/**
 * Test transaction rollback functionality
 * Verifies that failed signup operations are rolled back correctly
 */

const { TransactionManager, withTransaction } = require('./utils/transactionManager');

console.log('🧪 TESTING TRANSACTION ROLLBACK');
console.log('===============================\n');

// Mock operations for testing
let createdUsers = [];
let createdOrgs = [];

const mockOperations = {
  createUser: async (userData) => {
    const user = { id: `user_${Date.now()}`, ...userData };
    createdUsers.push(user);
    console.log(`✅ Created user: ${user.id}`);
    return user;
  },

  deleteUser: async (user) => {
    createdUsers = createdUsers.filter(u => u.id !== user.id);
    console.log(`🔄 Rolled back user: ${user.id}`);
  },

  createOrg: async (orgData) => {
    const org = { id: `org_${Date.now()}`, ...orgData };
    createdOrgs.push(org);
    console.log(`✅ Created organization: ${org.id}`);
    return org;
  },

  deleteOrg: async (org) => {
    createdOrgs = createdOrgs.filter(o => o.id !== org.id);
    console.log(`🔄 Rolled back organization: ${org.id}`);
  },

  failingOperation: async () => {
    throw new Error('Simulated failure');
  }
};

async function testSuccessfulTransaction() {
  console.log('\n📝 TEST 1: Successful Transaction');
  console.log('==================================');

  createdUsers = [];
  createdOrgs = [];

  try {
    const result = await withTransaction(async (tx) => {
      const user = await tx.execute(
        'createUser',
        () => mockOperations.createUser({ name: 'Test User' }),
        (user) => mockOperations.deleteUser(user)
      );

      const org = await tx.execute(
        'createOrganization',
        () => mockOperations.createOrg({ name: 'Test Org', ownerId: user.id }),
        (org) => mockOperations.deleteOrg(org)
      );

      return { user, org };
    });

    console.log('\n✅ Transaction completed successfully');
    console.log('Created users:', createdUsers.length);
    console.log('Created orgs:', createdOrgs.length);
    console.log('Result:', result);

    if (createdUsers.length === 1 && createdOrgs.length === 1) {
      console.log('✅ TEST 1 PASSED');
      return true;
    } else {
      console.log('❌ TEST 1 FAILED - Expected 1 user and 1 org');
      return false;
    }
  } catch (error) {
    console.log('❌ TEST 1 FAILED - Unexpected error:', error.message);
    return false;
  }
}

async function testRollbackTransaction() {
  console.log('\n📝 TEST 2: Failed Transaction with Rollback');
  console.log('============================================');

  createdUsers = [];
  createdOrgs = [];

  try {
    await withTransaction(async (tx) => {
      const user = await tx.execute(
        'createUser',
        () => mockOperations.createUser({ name: 'Test User 2' }),
        (user) => mockOperations.deleteUser(user)
      );

      const org = await tx.execute(
        'createOrganization',
        () => mockOperations.createOrg({ name: 'Test Org 2', ownerId: user.id }),
        (org) => mockOperations.deleteOrg(org)
      );

      // This will fail and trigger rollback
      await tx.execute(
        'failingOperation',
        () => mockOperations.failingOperation()
      );

      return { user, org };
    });

    console.log('❌ TEST 2 FAILED - Transaction should have failed');
    return false;
  } catch (error) {
    console.log('\n⚠️  Transaction failed as expected:', error.message);
    console.log('Created users after rollback:', createdUsers.length);
    console.log('Created orgs after rollback:', createdOrgs.length);

    if (createdUsers.length === 0 && createdOrgs.length === 0) {
      console.log('✅ TEST 2 PASSED - All operations rolled back successfully');
      return true;
    } else {
      console.log('❌ TEST 2 FAILED - Rollback incomplete');
      console.log('Remaining users:', createdUsers);
      console.log('Remaining orgs:', createdOrgs);
      return false;
    }
  }
}

async function testPartialRollback() {
  console.log('\n📝 TEST 3: Partial Rollback (middle operation fails)');
  console.log('====================================================');

  createdUsers = [];
  createdOrgs = [];

  try {
    await withTransaction(async (tx) => {
      // Step 1: Create user (should be rolled back)
      await tx.execute(
        'createUser',
        () => mockOperations.createUser({ name: 'Test User 3' }),
        (user) => mockOperations.deleteUser(user)
      );

      // Step 2: Fail (triggers rollback)
      await tx.execute(
        'failingOperation',
        () => mockOperations.failingOperation()
      );

      // Step 3: Should not execute
      await tx.execute(
        'createOrganization',
        () => mockOperations.createOrg({ name: 'Test Org 3' }),
        (org) => mockOperations.deleteOrg(org)
      );
    });

    console.log('❌ TEST 3 FAILED - Transaction should have failed');
    return false;
  } catch (error) {
    console.log('\n⚠️  Transaction failed as expected:', error.message);
    console.log('Created users after rollback:', createdUsers.length);
    console.log('Created orgs after rollback:', createdOrgs.length);

    if (createdUsers.length === 0 && createdOrgs.length === 0) {
      console.log('✅ TEST 3 PASSED - Partial operations rolled back correctly');
      return true;
    } else {
      console.log('❌ TEST 3 FAILED - Rollback incomplete');
      return false;
    }
  }
}

async function runAllTests() {
  console.log('Starting transaction rollback tests...\n');

  const results = [];

  results.push(await testSuccessfulTransaction());
  results.push(await testRollbackTransaction());
  results.push(await testPartialRollback());

  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`${passed === total ? '🎉' : '❌'} Overall: ${passed === total ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}\n`);

  if (passed === total) {
    console.log('✅ Transaction Manager is working correctly');
    console.log('✅ Rollback functionality verified');
    console.log('✅ Ready for production use\n');
    process.exit(0);
  } else {
    console.log('❌ Transaction Manager has issues');
    console.log('❌ Review failed tests above\n');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
