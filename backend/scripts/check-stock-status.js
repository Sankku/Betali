/**
 * Quick Stock Status Checker
 * Útil durante testing para verificar el estado del stock
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

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

async function showHelp() {
  console.log('\n' + colors.cyan + '📊 Stock Status Checker' + colors.reset);
  console.log('='.repeat(60));
  console.log('\nUso: node check-stock-status.js [comando]\n');
  console.log('Comandos disponibles:');
  console.log('  products    - Listar productos con stock');
  console.log('  orders      - Listar órdenes recientes');
  console.log('  reservations - Listar reservas activas');
  console.log('  movements   - Listar movimientos de stock recientes');
  console.log('  stock <product_id> <warehouse_id> <org_id> - Ver stock de un producto');
  console.log('\nEjemplo:');
  console.log('  node check-stock-status.js products');
  console.log('  node check-stock-status.js reservations\n');
}

async function listProducts() {
  log('\n📦 Productos con Stock', 'cyan');
  console.log('='.repeat(80));

  const { data: orgs } = await supabase
    .from('organizations')
    .select('organization_id, name')
    .limit(1)
    .single();

  if (!orgs) {
    log('❌ No se encontró organización', 'red');
    return;
  }

  const { data: products } = await supabase
    .from('products')
    .select('product_id, name, sku, category')
    .eq('organization_id', orgs.organization_id)
    .limit(10);

  if (!products || products.length === 0) {
    log('⚠️  No hay productos', 'yellow');
    return;
  }

  const { data: warehouses } = await supabase
    .from('warehouse')
    .select('warehouse_id, name')
    .eq('organization_id', orgs.organization_id)
    .limit(1)
    .single();

  console.log(`\nOrganización: ${orgs.name}`);
  console.log(`Warehouse: ${warehouses?.name || 'N/A'}\n`);

  for (const product of products) {
    // Get physical stock
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('quantity, movement_type')
      .eq('product_id', product.product_id)
      .eq('organization_id', orgs.organization_id);

    const physicalStock = movements?.reduce((total, m) => {
      return m.movement_type === 'entry' ? total + m.quantity : total - m.quantity;
    }, 0) || 0;

    // Get available stock
    let availableStock = physicalStock;
    if (warehouses) {
      try {
        const { data: available } = await supabase.rpc('get_available_stock', {
          p_product_id: product.product_id,
          p_warehouse_id: warehouses.warehouse_id,
          p_organization_id: orgs.organization_id
        });
        availableStock = available || 0;
      } catch (error) {
        // Function might not exist
      }
    }

    const reserved = physicalStock - availableStock;

    console.log(`${colors.bright}${product.name}${colors.reset} (${product.sku})`);
    console.log(`  ID: ${product.product_id}`);
    console.log(`  Categoría: ${product.category || 'N/A'}`);
    console.log(`  Stock físico: ${colors.green}${physicalStock}${colors.reset}`);
    console.log(`  Stock disponible: ${colors.cyan}${availableStock}${colors.reset}`);
    if (reserved > 0) {
      console.log(`  Stock reservado: ${colors.yellow}${reserved}${colors.reset}`);
    }
    console.log('');
  }

  console.log(`Total productos: ${products.length}\n`);
}

async function listOrders() {
  log('\n📋 Órdenes Recientes', 'cyan');
  console.log('='.repeat(80));

  const { data: orgs } = await supabase
    .from('organizations')
    .select('organization_id')
    .limit(1)
    .single();

  if (!orgs) {
    log('❌ No se encontró organización', 'red');
    return;
  }

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      order_id,
      status,
      total_price,
      order_date,
      clients(name)
    `)
    .eq('organization_id', orgs.organization_id)
    .order('order_date', { ascending: false })
    .limit(10);

  if (!orders || orders.length === 0) {
    log('⚠️  No hay órdenes', 'yellow');
    return;
  }

  console.log('');
  for (const order of orders) {
    const statusColor = {
      'pending': 'yellow',
      'processing': 'blue',
      'shipped': 'green',
      'completed': 'green',
      'cancelled': 'red'
    }[order.status] || 'reset';

    console.log(`${colors.bright}${order.order_id}${colors.reset}`);
    console.log(`  Cliente: ${order.clients?.name || 'N/A'}`);
    console.log(`  Status: ${colors[statusColor]}${order.status}${colors.reset}`);
    console.log(`  Total: $${order.total_price}`);
    console.log(`  Fecha: ${new Date(order.order_date).toLocaleDateString()}`);
    console.log('');
  }

  console.log(`Total órdenes: ${orders.length}\n`);
}

async function listReservations() {
  log('\n🔒 Reservas de Stock', 'cyan');
  console.log('='.repeat(80));

  const { data: orgs } = await supabase
    .from('organizations')
    .select('organization_id')
    .limit(1)
    .single();

  if (!orgs) {
    log('❌ No se encontró organización', 'red');
    return;
  }

  const { data: reservations } = await supabase
    .from('stock_reservations')
    .select(`
      reservation_id,
      quantity,
      status,
      reserved_at,
      fulfilled_at,
      products(name),
      orders(order_id, status)
    `)
    .eq('organization_id', orgs.organization_id)
    .order('reserved_at', { ascending: false })
    .limit(20);

  if (!reservations || reservations.length === 0) {
    log('✅ No hay reservas activas', 'green');
    return;
  }

  const activeReservations = reservations.filter(r => r.status === 'active');
  const fulfilledReservations = reservations.filter(r => r.status === 'fulfilled');
  const cancelledReservations = reservations.filter(r => r.status === 'cancelled');

  console.log('');
  log(`📊 Resumen:`, 'bright');
  console.log(`  Activas: ${colors.yellow}${activeReservations.length}${colors.reset}`);
  console.log(`  Cumplidas: ${colors.green}${fulfilledReservations.length}${colors.reset}`);
  console.log(`  Canceladas: ${colors.red}${cancelledReservations.length}${colors.reset}`);
  console.log('');

  if (activeReservations.length > 0) {
    log('Reservas Activas:', 'yellow');
    for (const res of activeReservations) {
      console.log(`  • ${res.products?.name || 'N/A'} - ${res.quantity} unidades`);
      console.log(`    Orden: ${res.orders?.order_id} (${res.orders?.status})`);
      console.log(`    Reservado: ${new Date(res.reserved_at).toLocaleString()}`);
      console.log('');
    }
  }

  if (fulfilledReservations.length > 0) {
    log('Últimas Cumplidas:', 'green');
    for (const res of fulfilledReservations.slice(0, 3)) {
      console.log(`  • ${res.products?.name || 'N/A'} - ${res.quantity} unidades`);
      console.log(`    Cumplido: ${new Date(res.fulfilled_at).toLocaleString()}`);
    }
    console.log('');
  }
}

async function listMovements() {
  log('\n📊 Movimientos de Stock Recientes', 'cyan');
  console.log('='.repeat(80));

  const { data: orgs } = await supabase
    .from('organizations')
    .select('organization_id')
    .limit(1)
    .single();

  if (!orgs) {
    log('❌ No se encontró organización', 'red');
    return;
  }

  const { data: movements } = await supabase
    .from('stock_movements')
    .select(`
      movement_id,
      movement_type,
      quantity,
      reason,
      created_at,
      products(name),
      warehouse(name)
    `)
    .eq('organization_id', orgs.organization_id)
    .order('created_at', { ascending: false })
    .limit(15);

  if (!movements || movements.length === 0) {
    log('⚠️  No hay movimientos', 'yellow');
    return;
  }

  console.log('');
  for (const mov of movements) {
    const typeColor = mov.movement_type === 'entry' ? 'green' : 'red';
    const typeSymbol = mov.movement_type === 'entry' ? '📥' : '📤';

    console.log(`${typeSymbol} ${colors[typeColor]}${mov.movement_type.toUpperCase()}${colors.reset}`);
    console.log(`  Producto: ${mov.products?.name || 'N/A'}`);
    console.log(`  Warehouse: ${mov.warehouse?.name || 'N/A'}`);
    console.log(`  Cantidad: ${mov.quantity}`);
    console.log(`  Razón: ${mov.reason || 'N/A'}`);
    console.log(`  Fecha: ${new Date(mov.created_at).toLocaleString()}`);
    console.log('');
  }

  console.log(`Total movimientos: ${movements.length}\n`);
}

async function checkStock(productId, warehouseId, orgId) {
  log('\n🔍 Verificando Stock Específico', 'cyan');
  console.log('='.repeat(80));

  try {
    const { data: available, error } = await supabase.rpc('get_available_stock', {
      p_product_id: productId,
      p_warehouse_id: warehouseId,
      p_organization_id: orgId
    });

    if (error) {
      log(`❌ Error: ${error.message}`, 'red');
      return;
    }

    const { data: reserved } = await supabase.rpc('get_reserved_stock', {
      p_product_id: productId,
      p_warehouse_id: warehouseId,
      p_organization_id: orgId
    });

    // Get physical stock
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('quantity, movement_type')
      .eq('product_id', productId)
      .eq('warehouse_id', warehouseId)
      .eq('organization_id', orgId);

    const physicalStock = movements?.reduce((total, m) => {
      return m.movement_type === 'entry' ? total + m.quantity : total - m.quantity;
    }, 0) || 0;

    console.log('');
    log('📊 Resultado:', 'bright');
    console.log(`  Stock físico: ${colors.green}${physicalStock}${colors.reset}`);
    console.log(`  Stock reservado: ${colors.yellow}${reserved || 0}${colors.reset}`);
    console.log(`  Stock disponible: ${colors.cyan}${available || 0}${colors.reset}`);
    console.log('');

    log('✅ Verificación completa', 'green');
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
  }
}

async function main() {
  if (!command || command === 'help') {
    await showHelp();
    return;
  }

  switch (command) {
    case 'products':
      await listProducts();
      break;
    case 'orders':
      await listOrders();
      break;
    case 'reservations':
      await listReservations();
      break;
    case 'movements':
      await listMovements();
      break;
    case 'stock':
      if (args.length < 4) {
        log('❌ Uso: node check-stock-status.js stock <product_id> <warehouse_id> <org_id>', 'red');
        return;
      }
      await checkStock(args[1], args[2], args[3]);
      break;
    default:
      log(`❌ Comando desconocido: ${command}`, 'red');
      await showHelp();
  }
}

main().catch(error => {
  log(`❌ Error fatal: ${error.message}`, 'red');
  process.exit(1);
});
