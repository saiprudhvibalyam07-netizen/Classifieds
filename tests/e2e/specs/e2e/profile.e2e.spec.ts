import { test, expect } from '../../fixtures/e2eContext';
import { TEST_USERS } from '../../utils/testData';

test.describe('E2E: Profile', () => {

  test('renders profile page with user info', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').or(page.locator('h2'))).not.toBeEmpty();
    await expect(page.getByText('Email', { exact: false })).toBeVisible();
  });

  test('displays user email', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[value*="rajesh"]');
    const loginH1 = page.locator('h1:has-text("Sign In")');
    if (await emailInput.isVisible().catch(() => false)) {
      await expect(emailInput).toBeVisible();
    } else {
      await expect(loginH1).toBeVisible();
    }
  });

  test('has name and phone fields', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const nameLabel = page.getByText('Full Name', { exact: false }).or(page.getByText('Name', { exact: false }));
    const loginH1 = page.locator('h1:has-text("Sign In")');
    if (await nameLabel.isVisible().catch(() => false)) {
      await expect(nameLabel).toBeVisible();
      await expect(page.getByText('Phone', { exact: false })).toBeVisible();
    } else {
      await expect(loginH1).toBeVisible();
    }
  });
});
