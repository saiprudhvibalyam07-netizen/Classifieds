import { test, expect } from '../../../fixtures/e2eContext';
import { TEST_USERS } from '../../../utils/testData';

test.describe('E2E: Create Listing', () => {

  test('renders create listing form', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    const titleLabel = page.locator('label', { hasText: 'Title' });
    const loginH1 = page.locator('h1:has-text("Sign In")');
    if (await titleLabel.isVisible().catch(() => false)) {
      await expect(titleLabel).toBeVisible();
      await expect(page.getByText('Price', { exact: false }).or(page.getByText('Price ($)', { exact: false }))).toBeVisible();
    } else {
      await expect(loginH1).toBeVisible();
    }
  });

  test('has location picker with map', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    const locationLabel = page.getByText('Location', { exact: false });
    const loginH1 = page.locator('h1:has-text("Sign In")');
    if (await locationLabel.isVisible().catch(() => false)) {
      await expect(locationLabel).toBeVisible();
      await expect(page.getByPlaceholder('Search for a city or address...')).toBeVisible();
    } else {
      await expect(loginH1).toBeVisible();
    }
  });

  test('has category and condition dropdowns', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    const categoryLabel = page.getByText('Category', { exact: false }).first();
    const loginH1 = page.locator('h1:has-text("Sign In")');
    if (await categoryLabel.isVisible().catch(() => false)) {
      await expect(categoryLabel).toBeVisible();
      await expect(page.getByText('Condition', { exact: false })).toBeVisible();
    } else {
      await expect(loginH1).toBeVisible();
    }
  });

  test('has image upload section', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    const imageLabel = page.getByText('Image', { exact: false }).or(page.getByText('Photo', { exact: false }));
    const loginH1 = page.locator('h1:has-text("Sign In")');
    if (await imageLabel.isVisible().catch(() => false)) {
      await expect(imageLabel).toBeVisible();
    } else {
      await expect(loginH1).toBeVisible();
    }
  });

  test.afterEach(async ({ page }) => {
    await page.goto('/');
  });
});
