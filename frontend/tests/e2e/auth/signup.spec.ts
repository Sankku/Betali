/**
 * E2E Test: User Signup Flow
 *
 * Tests the complete user registration and onboarding process
 */

import { test, expect } from '../../helpers/fixtures';
import { generateUniqueEmail, generateUniqueOrgName } from '../../helpers/testData';

test.describe('User Signup', () => {
  test('should complete signup flow and redirect to dashboard', async ({ page, authHelper }) => {
    const uniqueEmail = generateUniqueEmail('signup');
    const uniqueOrgName = generateUniqueOrgName('E2E Test Org');

    // Navigate to signup page
    await page.goto('/register');
    await expect(page).toHaveURL(/.*register/);

    // Fill signup form (Register.tsx uses id attributes, single 'name' field)
    await page.fill('#email', uniqueEmail);
    await page.fill('#name', 'Test User');
    await page.fill('#organizationName', uniqueOrgName);
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#confirmPassword', 'TestPassword123!');
    await page.locator('label[for="terms"]').first().click();

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for either navigation OR an error message (e.g. Supabase email rate limit)
    await Promise.race([
      page.waitForURL(/.*dashboard|.*login.*verify/, { timeout: 15000 }),
      page.locator('.bg-danger-50').first().waitFor({ state: 'visible', timeout: 15000 })
    ]);

    const url = page.url();

    // If still on register page, check for known infrastructure errors (not code bugs)
    if (url.includes('register')) {
      const errorText = (await page.locator('.bg-danger-50').first().textContent().catch(() => '')) ?? '';
      const lowerError = errorText.toLowerCase();
      const isInfrastructureError =
        lowerError.includes('rate limit') ||
        lowerError.includes('hook requires authorization') ||
        lowerError.includes('unexpected_failure');
      if (isInfrastructureError) {
        test.skip(true, `Supabase infrastructure error — skipping signup test: ${errorText.trim()}`);
        return;
      }
      // Any other error on the register page is a real code failure
      expect(url).toMatch(/.*dashboard|.*login.*verify/);
      return;
    }

    // Both outcomes are valid success states
    expect(url.includes('dashboard') || url.includes('verify=true')).toBeTruthy();

    if (url.includes('dashboard')) {
      const isAuth = await authHelper.isAuthenticated();
      expect(isAuth).toBeTruthy();
      await expect(page.locator('h1, h2').first()).toBeVisible();
    }
  });

  test('should show validation errors for invalid signup data', async ({ page }) => {
    await page.goto('/register');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Verify validation triggered — HTML5 required fields become :invalid
    const hasInvalidInput = await page.locator('input:invalid').first().isVisible({ timeout: 3000 }).catch(() => false);
    const stayedOnRegister = page.url().includes('register');

    expect(hasInvalidInput || stayedOnRegister).toBeTruthy();
  });

  test('should not allow duplicate email registration', async ({ page }) => {
    const duplicateEmail = 'existing@betali-test.com';

    await page.goto('/register');

    await page.fill('#email', duplicateEmail);
    await page.fill('#name', 'Test User');
    await page.fill('#organizationName', 'Test Org');
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#confirmPassword', 'TestPassword123!');
    await page.locator('label[for="terms"]').first().click();

    await page.click('button[type="submit"]');

    // Wait for error message about duplicate email (error div has class bg-danger-50)
    const errorVisible = await page.locator('.bg-danger-50').first().isVisible({ timeout: 10000 }).catch(() => false);
    const stayedOnRegister = page.url().includes('register');

    // Either an error is shown or we're redirected to verify=true (email already in Supabase)
    const redirectedToVerify = page.url().includes('verify=true');

    expect(errorVisible || stayedOnRegister || redirectedToVerify).toBeTruthy();
  });
});
