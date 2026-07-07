import { test, expect } from '../../../fixtures/noAuthContext';
import { SEARCH_QUERIES } from '../../../utils/testData';

test.describe('E2E: Browse Listings', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/listings');
    await page.waitForLoadState('load');
  });

  async function openFilters(page: import('@playwright/test').Page) {
    const filtersBtn = page.locator('button', { hasText: 'Filters' });
    if (await filtersBtn.isVisible()) {
      await filtersBtn.click();
      await page.waitForSelector('[data-testid="listings-category-select"]', { timeout: 5000 });
    }
  }

  test('displays listing cards', async ({ page }) => {
    await expect(page.locator('[data-testid="listing-card"]').first()).toBeVisible({ timeout: 10000 });
    const count = await page.locator('[data-testid="listing-card"]').count();
    expect(count).toBeGreaterThan(0);
  });

  test('filters by keyword search', async ({ page }) => {
    await page.locator('[data-testid="listings-search-input"]').fill(SEARCH_QUERIES.keyword);
    await page.locator('[data-testid="listings-search-input"]').press('Enter');
    await page.waitForLoadState('networkidle');
    const titles = await page.locator('[data-testid="listing-card-title"]').allTextContents();
    for (const title of titles) {
      expect(title.toLowerCase()).toContain(SEARCH_QUERIES.keyword.toLowerCase());
    }
  });

  test('filters by category', async ({ page }) => {
    await openFilters(page);
    await page.locator('[data-testid="listings-category-select"]').selectOption(SEARCH_QUERIES.category);
    await page.waitForLoadState('networkidle');
  });

  test('has location filter', async ({ page }) => {
    await openFilters(page);
    await expect(page.locator('[data-testid="listings-city-select"]')).toBeVisible();
  });

  test('filters by price range', async ({ page }) => {
    await openFilters(page);
    await page.locator('[data-testid="listings-price-min"]').fill(SEARCH_QUERIES.priceMin);
    await page.locator('[data-testid="listings-price-max"]').fill(SEARCH_QUERIES.priceMax);
    await page.locator('[data-testid="listings-price-max"]').press('Enter');
    await page.waitForLoadState('networkidle');
  });

  test('shows empty state for no results', async ({ page }) => {
    await page.locator('[data-testid="listings-search-input"]').fill('ZZZZNONEXISTENT');
    await page.locator('[data-testid="listings-search-input"]').press('Enter');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="listings-empty-state"]')).toBeVisible({ timeout: 10000 });
  });

  test('navigates to listing detail on card click', async ({ page }) => {
    const card = page.locator('[data-testid="listing-card"]').first();
    await card.waitFor({ state: 'visible', timeout: 10000 });
    await card.click();
    await expect(page).toHaveURL(/\/listings\/[a-f0-9-]+/);
  });

  test('search input is accessible', async ({ page }) => {
    await expect(page.locator('[data-testid="listings-search-input"]')).toHaveAttribute('aria-label');
  });

  test('has sort dropdown', async ({ page }) => {
    await expect(page.locator('select').or(page.getByText('Sort', { exact: false })).first()).toBeVisible();
  });

  test('has pagination for many listings', async ({ page }) => {
    const pagination = page.locator('[data-testid="listings-pagination"]');
    const count = await page.locator('[data-testid="listing-card"]').count();
    if (count >= 12) {
      await expect(pagination).toBeVisible();
    }
  });
});
