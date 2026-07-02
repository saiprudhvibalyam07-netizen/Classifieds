import { FullConfig } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function globalSetup(config: FullConfig) {
  // Load .env.test into process.env
  const envPath = resolve(__dirname, '.env.test');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }

  console.log('Global setup: verifying environment variables...');
  const required = ['BASE_URL', 'TEST_BUYER_EMAIL', 'TEST_BUYER_PASSWORD'];
  for (const env of required) {
    if (!process.env[env]) {
      console.warn(`Warning: ${env} is not set. Tests may fail.`);
    } else {
      console.log(`  ${env}=${process.env[env]}`);
    }
  }
  console.log('Global setup complete.');
}

export default globalSetup;
