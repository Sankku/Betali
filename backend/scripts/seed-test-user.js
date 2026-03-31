const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function seedUser({ email, password, name, orgName, slug, role }) {
  // Try to get existing user first (avoids listUsers pagination issues)
  let user;
  try {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        // User exists — find via listUsers with filter
        const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        user = usersData?.users?.find(u => u.email === email);
        if (!user) throw new Error(`User ${email} exists in Auth but could not be retrieved`);
      } else {
        throw new Error(`Auth creation failed for ${email}: ` + error.message);
      }
    } else {
      user = data.user;
    }
  } catch (e) {
    if (e.message.includes('already been registered') || e.message.includes('already exists')) {
      const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      user = usersData?.users?.find(u => u.email === email);
      if (!user) throw new Error(`User ${email} not found after duplicate error`);
    } else {
      throw e;
    }
  }
  const userId = user.id;

  let { data: org } = await supabase.from('organizations').select('*').eq('slug', slug).maybeSingle();
  if (!org) {
    const { data, error } = await supabase.from('organizations').insert({
      name: orgName,
      slug,
      plan_type: 'professional',
      subscription_plan: 'professional',
      subscription_status: 'active',
    }).select().single();
    if (error) throw new Error(`Org creation failed for ${slug}: ` + error.message);
    org = data;
  } else {
    // Ensure existing orgs have correct subscription fields for tests
    await supabase.from('organizations').update({
      subscription_plan: 'professional',
      subscription_status: 'active',
    }).eq('organization_id', org.organization_id);
  }
  const orgId = org.organization_id;

  const passwordHash = await bcrypt.hash(password, 10);
  await supabase.from('user_organizations').upsert(
    { user_id: userId, organization_id: orgId, role, permissions: ['*'] },
    { onConflict: 'user_id,organization_id' }
  );
  await supabase.from('users').upsert(
    { user_id: userId, email, name, password_hash: passwordHash, organization_id: orgId, role, is_active: true },
    { onConflict: 'user_id' }
  );

  return { userId, orgId, org };
}

async function seed() {
  const password = 'TestPassword123!';

  try {
    console.log('🚀 Starting Robust Seeding...');

    // 1. Seed admin user → Betali Test Org (used by most E2E tests)
    const { userId, orgId } = await seedUser({
      email: 'admin@betali-test.com',
      password,
      name: 'Test Admin',
      orgName: 'Betali Test Org',
      slug: 'betali-test-org',
      role: 'admin',
    });

    // 2. Seed second user → Betali Test Org 2 (used by multi-tenant isolation tests)
    await seedUser({
      email: 'user@betali-test.com',
      password,
      name: 'Test User',
      orgName: 'Betali Test Org 2',
      slug: 'betali-test-org-2',
      role: 'admin',
    });
    console.log('✅ Both users seeded');

    // 3. Cleanup old transactional data for admin org only
    console.log('🧹 Cleaning old transactional data...');
    await supabase.from('stock_movements').delete().eq('organization_id', orgId);
    await supabase.from('stock_reservations').delete().eq('organization_id', orgId);
    await supabase.from('order_details').delete().eq('organization_id', orgId);
    await supabase.from('orders').delete().eq('organization_id', orgId);

    // 4. Warehouse (Get or Create)
    let { data: wh } = await supabase.from('warehouse').select('*').eq('organization_id', orgId).filter('name', 'eq', 'ALMACEN-FIXED').maybeSingle();
    if (!wh) {
      const { data, error } = await supabase.from('warehouse').insert({ name: 'ALMACEN-FIXED', organization_id: orgId, user_id: userId, owner_id: userId, is_active: true }).select().single();
      if (error) throw new Error('Warehouse creation failed: ' + error.message);
      wh = data;
    }

    // 5. Product Type (Get or Create) — replaces old `products` table
    let { data: prodType } = await supabase.from('product_types').select('*').eq('organization_id', orgId).filter('name', 'eq', 'PRODUCTO-FIXED').maybeSingle();
    if (!prodType) {
      const { data, error } = await supabase.from('product_types').insert({
        name: 'PRODUCTO-FIXED',
        sku: 'FIXED-SKU',
        unit: 'unidad',
        price: 1000,
        organization_id: orgId,
        created_by: userId,
        type: 'standard',
        alert_enabled: false,
        min_stock: 0
      }).select().single();
      if (error) throw new Error('ProductType creation failed: ' + error.message);
      prodType = data;
    }

    // 5b. Product Lot (Get or Create)
    let { data: lot } = await supabase.from('product_lots').select('*').eq('organization_id', orgId).filter('lot_number', 'eq', 'FIXED-LOT').maybeSingle();
    if (!lot) {
      const { data, error } = await supabase.from('product_lots').insert({
        product_type_id: prodType.product_type_id,
        lot_number: 'FIXED-LOT',
        expiration_date: '2030-01-01',
        origin_country: 'Argentina',
        organization_id: orgId,
        created_by: userId
      }).select().single();
      if (error) throw new Error('ProductLot creation failed: ' + error.message);
      lot = data;
    }

    // 6. Inject Stock via lot_id (movement_type must be 'entry')
    await supabase.from('stock_movements').insert({
      lot_id: lot.lot_id,
      warehouse_id: wh.warehouse_id,
      quantity: 1000,
      movement_type: 'entry',
      movement_date: new Date().toISOString(),
      organization_id: orgId,
      created_by: userId
    });

    // 7. Client (Get or Create)
    let { data: cli } = await supabase.from('clients').select('*').eq('organization_id', orgId).filter('name', 'eq', 'CLIENTE-FIXED').maybeSingle();
    if (!cli) {
      const { data, error } = await supabase.from('clients').insert({ name: 'CLIENTE-FIXED', email: 'fixed@client.com', cuit: '20-12345678-9', organization_id: orgId, user_id: userId }).select().single();
      if (error) throw new Error('Client creation failed: ' + error.message);
      cli = data;
    }

    console.log('✅ SEEDING SUCCESSFUL');
    console.log('Org:', orgId);
    console.log('Warehouse:', wh.warehouse_id);
    console.log('ProductType:', prodType.product_type_id);
    console.log('Lot:', lot.lot_id);
    console.log('Client:', cli.client_id);

  } catch (e) {
    console.error('❌ SEEDING FAILED:', e.message);
    process.exit(1);
  }
}
seed();
