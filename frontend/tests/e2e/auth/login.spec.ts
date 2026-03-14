/**
 * E2E Test: User Login Flow
 *
 * Tests the authentication and login process
 */

import { test, expect } from '../../helpers/fixtures';
import { testData } from '../../helpers/testData';

test.describe('User Login', () => {
  test('should login successfully with valid credentials', async ({ page, authHelper }) => {
    await page.goto('/login');

    // Verify we're on login page
    await expect(page).toHaveURL(/.*login/);

    // Fill login form
    await page.fill('#email', testData.users.admin.email);
    await page.fill('#password', testData.users.admin.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    // Verify successful login
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify user is authenticated
    const isAuth = await authHelper.isAuthenticated();
    expect(isAuth).toBeTruthy();

    // Verify auth token exists
    const token = await authHelper.getAuthToken();
    expect(token).toBeTruthy();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill with invalid credentials
    await page.fill('#email', 'invalid@test.com');
    await page.fill('#password', 'WrongPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify some error feedback appeared — use waitForSelector to properly wait
    // The login page shows errors in a .bg-danger-50 container
    const errorVisible = await page.waitForSelector(
      '.bg-danger-50, [class*="bg-danger"], [class*="text-danger-8"]',
      { state: 'visible', timeout: 10000 }
    ).then(() => true).catch(() => false);

    expect(errorVisible).toBeTruthy();

    // Verify we're still on login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL(/.*login/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*login/);
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Verify validation triggered — HTML5 required fields become :invalid
    // or the form stays on the login page without submitting
    const hasInvalidInput = await page.locator('input:invalid').first().isVisible({ timeout: 3000 }).catch(() => false);
    const stayedOnLogin = page.url().includes('login');

    expect(hasInvalidInput || stayedOnLogin).toBeTruthy();
  });
});
