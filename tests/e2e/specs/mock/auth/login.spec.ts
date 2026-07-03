import { test, expect } from '../../../fixtures/testContext';
import { TEST_USERS } from '../../../utils/testData';

test.describe('Authentication - Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('should render the login form', async ({ loginPage, page }) => {
    await expect(page.locator('h1')).toHaveText('Sign In');
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit-button"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    await loginPage.login('wrong@email.com', 'wrongpassword');
    await loginPage.expectErrorMessage('Invalid email or password. Please try again.');
  });

  test('should not submit form with empty email', async ({ loginPage, page }) => {
    await loginPage.login('', TEST_USERS.buyer.password);
    await expect(page.locator('[data-testid="login-error-message"]')).not.toBeVisible();
  });

  test('should not submit form with empty password', async ({ loginPage, page }) => {
    await loginPage.login(TEST_USERS.buyer.email, '');
    await expect(page.locator('[data-testid="login-error-message"]')).not.toBeVisible();
  });

  test('should navigate to register page', async ({ loginPage, page }) => {
    await loginPage.clickRegisterLink();
    await expect(page).toHaveURL(/\/register/);
  });

  test('should have sign in heading and form fields', async ({ loginPage, page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit-button"]')).toBeVisible();
  });

  test('should show email confirmation required error for unconfirmed emails', async ({ loginPage, page }) => {
    // Intercept the auth request to simulate email_not_confirmed error
    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'email_not_confirmed',
          error_description: 'Email not confirmed',
          message: 'Email not confirmed',
        }),
      });
    });

    await loginPage.goto();
    await loginPage.login('unconfirmed@test.com', 'somepassword');
    await loginPage.expectErrorMessage('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
  });
});
