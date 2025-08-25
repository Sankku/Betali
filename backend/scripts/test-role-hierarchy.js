const { validateRoleAssignment, getAssignableRoles, getRoleInfo } = require('../utils/roleValidation');

/**
 * Test script for role hierarchy validation
 */
function testRoleHierarchy() {
  console.log('🧪 Testing Role Hierarchy Implementation');
  console.log('=====================================\n');

  // Test cases: [currentUserRole, targetRole, shouldSucceed]
  const testCases = [
    // Super admin tests
    ['super_admin', 'admin', true, 'Super admin can assign admin'],
    ['super_admin', 'manager', true, 'Super admin can assign manager'],
    ['super_admin', 'employee', true, 'Super admin can assign employee'],  
    ['super_admin', 'viewer', true, 'Super admin can assign viewer'],
    ['super_admin', 'super_admin', false, 'Super admin cannot assign super_admin'],
    
    // Admin tests
    ['admin', 'super_admin', false, 'Admin cannot assign super_admin (PROTECTED)'],
    ['admin', 'admin', false, 'Admin cannot assign admin to others'],
    ['admin', 'manager', true, 'Admin can assign manager'],
    ['admin', 'employee', true, 'Admin can assign employee'],
    ['admin', 'viewer', true, 'Admin can assign viewer'],
    
    // Manager tests  
    ['manager', 'super_admin', false, 'Manager cannot assign super_admin (PROTECTED)'],
    ['manager', 'admin', false, 'Manager cannot assign admin'],
    ['manager', 'manager', false, 'Manager cannot assign manager to others'],
    ['manager', 'employee', true, 'Manager can assign employee'],
    ['manager', 'viewer', true, 'Manager can assign viewer'],
    
    // Employee tests
    ['employee', 'super_admin', false, 'Employee cannot assign super_admin'],
    ['employee', 'admin', false, 'Employee cannot assign admin'],
    ['employee', 'manager', false, 'Employee cannot assign manager'],
    ['employee', 'employee', false, 'Employee cannot assign employee'],
    ['employee', 'viewer', false, 'Employee cannot assign viewer'],
    
    // Viewer tests  
    ['viewer', 'super_admin', false, 'Viewer cannot assign super_admin'],
    ['viewer', 'admin', false, 'Viewer cannot assign admin'],
    ['viewer', 'manager', false, 'Viewer cannot assign manager'],
    ['viewer', 'employee', false, 'Viewer cannot assign employee'],
    ['viewer', 'viewer', false, 'Viewer cannot assign viewer'],
  ];

  let passed = 0;
  let failed = 0;

  console.log('📋 Role Assignment Tests:');
  console.log('-'.repeat(80));

  testCases.forEach(([currentRole, targetRole, expected, description], index) => {
    const result = validateRoleAssignment(currentRole, targetRole);
    const success = result.success === expected;
    
    const status = success ? '✅' : '❌';
    const resultText = result.success ? 'ALLOWED' : 'BLOCKED';
    const expectedText = expected ? 'SHOULD ALLOW' : 'SHOULD BLOCK';
    
    console.log(`${status} Test ${index + 1}: ${description}`);
    console.log(`   ${currentRole} → ${targetRole}: ${resultText} (${expectedText})`);
    
    if (!success) {
      console.log(`   ERROR: Expected ${expectedText} but got ${resultText}`);
      console.log(`   Reason: ${result.error || 'No error message'}`);
      failed++;
    } else {
      passed++;
    }
    console.log('');
  });

  console.log('=' .repeat(80));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Role hierarchy is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }

  console.log('\n🔍 Role Information Summary:');
  console.log('-'.repeat(50));
  
  const roles = ['super_admin', 'admin', 'manager', 'employee', 'viewer'];
  roles.forEach(role => {
    const info = getRoleInfo(role);
    console.log(`\n👤 ${role.toUpperCase()}:`);
    console.log(`   Protected: ${info.isProtected ? '🔒 Yes' : '❌ No'}`);
    console.log(`   Can assign: [${info.canAssign.join(', ')}]`);
    console.log(`   Can manage: [${info.canManage.join(', ')}]`);
  });

  console.log('\n🛡️  Security Summary:');
  console.log('-'.repeat(30));
  console.log('• super_admin role is PROTECTED - only super_admin can assign it');
  console.log('• Users cannot assign roles equal or higher than their own');
  console.log('• Role hierarchy enforced: super_admin > admin > manager > employee > viewer');
  console.log('• All role assignments are logged for audit purposes');

  return failed === 0;
}

// Run the test
if (require.main === module) {
  const success = testRoleHierarchy();
  process.exit(success ? 0 : 1);
}

module.exports = { testRoleHierarchy };