import { test, expect } from '../../../fixtures/adminContext';

test.describe('E2E: Admin Panel Access', () => {
  test('should allow admin user to access admin panel', async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.expectAdminPanelVisible();
  });

  test('should show Admin link in navigation for admin', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: 'Admin' }).first()).toBeVisible();
  });
});
