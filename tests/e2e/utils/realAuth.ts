import { Page } from '@playwright/test';

export async function realLogin(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'load' });
  const emailInput = page.locator('[data-testid="login-email-input"]');
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(email);
    await page.fill('[data-testid="login-password-input"]', password);
    await page.click('[data-testid="login-submit-button"]');
  }
  await page.waitForSelector('[data-testid="navbar-user-menu"]', { timeout: 20000 });
}

export async function realLogout(page: Page) {
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
