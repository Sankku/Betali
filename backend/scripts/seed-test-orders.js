#!/usr/bin/env node

/**
 * Script to seed test orders for statistics testing
 * Creates 20 orders with varying dates, statuses, and amounts
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Order statuses to rotate through (matching database constraint)
const statuses = ['draft', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];

// Generate random date within last 60 days
function getRandomDate() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 60);
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

// Generate random price between min and max
function getRandomPrice(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

// Generate random quantity
function getRandomQuantity() {
  return Math.floor(Math.random() * 5) + 1; // 1-5
}

async function seedOrders() {
  try {
    console.log('🌱 Starting to seed test orders...\n');

    // Use specific organization for betali.business@gmail.com
    const targetOrgId = '52989a6e-a2ea-4653-a94e-9adb300648a0'; // testing org
    const targetUserId = '4ef37216-5711-403a-96e9-5a2fdd286d85'; // betali.business@gmail.com

    const organizationId = targetOrgId;
    const userId = targetUserId;

    console.log('✅ Using organization: testing (betali.business@gmail.com)');
    console.log('✅ Organization ID:', organizationId);

    // Get products from the organization
    let { data: products, error: productsError } = await supabase
      .from('products')
      .select('product_id, name, price')
      .eq('organization_id', organizationId)
      .limit(10);

    // If no products found, create some test products
    if (!products || products.length === 0) {
      console.log('⚠️  No products found. Creating test products...\n');

      const testProducts = [
        { name: 'Premium Coffee Beans', price: 24.99, sku: 'COFFEE-001', description: 'High quality arabica beans' },
        { name: 'Organic Green Tea', price: 15.50, sku: 'TEA-001', description: 'Organic green tea leaves' },
        { name: 'Artisan Bread', price: 8.75, sku: 'BREAD-001', description: 'Fresh baked daily' },
        { name: 'Swiss Chocolate', price: 12.99, sku: 'CHOCO-001', description: 'Premium dark chocolate' },
        { name: 'Olive Oil Extra Virgin', price: 28.50, sku: 'OIL-001', description: 'Cold pressed olive oil' },
        { name: 'Pasta Penne', price: 6.25, sku: 'PASTA-001', description: 'Italian durum wheat pasta' },
        { name: 'Tomato Sauce', price: 4.99, sku: 'SAUCE-001', description: 'Homemade style tomato sauce' },
        { name: 'Parmesan Cheese', price: 18.99, sku: 'CHEESE-001', description: 'Aged 24 months' },
        { name: 'Balsamic Vinegar', price: 22.50, sku: 'VINEGAR-001', description: 'Aged balsamic from Modena' },
        { name: 'Sea Salt', price: 5.99, sku: 'SALT-001', description: 'Natural sea salt' },
      ];

      // Generate expiration date 1 year from now
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);

      const productsToInsert = testProducts.map(p => ({
        organization_id: organizationId,
        name: p.name,
        price: p.price,
        batch_number: p.sku,
        expiration_date: expirationDate.toISOString().split('T')[0],
        origin_country: 'Test Country'
      }));

      const { data: createdProducts, error: createError } = await supabase
        .from('products')
        .insert(productsToInsert)
        .select('product_id, name, price');

      if (createError) {
        console.error('❌ Failed to create test products:', createError.message);
        process.exit(1);
      }

      products = createdProducts;
      console.log(`✅ Created ${products.length} test products\n`);
    } else {
      console.log(`✅ Found ${products.length} existing products to use\n`);
    }

    // Get clients (optional)
    const { data: clients } = await supabase
      .from('clients')
      .select('client_id, name')
      .eq('organization_id', organizationId)
      .limit(5);

    // Get warehouses (optional)
    const { data: warehouses } = await supabase
      .from('warehouse')
      .select('warehouse_id, name')
      .eq('organization_id', organizationId)
      .limit(3);

    // Create 20 test orders
    const ordersToCreate = [];

    for (let i = 0; i < 20; i++) {
      const status = statuses[i % statuses.length];
      const orderDate = getRandomDate();
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per order

      // Select random products for this order
      const orderItems = [];
      let subtotal = 0;

      for (let j = 0; j < numItems; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = getRandomQuantity();
        const price = parseFloat(product.price || getRandomPrice(10, 100));

        orderItems.push({
          product_id: product.product_id,
          quantity,
          price
        });

        subtotal += quantity * price;
      }

      // Add some tax (21% for example)
      const taxAmount = subtotal * 0.21;
      const total = subtotal + taxAmount;

      const order = {
        organization_id: organizationId,
        client_id: clients && clients.length > 0 ? clients[Math.floor(Math.random() * clients.length)].client_id : null,
        warehouse_id: warehouses && warehouses.length > 0 ? warehouses[Math.floor(Math.random() * warehouses.length)].warehouse_id : null,
        status,
        order_date: orderDate,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax_amount: parseFloat(taxAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        notes: `Test order #${i + 1} - ${status}`,
        created_by: userId,
        items: orderItems
      };

      ordersToCreate.push(order);
    }

    console.log('📦 Creating orders...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const orderData of ordersToCreate) {
      const { items, ...orderFields } = orderData;

      // Insert order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderFields)
        .select()
        .single();

      if (orderError) {
        console.error(`❌ Failed to create order:`, orderError.message, orderError);
        errorCount++;
        continue;
      }

      console.log('✓ Order created:', order.order_id);

      // Insert order items
      const itemsToInsert = items.map(item => ({
        order_id: order.order_id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        organization_id: organizationId
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert)
        .select();

      // Debug: log the response
      console.log('Items insert response - error:', itemsError, 'data:', insertedItems ? `${insertedItems.length} items` : 'no data');

      if (itemsError && itemsError.message) {
        console.error(`❌ Failed to create order items:`, itemsError.message);
        console.error('Items data:', itemsToInsert);
        errorCount++;
        continue;
      }

      successCount++;
      console.log(`✅ Order ${successCount}/20 created: ${order.status} - $${order.total} (${orderData.order_date.split('T')[0]})`);
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully created: ${successCount} orders`);
    if (errorCount > 0) {
      console.log(`❌ Failed: ${errorCount} orders`);
    }
    console.log('\n🎉 Done! Your orders are ready for testing statistics.');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the script
seedOrders();
