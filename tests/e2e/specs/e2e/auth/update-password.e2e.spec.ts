import { test, expect } from '../../../fixtures/e2eContext';

test.describe('E2E: Update Password', () => {

  test('renders update password form for authenticated user', async ({ page }) => {
    await page.goto('/update-password');
    await page.waitForLoadState('networkidle');
    const h1 = page.locator('h1').or(page.locator('h2')).first();
    await expect(h1).not.toBeEmpty();
  });
});
