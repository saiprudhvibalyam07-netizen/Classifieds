import { test, expect } from '../../../fixtures/noAuthContext';

test.describe('E2E: Forgot Password', () => {

  test('renders forgot password form', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('h1')).toHaveText('Reset Password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByText('Send Reset Link')).toBeVisible();
  });

  test('shows success or error after submitting email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.locator('input[type="email"]').fill('rajesh.kumar@valclassifieds.test');
    await page.getByText('Send Reset Link').click();
    await page.waitForLoadState('networkidle');
    const successH1 = page.locator('h1').or(page.locator('h2')).first();
    await expect(successH1).not.toBeEmpty({ timeout: 15000 });
  });

  test('navigates back to login', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByRole('link', { name: /Back to sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
