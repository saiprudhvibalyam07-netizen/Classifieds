import type { Recommendation, UserPreference, MarketplaceListing } from '../types'
import { MEMORY_CONFIG } from '../config'
import { searchListings, getCategories } from './marketplaceIntelligence'
import { retrieveContext } from './retrievalPipeline'
import { logger } from './logger'

export async function recommendListings(
  preferences: UserPreference[],
  excludeIds: string[] = []
): Promise<Recommendation[]> {
  const preferredCats = preferences
    .filter((p) => p.key === 'preferred_category')
    .sort((a, b) => b.confidence - a.confidence)
    .map((p) => p.value as string)

  const preferredLoc = preferences.find((p) => p.key === 'preferred_location')?.value as string | undefined
  const budgetUnder = preferences.find((p) => p.key === 'budget_under')?.value as string | undefined

  if (preferredCats.length === 0 && !preferredLoc) return []

  const maxPrice = budgetUnder ? parseFloat(budgetUnder) : undefined

  const results = await searchListings({
    categories: preferredCats.length > 0 ? preferredCats : undefined,
    location: preferredLoc,
    maxPrice,
  })

  const filtered = results.filter((l) => !excludeIds.includes(l.id))
  const topK = MEMORY_CONFIG.recommendationTopK

  const recommendations: Recommendation[] = filtered.slice(0, topK).map((listing, i) => ({
    type: 'listing',
    id: listing.id,
    title: listing.title,
    description: `₹${listing.price.toLocaleString()} — ${listing.location}`,
    score: 1 - (i / filtered.length),
    reason: buildListingReason(listing, preferences),
    image: listing.images[0],
  }))

  logger.info('listings_recommended', { details: { count: recommendations.length } })
  return recommendations
}

export async function recommendCategories(
  preferences: UserPreference[]
): Promise<Recommendation[]> {
  const preferredCats = preferences
    .filter((p) => p.key === 'preferred_category')
    .sort((a, b) => b.confidence - a.confidence)
    .map((p) => p.value as string)

  if (preferredCats.length === 0) return []

  const allCategories = await getCategories()
  const topK = MEMORY_CONFIG.recommendationTopK

  const recommendations: Recommendation[] = preferredCats.slice(0, topK).map((catName, i) => {
    const cat = allCategories.find((c) => c.name === catName)
    return {
      type: 'category',
      id: cat?.id ?? catName,
      title: catName,
      description: cat ? `${cat.itemCount} items available` : 'Browse listings',
      score: 1 - (i / topK),
      reason: `Based on your interest in ${catName.toLowerCase()}`,
    }
  })

  return recommendations
}

export async function recommendResources(
  preferences: UserPreference[]
): Promise<Recommendation[]> {
  const preferredCats = preferences
    .filter((p) => p.key === 'preferred_category')
    .map((p) => p.value as string)

  const query = preferredCats.length > 0
    ? `Information about ${preferredCats.slice(0, 3).join(', ')} buying selling`
    : 'Buying and selling tips'

  const result = await retrieveContext({ query, topK: 3, useHybridSearch: true })

  const recommendations: Recommendation[] = result.chunks.map((sc, _i) => ({
    type: 'resource',
    id: sc.chunk.id,
    title: sc.chunk.metadata.sourceTitle as string ?? 'Resource',
    description: sc.chunk.content.slice(0, 120),
    score: sc.score,
    reason: 'Relevant marketplace resource',
  }))

  return recommendations
}

export async function recommendSellers(
  preferences: UserPreference[]
): Promise<Recommendation[]> {
  const preferredCats = preferences
    .filter((p) => p.key === 'preferred_category')
    .map((p) => p.value as string)

  if (preferredCats.length === 0) return []

  const results = await searchListings({ categories: preferredCats })
  const sellerIds = new Set(results.map((l) => l.sellerId))

  const recommendations: Recommendation[] = Array.from(sellerIds).slice(0, MEMORY_CONFIG.recommendationTopK).map((id, i) => ({
    type: 'seller',
    id,
    title: `Seller #${id}`,
    description: `Active in ${preferredCats.join(', ')}`,
    score: 1 - (i / MEMORY_CONFIG.recommendationTopK),
    reason: `Has listings in ${preferredCats[0]?.toLowerCase() ?? 'your interests'}`,
  }))

  return recommendations
}

export async function recommendAll(
  preferences: UserPreference[],
  excludeListingIds: string[] = []
): Promise<{ listings: Recommendation[]; categories: Recommendation[]; sellers: Recommendation[]; resources: Recommendation[] }> {
  const [listings, categories, sellers, resources] = await Promise.all([
    recommendListings(preferences, excludeListingIds),
    recommendCategories(preferences),
    recommendSellers(preferences),
    recommendResources(preferences),
  ])

  return { listings, categories, sellers, resources }
}

function buildListingReason(listing: MarketplaceListing, preferences: UserPreference[]): string {
  const reasons: string[] = []

  const catPref = preferences.find((p) => p.key === 'preferred_category' && p.value === listing.category)
  if (catPref) reasons.push(`Matches your interest in ${listing.category.toLowerCase()}`)

  const locPref = preferences.find((p) => p.key === 'preferred_location')
  if (locPref && listing.location.toLowerCase().includes((locPref.value as string).toLowerCase())) {
    reasons.push(`Located in ${listing.location}`)
  }

  const budgetPref = preferences.find((p) => p.key === 'budget_under')
  if (budgetPref) {
    const budget = parseFloat(budgetPref.value as string)
    if (listing.price <= budget) reasons.push(`Within your budget`)
  }

  return reasons[0] ?? 'Recommended for you'
}
