/**
 * Test Data Factory for E2E Tests
 *
 * Provides reusable test data for different scenarios
 */

export const testData = {
  // User credentials for testing
  users: {
    admin: {
      email: 'admin@betali-test.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Admin',
      organizationName: 'Betali Test Org'
    },
    user: {
      email: 'user@betali-test.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      organizationName: 'Betali Test Org 2'
    }
  },

  // Product test data
  products: {
    basic: {
      name: 'Test Product',
      sku: `SKU-TEST-${Date.now()}`,
      description: 'This is a test product',
      category: 'Electronics',
      unit_price: '99.99',
      cost_price: '50.00'
    },
    withStock: {
      name: 'Product with Stock',
      sku: `SKU-STOCK-${Date.now()}`,
      description: 'Product for stock testing',
      category: 'Electronics',
      unit_price: '149.99',
      cost_price: '75.00',
      initial_stock: 100
    }
  },

  // Warehouse test data
  warehouses: {
    main: {
      name: 'Main Warehouse',
      location: '123 Test Street, Test City',
      capacity: 1000
    },
    secondary: {
      name: 'Secondary Warehouse',
      location: '456 Test Avenue, Test City',
      capacity: 500
    }
  },

  // Order test data
  orders: {
    basic: {
      client_name: 'Test Client',
      client_email: 'client@test.com',
      quantity: 10
    },
    large: {
      client_name: 'Large Order Client',
      client_email: 'large@test.com',
      quantity: 50
    }
  }
};

/**
 * Generate unique email for test isolation
 */
export function generateUniqueEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}@betali-test.com`;
}

/**
 * Generate unique SKU for products
 */
export function generateUniqueSKU(prefix: string = 'TEST'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
}

/**
 * Generate unique organization name
 */
export function generateUniqueOrgName(prefix: string = 'Test Org'): string {
  return `${prefix} ${Date.now()}`;
}
