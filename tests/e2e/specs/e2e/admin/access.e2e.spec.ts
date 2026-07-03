import { test, expect } from '../../../fixtures/e2eContext';

test.describe('E2E: Admin Access', () => {
  test('should redirect non-admin user away from /admin', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/access-denied/);
  });

  test('should show 403 page for non-admin user', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('403');
    await expect(page.getByText('Access Denied')).toBeVisible();
  });
});
