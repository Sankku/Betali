/**
 * Create Test Data for Purchase Orders
 *
 * This script creates test data needed for purchase orders:
 * - Suppliers
 * - Products (if needed)
 * - Warehouse (if needed)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Get the first organization (for testing)
 */
async function getFirstOrganization() {
  const { data, error } = await supabase
    .from('organizations')
    .select('organization_id, name')
    .limit(1)
    .single();

  if (error || !data) {
    console.error('❌ Error: No organization found. Please create an organization first.');
    process.exit(1);
  }

  console.log(`✅ Using organization: ${data.name} (${data.organization_id})`);
  return data;
}

/**
 * Create test suppliers
 */
async function createSuppliers(organizationId) {
  console.log('\n📦 Creating suppliers...');

  const suppliers = [
    {
      name: 'Proveedor Global S.A.',
      contact_person: 'Juan Pérez',
      email: 'contacto@proveedorglobal.com',
      phone: '+54 11 4444-5555',
      cuit: '30-12345678-9',
      address: 'Av. Corrientes 1234, CABA, Argentina',
      is_active: true,
      is_preferred: true,
      payment_terms: '30 días',
      business_type: 'Mayorista',
      organization_id: organizationId,
    },
    {
      name: 'Distribuidora Central LTDA',
      contact_person: 'María González',
      email: 'ventas@distribuidoracentral.com',
      phone: '+54 11 5555-6666',
      cuit: '30-98765432-1',
      address: 'Av. Belgrano 5678, CABA, Argentina',
      is_active: true,
      is_preferred: false,
      payment_terms: '60 días',
      business_type: 'Distribuidor',
      organization_id: organizationId,
    },
    {
      name: 'Importadora del Sur',
      contact_person: 'Carlos Rodríguez',
      email: 'info@importadoradelsur.com',
      phone: '+54 11 6666-7777',
      cuit: '30-11223344-5',
      address: 'Av. Santa Fe 9012, CABA, Argentina',
      is_active: true,
      is_preferred: true,
      payment_terms: '45 días',
      business_type: 'Importador',
      credit_limit: 500000,
      organization_id: organizationId,
    },
  ];

  const { data, error } = await supabase
    .from('suppliers')
    .insert(suppliers)
    .select();

  if (error) {
    console.error('❌ Error creating suppliers:', error.message);
    return [];
  }

  console.log(`✅ Created ${data.length} suppliers:`);
  data.forEach(supplier => {
    console.log(`   - ${supplier.name} (${supplier.cuit})`);
  });

  return data;
}

/**
 * Check if warehouse exists, create if not
 */
async function ensureWarehouse(organizationId) {
  console.log('\n🏢 Checking warehouses...');

  // Check if warehouse exists
  const { data: existing } = await supabase
    .from('warehouse')
    .select('warehouse_id, name')
    .eq('organization_id', organizationId)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`✅ Warehouse exists: ${existing[0].name}`);
    return existing[0];
  }

  // Create warehouse
  const newWarehouse = {
    name: 'Almacén Principal',
    location: 'Depósito Central - Buenos Aires',
    capacity: 10000,
    is_active: true,
    organization_id: organizationId,
  };

  const { data, error } = await supabase
    .from('warehouse')
    .insert([newWarehouse])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating warehouse:', error.message);
    return null;
  }

  console.log(`✅ Created warehouse: ${data.name}`);
  return data;
}

/**
 * Check if products exist, create if not enough
 */
async function ensureProducts(organizationId) {
  console.log('\n📦 Checking products...');

  // Check existing products
  const { data: existing } = await supabase
    .from('products')
    .select('product_id, name, sku')
    .eq('organization_id', organizationId);

  if (existing && existing.length >= 5) {
    console.log(`✅ Found ${existing.length} existing products`);
    existing.slice(0, 5).forEach(product => {
      console.log(`   - ${product.name} (${product.sku})`);
    });
    return existing;
  }

  // Create additional products
  console.log('Creating additional products...');

  const products = [
    {
      name: 'Laptop Dell Inspiron 15',
      sku: 'LAP-DELL-INS15',
      description: 'Laptop Dell Inspiron 15, 16GB RAM, 512GB SSD',
      category: 'Electrónica',
      unit_price: 850000,
      cost_price: 650000,
      organization_id: organizationId,
    },
    {
      name: 'Mouse Logitech MX Master 3',
      sku: 'MOU-LOG-MX3',
      description: 'Mouse inalámbrico ergonómico',
      category: 'Periféricos',
      unit_price: 25000,
      cost_price: 18000,
      organization_id: organizationId,
    },
    {
      name: 'Teclado Mecánico RGB',
      sku: 'KEY-MECH-RGB',
      description: 'Teclado mecánico con iluminación RGB',
      category: 'Periféricos',
      unit_price: 35000,
      cost_price: 25000,
      organization_id: organizationId,
    },
    {
      name: 'Monitor LG 27" 4K',
      sku: 'MON-LG-27-4K',
      description: 'Monitor LG 27 pulgadas, resolución 4K',
      category: 'Monitores',
      unit_price: 120000,
      cost_price: 90000,
      organization_id: organizationId,
    },
    {
      name: 'Webcam Logitech C920',
      sku: 'CAM-LOG-C920',
      description: 'Webcam Full HD 1080p',
      category: 'Periféricos',
      unit_price: 30000,
      cost_price: 22000,
      organization_id: organizationId,
    },
  ];

  const { data, error } = await supabase
    .from('products')
    .insert(products)
    .select();

  if (error) {
    console.error('❌ Error creating products:', error.message);
    return existing || [];
  }

  console.log(`✅ Created ${data.length} products:`);
  data.forEach(product => {
    console.log(`   - ${product.name} (${product.sku})`);
  });

  return [...(existing || []), ...data];
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Creating test data for Purchase Orders...\n');

  try {
    // Get organization
    const organization = await getFirstOrganization();

    // Create suppliers
    const suppliers = await createSuppliers(organization.organization_id);

    // Ensure warehouse exists
    const warehouse = await ensureWarehouse(organization.organization_id);

    // Ensure products exist
    const products = await ensureProducts(organization.organization_id);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST DATA CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`
📊 Summary:
   - Organization: ${organization.name}
   - Suppliers: ${suppliers.length} created
   - Warehouse: ${warehouse ? warehouse.name : 'N/A'}
   - Products: ${products.length} available

🎯 Next Steps:
   1. Restart backend: cd backend && node server.js
   2. Open frontend: http://localhost:3000
   3. Navigate to "Órdenes de Compra"
   4. Click "Nueva Orden de Compra"
   5. Create a test purchase order!

💡 Test Flow:
   1. Create PO with status "draft"
   2. Submit → status changes to "pending"
   3. Approve → status changes to "approved"
   4. Receive → status changes to "received" + STOCK INCREASES!

🔍 Verify Stock:
   - Go to "Stock Movements" to see entry movements
   - Go to "Products" to see increased stock quantities
    `);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run script
main();
