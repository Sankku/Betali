/**
 * Create test data for stock reservation testing
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTestData() {
  console.log('\n🏗️  Creating test data for stock reservations...\n');

  try {
    // 1. Get or create organization
    console.log('1️⃣  Getting organization...');
    let { data: org } = await supabase
      .from('organizations')
      .select('organization_id, name')
      .limit(1)
      .single();

    if (!org) {
      const { data: newOrg } = await supabase
        .from('organizations')
        .insert({ name: 'Test Organization - Stock' })
        .select()
        .single();
      org = newOrg;
    }

    const organizationId = org.organization_id;
    console.log(`   ✅ Organization: ${org.name}`);

    // 2. Get or create user
    console.log('\n2️⃣  Getting user...');
    let { data: user } = await supabase
      .from('users')
      .select('user_id, name, email')
      .limit(1)
      .single();

    if (!user) {
      console.log('   ⚠️  No users found. You may need to create one manually.');
      return;
    }

    const userId = user.user_id;
    console.log(`   ✅ User: ${user.name} (${user.email})`);

    // 3. Get or create warehouse
    console.log('\n3️⃣  Getting warehouse...');

    // First try to get existing warehouse
    let { data: warehouse } = await supabase
      .from('warehouse')
      .select('warehouse_id, name')
      .eq('organization_id', organizationId)
      .limit(1)
      .single();

    let warehouseId;

    if (warehouse) {
      warehouseId = warehouse.warehouse_id;
      console.log(`   ✅ Using existing warehouse: ${warehouse.name}`);
    } else {
      // If no warehouse exists, try to create one
      console.log('   ⚠️  No warehouse found. Please create one manually in Supabase.');
      console.log('   Or use the UI to create a warehouse for this organization.');
      return;
    }

    // 4. Create test product
    console.log('\n4️⃣  Creating test product...');
    const { data: product, error: prodError } = await supabase
      .from('products')
      .insert({
        organization_id: organizationId,
        name: 'Test Product - Stock Reservation ' + Date.now(),
        batch_number: 'BATCH-TEST-' + Date.now(),
        origin_country: 'Test Country',
        expiration_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        price: 100.00,
        category: 'test'
      })
      .select()
      .single();

    if (prodError) {
      console.log('   ❌ Error creating product:', prodError.message);
      return;
    }

    const productId = product.product_id;
    console.log(`   ✅ Created product: ${product.name}`);

    // 5. Add initial stock
    console.log('\n5️⃣  Adding initial stock (100 units)...');
    const { data: stockMovement, error: stockError } = await supabase
      .from('stock_movements')
      .insert({
        organization_id: organizationId,
        product_id: productId,
        warehouse_id: warehouseId,
        movement_type: 'in',
        quantity: 100,
        movement_date: new Date().toISOString(),
        reference: 'Initial test stock for reservations'
      })
      .select()
      .single();

    if (stockError) {
      console.log('   ❌ Error adding stock:', stockError.message);
      return;
    }

    console.log(`   ✅ Added 100 units to warehouse`);

    // 6. Test get_available_stock function
    console.log('\n6️⃣  Testing get_available_stock function...');
    const { data: availableStock, error: availError } = await supabase
      .rpc('get_available_stock', {
        p_product_id: productId,
        p_warehouse_id: warehouseId,
        p_organization_id: organizationId
      });

    if (availError) {
      console.log('   ❌ Error:', availError.message);
    } else {
      console.log(`   ✅ Available stock: ${availableStock} units`);
    }

    // 7. Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test Data Created Successfully!');
    console.log('='.repeat(60));
    console.log('\n📊 Test Data Summary:');
    console.log(`   Organization ID: ${organizationId}`);
    console.log(`   Warehouse ID:    ${warehouseId}`);
    console.log(`   Product ID:      ${productId}`);
    console.log(`   User ID:         ${userId}`);
    console.log(`   Initial Stock:   100 units`);
    console.log(`   Available Stock: ${availableStock} units`);

    console.log('\n🧪 Next Steps:');
    console.log('   1. Test creating an order:');
    console.log('      POST /api/orders with these IDs');
    console.log('   2. Test stock reservation:');
    console.log('      Change order status to "processing"');
    console.log('   3. Test available stock:');
    console.log(`      GET /api/products/${productId}/available-stock?warehouse_id=${warehouseId}`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

createTestData();
