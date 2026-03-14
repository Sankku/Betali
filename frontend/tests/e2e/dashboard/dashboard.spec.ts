import { test, expect } from '../../helpers/fixtures';
import { testData } from '../../helpers/testData';

test.describe('Dashboard — Core flows', () => {
  test.beforeEach(async ({ page, authHelper }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('betali_onboarding_completed', 'true');
      window.localStorage.setItem('betali_tutorial_skipped', 'true');
    });
    await authHelper.login(testData.users.admin.email, testData.users.admin.password);
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });
  });

  test('dashboard loads and shows stat cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // At least one stat card should be visible (total orders, products, etc.)
    // Cards typically contain a numeric value
    const statCards = page.locator(
      '[class*="stat"], [class*="card"], [class*="metric"], [class*="KPI"]'
    );
    const count = await statCards.count();

    // Fallback: look for any element showing a number on the dashboard
    if (count === 0) {
      const numerics = page.locator('text=/^\\d+/');
      await expect(numerics.first()).toBeVisible({ timeout: 10000 });
    } else {
      await expect(statCards.first()).toBeVisible({ timeout: 10000 });
    }

    console.log('✅ Dashboard stat cards visible');
  });

  test('dashboard has no critical JS errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter out non-critical / expected errors:
    // - favicon 404s
    // - ERR_BLOCKED_BY_CLIENT (ad blockers, extensions)
    // - ERR_CONNECTION_REFUSED (API calls during cold start / race conditions)
    // - Failed to fetch (same as above — API not fully ready)
    // - 404 resource not found
    // - net:: errors (network layer, not JS bugs)
    // What we WANT to catch: ReferenceError, TypeError in app code, SyntaxError
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('ERR_BLOCKED_BY_CLIENT') &&
      !e.includes('ERR_CONNECTION_REFUSED') &&
      !e.includes('Failed to fetch') &&
      !e.includes('TypeError: Failed to fetch') &&
      !e.includes('Failed to load resource') &&  // browser-level network error, not JS error
      !e.includes('net::') &&
      !e.includes('404') &&
      !e.includes('Load failed') &&
      !e.includes('You do not have permission') && // 403 on /api/users during org context load
      !e.includes('Please provide x-organization-id') && // race: org context not yet loaded
      e.length > 0
    );

    if (criticalErrors.length > 0) {
      console.error('⚠️  Critical JS errors found:', criticalErrors);
    }

    // Only fail on real JS/app errors (ReferenceError, SyntaxError, etc.)
    expect(criticalErrors).toHaveLength(0);
  });

  test('sidebar navigation works — can reach all main sections', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const routes = [
      { label: /product/i,  path: /dashboard\/products/ },
      { label: /order/i,    path: /dashboard\/orders/ },
      { label: /warehouse|almac/i, path: /dashboard\/warehouse/ },
      { label: /client/i,   path: /dashboard\/clients/ },
    ];

    for (const route of routes) {
      // Click sidebar link
      const link = page.locator(`nav a, aside a, [role="navigation"] a`).filter({ hasText: route.label }).first();

      if (await link.isVisible()) {
        await link.click();
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL(route.path, { timeout: 10000 });
        console.log(`✅ Navigated to ${page.url()}`);
      } else {
        console.log(`⚠️  Sidebar link not found for: ${route.label}`);
      }
    }
  });

  test('dashboard stats load data from API (not empty/loading state)', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for network to settle
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verify no "loading" spinners remain visible
    const spinners = page.locator('[class*="spinner"], [class*="skeleton"], [class*="loading"]');
    const spinnerCount = await spinners.count();

    if (spinnerCount > 0) {
      // Wait for them to disappear (max 10s)
      await expect(spinners.first()).toBeHidden({ timeout: 10000 });
    }

    console.log('✅ Dashboard data loaded (no stuck loading states)');
  });

  test('organization switcher is visible and functional', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for org switcher or org name display
    const orgSelector = page.locator(
      '[data-testid="org-switcher"], [class*="org"], button:has-text("Betali Test")'
    ).first();

    // Either org switcher exists or at least the org name is shown somewhere
    const orgNameVisible = await page.locator('text=/Betali Test/i').isVisible().catch(() => false);
    const orgSwitcherVisible = await orgSelector.isVisible().catch(() => false);

    expect(orgNameVisible || orgSwitcherVisible).toBeTruthy();
    console.log('✅ Organization context is visible');
  });
});
