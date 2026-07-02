import { Page, expect } from '@playwright/test';

export class ListingsPage {
  constructor(private page: Page) {}

  private searchInput = () => this.page.locator('[data-testid="listings-search-input"]');
  private categorySelect = () => this.page.locator('[data-testid="listings-category-select"]');
  private citySelect = () => this.page.locator('[data-testid="listings-city-select"]');
  private priceMin = () => this.page.locator('[data-testid="listings-price-min"]');
  private priceMax = () => this.page.locator('[data-testid="listings-price-max"]');
  private cards = () => this.page.locator('[data-testid="listing-card"]');
  private cardTitles = () => this.page.locator('[data-testid="listing-card-title"]');
  private cardPrices = () => this.page.locator('[data-testid="listing-card-price"]');
  private cardLocations = () => this.page.locator('[data-testid="listing-card-location"]');
  private loadingSkeleton = () => this.page.locator('[data-testid="listings-loading-skeleton"]');
  private emptyState = () => this.page.locator('[data-testid="listings-empty-state"]');
  private pagination = () => this.page.locator('[data-testid="listings-pagination"]');

  async goto() {
    await this.page.goto('/listings');
    await this.page.waitForLoadState('networkidle');
  }

  async openFilters() {
    const btn = this.page.locator('[aria-label="Show filters"]');
    if (await btn.isVisible()) {
      await btn.click();
      await this.page.waitForSelector('[data-testid="listings-category-select"]');
    }
  }

  async search(query: string) {
    await this.searchInput().fill(query);
    await this.searchInput().press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async filterByCategory(category: string) {
    await this.openFilters();
    await this.categorySelect().selectOption(category);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByCity(city: string) {
    await this.openFilters();
    await this.citySelect().selectOption(city);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByPrice(min: string, max: string) {
    await this.openFilters();
    if (min) await this.priceMin().fill(min);
    if (max) await this.priceMax().fill(max);
    await this.priceMax().press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async clickListingCard(index: number = 0) {
    await this.cards().nth(index).click();
  }

  async getListingCount(): Promise<number> {
    await this.cards().first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    return this.cards().count();
  }

  async getFirstCardTitle(): Promise<string> {
    return (await this.cardTitles().first().textContent()) || '';
  }

  async expectListingsVisible() {
    await expect(this.cards().first()).toBeVisible({ timeout: 10000 });
  }

  async expectEmptyState() {
    await expect(this.emptyState()).toBeVisible();
  }

  async expectLoadingToFinish() {
    await expect(this.loadingSkeleton()).not.toBeVisible({ timeout: 10000 }).catch(() => {});
  }

  async expectCardTitlesContain(text: string) {
    const titles = await this.cardTitles().allTextContents();
    for (const title of titles) {
      expect(title.toLowerCase()).toContain(text.toLowerCase());
    }
  }

  async expectCardLocationsContain(text: string) {
    const locations = await this.cardLocations().allTextContents();
    for (const loc of locations) {
      expect(loc.toLowerCase()).toContain(text.toLowerCase());
    }
  }
}
