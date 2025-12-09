/**
 * Integration test for complete order workflow with stock reservations
 * Tests the full cycle: Create Order → Reserve Stock → Fulfill → Cancel → Restore
 */
const { ServiceFactory } = require('../../config/container');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

describe('Order Workflow Integration Tests', () => {
  let orderService;
  let productService;
  let warehouseService;
  let stockReservationRepository;
  let testOrganizationId;
  let testUserId;
  let testProductId;
  let testWarehouseId;
  let testOrderId;

  beforeAll(async () => {
    // Initialize services
    orderService = ServiceFactory.createOrderService();
    productService = ServiceFactory.createProductService();
    warehouseService = ServiceFactory.createWarehouseService();
    stockReservationRepository = ServiceFactory.getStockReservationRepository();

    // Create test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  /**
   * Setup test data: organization, user, product, warehouse
   */
  async function setupTestData() {
    console.log('\n🔧 Setting up test data...');

    // Get or create test organization
    const { data: orgs } = await supabase
      .from('organizations')
      .select('organization_id, name')
      .limit(1)
      .single();

    testOrganizationId = orgs.organization_id;
    console.log(`  ✅ Organization: ${orgs.name}`);

    // Get or create test user
    const { data: users } = await supabase
      .from('users')
      .select('user_id, name')
      .limit(1)
      .single();

    testUserId = users.user_id;
    console.log(`  ✅ User: ${users.name}`);

    // Create test warehouse if needed
    const { data: warehouses } = await supabase
      .from('warehouse')
      .select('warehouse_id, name')
      .eq('organization_id', testOrganizationId)
      .limit(1)
      .single();

    if (warehouses) {
      testWarehouseId = warehouses.warehouse_id;
      console.log(`  ✅ Warehouse: ${warehouses.name}`);
    } else {
      const { data: newWarehouse } = await supabase
        .from('warehouse')
        .insert({
          organization_id: testOrganizationId,
          name: 'Test Warehouse - Integration',
          location: 'Test Location',
          capacity: 1000
        })
        .select()
        .single();

      testWarehouseId = newWarehouse.warehouse_id;
      console.log(`  ✅ Created warehouse: ${newWarehouse.name}`);
    }

    // Create test product with initial stock
    const { data: newProduct } = await supabase
      .from('products')
      .insert({
        organization_id: testOrganizationId,
        name: 'Test Product - Stock Reservation',
        batch_number: 'TEST-' + Date.now(),
        origin_country: 'Test Country',
        expiration_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        price: 100.00,
        category: 'test'
      })
      .select()
      .single();

    testProductId = newProduct.product_id;
    console.log(`  ✅ Created product: ${newProduct.name}`);

    // Add initial stock (100 units)
    await supabase
      .from('stock_movements')
      .insert({
        organization_id: testOrganizationId,
        product_id: testProductId,
        warehouse_id: testWarehouseId,
        movement_type: 'in',
        quantity: 100,
        movement_date: new Date().toISOString(),
        reference: 'Initial test stock'
      });

    console.log(`  ✅ Added 100 units of initial stock\n`);
  }

  /**
   * Cleanup test data
   */
  async function cleanupTestData() {
    console.log('\n🧹 Cleaning up test data...');

    if (testProductId) {
      await supabase
        .from('products')
        .delete()
        .eq('product_id', testProductId);
      console.log('  ✅ Deleted test product');
    }
  }

  // ========================================================================
  // Test Suite 1: Order Creation with Stock Validation
  // ========================================================================

  describe('Order Creation with Stock Validation', () => {
    test('should create order with valid stock', async () => {
      const orderData = {
        user_id: testUserId,
        warehouse_id: testWarehouseId,
        status: 'pending',
        items: [
          {
            product_id: testProductId,
            quantity: 10,
            price: 100.00
          }
        ]
      };

      const result = await orderService.createOrder(orderData, testOrganizationId);

      expect(result).toBeDefined();
      expect(result.order_id).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.total_price).toBeGreaterThan(0);

      testOrderId = result.order_id;
      console.log(`  ✅ Created order: ${testOrderId}`);
    });

    test('should reject order with insufficient stock', async () => {
      const orderData = {
        user_id: testUserId,
        warehouse_id: testWarehouseId,
        status: 'pending',
        items: [
          {
            product_id: testProductId,
            quantity: 1000, // More than available (100)
            price: 100.00
          }
        ]
      };

      await expect(
        orderService.createOrder(orderData, testOrganizationId)
      ).rejects.toThrow();
    });
  });

  // ========================================================================
  // Test Suite 2: Stock Reservation
  // ========================================================================

  describe('Stock Reservation', () => {
    test('should reserve stock when order status changes to processing', async () => {
      // Change order status to processing
      await orderService.updateOrderStatus(
        testOrderId,
        testOrganizationId,
        'processing'
      );

      // Check if reservations were created
      const reservations = await stockReservationRepository.getActiveReservationsByOrder(
        testOrderId,
        testOrganizationId
      );

      expect(reservations).toBeDefined();
      expect(reservations.length).toBeGreaterThan(0);
      expect(reservations[0].status).toBe('active');
      expect(reservations[0].quantity).toBe(10);

      console.log(`  ✅ Reserved ${reservations[0].quantity} units`);
    });

    test('should calculate available stock correctly (physical - reserved)', async () => {
      const availableStock = await stockReservationRepository.getAvailableStock(
        testProductId,
        testWarehouseId,
        testOrganizationId
      );

      // Should be 100 (initial) - 10 (reserved) = 90
      expect(availableStock).toBe(90);
      console.log(`  ✅ Available stock: ${availableStock} (100 - 10 reserved)`);
    });

    test('should not allow double reservation for same order', async () => {
      const result = await orderService.reserveStockForOrder(
        testOrderId,
        testOrganizationId,
        testUserId
      );

      // Should return existing reservations, not create new ones
      expect(result).toBeDefined();
      expect(result.length).toBe(1); // Still just 1 reservation

      console.log(`  ✅ Prevented double reservation`);
    });
  });

  // ========================================================================
  // Test Suite 3: Order Fulfillment
  // ========================================================================

  describe('Order Fulfillment', () => {
    test('should fulfill order and deduct physical stock', async () => {
      // Get stock before fulfillment
      const stockBefore = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', testProductId)
        .eq('warehouse_id', testWarehouseId);

      // Fulfill the order
      await orderService.fulfillOrder(testOrderId, testOrganizationId);

      // Check order status
      const order = await orderService.getOrderById(testOrderId, testOrganizationId);
      expect(order.status).toBe('shipped');

      // Check that stock was deducted
      const stockAfter = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', testProductId)
        .eq('warehouse_id', testWarehouseId);

      expect(stockAfter.data.length).toBeGreaterThan(stockBefore.data.length);
      console.log(`  ✅ Order fulfilled, physical stock deducted`);
    });

    test('should mark reservations as fulfilled', async () => {
      const reservations = await stockReservationRepository.getReservationsByOrder(
        testOrderId,
        testOrganizationId
      );

      expect(reservations[0].status).toBe('fulfilled');
      expect(reservations[0].released_at).toBeDefined();

      console.log(`  ✅ Reservations marked as fulfilled`);
    });
  });

  // ========================================================================
  // Test Suite 4: Order Cancellation with Stock Restoration
  // ========================================================================

  describe('Order Cancellation with Stock Restoration', () => {
    test('should restore stock when shipped order is cancelled', async () => {
      // Get stock movements before cancellation
      const { data: movementsBefore } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', testProductId)
        .eq('warehouse_id', testWarehouseId);

      const stockBefore = movementsBefore.reduce((sum, m) => {
        return sum + (m.movement_type === 'in' ? m.quantity : -m.quantity);
      }, 0);

      // Cancel the order
      await orderService.updateOrderStatus(
        testOrderId,
        testOrganizationId,
        'cancelled'
      );

      // Get stock movements after cancellation
      const { data: movementsAfter } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', testProductId)
        .eq('warehouse_id', testWarehouseId);

      const stockAfter = movementsAfter.reduce((sum, m) => {
        return sum + (m.movement_type === 'in' ? m.quantity : -m.quantity);
      }, 0);

      // Stock should be restored
      expect(stockAfter).toBeGreaterThan(stockBefore);
      expect(stockAfter).toBe(100); // Back to original 100

      console.log(`  ✅ Stock restored: ${stockBefore} → ${stockAfter}`);
    });

    test('reservations should be marked as cancelled', async () => {
      const reservations = await stockReservationRepository.getReservationsByOrder(
        testOrderId,
        testOrganizationId
      );

      expect(reservations[0].status).toBe('cancelled');
      expect(reservations[0].released_at).toBeDefined();

      console.log(`  ✅ Reservations marked as cancelled`);
    });
  });

  // ========================================================================
  // Test Suite 5: Available Stock API Endpoint
  // ========================================================================

  describe('Available Stock API', () => {
    test('productService.getAvailableStock should return correct value', async () => {
      const availableStock = await productService.getAvailableStock(
        testProductId,
        testWarehouseId,
        testOrganizationId
      );

      expect(availableStock).toBe(100); // Back to full stock after cancellation
      console.log(`  ✅ Available stock API: ${availableStock} units`);
    });
  });
});

// Manual test runner (if not using Jest)
if (require.main === module) {
  console.log('\n🧪 Running Order Workflow Integration Tests\n');
  console.log('='.repeat(60));

  async function runTests() {
    const tests = new describe('Order Workflow Integration Tests', () => {});
    // This is a placeholder for manual execution
    // Use Jest to run this properly: npm test order-workflow.integration.test.js
  }

  runTests().catch(console.error);
}
