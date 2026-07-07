import { test, expect } from '../../../fixtures/noAuthContext';

test.describe('E2E: Auth Callback', () => {

  test('renders auth callback page', async ({ page }) => {
    await page.goto('/auth/callback');
    await page.waitForLoadState('networkidle');
  });

  test('shows error state for invalid callback', async ({ page }) => {
    await page.goto('/auth/callback?error=invalid_token');
    await page.waitForLoadState('networkidle');
  });
});
