import { test, expect } from '../../../fixtures/testContext';
import { mockSupabaseAuth } from '../../../utils/mockAuth';

test.describe('Admin Access', () => {
  test('should show admin nav link for admin users', async ({ page }) => {
    await mockSupabaseAuth(page, { role: 'admin' });
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: 'Admin' }).first()).toBeVisible({ timeout: 15000 });
  });

  test('should redirect non-admin user away from /admin', async ({ page }) => {
    await mockSupabaseAuth(page);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/access-denied|\//);
  });

  test('should allow admin user to access /admin', async ({ page }) => {
    await mockSupabaseAuth(page, { role: 'admin' });
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Admin Panel');
  });
});
