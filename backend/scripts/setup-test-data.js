/**
 * Setup Test Data for Stock Reservation Testing
 * Creates sample products, warehouses, and clients for testing
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function setupTestData() {
  console.clear();
  log('\n🚀 Configurando Datos de Prueba', 'cyan');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. Get organization
    log('1️⃣  Obteniendo organización...', 'blue');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('organization_id, name')
      .limit(1)
      .single();

    if (orgError || !org) {
      log('❌ No se encontró organización. Por favor crea una cuenta primero.', 'red');
      process.exit(1);
    }

    const organizationId = org.organization_id;
    log(`✅ Usando organización: ${org.name}`, 'green');
    log(`   ID: ${organizationId}`, 'reset');

    // 2. Get or create user
    log('\n2️⃣  Obteniendo usuario...', 'blue');
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    let orgUser = authUsers?.users?.find(u =>
      u.user_metadata?.organization_id === organizationId ||
      u.app_metadata?.organization_id === organizationId
    );

    // If no user found with that org, use the first available user
    if (!orgUser && authUsers?.users?.length > 0) {
      orgUser = authUsers.users[0];
      log(`⚠️  Usando primer usuario disponible: ${orgUser.email}`, 'yellow');
    }

    if (!orgUser) {
      log('❌ No se encontró ningún usuario. Por favor crea una cuenta primero.', 'red');
      log('   Visita: http://localhost:3000/register', 'yellow');
      process.exit(1);
    }

    const userId = orgUser.id;
    log(`✅ Usuario: ${orgUser.email}`, 'green');

    // 3. Create test warehouse
    log('\n3️⃣  Creando warehouse de prueba...', 'blue');

    // Check if test warehouse exists
    const { data: existingWh } = await supabase
      .from('warehouse')
      .select('warehouse_id, name')
      .eq('organization_id', organizationId)
      .eq('name', 'TEST Warehouse')
      .maybeSingle();

    let warehouseId;
    if (existingWh) {
      warehouseId = existingWh.warehouse_id;
      log(`⚠️  Warehouse ya existe: ${existingWh.name}`, 'yellow');
      log(`   ID: ${warehouseId}`, 'reset');
    } else {
      const { data: warehouse, error: whError } = await supabase
        .from('warehouse')
        .insert({
          organization_id: organizationId,
          name: 'TEST Warehouse',
          location: 'Test Location',
          owner_id: userId,
          user_id: userId
        })
        .select()
        .single();

      if (whError) {
        log(`❌ Error creando warehouse: ${whError.message}`, 'red');
        process.exit(1);
      }

      warehouseId = warehouse.warehouse_id;
      log(`✅ Warehouse creado: ${warehouse.name}`, 'green');
      log(`   ID: ${warehouseId}`, 'reset');
    }

    // 4. Create test products
    log('\n4️⃣  Creando productos de prueba...', 'blue');

    const products = [
      {
        name: 'TEST Product A',
        sku: `TEST-A-${Date.now()}`,
        unit: 'unit',
        price: 100.00,
        initialStock: 100
      },
      {
        name: 'TEST Product B',
        sku: `TEST-B-${Date.now()}`,
        unit: 'unit',
        price: 200.00,
        initialStock: 50
      },
      {
        name: 'TEST Product C (Low Stock)',
        sku: `TEST-C-${Date.now()}`,
        unit: 'unit',
        price: 150.00,
        initialStock: 10
      }
    ];

    const createdProducts = [];

    for (const product of products) {
      const { data: newProduct, error: prodError } = await supabase
        .from('products')
        .insert({
          organization_id: organizationId,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          price: product.price
        })
        .select()
        .single();

      if (prodError) {
        log(`❌ Error creando ${product.name}: ${prodError.message}`, 'red');
        continue;
      }

      // Add initial stock
      const { error: stockError } = await supabase
        .from('stock_movements')
        .insert({
          organization_id: organizationId,
          warehouse_id: warehouseId,
          product_id: newProduct.product_id,
          movement_type: 'entry',
          quantity: product.initialStock,
          reason: 'Initial stock for testing',
          user_id: userId
        });

      if (stockError) {
        log(`❌ Error agregando stock: ${stockError.message}`, 'red');
      } else {
        createdProducts.push({
          ...newProduct,
          initialStock: product.initialStock
        });
        log(`✅ ${product.name} creado con ${product.initialStock} unidades`, 'green');
        log(`   ID: ${newProduct.product_id}`, 'reset');
      }
    }

    // 5. Create test client
    log('\n5️⃣  Creando cliente de prueba...', 'blue');

    const { data: existingClient } = await supabase
      .from('clients')
      .select('client_id, name')
      .eq('organization_id', organizationId)
      .eq('name', 'TEST Client')
      .maybeSingle();

    let clientId;
    if (existingClient) {
      clientId = existingClient.client_id;
      log(`⚠️  Cliente ya existe: ${existingClient.name}`, 'yellow');
      log(`   ID: ${clientId}`, 'reset');
    } else {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          name: 'TEST Client',
          cuit: '20-12345678-9',
          email: 'test@example.com',
          phone: '1234567890',
          address: 'Test Address'
        })
        .select()
        .single();

      if (clientError) {
        log(`❌ Error creando cliente: ${clientError.message}`, 'red');
      } else {
        clientId = client.client_id;
        log(`✅ Cliente creado: ${client.name}`, 'green');
        log(`   ID: ${clientId}`, 'reset');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    log('✅ CONFIGURACIÓN COMPLETADA', 'green');
    console.log('='.repeat(60));

    log('\n📊 Resumen de Datos Creados:', 'bright');
    console.log('');
    log(`Organización: ${org.name}`, 'cyan');
    log(`Warehouse: TEST Warehouse`, 'cyan');
    log(`Cliente: TEST Client`, 'cyan');
    log(`\nProductos creados: ${createdProducts.length}`, 'yellow');
    createdProducts.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.name} - ${p.initialStock} unidades`);
    });

    log('\n📝 Próximos Pasos:', 'bright');
    console.log('');
    console.log('1. Verifica los datos creados:');
    console.log(`   ${colors.cyan}node backend/scripts/check-stock-status.js products${colors.reset}`);
    console.log('');
    console.log('2. Inicia el testing manual:');
    console.log(`   ${colors.cyan}Abre: TESTING-DAY1-MANUAL-GUIDE.md${colors.reset}`);
    console.log('');
    console.log('3. Usa estos IDs para el testing:');
    console.log(`   Warehouse ID: ${colors.yellow}${warehouseId}${colors.reset}`);
    if (clientId) {
      console.log(`   Client ID: ${colors.yellow}${clientId}${colors.reset}`);
    }
    console.log('');

    log('🎉 ¡Listo para empezar el testing!', 'green');
    console.log('');

  } catch (error) {
    log(`\n❌ Error fatal: ${error.message}`, 'red');
    console.error(error.stack);
    process.exit(1);
  }
}

setupTestData();
