import { test, expect } from '../../../api/fixtures';
import { signInAs, signOut, getAuthedClient } from '../../../api/auth';

test.describe('API: Auth – signOut', () => {
  test('Sign out with valid JWT returns 204', async () => {
    const session = await signInAs('buyer');
    const { status, ok } = await signOut(session.jwt);
    expect(ok).toBe(true);
    expect(status).toBe(204);
  });

  test('After sign out, client getSession returns null', async () => {
    const session = await signInAs('buyer');
    await signOut(session.jwt);
    const client = getAuthedClient(session.jwt);
    const { data } = await client.auth.getSession();
    expect(data.session).toBeNull();
  });

  test('Sign out without JWT returns 401', async () => {
    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
    const response = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    });
    expect(response.status).toBe(401);
  });

  test('Double sign out returns 401 or 403 depending on Supabase CSRF check', async () => {
    const session = await signInAs('buyer');
    await signOut(session.jwt);
    const { status } = await signOut(session.jwt);
    expect([401, 403]).toContain(status);
  });
});
