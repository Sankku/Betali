# 🧪 E2E Testing Guide - Betali SaaS

**Created**: 2025-12-08
**Status**: Day 4-5 Complete - E2E Testing Setup
**Progress**: 5 Core Tests Implemented

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Running Tests](#running-tests)
4. [Test Structure](#test-structure)
5. [Available Tests](#available-tests)
6. [Writing New Tests](#writing-new-tests)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This project uses **Playwright** for End-to-End testing to ensure the complete user journey works as expected.

### What We Test

- ✅ User signup and authentication flow
- ✅ Login and session management
- ✅ Product creation and management
- ✅ Order creation and stock reservation
- ✅ Multi-tenant data isolation

### Test Coverage Goals

- **Core Flows**: 100% of critical user journeys
- **Multi-Tenant**: Complete isolation between organizations
- **Stock System**: Real-time validation and reservations
- **Authentication**: All auth states and edge cases

---

## 🚀 Setup

### Prerequisites

1. **Node.js** 18+ installed
2. **Backend** running on `http://localhost:4000`
3. **Frontend** running on `http://localhost:3000`

### Installation

Playwright is already installed. If you need to reinstall:

```bash
cd frontend
npm install -D @playwright/test
npx playwright install chromium
```

### Environment Variables

Create `.env.test` in the frontend directory if needed:

```bash
# Frontend .env.test
VITE_API_URL=http://localhost:4000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

---

## 🏃 Running Tests

### Available Commands

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests with UI mode (recommended for development)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests step-by-step
npm run test:e2e:debug

# View test report (after tests run)
npm run test:e2e:report
```

### Run Specific Tests

```bash
# Run only auth tests
npx playwright test tests/e2e/auth

# Run only product tests
npx playwright test tests/e2e/products

# Run only orders tests
npx playwright test tests/e2e/orders

# Run only multi-tenant tests
npx playwright test tests/e2e/multi-tenant

# Run a single test file
npx playwright test tests/e2e/auth/signup.spec.ts
```

### Run with Specific Browser

```bash
# Run on Chromium only
npx playwright test --project=chromium

# Run on Firefox (if configured)
npx playwright test --project=firefox

# Run on Webkit/Safari (if configured)
npx playwright test --project=webkit
```

---

## 📁 Test Structure

```
frontend/
├── playwright.config.ts          # Playwright configuration
├── tests/
│   ├── helpers/
│   │   ├── auth.ts              # Authentication helpers
│   │   ├── testData.ts          # Test data factory
│   │   └── fixtures.ts          # Custom Playwright fixtures
│   └── e2e/
│       ├── auth/
│       │   ├── signup.spec.ts   # User signup tests
│       │   └── login.spec.ts    # User login tests
│       ├── products/
│       │   └── create-product.spec.ts
│       ├── orders/
│       │   └── create-order.spec.ts
│       └── multi-tenant/
│           └── organization-isolation.spec.ts
```

---

## ✅ Available Tests

### 1. **Auth Tests** (`tests/e2e/auth/`)

#### Signup Tests (`signup.spec.ts`)
- ✅ Complete signup flow and redirect to dashboard
- ✅ Show validation errors for invalid data
- ✅ Prevent duplicate email registration

#### Login Tests (`login.spec.ts`)
- ✅ Login successfully with valid credentials
- ✅ Show error for invalid credentials
- ✅ Redirect to login when accessing protected route
- ✅ Show validation errors for empty form

### 2. **Product Tests** (`tests/e2e/products/`)

#### Create Product (`create-product.spec.ts`)
- ✅ Create a new product successfully
- ✅ Show validation errors for empty form
- ✅ Prevent duplicate SKU

### 3. **Order Tests** (`tests/e2e/orders/`)

#### Create Order with Stock Reservation (`create-order.spec.ts`)
- ✅ Create order and reserve stock when status is "processing"
- ✅ Show low stock warning when available stock is low
- ✅ Prevent order creation when stock is insufficient

### 4. **Multi-Tenant Tests** (`tests/e2e/multi-tenant/`)

#### Organization Isolation (`organization-isolation.spec.ts`)
- ✅ Isolate data between different organizations
- ✅ Switch organization context correctly (if multi-org membership exists)

---

## 📝 Writing New Tests

### Basic Test Template

```typescript
import { test, expect } from '../../helpers/fixtures';
import { testData } from '../../helpers/testData';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page, authHelper }) => {
    // Login before each test
    await authHelper.login(
      testData.users.admin.email,
      testData.users.admin.password
    );
  });

  test('should do something', async ({ page }) => {
    // Navigate
    await page.goto('/my-page');

    // Interact
    await page.click('button:has-text("Click Me")');

    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Using Custom Helpers

#### Authentication Helper

```typescript
import { test, expect } from '../../helpers/fixtures';

test('should signup and login', async ({ page, authHelper }) => {
  // Signup
  await authHelper.signup(
    'user@test.com',
    'Password123!',
    'John',
    'Doe',
    'My Org'
  );

  // Logout
  await authHelper.logout();

  // Login again
  await authHelper.login('user@test.com', 'Password123!');

  // Check if authenticated
  const isAuth = await authHelper.isAuthenticated();
  expect(isAuth).toBeTruthy();
});
```

#### Test Data Factory

```typescript
import { generateUniqueEmail, generateUniqueSKU, testData } from '../../helpers/testData';

test('should use test data', async ({ page }) => {
  const uniqueEmail = generateUniqueEmail('signup');
  const uniqueSKU = generateUniqueSKU('PROD');

  // Use predefined test data
  await page.fill('input[name="email"]', uniqueEmail);
  await page.fill('input[name="sku"]', uniqueSKU);
  await page.fill('input[name="price"]', testData.products.basic.unit_price);
});
```

---

## 🎯 Best Practices

### 1. **Use Data Test IDs**

Add `data-testid` attributes to important elements:

```tsx
// In your React components
<button data-testid="submit-button">Submit</button>
<div data-testid="user-menu">Menu</div>
```

```typescript
// In your tests
await page.click('[data-testid="submit-button"]');
await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
```

### 2. **Generate Unique Data**

Always use unique emails, SKUs, and org names to avoid conflicts:

```typescript
const uniqueEmail = generateUniqueEmail('test');
const uniqueSKU = generateUniqueSKU('PROD');
const uniqueOrgName = generateUniqueOrgName('Org');
```

### 3. **Wait for Elements**

Use Playwright's auto-waiting and explicit waits:

```typescript
// Auto-waiting (recommended)
await expect(page.locator('text=Success')).toBeVisible();

// Explicit wait
await page.waitForSelector('text=Success', { timeout: 10000 });
```

### 4. **Use Page Object Model (for complex flows)**

```typescript
class ProductPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/products');
  }

  async createProduct(name: string, sku: string, price: string) {
    await this.page.click('button:has-text("New Product")');
    await this.page.fill('input[name="name"]', name);
    await this.page.fill('input[name="sku"]', sku);
    await this.page.fill('input[name="unit_price"]', price);
    await this.page.click('button[type="submit"]');
  }
}
```

### 5. **Clean Up Test Data**

```typescript
test.afterEach(async ({ page }) => {
  // Clear local storage
  await page.evaluate(() => localStorage.clear());
});
```

---

## 🐛 Troubleshooting

### Tests Timing Out

```typescript
// Increase timeout for specific test
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds

  // ... rest of test
});

// Or in playwright.config.ts
export default defineConfig({
  timeout: 60000, // Global timeout
});
```

### Element Not Found

```typescript
// Add debug screenshots
await page.screenshot({ path: 'debug.png', fullPage: true });

// Check what's on the page
const content = await page.content();
console.log(content);

// Use debug mode
npx playwright test --debug
```

### Backend Not Running

Make sure both frontend and backend are running:

```bash
# Terminal 1 - Backend
cd backend
node server.js

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Tests
cd frontend
npm run test:e2e
```

### Test Data Conflicts

If tests fail due to existing data:

1. Use unique generators: `generateUniqueEmail()`, `generateUniqueSKU()`
2. Clean up test data after each run
3. Use isolated test databases

### Flaky Tests

```typescript
// Retry flaky tests
test.describe.configure({ retries: 2 });

// Or for individual test
test('flaky test', async ({ page }) => {
  test.describe.configure({ retries: 3 });
  // ... test code
});
```

---

## 📊 Test Reports

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

This opens a detailed report showing:
- ✅ Passed tests
- ❌ Failed tests
- ⏭️  Skipped tests
- 📸 Screenshots on failures
- 🎥 Videos of test runs
- 📋 Traces for debugging

---

## 🎉 Next Steps

### Expand Test Coverage

Add tests for:

1. **Purchase Orders** (Semana 2)
   - Create purchase order
   - Receive purchase order → Stock movements

2. **Inventory Alerts** (Semana 3)
   - Low stock warnings
   - Out of stock alerts

3. **Help System** (Semana 3)
   - Onboarding flow
   - Tooltips and guides

4. **Analytics Dashboard** (Semana 3)
   - Date range filtering
   - Export functionality

5. **Performance Tests**
   - Load 1000 products
   - Create 50 orders simultaneously

6. **Mobile Tests**
   - Responsive design
   - Touch interactions

### CI/CD Integration

Add to GitHub Actions:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

---

## 📈 Current Status

### ✅ Completed (Day 4-5)

- [x] Playwright setup and configuration
- [x] Test directory structure
- [x] Custom helpers and fixtures
- [x] 5 core test suites:
  - [x] Signup flow (3 tests)
  - [x] Login flow (4 tests)
  - [x] Product creation (3 tests)
  - [x] Order + Stock reservation (3 tests)
  - [x] Multi-tenant isolation (2 tests)

**Total**: 15 E2E tests implemented

### 📅 Next Steps (Week 4 - Day 16-17)

- [ ] Expand to 20+ tests
- [ ] Add complete user journeys
- [ ] Performance testing
- [ ] Cross-browser testing
- [ ] CI/CD pipeline setup

---

## 🚀 Quick Start Checklist

Before running E2E tests:

- [ ] Backend running on `localhost:4000`
- [ ] Frontend running on `localhost:3000`
- [ ] Database is seeded with initial data
- [ ] Environment variables are set
- [ ] Test user exists (or signup will create one)

Run tests:

```bash
cd frontend
npm run test:e2e:ui  # Best for development
```

---

**Documentation last updated**: 2025-12-08
**Next review**: After Week 4 Day 17 (Complete E2E Testing)
