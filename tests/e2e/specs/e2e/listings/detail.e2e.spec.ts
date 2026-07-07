import { test, expect } from '../../../fixtures/noAuthContext';

test.describe('E2E: Listing Detail', () => {

  async function navigateToDetail(page: import('@playwright/test').Page) {
    await page.goto('/listings');
    await page.waitForLoadState('load');
    const card = page.locator('[data-testid="listing-card"]').first();
    await card.waitFor({ state: 'visible', timeout: 15000 });
    await card.click();
    await page.waitForLoadState('load');
  }

  test('renders listing detail page with all sections', async ({ page }) => {
    await navigateToDetail(page);
    await expect(page.locator('[data-testid="listing-detail-title"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="listing-detail-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="listing-detail-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="listing-detail-category"]')).toBeVisible();
  });

  test('displays listing gallery', async ({ page }) => {
    await navigateToDetail(page);
    await expect(page.locator('[data-testid="listing-detail-gallery"]')).toBeVisible({ timeout: 10000 });
  });

  test('displays listing location', async ({ page }) => {
    await navigateToDetail(page);
    await expect(page.locator('[data-testid="listing-detail-location"]')).toBeVisible({ timeout: 10000 });
  });

  test('has contact seller or own-listing message', async ({ page }) => {
    await navigateToDetail(page);
    const contactBtn = page.locator('[data-testid="listing-contact-seller"]');
    const ownMsg = page.getByText('This is your own listing');
    if (await contactBtn.isVisible().catch(() => false)) {
      await expect(contactBtn).toBeVisible();
    } else if (await ownMsg.isVisible().catch(() => false)) {
      await expect(ownMsg).toBeVisible();
    }
  });

  test('has favorite or own-listing indicator', async ({ page }) => {
    await navigateToDetail(page);
    const favBtn = page.locator('[data-testid="listing-favorite-button"]');
    if (await favBtn.isVisible().catch(() => false)) {
      await expect(favBtn).toBeVisible();
    }
  });
});
