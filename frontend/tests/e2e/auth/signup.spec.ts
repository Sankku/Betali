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

    // Verify we're on the signup page
    await expect(page).toHaveURL(/.*register/);

    // Fill signup form
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="organizationName"]', uniqueOrgName);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for successful signup and redirect to dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    // Verify dashboard loaded successfully
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify user is authenticated
    const isAuth = await authHelper.isAuthenticated();
    expect(isAuth).toBeTruthy();

    // Verify dashboard content is visible
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Verify organization was created
    await expect(page.locator(`text=${uniqueOrgName}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show validation errors for invalid signup data', async ({ page }) => {
    await page.goto('/register');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Verify validation errors appear
    await expect(page.locator('text=/required|invalid/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should not allow duplicate email registration', async ({ page }) => {
    const duplicateEmail = 'existing@betali-test.com';

    await page.goto('/register');

    await page.fill('input[name="email"]', duplicateEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="organizationName"]', 'Test Org');

    await page.click('button[type="submit"]');

    // Wait for error message about duplicate email
    // Note: This assumes the email already exists in the database
    await expect(
      page.locator('text=/already exists|already registered/i').first()
    ).toBeVisible({ timeout: 10000 });
  });
});
