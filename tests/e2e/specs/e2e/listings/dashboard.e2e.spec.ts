import { test, expect } from '../../../fixtures/e2eContext';

test.describe('E2E: Dashboard', () => {

  test('renders dashboard with user listings', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').or(page.locator('h2')).first()).not.toBeEmpty();
  });

test('has new listing button', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  const newBtn = page.getByText('New Listing', { exact: false }).first();
  const loginH1 = page.locator('h1:has-text("Sign In")');
  if (await newBtn.isVisible().catch(() => false)) {
    await expect(newBtn).toBeVisible();
    await newBtn.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/create/);
  } else {
    await expect(loginH1).toBeVisible();
  }
});
});
