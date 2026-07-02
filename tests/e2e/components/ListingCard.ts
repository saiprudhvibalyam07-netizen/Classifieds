import { Page, expect } from '@playwright/test';

export class ListingCard {
  constructor(private page: Page) {}

  private card(index: number) {
    return this.page.locator('[data-testid="listing-card"]').nth(index);
  }

  private title(index: number) {
    return this.card(index).locator('[data-testid="listing-card-title"]');
  }

  private price(index: number) {
    return this.card(index).locator('[data-testid="listing-card-price"]');
  }

  private location(index: number) {
    return this.card(index).locator('[data-testid="listing-card-location"]');
  }

  private image(index: number) {
    return this.card(index).locator('[data-testid="listing-card-image"]');
  }

  async clickCard(index: number = 0) {
    await this.card(index).click();
  }

  async getTitle(index: number = 0): Promise<string> {
    return (await this.title(index).textContent()) || '';
  }

  async getPrice(index: number = 0): Promise<string> {
    return (await this.price(index).textContent()) || '';
  }

  async getLocation(index: number = 0): Promise<string> {
    return (await this.location(index).textContent()) || '';
  }

  async expectCardVisible(index: number = 0) {
    await expect(this.card(index)).toBeVisible();
  }

  async expectTitleContains(index: number, text: string) {
    await expect(this.title(index)).toContainText(text);
  }

  async expectPriceContains(index: number, text: string) {
    await expect(this.price(index)).toContainText(text);
  }

  async expectImageLoaded(index: number = 0) {
    const img = this.image(index);
    await expect(img).toBeVisible();
    const nat = await img.getAttribute('naturalWidth');
    expect(nat).not.toBe('0');
  }
}
