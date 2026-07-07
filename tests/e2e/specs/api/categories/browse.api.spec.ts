import { test, expect } from '../../../api/fixtures';

test.describe('API: Categories – Browse', () => {
  test('GET /categories?select=* returns all categories with correct structure', async ({ anonClient }) => {
    const { data, error } = await anonClient.from('categories').select('*');
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThanOrEqual(6);
    for (const cat of data!) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('slug');
      expect(cat).toHaveProperty('icon');
      expect(typeof cat.id).toBe('string');
      expect(typeof cat.name).toBe('string');
      expect(typeof cat.slug).toBe('string');
    }
  });

  test('GET /categories?select=id,slug returns only id and slug fields', async ({ anonClient }) => {
    const { data, error } = await anonClient.from('categories').select('id, slug');
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);
    for (const cat of data!) {
      expect(Object.keys(cat)).toEqual(['id', 'slug']);
    }
  });

  test('GET /categories?select=*&eq(slug,vehicles)&single() returns correct category', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('categories')
      .select('*')
      .eq('slug', 'vehicles')
      .single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.slug).toBe('vehicles');
  });

  test('GET /categories?select=*&eq(slug,housing)&single() returns correct category', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('categories')
      .select('*')
      .eq('slug', 'housing')
      .single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.slug).toBe('housing');
  });

  test('GET /categories?eq(slug,__invalid__)&single() returns error for non-existent slug', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('categories')
      .select('*')
      .eq('slug', '__nonexistent_slug_zzz__')
      .single();
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  test('Categories returned in a consistent order (no display_order column in DB)', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('categories')
      .select('slug')
      .order('slug', { ascending: true });
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    for (let i = 1; i < data!.length; i++) {
      expect(data![i].slug.localeCompare(data![i - 1].slug)).toBeGreaterThanOrEqual(0);
    }
  });

  test('Get category by slug with hyphens works correctly', async ({ anonClient }) => {
    const { data } = await anonClient
      .from('categories')
      .select('slug')
      .ilike('slug', '%-%')
      .limit(1);
    if (data && data.length > 0) {
      const slug = data[0].slug;
      const { data: cat, error } = await anonClient
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();
      expect(error).toBeNull();
      expect(cat!.slug).toBe(slug);
    }
  });

  test('Uppercase slug is case-sensitive and returns error', async ({ anonClient }) => {
    const { data, error } = await anonClient
      .from('categories')
      .select('*')
      .eq('slug', 'VEHICLES')
      .single();
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});
