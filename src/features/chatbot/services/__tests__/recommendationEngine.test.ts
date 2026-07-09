import { describe, it, expect, beforeEach, vi } from 'vitest'
import { recommendListings, recommendCategories, recommendAll } from '../recommendationEngine'
import * as marketplaceIntelligence from '../marketplaceIntelligence'
import type { UserPreference, MarketplaceListing, MarketplaceCategory } from '../../types'

vi.mock('../marketplaceIntelligence', () => ({
  searchListings: vi.fn(),
  getCategories: vi.fn(),
}))

vi.mock('../retrievalPipeline', () => ({
  retrieveContext: vi.fn().mockResolvedValue({ chunks: [] }),
}))

const mockListings: MarketplaceListing[] = [
  { id: 'l1', title: 'MacBook Pro', price: 120000, category: 'Electronics', location: 'Mumbai', sellerId: 's1', status: 'active', images: ['img1.jpg'], createdAt: '2024-01-01' },
  { id: 'l2', title: 'iPhone 15', price: 80000, category: 'Electronics', location: 'Delhi', sellerId: 's2', status: 'active', images: ['img2.jpg'], createdAt: '2024-01-02' },
  { id: 'l3', title: 'Sofa Set', price: 25000, category: 'Furniture', location: 'Mumbai', sellerId: 's3', status: 'active', images: ['img3.jpg'], createdAt: '2024-01-03' },
]

const mockCategories: MarketplaceCategory[] = [
  { id: 'cat1', name: 'Electronics', slug: 'electronics', parentId: null, itemCount: 50 },
  { id: 'cat2', name: 'Furniture', slug: 'furniture', parentId: null, itemCount: 30 },
]

describe('RecommendationEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(marketplaceIntelligence.searchListings).mockResolvedValue(mockListings)
    vi.mocked(marketplaceIntelligence.getCategories).mockResolvedValue(mockCategories)
  })

  describe('recommendListings', () => {
    it('returns recommendations based on category preference', async () => {
      const prefs: UserPreference[] = [
        { key: 'preferred_category', value: 'Electronics', confidence: 0.9, source: 'inferred', updatedAt: new Date().toISOString() },
      ]
      const recs = await recommendListings(prefs)
      expect(recs.length).toBeGreaterThan(0)
      expect(recs[0].type).toBe('listing')
      expect(recs[0].reason).toContain('electronics')
    })

    it('returns empty when no preferences', async () => {
      const recs = await recommendListings([])
      expect(recs).toHaveLength(0)
    })

    it('excludes specified listing IDs', async () => {
      const prefs: UserPreference[] = [
        { key: 'preferred_category', value: 'Electronics', confidence: 0.9, source: 'inferred', updatedAt: new Date().toISOString() },
      ]
      const recs = await recommendListings(prefs, ['l1', 'l2'])
      expect(recs.every((r) => !['l1', 'l2'].includes(r.id))).toBe(true)
    })

    it('respects budget preference', async () => {
      const prefs: UserPreference[] = [
        { key: 'preferred_category', value: 'Electronics', confidence: 0.9, source: 'inferred', updatedAt: new Date().toISOString() },
        { key: 'budget_under', value: '90000', confidence: 0.8, source: 'inferred', updatedAt: new Date().toISOString() },
      ]
      vi.mocked(marketplaceIntelligence.searchListings).mockResolvedValue([mockListings[0], mockListings[1]])
      const recs = await recommendListings(prefs)
      expect(recs.length).toBeGreaterThan(0)
    })
  })

  describe('recommendCategories', () => {
    it('returns category recommendations', async () => {
      const prefs: UserPreference[] = [
        { key: 'preferred_category', value: 'Electronics', confidence: 0.9, source: 'inferred', updatedAt: new Date().toISOString() },
        { key: 'preferred_category', value: 'Furniture', confidence: 0.6, source: 'inferred', updatedAt: new Date().toISOString() },
      ]
      const recs = await recommendCategories(prefs)
      expect(recs.length).toBeGreaterThan(0)
      expect(recs[0].type).toBe('category')
    })

    it('returns empty when no category preferences', async () => {
      const recs = await recommendCategories([])
      expect(recs).toHaveLength(0)
    })
  })

  describe('recommendAll', () => {
    it('returns all recommendation types', async () => {
      const prefs: UserPreference[] = [
        { key: 'preferred_category', value: 'Electronics', confidence: 0.9, source: 'inferred', updatedAt: new Date().toISOString() },
      ]
      const result = await recommendAll(prefs)
      expect(result).toHaveProperty('listings')
      expect(result).toHaveProperty('categories')
      expect(result).toHaveProperty('sellers')
      expect(result).toHaveProperty('resources')
    })

    it('returns empty arrays when no preferences', async () => {
      const result = await recommendAll([])
      expect(result.listings).toHaveLength(0)
      expect(result.categories).toHaveLength(0)
    })
  })
})
