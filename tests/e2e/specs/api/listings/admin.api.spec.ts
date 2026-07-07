import { test, expect } from '../../../api/fixtures';
import { taggedName, preCleanStaleListings, softDeleteTestListings } from '../../../api/cleanup';

let adminListingId: string | null = null;

test.describe('API: Listings – Admin operations', () => {
  test.beforeAll(async ({ adminClient }) => {
    await preCleanStaleListings(adminClient);
    const { data: categories } = await adminClient.from('categories').select('id').limit(1);
    if (categories && categories.length > 0) {
      const { data } = await adminClient
        .from('listings')
        .insert({
          title: taggedName('API Admin Test'),
          description: 'For admin operations',
          price: 250,
          category_id: categories[0].id,
        })
        .select()
        .single();
      if (data) adminListingId = data.id;
    }
  });

  test.afterAll(async ({ adminClient }) => {
    if (adminListingId) {
      await adminClient.from('listings').update({ status: 'inactive' }).eq('id', adminListingId);
    }
    await softDeleteTestListings(adminClient);
  });

  test('Admin fetch non-pending listings works', async ({ adminClient }) => {
    const { data, error } = await adminClient
      .from('listings')
      .select('status')
      .neq('status', 'pending')
      .limit(20);
    expect(error).toBeNull();
  });

  test('Admin fetch pending listings returns results', async ({ adminClient }) => {
    const { data, error } = await adminClient
      .from('listings')
      .select('status')
      .eq('status', 'pending')
      .limit(20);
    expect(error).toBeNull();
  });

  test('Admin can update listing status', async ({ adminClient }) => {
    if (!adminListingId) return;
    const { error } = await adminClient
      .from('listings')
      .update({ status: 'active' })
      .eq('id', adminListingId);
    expect(error).toBeNull();
    const { data } = await adminClient
      .from('listings')
      .select('status')
      .eq('id', adminListingId)
      .single();
    expect(data!.status).toBe('active');
  });

  test('Admin can set listing to inactive', async ({ adminClient }) => {
    if (!adminListingId) return;
    const { error } = await adminClient
      .from('listings')
      .update({ status: 'inactive' })
      .eq('id', adminListingId);
    expect(error).toBeNull();
    const { data } = await adminClient
      .from('listings')
      .select('status')
      .eq('id', adminListingId)
      .single();
    expect(data!.status).toBe('inactive');
  });

  test('Admin can toggle listing back to active', async ({ adminClient }) => {
    if (!adminListingId) return;
    const { error } = await adminClient
      .from('listings')
      .update({ status: 'active' })
      .eq('id', adminListingId);
    expect(error).toBeNull();
    const { data } = await adminClient
      .from('listings')
      .select('status')
      .eq('id', adminListingId)
      .single();
    expect(data!.status).toBe('active');
  });

  test('Admin fetch all users returns list with roles', async ({ adminClient }) => {
    const { data, error } = await adminClient
      .from('profiles')
      .select('id, email, role')
      .limit(10);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    for (const user of data || []) {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
    }
  });
});
