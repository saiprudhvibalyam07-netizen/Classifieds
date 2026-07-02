import { Page } from '@playwright/test';

export async function realLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForSelector('[data-testid="login-email-input"]', { timeout: 10000 });
  await page.fill('[data-testid="login-email-input"]', email);
  await page.fill('[data-testid="login-password-input"]', password);
  await page.click('[data-testid="login-submit-button"]');
  // Wait for successful login — user menu appears
  await page.waitForSelector('[data-testid="navbar-user-menu"]', { timeout: 15000 });
}

export async function realLogout(page: Page) {
  await page.goto('/');
  const userMenu = page.locator('[data-testid="navbar-user-menu"]');
  if (await userMenu.isVisible().catch(() => false)) {
    await userMenu.click();
    const logoutBtn = page.locator('[data-testid="navbar-logout-button"]');
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForLoadState('networkidle');
    }
  }
}
