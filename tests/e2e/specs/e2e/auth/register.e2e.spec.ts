import { test, expect } from '../../../fixtures/noAuthContext';
import { TEST_USERS } from '../../../utils/testData';

test.describe('E2E: Registration', () => {

  test('renders registration form with all fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('[data-testid="register-name-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-submit-button"]')).toBeVisible();
  });

  test('shows success or error for already registered email', async ({ page }) => {
    await page.goto('/register');
    await page.locator('[data-testid="register-name-input"]').fill('Test User');
    await page.locator('[data-testid="register-email-input"]').fill(TEST_USERS.buyer.email);
    await page.locator('[data-testid="register-password-input"]').fill('SomePass123!');
    await page.locator('[data-testid="register-submit-button"]').click();
    await page.waitForLoadState('networkidle');
    const errorEl = page.locator('[data-testid="register-error-message"]');
    const successEl = page.getByText('Account Created Successfully');
    await expect(errorEl.or(successEl).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows password too short error', async ({ page }) => {
    await page.goto('/register');
    await page.locator('[data-testid="register-name-input"]').fill('Test User');
    await page.locator('[data-testid="register-email-input"]').fill('newuser@test.com');
    await page.locator('[data-testid="register-password-input"]').fill('12');
    await page.locator('[data-testid="register-password-input"]').evaluate(el => el.removeAttribute('minLength'));
    await page.locator('[data-testid="register-submit-button"]').click();
    await expect(page.locator('[data-testid="register-error-message"]')).toBeVisible({ timeout: 5000 });
  });

  test('navigates to login from sign in link', async ({ page }) => {
    await page.goto('/register');
    const signInLink = page.getByRole('link', { name: /Sign in/i }).first();
    await expect(signInLink).toBeVisible();
    await signInLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
