import { Page } from '@playwright/test';

const MOCK_ADMIN_ID = '00000000-0000-0000-0000-000000000042';

const now = new Date().toISOString();

const MOCK_ADMIN_USER = {
  id: MOCK_ADMIN_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'admin@test.com',
  email_confirmed_at: now,
  phone: '',
  confirmed_at: now,
  last_sign_in_at: now,
  app_metadata: { provider: 'email' },
  user_metadata: { full_name: 'Test Admin' },
  identities: [],
  created_at: now,
  updated_at: now,
};

function buildSessionData() {
  return JSON.stringify({
    access_token: 'mock-admin-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock-admin-refresh-token',
    user: MOCK_ADMIN_USER,
    provider_token: null,
  });
}

export async function mockAdminAuth(page: Page) {
  const sessionData = buildSessionData();

  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: sessionData });
  });

  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ADMIN_USER) });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: MOCK_ADMIN_ID,
          full_name: 'Test Admin',
          email: 'admin@test.com',
          role: 'admin',
          phone: '+91-9876543210',
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      ]),
    });
  });

  await page.route('**/rest/v1/user_presence*', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route('**/rest/v1/notification_events*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route('**/storage/v1/object/*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  await page.goto('/');
  await page.evaluate((data: string) => {
    localStorage.setItem('sb-seqzkrwgpshqinsjhxwh-auth-token', data);
  }, sessionData);
  await page.reload();
  await page.waitForSelector('[data-testid="navbar-user-menu"]', { timeout: 10000 });
}
