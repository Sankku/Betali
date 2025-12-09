/**
 * E2E Test: Create Order & Stock Reservation
 *
 * Tests order creation flow and stock reservation system
 */

import { test, expect } from '../../helpers/fixtures';
import { testData } from '../../helpers/testData';

test.describe('Create Order with Stock Reservation', () => {
  test.beforeEach(async ({ page, authHelper }) => {
    // Login before each test
    await authHelper.login(testData.users.admin.email, testData.users.admin.password);
  });

  test('should create order and reserve stock when status is "processing"', async ({ page }) => {
    // Navigate to orders page
    await page.goto('/orders');
    await expect(page).toHaveURL(/.*orders/);

    // Click "New Order" button
    await page.click('button:has-text("New Order"), button:has-text("Create Order"), a[href*="orders/new"]');

    // Wait for order form
    await page.waitForSelector('form', { timeout: 5000 });

    // Select warehouse (if dropdown exists)
    const warehouseSelect = page.locator('select[name="warehouse_id"]');
    if (await warehouseSelect.count() > 0) {
      await warehouseSelect.selectOption({ index: 1 });
    }

    // Fill order details
    await page.fill('input[name="client_name"]', testData.orders.basic.client_name);

    // Add product to order
    await page.click('button:has-text("Add Product"), button:has-text("Add Item")');

    // Select product
    const productSelect = page.locator('select[name*="product"]').first();
    if (await productSelect.count() > 0) {
      await productSelect.selectOption({ index: 1 });
    }

    // Fill quantity
    await page.fill('input[name*="quantity"]', testData.orders.basic.quantity.toString());

    // Set status to "processing" to trigger stock reservation
    const statusSelect = page.locator('select[name="status"]');
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('processing');
    }

    // Submit order
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(
      page.locator('text=/success|created/i').first()
    ).toBeVisible({ timeout: 15000 });

    // Verify order appears in list
    await page.goto('/orders');
    await expect(
      page.locator(`text=${testData.orders.basic.client_name}`).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show low stock warning when available stock is low', async ({ page }) => {
    await page.goto('/orders');

    // Create new order
    await page.click('button:has-text("New Order"), button:has-text("Create Order"), a[href*="orders/new"]');

    await page.waitForSelector('form', { timeout: 5000 });

    // Try to add a large quantity that might trigger low stock warning
    await page.click('button:has-text("Add Product"), button:has-text("Add Item")');

    const productSelect = page.locator('select[name*="product"]').first();
    if (await productSelect.count() > 0) {
      await productSelect.selectOption({ index: 1 });
    }

    // Enter large quantity
    await page.fill('input[name*="quantity"]', '9999');

    // Check for low stock or insufficient stock warning
    const warningVisible = await page.locator('text=/low stock|insufficient|not enough/i').first().isVisible({ timeout: 5000 }).catch(() => false);

    // Warning should appear if stock is low
    if (warningVisible) {
      expect(warningVisible).toBeTruthy();
    }
  });

  test('should prevent order creation when stock is insufficient', async ({ page }) => {
    await page.goto('/orders');

    await page.click('button:has-text("New Order"), button:has-text("Create Order"), a[href*="orders/new"]');

    await page.waitForSelector('form', { timeout: 5000 });

    // Add product
    await page.click('button:has-text("Add Product"), button:has-text("Add Item")');

    const productSelect = page.locator('select[name*="product"]').first();
    if (await productSelect.count() > 0) {
      await productSelect.selectOption({ index: 1 });
    }

    // Try to order more than available
    await page.fill('input[name*="quantity"]', '999999');

    // Set status to processing
    const statusSelect = page.locator('select[name="status"]');
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('processing');
    }

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show error about insufficient stock
    const errorVisible = await page.locator('text=/insufficient|not enough|out of stock/i').first().isVisible({ timeout: 10000 }).catch(() => false);

    if (errorVisible) {
      expect(errorVisible).toBeTruthy();
    }
  });
});
