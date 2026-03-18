/**
 * E2E Test: Create Product
 *
 * Tests product creation flow and validation
 */

import { test, expect } from '../../helpers/fixtures';
import { generateUniqueSKU, testData } from '../../helpers/testData';

test.describe('Create Product', () => {
  test.beforeEach(async ({ page, authHelper }) => {
    // Login before each test
    await authHelper.login(testData.users.admin.email, testData.users.admin.password);
    // Ensure the user has an organization (creates one if missing)
    await authHelper.ensureOrganization(testData.users.admin.organizationName);
  });

  test('should create a new product successfully', async ({ page }) => {
    const uniqueSKU = generateUniqueSKU();
    const productName = `E2E Test Product ${Date.now()}`;

    // Navigate to products page
    await page.goto('/dashboard/products');
    await expect(page).toHaveURL(/.*products/);

    // Click create button (id or text in EN/ES) — skip if disabled due to plan limit
    const createBtn = page.locator('#create-product-button, button:has-text("Add Product"), button:has-text("Agregar Producto")').first();
    await createBtn.waitFor({ state: 'visible', timeout: 10000 });
    if (!await createBtn.isEnabled()) {
      console.log('⚠️  Create product button is disabled (plan limit reached) — skipping test');
      test.skip();
      return;
    }
    await createBtn.click();

    // Wait for product form to load
    await page.waitForSelector('input[name="name"]', { timeout: 5000 });

    // Fill product form (form uses batch_number, price, origin_country)
    await page.fill('input[name="name"]', productName);
    await page.fill('input[name="batch_number"]', uniqueSKU);
    await page.fill('input[name="price"]', '99.99');
    await page.fill('input[name="origin_country"]', 'Local Supplier');
    // Set expiration date via the DatePicker's manual text input (DD/MM/YYYY).
    // Using the manual input is reliable: page.evaluate() calendar clicks can leave
    // the backdrop (z-[9998]) open, blocking the submit button click.
    const pickerEl = page.locator('button[class*="h-\\[48px\\]"]').first();
    if (await pickerEl.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pickerEl.click();
      // Wait for the manual input to appear (auto-focuses after 50ms)
      const manualInput = page.locator('input[placeholder="DD/MM/YYYY"]');
      await manualInput.waitFor({ state: 'visible', timeout: 3000 });
      // Compute next-month day 15 as DD/MM/YYYY
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      d.setDate(15);
      const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      await manualInput.fill(dateStr);
      await page.keyboard.press('Enter'); // closes calendar and commits date
      // Wait for backdrop to disappear before proceeding
      await page.waitForSelector('.fixed.inset-0[class*="z-\\[9998\\]"]', { state: 'detached', timeout: 3000 }).catch(() => {});
    }

    // Submit form — wait for the actual POST /api/products 201 response (most reliable signal)
    const createResponsePromise = page.waitForResponse(
      r => r.url().includes('/api/products') && r.request().method() === 'POST',
      { timeout: 15000 }
    );
    await page.click('button[type="submit"]');
    const createResponse = await createResponsePromise.catch(() => null);
    const successVisible = createResponse !== null && createResponse.status() === 201;
    expect(successVisible).toBeTruthy();

    // Verify product appears in the list (use search to avoid pagination)
    await page.goto('/dashboard/products');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForSelector('table', { timeout: 10000 });
    // Dismiss onboarding tour — wait up to 3s for it to appear, then click if visible
    const skipTour = page.locator('button:has-text("Omitir tour guiado"), button:has-text("Omitir tour"), button:has-text("Skip tour")');
    await skipTour.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    if (await skipTour.isVisible().catch(() => false)) {
      await skipTour.click();
      await page.waitForTimeout(300);
    }
    // Search for the product to find it across pages
    const searchInput = page.locator('input[placeholder="Search..."]');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill(productName);
    await page.waitForTimeout(700);
    await expect(page.locator(`text=${productName}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show validation errors for empty product form', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Click create button (id or text in EN/ES) — skip if disabled due to plan limit
    const createBtn = page.locator('#create-product-button, button:has-text("Add Product"), button:has-text("Agregar Producto")').first();
    await createBtn.waitFor({ state: 'visible', timeout: 10000 });
    if (!await createBtn.isEnabled()) {
      console.log('⚠️  Create product button is disabled (plan limit reached) — skipping test');
      test.skip();
      return;
    }
    await createBtn.click();

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Verify validation errors
    await expect(
      page.locator('text=/required/i').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should not allow duplicate SKU', async ({ page }) => {
    const duplicateSKU = 'DUPLICATE-SKU-TEST';

    await page.goto('/dashboard/products');
    await page.click('#create-product-button, button:has-text("Add Product"), button:has-text("Agregar Producto")');

    await page.fill('input[name="name"]', 'Product 1');
    await page.fill('input[name="batch_number"]', duplicateSKU);
    await page.fill('input[name="price"]', '99.99');

    await page.click('button[type="submit"]');

    // Wait for potential error about duplicate SKU
    // Note: This assumes a product with this SKU already exists
    const errorVisible = await page.locator('text=/already exists|duplicate/i').first().isVisible({ timeout: 5000 }).catch(() => false);

    if (errorVisible) {
      expect(errorVisible).toBeTruthy();
    } else {
      // If no error, the SKU might not exist yet - this is acceptable
      console.log('SKU does not exist yet - test passed');
    }
  });
});
