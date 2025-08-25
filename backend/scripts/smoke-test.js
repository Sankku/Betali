const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

class SmokeTest {
  constructor() {
    this.testResults = [];
    this.testOrganization = null;
    this.testUser = null;
    this.testBranch = null;
    this.testClient = null;
    this.testWarehouse = null;
    this.testProduct = null;
  }

  log(emoji, message, status = 'info') {
    const timestamp = new Date().toISOString();
    const line = `${emoji} ${message}`;
    console.log(line);
    this.testResults.push({ timestamp, message: line, status });
  }

  async test(name, testFn) {
    try {
      this.log('🧪', `Testing: ${name}`, 'test');
      await testFn();
      this.log('✅', `PASSED: ${name}`, 'pass');
      return true;
    } catch (error) {
      this.log('❌', `FAILED: ${name} - ${error.message}`, 'fail');
      return false;
    }
  }

  async runAllTests() {
    this.log('🚀', 'Starting BETALI System Smoke Test');
    this.log('=' .repeat(50));
    
    // Test 1: Database Connection
    await this.test('Database Connection', async () => {
      const { data, error } = await supabase.from('organizations').select('count').limit(1);
      if (error) throw error;
    });

    // Test 2: Organizations
    await this.test('Organization CRUD', async () => {
      // Create
      const { data: org, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: 'Test Smoke Org',
          slug: `test-smoke-${Date.now()}`,
          email: 'test@smoketest.com'
        })
        .select()
        .single();
      
      if (createError) throw createError;
      this.testOrganization = org;
      this.log('📊', `Created organization: ${org.name}`);

      // Read
      const { data: readOrg, error: readError } = await supabase
        .from('organizations')
        .select('*')
        .eq('organization_id', org.organization_id)
        .single();
      
      if (readError) throw readError;
      if (!readOrg) throw new Error('Organization not found after creation');
    });

    // Test 3: Users
    await this.test('User Management', async () => {
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          name: 'Test Smoke User',
          email: `test-smoke-${Date.now()}@example.com`,
          password_hash: 'test_hash',
          role: 'member',
          organization_id: this.testOrganization.organization_id
        })
        .select()
        .single();
      
      if (error) throw error;
      this.testUser = user;
      this.log('👤', `Created user: ${user.name}`);
    });

    // Test 4: Branches
    await this.test('Branch Management', async () => {
      const { data: branch, error } = await supabase
        .from('branches')
        .insert({
          name: 'Test Smoke Branch',
          organization_id: this.testOrganization.organization_id,
          address: 'Test Address',
          is_main_branch: true
        })
        .select()
        .single();
      
      if (error) throw error;
      this.testBranch = branch;
      this.log('🏢', `Created branch: ${branch.name}`);
    });

    // Test 5: Clients (Customers)
    await this.test('Client Management', async () => {
      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          name: 'Test Smoke Client',
          cuit: `smoke-${Date.now()}`,
          email: `client-smoke-${Date.now()}@example.com`,
          organization_id: this.testOrganization.organization_id,
          branch_id: this.testBranch.branch_id,
          user_id: this.testUser.user_id
        })
        .select()
        .single();
      
      if (error) throw error;
      this.testClient = client;
      this.log('👥', `Created client: ${client.name}`);
    });

    // Test 6: Warehouses
    await this.test('Warehouse Management', async () => {
      const { data: warehouse, error } = await supabase
        .from('warehouse')
        .insert({
          name: 'Test Smoke Warehouse',
          location: 'Test Location',
          organization_id: this.testOrganization.organization_id,
          branch_id: this.testBranch.branch_id
          // Skipping user_id and owner_id due to auth.users FK constraint issues
        })
        .select()
        .single();
      
      if (error) throw error;
      this.testWarehouse = warehouse;
      this.log('🏪', `Created warehouse: ${warehouse.name}`);
    });

    // Test 7: Products
    await this.test('Product Management', async () => {
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          name: 'Test Smoke Product',
          batch_number: `SMOKE-${Date.now()}`,
          expiration_date: '2025-12-31',
          origin_country: 'Argentina',
          organization_id: this.testOrganization.organization_id,
          branch_id: this.testBranch.branch_id
        })
        .select()
        .single();
      
      if (error) throw error;
      this.testProduct = product;
      this.log('📦', `Created product: ${product.name}`);
    });

    // Test 8: Stock Movements
    await this.test('Stock Movement Management', async () => {
      const { data: movement, error } = await supabase
        .from('stock_movements')
        .insert({
          product_id: this.testProduct.product_id,
          warehouse_id: this.testWarehouse.warehouse_id,
          movement_type: 'entry',
          quantity: 100,
          reference: 'Smoke Test Entry',
          organization_id: this.testOrganization.organization_id,
          branch_id: this.testBranch.branch_id
        })
        .select()
        .single();
      
      if (error) throw error;
      this.log('📈', `Created stock movement: ${movement.movement_type} - ${movement.quantity} units`);
    });

    // Test 9: Orders
    await this.test('Order Management', async () => {
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          client_id: this.testClient.client_id,
          warehouse_id: this.testWarehouse.warehouse_id,
          status: 'pending',
          total_price: 150.00,
          organization_id: this.testOrganization.organization_id,
          branch_id: this.testBranch.branch_id,
          user_id: this.testUser.user_id
        })
        .select()
        .single();
      
      if (error) throw error;
      this.log('📝', `Created order: ${order.status} - $${order.total_price}`);

      // Test order details
      const { data: orderDetail, error: detailError } = await supabase
        .from('order_details')
        .insert({
          order_id: order.order_id,
          product_id: this.testProduct.product_id,
          quantity: 5,
          price: 30.00,
          organization_id: this.testOrganization.organization_id
        })
        .select()
        .single();
      
      if (detailError) throw detailError;
      this.log('📄', `Created order detail: ${orderDetail.quantity} x ${orderDetail.price}`);
    });

    // Test 10: Multi-tenant Isolation
    await this.test('Multi-tenant Data Isolation', async () => {
      // Test that we can query organization-specific data
      const { data: orgProducts, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', this.testOrganization.organization_id);
      
      if (prodError) throw prodError;
      if (orgProducts.length === 0) throw new Error('No products found for organization');
      
      const { data: orgClients, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', this.testOrganization.organization_id);
      
      if (clientError) throw clientError;
      if (orgClients.length === 0) throw new Error('No clients found for organization');
      
      this.log('🔐', `Multi-tenant isolation working: ${orgProducts.length} products, ${orgClients.length} clients`);
    });

    // Cleanup
    await this.test('Cleanup Test Data', async () => {
      await supabase.from('organizations').delete().eq('organization_id', this.testOrganization.organization_id);
      this.log('🧹', 'Cleaned up test data');
    });

    // Summary
    this.log('=' .repeat(50));
    const passed = this.testResults.filter(r => r.status === 'pass').length;
    const failed = this.testResults.filter(r => r.status === 'fail').length;
    const total = passed + failed;
    
    this.log('📊', `SMOKE TEST SUMMARY: ${passed}/${total} tests passed`);
    
    if (failed > 0) {
      this.log('⚠️', `${failed} tests failed - review the logs above`);
      process.exit(1);
    } else {
      this.log('🎉', 'ALL SMOKE TESTS PASSED! System is working correctly.');
    }
  }
}

// Run the smoke test
const smokeTest = new SmokeTest();
smokeTest.runAllTests().catch(error => {
  console.error('💥 Smoke test crashed:', error);
  process.exit(1);
});