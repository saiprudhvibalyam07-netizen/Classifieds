import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Global teardown: cleaning up test artifacts...');
}

export default globalTeardown;
