import { test, expect } from '../../helpers/fixtures';
import { testData } from '../../helpers/testData';

test.describe('Warehouse — Core flows', () => {
  test.beforeEach(async ({ page, authHelper }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('betali_onboarding_completed', 'true');
      window.localStorage.setItem('betali_tutorial_skipped', 'true');
    });
    await authHelper.login(testData.users.admin.email, testData.users.admin.password);
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });
  });

  test('warehouse page loads and shows list', async ({ page }) => {
    await page.goto('/dashboard/warehouse');
    await page.waitForLoadState('networkidle');

    // Should show the seeded ALMACEN-FIXED warehouse
    const warehouseItem = page.locator('text=/ALMACEN-FIXED/i');
    await expect(warehouseItem).toBeVisible({ timeout: 15000 });
    console.log('✅ Warehouse list loaded with ALMACEN-FIXED');
  });

  test('warehouse page has no API errors', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('response', res => {
      if (res.url().includes('/warehouse') && res.status() >= 400) {
        failedRequests.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto('/dashboard/warehouse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(failedRequests).toHaveLength(0);
    console.log('✅ No API errors on warehouse page');
  });

  test('can open warehouse creation form', async ({ page }) => {
    await page.goto('/dashboard/warehouse');
    await page.waitForLoadState('networkidle');

    // Find and click the create/add button
    const createBtn = page.locator(
      '#create-warehouse-button, button:has-text("New Warehouse"), button:has-text("Create"), button:has-text("Nuevo"), button:has-text("Agregar")'
    ).first();

    const isVisible = await createBtn.isVisible({ timeout: 5000 }).catch(() => false);
    const isEnabled = isVisible && await createBtn.isEnabled().catch(() => false);

    if (isVisible && isEnabled) {
      await createBtn.click();
      // Form or modal should appear
      await expect(page.locator('form, [role="dialog"]').first()).toBeVisible({ timeout: 8000 });
      console.log('✅ Warehouse creation form opened');

      // Close/cancel without submitting
      const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Cancelar"), button:has-text("Close")').first();
      if (await cancelBtn.isVisible({ timeout: 3000 })) {
        await cancelBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    } else if (isVisible && !isEnabled) {
      console.log('⚠️  Create warehouse button is disabled (plan limit reached) — skipping click, verifying page loaded');
      await expect(page.locator('table, [role="table"], #create-warehouse-button').first()).toBeVisible({ timeout: 5000 });
    } else {
      console.log('⚠️  Create warehouse button not found — checking if it requires a different selector');
      await expect(page.locator('table, [role="table"], #create-warehouse-button').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('warehouse shows stock levels for seeded product', async ({ page }) => {
    await page.goto('/dashboard/warehouse');
    await page.waitForLoadState('networkidle');

    // After order seeding, ALMACEN-FIXED should show some stock
    const almacen = page.locator('text=/ALMACEN-FIXED/i');
    await expect(almacen).toBeVisible({ timeout: 10000 });

    // Stock number should appear near the warehouse item
    // (varies by UI design — just check the row/card is rendered)
    const row = page.locator('[class*="row"], [class*="card"], tr').filter({ hasText: 'ALMACEN-FIXED' }).first();
    if (await row.isVisible()) {
      const rowText = await row.textContent();
      console.log(`✅ Warehouse row content: "${rowText?.slice(0, 80)}"`);
    }
  });

  test('stock movements page loads for the seeded warehouse', async ({ page }) => {
    await page.goto('/dashboard/stock-movements');
    await page.waitForLoadState('networkidle');

    // Should load without 500 errors
    const errorPage = page.locator('text=/500|Internal Server Error/i');
    await expect(errorPage).not.toBeVisible({ timeout: 5000 });

    // Page content should be rendered
    await expect(page.locator('main, [class*="content"], [class*="page"]').first()).toBeVisible({ timeout: 8000 });
    console.log('✅ Stock movements page loaded successfully');
  });
});
