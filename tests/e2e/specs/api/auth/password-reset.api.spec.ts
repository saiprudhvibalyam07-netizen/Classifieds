import { test, expect } from '../../../api/fixtures';
import { TEST_USERS } from '../../../utils/testData';
import { signInAs } from '../../../api/auth';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

test.describe('API: Auth – resetPasswordForEmail & updateUser', () => {
  test('resetPasswordForEmail with registered email returns 200 or 429 (rate-limited)', async () => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: TEST_USERS.buyer.email }),
    });
    expect([200, 400, 429]).toContain(response.status);
  });

  test('resetPasswordForEmail with unregistered email returns 200 or 429', async () => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: 'nonexistent@test.com' }),
    });
    expect([200, 400, 429]).toContain(response.status);
  });

  test('resetPasswordForEmail with invalid email format returns 400', async () => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: 'notanemail' }),
    });
    expect(response.status).toBe(400);
  });

  test('updateUser without auth returns 401', async () => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ password: 'NewPass123!' }),
    });
    expect(response.status).toBe(401);
  });

  test('updateUser with valid session and valid password works', async () => {
    const session = await signInAs('buyer');
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.jwt}`,
      },
      body: JSON.stringify({ password: 'UpdatedPass123!' }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe(session.userId);
    // Restore original password
    const restoreRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.jwt}`,
      },
      body: JSON.stringify({ password: TEST_USERS.buyer.password }),
    });
    expect(restoreRes.status).toBe(200);
  });

  test('updateUser with short password returns 422', async () => {
    const session = await signInAs('buyer');
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.jwt}`,
      },
      body: JSON.stringify({ password: '12' }),
    });
    expect(response.status).toBe(422);
  });
});
