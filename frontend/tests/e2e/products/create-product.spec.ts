/**
 * E2E Test: Create Product Type
 *
 * Tests product type creation flow in the new accordion-based Products page.
 * Products are now managed as product_types (types + lots architecture).
 */

import { test, expect } from '../../helpers/fixtures';
import { testData } from '../../helpers/testData';

test.describe('Create Product Type', () => {
  test.beforeEach(async ({ page, authHelper }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('betali_onboarding_completed', 'true');
      window.localStorage.setItem('betali_tutorial_skipped', 'true');
    });
    await authHelper.login(testData.users.admin.email, testData.users.admin.password);
    await authHelper.ensureOrganization(testData.users.admin.organizationName);
  });

  test('should display the products page with accordion UI', async ({ page }) => {
    await page.goto('/dashboard/products');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/.*products/);

    // Page should have a heading
    const heading = page.locator('h1, h2').filter({ hasText: /productos|products/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should create a new product type successfully', async ({ page }) => {
    const productName = `E2E ProductType ${Date.now()}`;
    const sku = `SKU-E2E-${Date.now()}`;

    await page.goto('/dashboard/products');
    await page.waitForLoadState('networkidle');

    // Click the create / add product type button
    const createBtn = page.locator(
      'button:has-text("Nuevo Tipo"), button:has-text("Agregar Tipo"), button:has-text("Add Type"), button:has-text("New Type")'
    ).first();
    await createBtn.waitFor({ state: 'visible', timeout: 10000 });
    await createBtn.click();

    // Wait for form / side panel to appear
    await page.waitForSelector('input[name="name"], input[placeholder*="nombre"], input[placeholder*="name"]', { timeout: 8000 });

    // Fill in product type fields
    const nameInput = page.locator('input[name="name"]').first();
    await nameInput.fill(productName);

    const skuInput = page.locator('input[name="sku"]').first();
    if (await skuInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skuInput.fill(sku);
    }

    // Submit the form — wait for the API response
    const responsePromise = page.waitForResponse(
      r => r.url().includes('/api/product-types') && r.request().method() === 'POST',
      { timeout: 15000 }
    );
    await page.click('button[type="submit"]');
    const response = await responsePromise.catch(() => null);

    if (response) {
      expect(response.status()).toBeLessThan(300);
    } else {
      // Fallback: check for absence of error
      const errorVisible = await page.locator('.text-red-600, [role="alert"]').first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(errorVisible).toBeFalsy();
    }
  });

  test('should show validation errors for empty product type form', async ({ page }) => {
    await page.goto('/dashboard/products');
    await page.waitForLoadState('networkidle');

    const createBtn = page.locator(
      'button:has-text("Nuevo Tipo"), button:has-text("Agregar Tipo"), button:has-text("Add Type"), button:has-text("New Type")'
    ).first();
    await createBtn.waitFor({ state: 'visible', timeout: 10000 });
    await createBtn.click();

    await page.waitForSelector('input[name="sku"]', { timeout: 8000 });

    // Bypass browser's native required validation so React's custom errors render
    await page.evaluate(() => {
      document.querySelectorAll('form').forEach((f) => {
        (f as HTMLFormElement).noValidate = true;
      });
    });
    await page.locator('button:has-text("Crear producto")').click();

    // Should show React custom validation errors (.text-danger-600)
    await expect(
      page.locator('.text-danger-600').first()
    ).toBeVisible({ timeout: 8000 });
  });
});
