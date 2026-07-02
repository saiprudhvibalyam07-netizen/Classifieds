import { test, expect } from '../../../fixtures/noAuthContext';

test.describe('E2E: Authentication - Login', () => {
  test('should render the login form', async ({ loginPage, page }) => {
    await loginPage.goto();
    await expect(page.locator('h1')).toHaveText('Sign In');
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit-button"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('wrong@email.com', 'wrongpassword');
    await loginPage.expectErrorMessage('Invalid login credentials');
  });

  test('should not submit form with empty email', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login('', 'somepassword');
    await expect(page.locator('[data-testid="login-error-message"]')).not.toBeVisible();
  });

  test('should not submit form with empty password', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login('test@test.com', '');
    await expect(page.locator('[data-testid="login-error-message"]')).not.toBeVisible();
  });

  test('should navigate to register page', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.clickRegisterLink();
    await expect(page).toHaveURL(/\/register/);
  });

  test('should have sign in heading and form fields', async ({ loginPage, page }) => {
    await loginPage.goto();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit-button"]')).toBeVisible();
  });

  test('should log in successfully with valid credentials', async ({ loginPage }) => {
    await loginPage.goto();
    const email = process.env.TEST_BUYER_EMAIL || 'rajesh.kumar@valclassifieds.test';
    const password = process.env.TEST_BUYER_PASSWORD || 'Rajesh#99Kumar';
    await loginPage.login(email, password);
    await loginPage.expectLoginSuccess();
  });
});
