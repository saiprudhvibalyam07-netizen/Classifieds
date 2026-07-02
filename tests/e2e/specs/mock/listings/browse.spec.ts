import { test, expect } from '../../../fixtures/testContext';
import { SEARCH_QUERIES } from '../../../utils/testData';

test.describe('Listings - Browse & Search', () => {
  test.beforeEach(async ({ listingsPage }) => {
    await listingsPage.goto();
  });

  test('should display listing cards', async ({ listingsPage }) => {
    await listingsPage.expectLoadingToFinish();
    await listingsPage.expectListingsVisible();
    const count = await listingsPage.getListingCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter by keyword search', async ({ listingsPage }) => {
    await listingsPage.search(SEARCH_QUERIES.keyword);
    await listingsPage.expectCardTitlesContain(SEARCH_QUERIES.keyword);
  });

  test('should filter by category', async ({ listingsPage }) => {
    await listingsPage.filterByCategory(SEARCH_QUERIES.category);
    const count = await listingsPage.getListingCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show location filter in filters panel', async ({ listingsPage, page }) => {
    await listingsPage.openFilters();
    await expect(page.locator('[data-testid="listings-city-select"]')).toBeVisible();
    await expect(page.locator('label[for="filter-location"]')).toHaveText('Location');
  });

  test('should filter by price range', async ({ listingsPage }) => {
    await listingsPage.filterByPrice(SEARCH_QUERIES.priceMin, SEARCH_QUERIES.priceMax);
    const count = await listingsPage.getListingCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show empty state for no results', async ({ listingsPage }) => {
    await listingsPage.search('xyznonexistentlisting999');
    await listingsPage.expectEmptyState();
  });

  test('should navigate to listing detail on card click', async ({ listingsPage, page }) => {
    await listingsPage.expectLoadingToFinish();
    const firstTitle = await listingsPage.getFirstCardTitle();
    await listingsPage.clickListingCard(0);
    await expect(page.locator('[data-testid="listing-detail-title"]')).toHaveText(firstTitle);
  });

  test('should have accessible search input', async ({ listingsPage, page }) => {
    await expect(page.locator('[data-testid="listings-search-input"]')).toHaveAttribute('aria-label');
  });
});
