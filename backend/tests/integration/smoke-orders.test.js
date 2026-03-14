const request = require('supertest');
const express = require('express');
const { ServiceFactory } = require('../../config/container');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// We need a real app instance or we can mock the middleware
const app = express();
app.use(express.json());

// Mock Auth Middleware
const mockAuth = (req, res, next) => {
  req.user = {
    id: 'test-user-id',
    currentOrganizationId: 'test-org-id'
  };
  next();
};

const orderController = ServiceFactory.getInstance().get('orderController');

app.post('/api/orders', mockAuth, (req, res, next) => orderController.createOrder(req, res, next));
app.get('/api/orders/:id', mockAuth, (req, res, next) => orderController.getOrderById(req, res, next));

describe('Order Smoke Tests', () => {
  let supabase;

  beforeAll(() => {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  });

  it('should create a new order (Smoke Test)', async () => {
    // In a real scenario, we would seed a product and a client first
    // For this smoke test, we'll assume the existence of some test data or 
    // we would use the repositories to create them.
    
    // Let's at least try to fetch a real product to make it a true integration test
    const { data: products } = await supabase.from('products').select('product_id').limit(1);
    const { data: clients } = await supabase.from('clients').select('client_id').limit(1);
    const { data: warehouses } = await supabase.from('warehouses').select('warehouse_id').limit(1);

    if (!products?.[0] || !clients?.[0] || !warehouses?.[0]) {
      console.warn('⚠️  Skipping test: No test data found in database (products/clients/warehouses)');
      return;
    }

    const orderPayload = {
      client_id: clients[0].client_id,
      items: [
        {
          product_id: products[0].product_id,
          quantity: 1,
          unit_price: 100,
          warehouse_id: warehouses[0].warehouse_id
        }
      ],
      total_amount: 100,
      status: 'pending'
    };

    const response = await request(app)
      .post('/api/orders')
      .send(orderPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('order_id');
  });
});
