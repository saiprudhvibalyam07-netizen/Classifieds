import { test, expect } from '../../../fixtures/adminContext';

test.describe('E2E: Admin Panel', () => {

  test('should allow admin user to access admin panel', async ({ adminPage }) => {
    await adminPage.goto();
    await adminPage.expectAdminPanelVisible();
  });

  test('should show Admin link in navigation for admin', async ({ page, adminPage }) => {
    await adminPage.goto();
    await adminPage.expectAdminPanelVisible();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const adminLink = page.getByText('Admin').first();
    await expect(adminLink).toBeVisible();
  });

  test('should display pending listings tab', async ({ adminPage, page }) => {
    await adminPage.goto();
    const pendingTab = page.getByRole('button', { name: 'Pending' });
    await expect(pendingTab).toBeVisible();
  });

  test('should display users tab', async ({ adminPage, page }) => {
    await adminPage.goto();
    const usersTab = page.getByRole('button', { name: /Users/i });
    await expect(usersTab).toBeVisible();
  });

  test('should display listings tab', async ({ adminPage, page }) => {
    await adminPage.goto();
    const listingsTab = page.getByRole('button', { name: /Listings/i });
    await expect(listingsTab).toBeVisible();
  });
});
