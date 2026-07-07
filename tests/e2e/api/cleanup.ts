import { SupabaseClient } from '@supabase/supabase-js';

export const API_TEST_TAG = '[API_TEST:';

export function taggedName(prefix: string): string {
  return `${prefix} ${API_TEST_TAG}${crypto.randomUUID()}]`;
}

export function extractTag(value: string): string | null {
  const m = value.match(/\[API_TEST:([^\]]+)\]/);
  return m ? m[1] : null;
}

export function isTagged(value: string): boolean {
  return value.includes(API_TEST_TAG);
}

export async function preCleanStaleListings(client: SupabaseClient) {
  const { data } = await client
    .from('listings')
    .select('id')
    .ilike('title', `%${API_TEST_TAG}%`);
  if (data && data.length > 0) {
    const ids = data.map((r: { id: string }) => r.id);
    await client.from('listings').update({ status: 'inactive' }).in('id', ids);
  }
}

export async function verifyCleanListings(client: SupabaseClient) {
  const { data } = await client
    .from('listings')
    .select('id, title, status')
    .ilike('title', `%${API_TEST_TAG}%`)
    .neq('status', 'inactive');
  if (data && data.length > 0) {
    throw new Error(`Cleanup failed: ${data.length} tagged listing(s) still visible: ${data.map((r: { title: string }) => r.title).join(', ')}`);
  }
}

export async function softDeleteTestListings(client: SupabaseClient) {
  const { data } = await client
    .from('listings')
    .select('id, title')
    .ilike('title', `%${API_TEST_TAG}%`)
    .neq('status', 'inactive');
  if (data && data.length > 0) {
    const ids = data.map((r: { id: string }) => r.id);
    await client.from('listings').update({ status: 'inactive' }).in('id', ids);
  }
}
