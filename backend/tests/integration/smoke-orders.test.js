const request = require('supertest');
const express = require('express');
const { container } = require('../../config/container');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const orderController = container.get('orderController');

describe('Order Smoke Tests', () => {
  let supabase;

  beforeAll(() => {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  });

  it('should create a new order (Smoke Test)', async () => {
    // Fetch a real organization first, then get related data from the same org
    const { data: organizations } = await supabase
      .from('organizations')
      .select('organization_id')
      .limit(1);

    if (!organizations?.[0]) {
      console.warn('⚠️  Skipping test: No organizations found in database');
      return;
    }

    const orgId = organizations[0].organization_id;

    const [{ data: productTypes }, { data: clients }, { data: warehouses }, { data: orgUsers }] = await Promise.all([
      supabase.from('product_types').select('product_type_id').eq('organization_id', orgId).limit(1),
      supabase.from('clients').select('client_id').eq('organization_id', orgId).limit(1),
      supabase.from('warehouse').select('warehouse_id').eq('organization_id', orgId).limit(1),
      supabase.from('user_organizations').select('user_id').eq('organization_id', orgId).limit(1)
    ]);

    if (!productTypes?.[0] || !clients?.[0] || !warehouses?.[0] || !orgUsers?.[0]) {
      console.warn('⚠️  Skipping test: No test data found for org (product_types/clients/warehouses/users)');
      return;
    }

    const userId = orgUsers[0].user_id;

    // Build app with the real org ID in mock auth
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/api/orders', (req, res, next) => {
      req.user = { id: userId, currentOrganizationId: orgId };
      next();
    }, (req, res, next) => orderController.createOrder(req, res, next));
    testApp.get('/api/orders/:id', (req, res, next) => {
      req.user = { id: userId, currentOrganizationId: orgId };
      next();
    }, (req, res, next) => orderController.getOrderById(req, res, next));

    const orderPayload = {
      client_id: clients[0].client_id,
      items: [
        {
          product_type_id: productTypes[0].product_type_id,
          quantity: 1,
          unit_price: 100,
          warehouse_id: warehouses[0].warehouse_id
        }
      ],
      total_amount: 100,
      status: 'pending'
    };

    const response = await request(testApp)
      .post('/api/orders')
      .send(orderPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('order_id');
  });
});
