import { test, expect } from '../../helpers/fixtures';
import { testData } from '../../helpers/testData';

test.describe('Create Order Flow (Fixed Data)', () => {
  test.beforeEach(async ({ page, authHelper }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('betali_onboarding_completed', 'true');
      window.localStorage.setItem('betali_tutorial_skipped', 'true');
    });
    await authHelper.login(testData.users.admin.email, testData.users.admin.password);
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });
    await authHelper.ensureOrganization(testData.users.admin.organizationName);
  });

  test('should create order with fixed seeded data', async ({ page }) => {
    console.log('🏁 Starting Order Flow Test');
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    
    // 1. Click Create Button
    const createBtn = page.locator('#create-order-button, button:has-text("New Order"), button:has-text("Create Order")').first();
    await createBtn.click();
    await page.waitForSelector('form', { timeout: 10000 });

    // 2. Select Warehouse
    console.log('Selecting Warehouse...');
    await page.locator('button').filter({ hasText: /warehouse|almacén/i }).first().click();
    await page.locator('[role="option"]').filter({ hasText: 'ALMACEN-FIXED' }).first().click();
    await page.waitForTimeout(1000); // Wait for state update

    // 3. Select Client
    console.log('Selecting Client...');
    await page.locator('button').filter({ hasText: /client|cliente/i }).first().click();
    await page.locator('[role="option"]').filter({ hasText: 'CLIENTE-FIXED' }).first().click();
    await page.waitForTimeout(1000);

    // 4. Select Product in the existing empty item slot (create mode adds one empty item by default)
    console.log('Selecting Product...');
    await page.locator('button').filter({ hasText: /product|producto/i }).first().click();
    await page.locator('[role="option"]').filter({ hasText: 'PRODUCTO-FIXED' }).first().click();
    await page.waitForTimeout(1000);

    // 6. Fill Qty and Price
    console.log('Filling Qty and Price...');
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.clear();
    await qtyInput.fill('1');
    
    const priceInput = page.locator('input[type="number"]').nth(1); 
    if (await priceInput.isVisible()) {
        await priceInput.clear();
        await priceInput.fill('1000');
    }

    // 7. Check for frontend validation errors
    const errors = page.locator('.text-red-600');
    const errorCount = await errors.count();
    if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
            console.error('❌ Validation Error:', await errors.nth(i).textContent());
        }
    }

    // 8. Submit
    console.log('Submitting...');
    const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /create|save|crear|guardar/i }).first();
    await expect(submitBtn).toBeEnabled();

    // Capture the API response for debugging
    const createResponsePromise = page.waitForResponse(
      r => r.url().includes('/api/orders') && r.request().method() === 'POST',
      { timeout: 25000 }
    ).catch(() => null);

    await submitBtn.click();

    const createApiResponse = await createResponsePromise;
    if (createApiResponse) {
      const status = createApiResponse.status();
      const body = await createApiResponse.json().catch(() => null);
      console.log(`📡 API POST /api/orders → ${status}`, JSON.stringify(body)?.substring(0, 400));
    } else {
      console.log('📡 No API response captured (request may not have been made)');
      // Log form state for debugging
      const formValues = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="number"]');
        return Array.from(inputs).map(i => ({ type: (i as HTMLInputElement).type, value: (i as HTMLInputElement).value }));
      });
      console.log('Number inputs:', JSON.stringify(formValues));
    }

    // 9. Wait for Success (custom toast with border-l-success-500 class)
    console.log('Waiting for feedback...');
    const appeared = await page.waitForSelector(
      '.border-l-success-500, [class*="border-l-success"]',
      { state: 'visible', timeout: 20000 }
    ).then(() => true).catch(() => false);
    if (!appeared) {
      // Log any visible error for debugging
      const errMsg = await page.locator('[class*="danger" i], [class*="error" i], .text-red-600').first().textContent().catch(() => 'unknown');
      console.error('❌ No success feedback. Possible error:', errMsg);
    }
    expect(appeared).toBeTruthy();
    
    console.log('✅ TEST PASSED');
  });
});
