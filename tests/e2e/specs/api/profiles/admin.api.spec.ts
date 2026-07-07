import { test, expect } from '../../../api/fixtures';

test.describe('API: Profiles – Admin', () => {
  test('Admin can list all users with roles', async ({ adminClient }) => {
    const { data, error } = await adminClient
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);
  });

  test('Buyer can list profiles (RLS allows profile reads)', async ({ buyerClient }) => {
    const { data, error } = await buyerClient
      .from('profiles')
      .select('id')
      .limit(5);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });
});
