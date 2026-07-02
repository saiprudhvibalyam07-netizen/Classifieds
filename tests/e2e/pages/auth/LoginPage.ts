import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  private emailInput = () => this.page.locator('[data-testid="login-email-input"]');
  private passwordInput = () => this.page.locator('[data-testid="login-password-input"]');
  private submitButton = () => this.page.locator('[data-testid="login-submit-button"]');
  private errorMessage = () => this.page.locator('[data-testid="login-error-message"]');
  private googleButton = () => this.page.locator('[data-testid="login-google-button"]');
  private registerLink = () => this.page.locator('[data-testid="login-register-link"]');

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForSelector('[data-testid="login-email-input"]');
  }

  async login(email: string, password: string) {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.submitButton().click();
  }

  async expectLoginSuccess() {
    await expect(this.page.locator('[data-testid="navbar-user-menu"]')).toBeVisible({ timeout: 10000 });
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage()).toHaveText(message);
  }

  async expectEmailValidationError() {
    await expect(this.emailInput()).toHaveAttribute('aria-invalid', 'true');
  }

  async clickGoogleOAuth() {
    await this.googleButton().click();
  }

  async clickRegisterLink() {
    await this.registerLink().click();
    await expect(this.page.locator('[data-testid="register-name-input"]')).toBeVisible();
  }
}
