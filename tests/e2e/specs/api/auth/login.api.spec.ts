import { test, expect } from '../../../api/fixtures';
import { TEST_USERS } from '../../../utils/testData';
import { signInAs } from '../../../api/auth';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

test.describe('API: Auth – signInWithPassword', () => {
  test('Valid buyer credentials return session with access_token', async () => {
    const result = await signInAs('buyer');
    expect(result.jwt).toBeTruthy();
    expect(typeof result.jwt).toBe('string');
    expect(result.jwt.split('.').length).toBe(3);
    expect(result.refreshToken).toBeTruthy();
    expect(result.userId).toBeTruthy();
    expect(result.email).toBe(TEST_USERS.buyer.email);
  });

  test('Sign-in response contains expected fields', async () => {
    const result = await signInAs('buyer');
    expect(result).toHaveProperty('jwt');
    expect(result).toHaveProperty('refreshToken');
    expect(result).toHaveProperty('userId');
    expect(result).toHaveProperty('email');
    expect(result.userId.length).toBeGreaterThan(0);
  });

  test('Wrong password returns 400', async () => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: TEST_USERS.buyer.email, password: 'wrongpassword123' }),
    });
    expect(response.status).toBe(400);
  });

  test('Unregistered email returns 400', async () => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: 'nonexistent@test.com', password: 'Pass123!' }),
    });
    expect(response.status).toBe(400);
  });

  test('Empty email returns 400', async () => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: '', password: 'Pass123!' }),
    });
    expect(response.status).toBe(400);
  });

  test('Empty password returns 400', async () => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: TEST_USERS.buyer.email, password: '' }),
    });
    expect(response.status).toBe(400);
  });
});
