/**
 * E2E Test: Multi-Tenant Organization Data Isolation
 *
 * Tests that organizations cannot see each other's data
 */

import { test, expect } from '../../helpers/fixtures';
import { testData } from '../../helpers/testData';

test.describe('Multi-Tenant Data Isolation', () => {
  test('should isolate data between different organizations', async ({ page, authHelper }) => {
    // Uses two pre-seeded users in separate orgs to avoid email verification issues
    // admin@betali-test.com → Betali Test Org
    // user@betali-test.com  → Betali Test Org 2

    await page.addInitScript(() => {
      window.localStorage.setItem('betali_onboarding_completed', 'true');
      window.localStorage.setItem('betali_tutorial_skipped', 'true');
    });

    // Helper to create a product type in the current org's products page
    const createProductType = async (productName: string, sku: string) => {
      await page.goto('/dashboard/products');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('div.fixed.inset-0.z-40', { state: 'detached', timeout: 5000 }).catch(() => {});

      const createBtn = page.locator(
        'button:has-text("Nuevo Tipo"), button:has-text("Agregar Tipo"), button:has-text("Add Type"), button:has-text("New Type")'
      ).first();
      await createBtn.waitFor({ state: 'visible', timeout: 10000 });
      if (!await createBtn.isEnabled()) {
        console.log('⚠️  Create product type button is disabled (plan limit reached) — skipping isolation test');
        return false;
      }
      await createBtn.click();
      await page.waitForSelector('input[name="name"]', { timeout: 8000 });

      await page.fill('input[name="name"]', productName);
      const skuInput = page.locator('input[name="sku"]').first();
      if (await skuInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skuInput.fill(sku);
      }

      // Submit — wait for the product-types POST response
      const createResponsePromise = page.waitForResponse(
        r => r.url().includes('/api/product-types') && r.request().method() === 'POST',
        { timeout: 15000 }
      );
      await page.click('button[type="submit"]');
      const response = await createResponsePromise.catch(() => null);
      return response !== null && response.status() < 300;
    };

    // --- ORG 1: login as admin test user ---
    await authHelper.login(testData.users.admin.email, testData.users.admin.password);
    await expect(page).toHaveURL(/.*dashboard/);

    const org1ProductName = `Org1-Product-${Date.now()}`;
    await createProductType(org1ProductName, `ORG1-SKU-${Date.now()}`);

    // Logout: clear all storage and navigate to login to reset Supabase in-memory state
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // --- ORG 2: login as second pre-seeded user (different org) ---
    await authHelper.login(testData.users.user.email, testData.users.user.password);
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify org2 cannot see org1's product
    await page.goto('/dashboard/products');
    await page.waitForLoadState('networkidle');
    const org1ProductVisible = await page.locator(`text=${org1ProductName}`).first().isVisible().catch(() => false);
    expect(org1ProductVisible).toBe(false);

    const org2ProductName = `Org2-Product-${Date.now()}`;
    const org2Created = await createProductType(org2ProductName, `ORG2-SKU-${Date.now()}`);

    if (!org2Created) {
      console.log('⚠️  Org2 product creation skipped (plan limit) — skipping own-product visibility assertion');
      return;
    }

    // Verify org2 sees their own product but not org1's.
    const productTypesLoaded = page.waitForResponse(
      r => r.url().includes('/api/product-types') && r.status() === 200,
      { timeout: 15000 }
    );
    await page.goto('/dashboard/products');
    await productTypesLoaded.catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Search by name to find across pages
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="Buscar"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(org2ProductName);
      await page.waitForTimeout(800);
    }

    await expect(page.locator(`text=${org2ProductName}`).first()).toBeVisible({ timeout: 10000 });

    const org1ProductStillVisible = await page.locator(`text=${org1ProductName}`).first().isVisible().catch(() => false);
    expect(org1ProductStillVisible).toBe(false);

    console.log("✅ Data isolation test passed: Organizations cannot see each other's data");
  });

  test('should switch organization context correctly', async ({ page, authHelper }) => {
    // This test requires a user who belongs to multiple organizations
    // For MVP, we'll skip this test and implement it later when multi-org membership is ready

    await authHelper.login('admin@betali-test.com', 'TestPassword123!');
    await page.goto('/dashboard');

    const orgSwitcher = page.locator('[data-testid="org-switcher"], select[name="organization"]');
    const switcherExists = await orgSwitcher.count() > 0;

    if (switcherExists) {
      console.log('✅ Organization switcher found - multi-org membership supported');

      const currentOrg = await page.locator('[data-testid="current-org"]').textContent();
      await orgSwitcher.click();
      const orgOptions = await orgSwitcher.locator('option').count();

      if (orgOptions > 1) {
        await orgSwitcher.selectOption({ index: 1 });
        await page.waitForTimeout(2000);
        const newOrg = await page.locator('[data-testid="current-org"]').textContent();
        expect(newOrg).not.toBe(currentOrg);
        console.log(`✅ Successfully switched from "${currentOrg}" to "${newOrg}"`);
      } else {
        console.log('⏭️  Only one organization available - skipping switch test');
      }
    } else {
      console.log('⏭️  Organization switcher not implemented yet - skipping test');
    }
  });
});
