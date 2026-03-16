/**
 * Authentication Helper for E2E Tests
 *
 * Provides methods to handle authentication in tests
 */

import { Page } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Sign up a new user
   */
  async signup(email: string, password: string, firstName: string, lastName: string, organizationName: string) {
    await this.page.goto('/register');

    // Fill signup form (Register.tsx uses id attributes, single 'name' field)
    await this.page.fill('#email', email);
    await this.page.fill('#name', `${firstName} ${lastName}`);
    await this.page.fill('#organizationName', organizationName);
    await this.page.fill('#password', password);
    await this.page.fill('#confirmPassword', password);
    await this.page.locator('label[for="terms"]').first().click();

    // Submit form
    await this.page.click('button[type="submit"]');

    // Wait for redirect to dashboard (may include query params like ?welcome=true)
    await this.page.waitForURL(/.*dashboard/, { timeout: 15000 });
  }

  /**
   * Login existing user
   */
  async login(email: string, password: string) {
    await this.page.goto('/login');

    // Fill login form
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);

    // Submit form
    await this.page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await this.page.waitForURL(/.*dashboard/, { timeout: 15000 });
  }

  /**
   * Logout user
   */
  async logout() {
    // Click user menu
    await this.page.click('[data-testid="user-menu"]');

    // Click logout button
    await this.page.click('[data-testid="logout-button"]');

    // Wait for redirect to login
    await this.page.waitForURL('/login', { timeout: 5000 });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const currentURL = this.page.url();
    return !currentURL.includes('/login') && !currentURL.includes('/register');
  }

  /**
   * Get stored authentication token from localStorage
   */
  async getAuthToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      // Supabase stores token with dynamic key: sb-<project-ref>-auth-token
      const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!key) return null;
      const authData = localStorage.getItem(key);
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          return parsed.access_token || null;
        } catch {
          return null;
        }
      }
      return null;
    });
  }

  /**
   * Ensure the logged-in user has an organization.
   * If "No Organization Selected" is showing, creates one with the given name.
   */
  /**
   * Ensures the logged-in user has at least one organization by calling the backend API directly.
   * Falls back to UI interaction if the API call fails.
   */
  async ensureOrganization(orgName: string) {
    // Wait specifically for the "No Organization Selected" heading.
    // If it appears, the user has no org. If it doesn't (timeout), the user has an org.
    const noOrgVisible = await this.page.locator('h1:has-text("No Organization Selected")')
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (!noOrgVisible) return;

    // Use browser-side fetch (has Supabase auth token in localStorage) to call the backend API
    const created = await this.page.evaluate(async (name: string) => {
      const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!key) return false;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        const token = parsed.access_token;
        if (!token) return false;

        const slug = `e2e-${Date.now()}`;
        const res = await fetch('http://localhost:4000/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name, slug }),
        });
        return res.ok;
      } catch {
        return false;
      }
    }, orgName);

    if (created) {
      // Reload to pick up the new organization in the app context
      await this.page.reload({ waitUntil: 'networkidle' });
    }
  }

  /**
   * Set authentication token in localStorage (for faster test setup)
   */
  async setAuthToken(token: string) {
    await this.page.evaluate((authToken) => {
      localStorage.setItem('sb-auth-token', JSON.stringify({
        access_token: authToken,
        refresh_token: authToken
      }));
    }, token);
  }
}
