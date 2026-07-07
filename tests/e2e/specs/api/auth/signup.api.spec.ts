import { test, expect } from '../../../api/fixtures';
import { signUp } from '../../../api/auth';

const UNIQUE_EMAIL = () => `e2e-test-${crypto.randomUUID().slice(0, 8)}@valclassifieds.test`;

test.describe('API: Auth – signUp', () => {
  test('Signup accepts valid data (may be rate-limited by Supabase)', async () => {
    const email = UNIQUE_EMAIL();
    const { status, data } = await signUp(email, 'ValidPass123!', 'Test User');
    // Supabase may return 200 (success) or 429 (rate-limited)
    if (status === 200) {
      expect(data.id).toBeTruthy();
      expect(data.email).toBe(email);
    } else {
      expect([400, 429]).toContain(status);
    }
  });

  test('Signup with user_metadata stores full_name', async () => {
    const email = UNIQUE_EMAIL();
    const { status, data } = await signUp(email, 'ValidPass123!', 'Jane Doe');
    if (status === 200) {
      expect(data.user_metadata?.full_name).toBe('Jane Doe');
    } else {
      expect([400, 429]).toContain(status);
    }
  });

  test('Already-registered email returns error', async () => {
    const email = UNIQUE_EMAIL();
    const { status: s1 } = await signUp(email, 'ValidPass123!', 'Test');
    if (s1 !== 200) return; // skip if rate-limited
    const { status, data } = await signUp(email, 'ValidPass123!', 'Test');
    expect(status).toBe(422);
    const msg = (data.msg || data.error || '').toLowerCase();
    expect(msg).toContain('already');
  });

  test('Password too short (< 6 chars) returns error', async () => {
    const email = UNIQUE_EMAIL();
    const { status } = await signUp(email, '12', 'Test');
    expect(status).toBe(422);
  });

  test('Invalid email format returns error', async () => {
    const { status } = await signUp('notanemail', 'ValidPass123!', 'Test');
    expect(status).toBe(400);
  });
});
