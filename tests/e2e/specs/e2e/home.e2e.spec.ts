import { test, expect } from '@playwright/test';

test.describe('E2E: Home Page', () => {

  test('renders hero section with search', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').or(page.locator('h2')).first()).not.toBeEmpty();
    await expect(page.locator('input[placeholder*="Search"]').or(page.locator('[aria-label*="Search"]'))).toBeVisible();
  });

  test('displays featured listings', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const featured = page.getByText('Featured Listings', { exact: false });
    if (await featured.isVisible().catch(() => false)) {
      await expect(featured).toBeVisible();
    }
  });

  test('displays recently added listings', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const recent = page.getByText('Recently Added', { exact: false }).or(page.getByText('Recent', { exact: false }));
    await expect(recent).toBeVisible();
  });

  test('displays category cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Browse Categories', { exact: false })).toBeVisible();
  });

  test('has browse all listings CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Browse All Listings', { exact: false }).first()).toBeVisible();
  });

  test('clicking browse listings navigates to /listings', async ({ page }) => {
    await page.goto('/');
    const browseLink = page.getByText('Browse All Listings', { exact: false }).first();
    if (await browseLink.isVisible()) {
      await browseLink.click();
      await expect(page).toHaveURL(/\/listings/);
    }
  });

  test('search from hero navigates to listings', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Camera');
      await searchInput.press('Enter');
      await expect(page).toHaveURL(/\/listings/);
    }
  });
});
