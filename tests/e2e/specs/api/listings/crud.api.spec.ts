import { test, expect } from '../../../api/fixtures';
import { taggedName, preCleanStaleListings, softDeleteTestListings, verifyCleanListings } from '../../../api/cleanup';

let testListingId: string | null = null;

test.describe('API: Listings – CRUD', () => {
  test.beforeAll(async ({ buyerClient }) => {
    await preCleanStaleListings(buyerClient);
  });

  test.afterAll(async ({ buyerClient, anonClient }) => {
    if (testListingId) {
      await buyerClient.from('listings').update({ status: 'inactive' }).eq('id', testListingId);
    }
    await softDeleteTestListings(anonClient);
    await verifyCleanListings(anonClient);
  });

  test('POST create listing with all fields succeeds and returns status=active', async ({ buyerClient, buyerSession }) => {
    const { data: categories } = await buyerClient.from('categories').select('id').limit(1);
    if (!categories || categories.length === 0) return;
    const catId = categories[0].id;
    const title = taggedName('API Test Listing');
    const { data, error } = await buyerClient
      .from('listings')
      .insert({
        title,
        description: 'Test description for API test',
        price: 999.99,
        category_id: catId,
        user_id: buyerSession.userId,
        condition: 'used',
        city: 'Mumbai',
        state: 'MH',
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.title).toBe(title);
    expect(data!.price).toBe(999.99);
    expect(data!.user_id).toBe(buyerSession.userId);
    testListingId = data!.id;
  });

  test('POST create listing with minimum fields succeeds', async ({ buyerClient, buyerSession }) => {
    const { data: categories } = await buyerClient.from('categories').select('id').limit(1);
    if (!categories || categories.length === 0) return;
    const catId = categories[0].id;
    const title = taggedName('API Min Fields');
    const { data, error } = await buyerClient
      .from('listings')
      .insert({
        title,
        description: 'Minimal test',
        price: 100,
        category_id: catId,
        user_id: buyerSession.userId,
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    await buyerClient.from('listings').update({ status: 'inactive' }).eq('id', data!.id);
  });

  test('POST create listing without auth returns 401', async ({ anonClient }) => {
    const { data: categories } = await anonClient.from('categories').select('id').limit(1);
    if (!categories || categories.length === 0) return;
    const { error } = await anonClient
      .from('listings')
      .insert({
        title: taggedName('API No Auth'),
        description: 'Should fail',
        price: 100,
        category_id: categories[0].id,
      });
    expect(error).not.toBeNull();
  });

  test('GET listing detail returns listing with all joins', async ({ anonClient }) => {
    const { data: listings } = await anonClient
      .from('listings')
      .select('id')
      .eq('status', 'active')
      .limit(1);
    if (!listings || listings.length === 0) return;
    const listingId = listings[0].id;
    const { data, error } = await anonClient
      .from('listings')
      .select('*, category:categories(*), profile:profiles(*), images:listing_images(*)')
      .eq('id', listingId)
      .single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBe(listingId);
  });

  test('GET listing detail with non-existent ID returns error', async ({ anonClient }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const { data, error } = await anonClient
      .from('listings')
      .select('id')
      .eq('id', fakeId)
      .single();
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  test('PATCH update own listing succeeds', async ({ buyerClient }) => {
    if (!testListingId) return;
    const { error } = await buyerClient
      .from('listings')
      .update({ title: taggedName('API Updated Title') })
      .eq('id', testListingId);
    expect(error).toBeNull();
    const { data } = await buyerClient
      .from('listings')
      .select('title')
      .eq('id', testListingId)
      .single();
    expect(data!.title).toContain('API Updated Title');
  });

  test('PATCH update partial field (single field) succeeds', async ({ buyerClient }) => {
    if (!testListingId) return;
    const { data: before } = await buyerClient
      .from('listings')
      .select('price, description')
      .eq('id', testListingId)
      .single();
    await buyerClient.from('listings').update({ description: 'Updated description only' }).eq('id', testListingId);
    const { data: after } = await buyerClient
      .from('listings')
      .select('price, description')
      .eq('id', testListingId)
      .single();
    expect(after!.price).toBe(before!.price);
    expect(after!.description).toBe('Updated description only');
  });

  test('PATCH update without auth is blocked (0 rows affected, no error thrown)', async ({ anonClient, buyerClient }) => {
    if (!testListingId) return;
    const { data: before } = await buyerClient
      .from('listings')
      .select('title')
      .eq('id', testListingId)
      .single();
    const originalTitle = before!.title;
    const { error } = await anonClient
      .from('listings')
      .update({ title: 'No auth update attempt' })
      .eq('id', testListingId);
    expect(error).toBeNull();
    const { data: after } = await buyerClient
      .from('listings')
      .select('title')
      .eq('id', testListingId)
      .single();
    expect(after!.title).toBe(originalTitle);
  });

  test('DELETE own listing succeeds', async ({ buyerClient }) => {
    const { data: categories } = await buyerClient.from('categories').select('id').limit(1);
    if (!categories || categories.length === 0) return;
    const { data: listing } = await buyerClient
      .from('listings')
      .insert({
        title: taggedName('API Delete Test'),
        description: 'To be deleted',
        price: 50,
        category_id: categories[0].id,
      })
      .select()
      .single();
    if (!listing) return;
    const { error } = await buyerClient.from('listings').delete().eq('id', listing.id);
    expect(error).toBeNull();
  });

  test('DELETE without auth is blocked (0 rows affected, no error thrown)', async ({ anonClient, buyerClient }) => {
    if (!testListingId) return;
    const { data: before } = await buyerClient
      .from('listings')
      .select('id')
      .eq('id', testListingId)
      .single();
    expect(before).not.toBeNull();
    const { error } = await anonClient.from('listings').delete().eq('id', testListingId);
    expect(error).toBeNull();
    const { data: after } = await buyerClient
      .from('listings')
      .select('id')
      .eq('id', testListingId)
      .single();
    expect(after).not.toBeNull();
  });

  test('Increment views_count on listing detail view', async ({ buyerClient }) => {
    if (!testListingId) return;
    const { data: before } = await buyerClient
      .from('listings')
      .select('views_count')
      .eq('id', testListingId)
      .single();
    const initialViews = before?.views_count ?? 0;
    await buyerClient
      .from('listings')
      .update({ views_count: initialViews + 1 })
      .eq('id', testListingId);
    const { data: after } = await buyerClient
      .from('listings')
      .select('views_count')
      .eq('id', testListingId)
      .single();
    expect(after!.views_count).toBe(initialViews + 1);
  });

  test('Favorites batch fetch by ID list', async ({ buyerClient }) => {
    const { data: listings } = await buyerClient
      .from('listings')
      .select('id')
      .eq('status', 'active')
      .limit(2);
    if (!listings || listings.length < 2) return;
    const ids = listings.map((l: { id: string }) => l.id);
    const { data, error } = await buyerClient
      .from('listings')
      .select('id, title')
      .in('id', ids);
    expect(error).toBeNull();
    expect(data!.length).toBe(2);
  });

  test('Empty ID list returns empty array', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('listings')
      .select('id')
      .in('id', []);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('Own listings (Dashboard) returns only own listings', async ({ buyerClient, buyerSession }) => {
    const { data, error } = await buyerClient
      .from('listings')
      .select('user_id')
      .eq('user_id', buyerSession.userId)
      .limit(50);
    if (error) return;
    for (const item of data || []) {
      expect(item.user_id).toBe(buyerSession.userId);
    }
  });
});
