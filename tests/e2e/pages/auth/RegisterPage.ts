import { Page, expect } from '@playwright/test';

export class RegisterPage {
  constructor(private page: Page) {}

  private nameInput = () => this.page.locator('[data-testid="register-name-input"]');
  private emailInput = () => this.page.locator('[data-testid="register-email-input"]');
  private passwordInput = () => this.page.locator('[data-testid="register-password-input"]');
  private submitButton = () => this.page.locator('[data-testid="register-submit-button"]');
  private successLoginLink = () => this.page.locator('[data-testid="register-success-login-link"]');

  async goto() {
    await this.page.goto('/register');
    await this.page.waitForSelector('[data-testid="register-name-input"]');
  }

  async register(name: string, email: string, password: string) {
    await this.nameInput().fill(name);
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.submitButton().click();
  }

  async expectRegistrationSuccess() {
    await expect(this.page.locator('h1')).toHaveText('Account Created Successfully');
    await expect(this.successLoginLink()).toBeVisible();
  }
}
