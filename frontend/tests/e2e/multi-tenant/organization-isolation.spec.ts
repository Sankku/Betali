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

    // Skip onboarding wizard for all page loads in this test (prevents z-40 overlay blocking clicks)
    await page.addInitScript(() => {
      window.localStorage.setItem('betali_onboarding_completed', 'true');
      window.localStorage.setItem('betali_tutorial_skipped', 'true');
    });

    // Helper to create a product in the current org's products page
    const createProduct = async (productName: string, sku: string) => {
      await page.goto('/dashboard/products');
      await page.waitForLoadState('networkidle');
      // Wait for any loading overlays (e.g., onboarding wizard backdrop z-40) to disappear
      await page.waitForSelector('div.fixed.inset-0.z-40', { state: 'detached', timeout: 5000 }).catch(() => {});
      const createBtn = page.locator('#create-product-button, button:has-text("Add Product"), button:has-text("Agregar Producto")').first();
      await createBtn.waitFor({ state: 'visible', timeout: 10000 });
      if (!await createBtn.isEnabled()) {
        throw new Error('Create product button is disabled — test user has reached plan limit. Seed data may need cleanup.');
      }
      await createBtn.click();
      await page.waitForSelector('input[name="name"]', { timeout: 5000 });

      await page.fill('input[name="name"]', productName);
      await page.fill('input[name="batch_number"]', sku);
      await page.fill('input[name="price"]', '99.99');
      await page.fill('input[name="origin_country"]', 'Test Supplier');

      // Set expiration date — open DatePicker, click day using z-[9999] container selector
      const datePickerBtn = page.locator('button[class*="h-\\[48px\\]"]').first();
      if (await datePickerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await datePickerBtn.click();
        await page.waitForTimeout(400);

        // Navigate to next month then click day 15 (always safe, no timezone/month-end issues)
        await page.evaluate(() => {
          const cal = Array.from(document.querySelectorAll('div')).find((d: any) =>
            d.style && d.style.width === '320px' && d.style.top
          ) as HTMLElement | undefined;
          if (!cal) return;
          const btns = cal.querySelectorAll('button[type="button"]') as NodeListOf<HTMLButtonElement>;
          if (btns[1]) btns[1].click(); // next month arrow
        });
        await page.waitForTimeout(300);
        await page.evaluate(() => {
          const cal = Array.from(document.querySelectorAll('div')).find((d: any) =>
            d.style && d.style.width === '320px' && d.style.top
          ) as HTMLElement | undefined;
          if (!cal) return;
          const dayBtn = Array.from(cal.querySelectorAll('button[type="button"]') as NodeListOf<HTMLButtonElement>)
            .find(b => b.textContent?.trim() === '15' && !b.disabled);
          if (dayBtn) dayBtn.click();
        });
        await page.waitForTimeout(500);
      }

      await page.waitForTimeout(300);
      await page.click('button[type="submit"]');
      await page.waitForSelector('.border-l-success-500, [class*="border-l-success"]', {
        state: 'visible',
        timeout: 15000,
      });
    };

    // --- ORG 1: login as admin test user ---
    await authHelper.login(testData.users.admin.email, testData.users.admin.password);
    await expect(page).toHaveURL(/.*dashboard/);

    const org1ProductName = `Org1-Product-${Date.now()}`;
    await createProduct(org1ProductName, `ORG1-SKU-${Date.now()}`);

    // Logout: clear Supabase auth tokens
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-') || k === 'betali_current_org')
        .forEach(k => localStorage.removeItem(k));
    });

    // --- ORG 2: login as second pre-seeded user (different org) ---
    await authHelper.login(testData.users.user.email, testData.users.user.password);
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify org2 cannot see org1's product
    await page.goto('/dashboard/products');
    await page.waitForLoadState('networkidle');
    const org1ProductVisible = await page.locator(`text=${org1ProductName}`).first().isVisible().catch(() => false);
    expect(org1ProductVisible).toBe(false);

    const org2ProductName = `Org2-Product-${Date.now()}`;
    await createProduct(org2ProductName, `ORG2-SKU-${Date.now()}`);

    // Verify org2 sees their own product but not org1's.
    // Use waitForResponse instead of networkidle: the products query is enabled only after
    // OrganizationContext loads, so networkidle can fire between sequential async fetches
    // (auth → org → products) before the products request even starts.
    const productsLoaded = page.waitForResponse(
      r => r.url().includes('/api/products') && r.status() === 200,
      { timeout: 15000 }
    );
    await page.goto('/dashboard/products');
    await productsLoaded;

    // The table uses client-side pagination (pageSize=10). If this org has accumulated
    // >10 products from prior test runs, the new product lands on page 2+.
    // Search by name to collapse the list to exactly 1 row, making the assertion reliable.
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(org2ProductName);
      await page.waitForTimeout(400); // let debounce / filter settle
    }

    await expect(page.locator(`text=${org2ProductName}`).first()).toBeVisible({ timeout: 10000 });

    const org1ProductStillVisible = await page.locator(`text=${org1ProductName}`).first().isVisible().catch(() => false);
    expect(org1ProductStillVisible).toBe(false);

    console.log("✅ Data isolation test passed: Organizations cannot see each other's data");
  });

  test('should switch organization context correctly', async ({ page, authHelper }) => {
    // This test requires a user who belongs to multiple organizations
    // For MVP, we'll skip this test and implement it later when multi-org membership is ready

    // Login as admin
    await authHelper.login('admin@betali-test.com', 'TestPassword123!');

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Check if organization switcher exists
    const orgSwitcher = page.locator('[data-testid="org-switcher"], select[name="organization"]');
    const switcherExists = await orgSwitcher.count() > 0;

    if (switcherExists) {
      console.log('✅ Organization switcher found - multi-org membership supported');

      // Get current organization
      const currentOrg = await page.locator('[data-testid="current-org"]').textContent();

      // Switch to different organization if available
      await orgSwitcher.click();
      const orgOptions = await orgSwitcher.locator('option').count();

      if (orgOptions > 1) {
        await orgSwitcher.selectOption({ index: 1 });

        // Wait for context switch
        await page.waitForTimeout(2000);

        // Verify organization switched
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
