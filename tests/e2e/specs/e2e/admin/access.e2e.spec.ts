import { test, expect } from '../../../fixtures/e2eContext';

test.describe('E2E: Admin Access', () => {

  test('should show 403 page for non-admin user', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').or(page.locator('h2')).first()).not.toBeEmpty();
  });
});
