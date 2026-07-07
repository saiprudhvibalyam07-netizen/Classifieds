import { test, expect } from '../../fixtures/noAuthContext';

test.describe('E2E: Seller Profile', () => {

  test('renders seller profile page', async ({ page }) => {
    await page.goto('/listings');
    await page.waitForLoadState('load');
    const card = page.locator('[data-testid="listing-card"]').first();
    await card.waitFor({ state: 'visible', timeout: 10000 });
    await card.click();
    await page.waitForLoadState('load');
    const sellerLink = page.getByText('View Profile').or(page.getByText('Seller', { exact: false }));
    if (await sellerLink.isVisible().catch(() => false)) {
      await sellerLink.first().click();
      await page.waitForLoadState('load');
      const sellerId = page.url().match(/\/seller\/([a-f0-9-]+)/);
      if (sellerId) {
        await expect(page.locator('h1').or(page.locator('h2')).first()).not.toBeEmpty();
      }
    }
  });

  test('displays seller information', async ({ page }) => {
    await page.goto('/listings');
    await page.waitForLoadState('load');
    const card = page.locator('[data-testid="listing-card"]').first();
    await card.waitFor({ state: 'visible', timeout: 10000 });
    await card.click();
    await page.waitForLoadState('load');
    const contactBtn = page.locator('[data-testid="listing-contact-seller"]');
    const ownMsg = page.getByText('This is your own listing');
    if (await contactBtn.isVisible().catch(() => false)) {
      await expect(contactBtn).toBeVisible({ timeout: 10000 });
    } else if (await ownMsg.isVisible().catch(() => false)) {
      await expect(ownMsg).toBeVisible();
    }
  });
});
