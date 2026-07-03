import { Page, expect } from '@playwright/test';

export class AdminPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('networkidle');
  }

  async expectAdminPanelVisible() {
    await expect(this.page.locator('h1')).toHaveText('Admin Panel');
  }

  async expectAccessDenied() {
    await expect(this.page.locator('h1')).toHaveText('403');
    await expect(this.page.getByText('Access Denied')).toBeVisible();
  }

  async expectRedirectedFromAdmin() {
    await this.page.waitForURL(/\/access-denied|\//);
  }
}
