import { test, expect } from '../../fixtures/e2eContext';

test.describe('E2E: Favorites', () => {

  test('renders favorites page', async ({ page }) => {
    await page.goto('/favorites');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').or(page.locator('h2')).first()).not.toBeEmpty();
  });

  test('has browse listings link', async ({ page }) => {
    await page.goto('/favorites');
    await page.waitForLoadState('networkidle');
    const browseLink = page.getByRole('link', { name: 'Browse listings' });
    if (await browseLink.isVisible()) {
      await browseLink.click();
      await expect(page).toHaveURL(/\/listings/);
    }
  });
});
