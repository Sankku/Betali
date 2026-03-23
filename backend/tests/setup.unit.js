/**
 * Unit Test Setup
 * Minimal setup for unit tests — no server required.
 * Tests here are pure functions (validations, services with mocked deps, etc.)
 */

require('dotenv').config();

// Shared test data generators (no network calls)
global.testUtils = {
  generateTestUser: () => ({
    user_id: require('crypto').randomUUID(),
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@betali.test`,
    name: `Test User ${Date.now()}`,
    password_hash: 'test_hash'
  }),

  generateTestOrganization: (ownerUserId) => ({
    name: `Test Org ${Date.now()}`,
    slug: `test-org-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    owner_user_id: ownerUserId
  }),

  generateTestProduct: (organizationId) => ({
    name: `Test Product ${Date.now()}`,
    description: 'Test product description',
    batch_number: `BATCH-${Date.now()}`,
    expiration_date: '2025-12-31',
    origin_country: 'Argentina',
    price: 99.99,
    organization_id: organizationId
  })
};
