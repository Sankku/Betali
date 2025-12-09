/**
 * Custom Playwright Fixtures for Betali E2E Tests
 *
 * Provides reusable fixtures for common test setups
 */

import { test as base } from '@playwright/test';
import { AuthHelper } from './auth';

type BetaliFixtures = {
  authHelper: AuthHelper;
};

/**
 * Extend base test with custom fixtures
 */
export const test = base.extend<BetaliFixtures>({
  authHelper: async ({ page }, use) => {
    const authHelper = new AuthHelper(page);
    await use(authHelper);
  },
});

export { expect } from '@playwright/test';
