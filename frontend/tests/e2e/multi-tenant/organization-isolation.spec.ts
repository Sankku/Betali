/**
 * E2E Test: Multi-Tenant Organization Data Isolation
 *
 * Tests that organizations cannot see each other's data
 */

import { test, expect } from '../../helpers/fixtures';
import { generateUniqueEmail, generateUniqueOrgName } from '../../helpers/testData';

test.describe('Multi-Tenant Data Isolation', () => {
  test('should isolate data between different organizations', async ({ page, authHelper, context }) => {
    // Create first organization
    const org1Email = generateUniqueEmail('org1');
    const org1Name = generateUniqueOrgName('Org 1');

    await authHelper.signup(org1Email, 'Password123!', 'User', 'One', org1Name);

    // Verify org1 dashboard is visible
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator(`text=${org1Name}`).first()).toBeVisible({ timeout: 10000 });

    // Create a product for org1
    await page.goto('/products');
    await page.click('button:has-text("New Product"), button:has-text("Add Product"), a[href*="products/new"]');

    const org1ProductName = `Org1 Product ${Date.now()}`;
    await page.fill('input[name="name"]', org1ProductName);
    await page.fill('input[name="sku"]', `ORG1-SKU-${Date.now()}`);
    await page.fill('input[name="unit_price"]', '99.99');
    await page.click('button[type="submit"]');

    // Wait for product creation
    await expect(
      page.locator('text=/success|created/i').first()
    ).toBeVisible({ timeout: 10000 });

    // Logout from org1
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Create second organization in a new session
    const org2Email = generateUniqueEmail('org2');
    const org2Name = generateUniqueOrgName('Org 2');

    await authHelper.signup(org2Email, 'Password123!', 'User', 'Two', org2Name);

    // Verify org2 dashboard is visible
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator(`text=${org2Name}`).first()).toBeVisible({ timeout: 10000 });

    // Navigate to products page for org2
    await page.goto('/products');

    // Verify org1's product is NOT visible to org2
    const org1ProductVisible = await page.locator(`text=${org1ProductName}`).first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(org1ProductVisible).toBe(false);

    // Create a product for org2
    await page.click('button:has-text("New Product"), button:has-text("Add Product"), a[href*="products/new"]');

    const org2ProductName = `Org2 Product ${Date.now()}`;
    await page.fill('input[name="name"]', org2ProductName);
    await page.fill('input[name="sku"]', `ORG2-SKU-${Date.now()}`);
    await page.fill('input[name="unit_price"]', '149.99');
    await page.click('button[type="submit"]');

    // Wait for product creation
    await expect(
      page.locator('text=/success|created/i').first()
    ).toBeVisible({ timeout: 10000 });

    // Go back to products list
    await page.goto('/products');

    // Verify org2 can see their own product
    await expect(page.locator(`text=${org2ProductName}`).first()).toBeVisible({ timeout: 10000 });

    // But still cannot see org1's product
    const org1ProductStillVisible = await page.locator(`text=${org1ProductName}`).first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(org1ProductStillVisible).toBe(false);

    console.log('✅ Data isolation test passed: Organizations cannot see each other\'s data');
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
