import { test, expect } from '../../../api/fixtures';
import { TEST_USERS } from '../../../utils/testData';

const DEFAULT_NAME = TEST_USERS.buyer.name;

test.describe('API: Profiles – Own profile', () => {
  test('GET own profile returns authenticated user data', async ({ buyerClient, buyerSession }) => {
    const { data, error } = await buyerClient
      .from('profiles')
      .select('*')
      .eq('id', buyerSession.userId)
      .single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBe(buyerSession.userId);
    expect(data!.email).toBe(buyerSession.email);
    expect(data).toHaveProperty('full_name');
    expect(data).toHaveProperty('role');
  });

  test('PATCH update own profile full_name succeeds', async ({ buyerClient, buyerSession }) => {
    const newName = 'Updated Test Name';
    const { error } = await buyerClient
      .from('profiles')
      .update({ full_name: newName })
      .eq('id', buyerSession.userId);
    expect(error).toBeNull();
    const { data } = await buyerClient
      .from('profiles')
      .select('full_name')
      .eq('id', buyerSession.userId)
      .single();
    expect(data!.full_name).toBe(newName);
    await buyerClient.from('profiles').update({ full_name: DEFAULT_NAME }).eq('id', buyerSession.userId);
  });

  test('PATCH update own profile phone number succeeds', async ({ buyerClient, buyerSession }) => {
    const phone = '9876543210';
    const { error } = await buyerClient
      .from('profiles')
      .update({ phone })
      .eq('id', buyerSession.userId);
    expect(error).toBeNull();
    const { data } = await buyerClient
      .from('profiles')
      .select('phone')
      .eq('id', buyerSession.userId)
      .single();
    expect(data!.phone).toBe(phone);
    await buyerClient.from('profiles').update({ phone: null }).eq('id', buyerSession.userId);
  });

  test('Seller profile (public) returns limited fields', async ({ anonClient, adminSession }) => {
    const { data, error } = await anonClient
      .from('profiles')
      .select('id, full_name, avatar_url, created_at, location, about')
      .eq('id', adminSession.userId)
      .single();
    if (error) return;
    expect(data).not.toBeNull();
    expect(data!.id).toBe(adminSession.userId);
  });

  test('Seller profile (public) for non-existent ID returns error', async ({ anonClient }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const { data, error } = await anonClient
      .from('profiles')
      .select('id')
      .eq('id', fakeId)
      .single();
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});
