import { test, expect } from '../../../fixtures/noAuthContext';

test.describe('E2E: Registration', () => {
  test('should render the registration form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1')).toHaveText('Create Account');
    await expect(page.locator('[data-testid="register-name-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-submit-button"]')).toBeVisible();
  });

  test('should show success view for already registered email', async ({ page }) => {
    await page.goto('/register');
    const email = process.env.TEST_BUYER_EMAIL || 'rajesh.kumar@valclassifieds.test';
    await page.fill('[data-testid="register-name-input"]', 'Test User');
    await page.fill('[data-testid="register-email-input"]', email);
    await page.fill('[data-testid="register-password-input"]', 'TestPass123!');
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
    // Supabase returns success (not error) for existing emails when email confirmation is enabled
    await expect(page.locator('h1')).toContainText('Account Created Successfully');
  });

  test('should show password too short error', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[data-testid="register-name-input"]', 'Test User');
    await page.fill('[data-testid="register-email-input"]', 'newuser@test.com');
    await page.fill('[data-testid="register-password-input"]', '12');
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
    await expect(page.locator('[data-testid="register-error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-error-message"]')).toContainText('at least 6 characters');
  });
});
