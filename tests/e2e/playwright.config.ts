import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  globalSetup: path.resolve(__dirname, 'global-setup.ts'),
  globalTeardown: path.resolve(__dirname, 'global-teardown.ts'),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
