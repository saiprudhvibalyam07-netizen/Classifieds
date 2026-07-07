import { test, expect } from '../../../api/fixtures';
import { taggedName, preCleanStaleListings, softDeleteTestListings, verifyCleanListings } from '../../../api/cleanup';

test.describe('API: Listings – Browse & Search', () => {
  test.beforeAll(async ({ anonClient }) => {
    await preCleanStaleListings(anonClient);
  });

  test.afterAll(async ({ anonClient }) => {
    await softDeleteTestListings(anonClient);
    await verifyCleanListings(anonClient);
  });

  test('GET listings with status=active returns listings with nested joins', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('listings')
      .select('*, category:categories(*), images:listing_images(*)')
      .eq('status', 'active')
      .limit(5);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    if (data!.length > 0) {
      expect(data![0]).toHaveProperty('id');
      expect(data![0]).toHaveProperty('title');
      expect(data![0]).toHaveProperty('price');
    }
  });

  test('Keyword search returns matching titles (case-insensitive)', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('listings')
      .select('title')
      .eq('status', 'active')
      .ilike('title', '%camera%')
      .limit(10);
    expect(error).toBeNull();
    if (data!.length > 0) {
      for (const item of data!) {
        expect(item.title.toLowerCase()).toContain('camera');
      }
    }
  });

  test('Category filter returns filtered results', async ({ anonClient }) => {
    const { data: cats } = await anonClient.from('categories').select('id').limit(1);
    if (!cats || cats.length === 0) return;
    const catId = cats[0].id;
    const { data, error } = await anonClient
      .from('listings')
      .select('category_id')
      .eq('status', 'active')
      .eq('category_id', catId)
      .limit(10);
    expect(error).toBeNull();
    for (const item of data || []) {
      expect(item.category_id).toBe(catId);
    }
  });

  test('City filter returns filtered results', async ({ anonClient }) => {
    const { data: cities } = await anonClient
      .from('listings')
      .select('city')
      .eq('status', 'active')
      .not('city', 'is', null)
      .limit(1);
    if (!cities || cities.length === 0 || !cities[0].city) return;
    const city = cities[0].city;
    const { data, error } = await anonClient
      .from('listings')
      .select('city')
      .eq('status', 'active')
      .eq('city', city)
      .limit(10);
    expect(error).toBeNull();
    for (const item of data || []) {
      expect(item.city).toBe(city);
    }
  });

  test('Price range filter works correctly', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('listings')
      .select('price')
      .eq('status', 'active')
      .gte('price', 100)
      .lte('price', 50000)
      .limit(10);
    expect(error).toBeNull();
    for (const item of data || []) {
      expect(item.price).toBeGreaterThanOrEqual(100);
      expect(item.price).toBeLessThanOrEqual(50000);
    }
  });

  test('Sort by price ascending returns non-decreasing prices', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('listings')
      .select('price')
      .eq('status', 'active')
      .order('price', { ascending: true })
      .limit(20);
    expect(error).toBeNull();
    for (let i = 1; i < data!.length; i++) {
      expect(data![i].price).toBeGreaterThanOrEqual(data![i - 1].price);
    }
  });

  test('Sort by price descending returns non-increasing prices', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('listings')
      .select('price')
      .eq('status', 'active')
      .order('price', { ascending: false })
      .limit(20);
    expect(error).toBeNull();
    for (let i = 1; i < data!.length; i++) {
      expect(data![i].price).toBeLessThanOrEqual(data![i - 1].price);
    }
  });

  test('Pagination returns correct slice', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('listings')
      .select('id')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(0, 11);
    expect(error).toBeNull();
    expect(data!.length).toBeLessThanOrEqual(12);
  });

  test('Empty result for non-matching query returns empty array', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('listings')
      .select('id')
      .eq('status', 'active')
      .ilike('title', '%__NONEXISTENT_ZZZ__%');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('Distinct cities endpoint returns sorted unique city names', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('listings')
      .select('city')
      .eq('status', 'active')
      .not('city', 'is', null)
      .order('city')
      .limit(1000);
    expect(error).toBeNull();
    const cities = [...new Set(data!.map((r: { city: string }) => r.city).filter(Boolean))];
    expect(cities.length).toBeGreaterThan(0);
    for (let i = 1; i < cities.length; i++) {
      expect(cities[i].localeCompare(cities[i - 1])).toBeGreaterThanOrEqual(0);
    }
  });

  test('Featured listings returns ≤6 results', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('listings')
      .select('id, is_featured')
      .eq('status', 'active')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(6);
    expect(error).toBeNull();
    expect(data!.length).toBeLessThanOrEqual(6);
  });

  test('Recent listings returns ≤8 results', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('listings')
      .select('id')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8);
    expect(error).toBeNull();
    expect(data!.length).toBeLessThanOrEqual(8);
  });

  test('Seller listings returns only active listings for seller', async ({ adminClient, adminSession }) => {
    const { data, error } = await adminClient
      .from('listings')
      .select('user_id, status')
      .eq('user_id', adminSession.userId)
      .eq('status', 'active')
      .limit(50);
    if (error) return;
    for (const item of data || []) {
      expect(item.user_id).toBe(adminSession.userId);
      expect(item.status).toBe('active');
    }
  });
});
