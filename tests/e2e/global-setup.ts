import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Global setup: verifying environment variables...');
  const required = ['BASE_URL', 'TEST_BUYER_EMAIL', 'TEST_BUYER_PASSWORD'];
  for (const env of required) {
    if (!process.env[env]) {
      console.warn(`Warning: ${env} is not set. Tests may fail.`);
    }
  }
  console.log('Global setup complete.');
}

export default globalSetup;
