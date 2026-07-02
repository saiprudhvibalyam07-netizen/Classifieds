import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, 'utf-8').split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .map(l => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
}

const env = loadEnv();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL is required');
if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY is required');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const USERS_PATH = resolve(ROOT, 'mock-data/users.json');
const users = JSON.parse(readFileSync(USERS_PATH, 'utf-8'));

const report = {
  started_at: new Date().toISOString(),
  total_in_file: users.length,
  processed: 0,
  created: 0,
  skipped_empty_password: 0,
  already_exists: 0,
  errors: [],
  warnings: [],
};

for (const user of users) {
  if (!user.email) {
    report.warnings.push(`Skipped user with missing email`);
    continue;
  }
  if (!user.password || user.password === '') {
    report.skipped_empty_password++;
    continue;
  }

  report.processed++;
  const payload = {
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      full_name: (user.name || '').replace(/[<>"';&]/g, '').slice(0, 200),
      role: user.role || 'user',
    },
  };
  if (user.id) payload.id = user.id;

  try {
    const { data, error } = await supabase.auth.admin.createUser(payload);

    if (error) {
      if (error.message?.includes('already exists') || error.message?.includes('already been registered') || error.code === 'user_already_exists') {
        report.already_exists++;
        continue;
      }
      if (error.message?.includes('Unexpected token') || error.message?.includes('not valid JSON')) {
        report.warnings.push(`${user.email}: API returned non-JSON (likely name payload issue). Skipping.`);
        continue;
      }
      throw error;
    }

    if (data?.user) {
      report.created++;
    }
  } catch (err) {
    report.errors.push(`${user.email}: ${err.message}`);
  }
}

report.ended_at = new Date().toISOString();
report.elapsed_ms = new Date(report.ended_at).getTime() - new Date(report.started_at).getTime();

console.log(JSON.stringify(report, null, 2));

if (report.errors.length > 0) {
  process.exit(1);
}
