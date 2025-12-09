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

    // Fill signup form
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.fill('input[name="firstName"]', firstName);
    await this.page.fill('input[name="lastName"]', lastName);
    await this.page.fill('input[name="organizationName"]', organizationName);

    // Submit form
    await this.page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  /**
   * Login existing user
   */
  async login(email: string, password: string) {
    await this.page.goto('/login');

    // Fill login form
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);

    // Submit form
    await this.page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
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
      const authData = localStorage.getItem('sb-auth-token');
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
