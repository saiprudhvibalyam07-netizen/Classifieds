import { test as base } from '@playwright/test';
import { AdminPage } from '../pages/admin/AdminPage';
import { realLogin } from '../utils/realAuth';
import { TEST_USERS } from '../utils/testData';

type MyFixtures = {
  adminPage: AdminPage;
};

export const test = base.extend<MyFixtures>({
  adminPage: async ({ page }, use) => {
    await use(new AdminPage(page));
  },
});

// Auto-login as admin before each test
test.beforeEach(async ({ page }) => {
  await realLogin(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
});

export { expect } from '@playwright/test';
