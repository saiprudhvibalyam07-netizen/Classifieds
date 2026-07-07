import { test, expect } from '../../../fixtures/noAuthContext';
import { TEST_USERS } from '../../../utils/testData';

test.describe('E2E: Login', () => {

  test('renders login form with all fields', async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage['emailInput']()).toBeVisible();
    await expect(loginPage['passwordInput']()).toBeVisible();
    await expect(loginPage['submitButton']()).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('wrong@email.com', 'wrongpass');
    await expect(loginPage['errorMessage']()).toBeVisible({ timeout: 10000 });
  });

  test('does not submit with empty email', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage['passwordInput']().fill('somepass');
    await loginPage['submitButton']().click();
    await expect(loginPage['errorMessage']()).not.toBeVisible();
  });

  test('does not submit with empty password', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage['emailInput']().fill('test@test.com');
    await loginPage['submitButton']().click();
    await expect(loginPage['errorMessage']()).not.toBeVisible();
  });

  test('navigates to register page', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.clickRegisterLink();
  });

  test('logs in successfully with valid buyer credentials', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(TEST_USERS.buyer.email, TEST_USERS.buyer.password);
    await loginPage.expectLoginSuccess();
  });

  test('shows email confirmation success banner', async ({ page }) => {
    await page.goto('/login?confirmed=true');
    await expect(page.locator('[data-testid="login-confirmed-banner"]')).toBeVisible();
  });

  test('has forgot password link', async ({ page }) => {
    await page.goto('/login');
    const link = page.getByText('Forgot your password?');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('navigates to auth callback page', async ({ page }) => {
    await page.goto('/auth/callback');
    await expect(page.locator('h2')).not.toBeEmpty();
  });
});
