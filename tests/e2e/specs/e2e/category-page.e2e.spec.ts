import { test, expect } from '../../fixtures/noAuthContext';

test.describe('E2E: Category Page', () => {

  test('navigates to category page and shows listings', async ({ page }) => {
    await page.goto('/category/vehicles');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').or(page.locator('h2')).first()).not.toBeEmpty();
  });

  test('shows post ad button on category page', async ({ page }) => {
    await page.goto('/category/vehicles');
    await page.waitForLoadState('networkidle');
    const postBtn = page.getByRole('link', { name: /Post an Ad|Post Ad/i });
    await expect(postBtn.first()).toBeVisible();
  });

  test('renders property category page', async ({ page }) => {
    await page.goto('/category/property');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').or(page.locator('h2')).first()).not.toBeEmpty();
  });

  test('renders jobs category page', async ({ page }) => {
    await page.goto('/category/jobs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').or(page.locator('h2')).first()).not.toBeEmpty();
  });

  test('renders services category page', async ({ page }) => {
    await page.goto('/category/services');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').or(page.locator('h2')).first()).not.toBeEmpty();
  });

  test('renders electronics category page', async ({ page }) => {
    await page.goto('/category/electronics');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').or(page.locator('h2')).first()).not.toBeEmpty();
  });

  test('renders community category page', async ({ page }) => {
    await page.goto('/category/community');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').or(page.locator('h2')).first()).not.toBeEmpty();
  });

  test('has sort dropdown on category page', async ({ page }) => {
    await page.goto('/category/vehicles');
    await page.waitForLoadState('networkidle');
    const sort = page.getByText('Sort', { exact: false }).or(page.locator('select'));
    await expect(sort.first()).toBeVisible();
  });
});
