import { Page, expect } from '@playwright/test';

export class Navbar {
  constructor(private page: Page) {}

  private logo = () => this.page.locator('[data-testid="navbar-logo"]');
  private searchInput = () => this.page.locator('[data-testid="navbar-search-input"]');
  private loginLink = () => this.page.locator('[data-testid="navbar-login-link"]');
  private userMenu = () => this.page.locator('[data-testid="navbar-user-menu"]');
  private logoutButton = () => this.page.locator('[data-testid="navbar-logout-button"]');
  private mobileToggle = () => this.page.locator('[data-testid="navbar-mobile-toggle"]');
  private createListingButton = () => this.page.locator('[data-testid="navbar-create-listing"]');

  async clickLogo() {
    await this.logo().click();
  }

  async search(query: string) {
    await this.searchInput().fill(query);
    await this.searchInput().press('Enter');
  }

  async clickLogin() {
    await this.loginLink().click();
  }

  async clickLogout() {
    await this.userMenu().click();
    await this.logoutButton().click();
  }

  async clickCreateListing() {
    await this.createListingButton().click();
  }

  async expectLoggedIn(username: string) {
    await expect(this.userMenu()).toBeVisible();
    await expect(this.userMenu()).toContainText(username);
  }

  async expectLoggedOut() {
    await expect(this.loginLink()).toBeVisible();
  }

  async isMobileMenuVisible(): Promise<boolean> {
    return this.mobileToggle().isVisible();
  }
}
