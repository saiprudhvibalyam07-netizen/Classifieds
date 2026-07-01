import { supabase } from '../lib/supabase'

export type CategoryCountMap = Record<string, number>

const CACHE_TTL = 300_000

let cachedCounts: { data: CategoryCountMap; expiry: number } | null = null

export async function getCategoryCounts(): Promise<CategoryCountMap> {
  if (cachedCounts && Date.now() < cachedCounts.expiry) {
    return cachedCounts.data
  }

  const { data, error } = await supabase
    .from('listings')
    .select('category_id')
    .eq('status', 'active')

  if (error) throw error

  const counts: CategoryCountMap = {}
  for (const row of data ?? []) {
    const id = row.category_id
    counts[id] = (counts[id] ?? 0) + 1
  }

  const { data: dbCategories } = await supabase
    .from('categories')
    .select('id, slug')

  const slugCounts: CategoryCountMap = {}
  for (const cat of dbCategories ?? []) {
    slugCounts[cat.slug] = counts[cat.id] ?? 0
  }

  cachedCounts = { data: slugCounts, expiry: Date.now() + CACHE_TTL }

  return slugCounts
}
