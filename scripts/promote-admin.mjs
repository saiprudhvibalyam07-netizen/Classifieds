import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
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

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/promote-admin.mjs <email>');
    process.exit(1);
  }

  const env = loadEnv();
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL is required');
  if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY is required');

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Check if the user exists in profiles
  const { data: profile, error: lookupError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('email', email)
    .single();

  if (lookupError) {
    console.error(`Error: No user found with email "${email}"`);
    console.error(lookupError.message);
    process.exit(1);
  }

  if (profile.role === 'admin') {
    console.log(`User "${email}" is already an admin.`);
    process.exit(0);
  }

  // Promote using the database function
  const { data, error } = await supabase.rpc('promote_to_admin', {
    target_email: email,
  });

  if (error) {
    console.error(`Failed to promote user: ${error.message}`);
    process.exit(1);
  }

  console.log(`Successfully promoted "${email}" to admin.`);
  console.log(`Profile ID: ${data}`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
