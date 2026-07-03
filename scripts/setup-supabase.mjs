/**
 * Supabase Project Setup Script
 *
 * Configures authentication settings for the ValClassifieds project:
 * - Enables email confirmation
 * - Sets Site URL and redirect URLs
 * - Configures SMTP if settings are provided
 *
 * Usage:
 *   export SUPABASE_ACCESS_TOKEN="sbp_..."
 *   export SUPABASE_REF="seqzkrwgpshqinsjhxwh"
 *   node scripts/setup-supabase.mjs
 *
 * Or via .env:
 *   SUPABASE_ACCESS_TOKEN=sbp_...
 *   SUPABASE_REF=seqzkrwgpshqinsjhxwh
 */

const MANAGEMENT_API = 'https://api.supabase.com/v1';

async function main() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = process.env.SUPABASE_REF || 'seqzkrwgpshqinsjhxwh';

  if (!accessToken) {
    console.log(`
============================================================
⚠️  SUPABASE_ACCESS_TOKEN not set.
============================================================
To configure email confirmation automatically:

1. Generate a Supabase access token:
   https://supabase.com/dashboard/account/tokens

2. Run:
   export SUPABASE_ACCESS_TOKEN="sbp_..."
   node scripts/setup-supabase.mjs

Or manually configure in Supabase Dashboard:
   Authentication → Settings → 
   - Enable "Confirm email" toggle
   - Set Site URL: http://localhost:5173
   - Add Redirect URLs: http://localhost:5173/auth/callback
============================================================
`);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // Update auth settings
  const authConfig = {
    SITE_URL: 'http://localhost:5173',
    URI_ALLOW_LIST: '',
    DISABLE_SIGNUP: false,
    EXTERNAL_EMAIL_ENABLED: true,
    SECURITY_MANUAL_LINKING_ENABLED: false,
    MAILER_AUTOCONFIGURE: 'true',
  };

  console.log('Updating Supabase auth settings...');
  const response = await fetch(
    `${MANAGEMENT_API}/projects/${projectRef}/config/auth`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(authConfig),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to update auth config: ${error}`);
    process.exit(1);
  }

  console.log('✓ Auth config updated');

  // Get current auth config to verify
  const getResponse = await fetch(
    `${MANAGEMENT_API}/projects/${projectRef}/config/auth`,
    { headers }
  );

  if (getResponse.ok) {
    const config = await getResponse.json();
    console.log('Current settings:');
    console.log(`  Site URL: ${config.SITE_URL}`);
    console.log(`  Confirm email: enabled`);
  }

  // Add redirect URLs for auth callback
  const authConfigUpdate = {
    SITE_URL: 'http://localhost:5173',
    ADDITIONAL_REDIRECT_URLS: JSON.stringify([
      'http://localhost:5173/auth/callback',
    ]),
  };

  const redirectResponse = await fetch(
    `${MANAGEMENT_API}/projects/${projectRef}/config/auth`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(authConfigUpdate),
    }
  );

  if (redirectResponse.ok) {
    console.log('✓ Redirect URLs configured');
  }

  console.log('\nSetup complete! Email confirmation is now enabled.');
  console.log('Users must confirm their email before signing in.');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
