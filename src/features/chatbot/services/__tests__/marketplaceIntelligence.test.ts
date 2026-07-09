import { describe, it, expect, beforeEach } from 'vitest'
import {
  searchListings, getListingDetails, getCategories, getSellerInfo,
  addListing, addCategory, addSeller, clearMarketplaceData, seedMarketplaceData,
} from '../marketplaceIntelligence'
import type { MarketplaceListing, MarketplaceCategory, MarketplaceSeller } from '../../types'

describe('Marketplace Intelligence', () => {
  beforeEach(async () => {
    await clearMarketplaceData()
  })

  describe('Listing Search', () => {
    it('returns empty for empty marketplace', async () => {
      const results = await searchListings({})
      expect(results).toHaveLength(0)
    })

    it('filters by category', async () => {
      await addListing({ id: 'l1', title: 'iPhone', price: 50000, category: 'Electronics', location: 'Mumbai', sellerId: 's1', status: 'active', images: [], createdAt: '2024-01-01' })
      await addListing({ id: 'l2', title: 'Sofa', price: 20000, category: 'Furniture', location: 'Delhi', sellerId: 's2', status: 'active', images: [], createdAt: '2024-01-02' })

      const results = await searchListings({ categories: ['Electronics'] })
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('iPhone')
    })

    it('filters by price range', async () => {
      await addListing({ id: 'l3', title: 'Budget Phone', price: 10000, category: 'Electronics', location: 'Mumbai', sellerId: 's1', status: 'active', images: [], createdAt: '2024-01-01' })
      await addListing({ id: 'l4', title: 'Premium Phone', price: 80000, category: 'Electronics', location: 'Mumbai', sellerId: 's1', status: 'active', images: [], createdAt: '2024-01-02' })

      const results = await searchListings({ minPrice: 50000, maxPrice: 100000 })
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Premium Phone')
    })

    it('filters by location', async () => {
      await addListing({ id: 'l5', title: 'Item in Mumbai', price: 100, category: 'General', location: 'Mumbai', sellerId: 's1', status: 'active', images: [], createdAt: '2024-01-01' })
      await addListing({ id: 'l6', title: 'Item in Delhi', price: 100, category: 'General', location: 'Delhi', sellerId: 's1', status: 'active', images: [], createdAt: '2024-01-02' })

      const results = await searchListings({ location: 'Mumbai' })
      expect(results).toHaveLength(1)
    })

    it('filters by search query', async () => {
      await addListing({ id: 'l7', title: 'Samsung TV 55 inch', price: 45000, category: 'Electronics', location: 'Mumbai', sellerId: 's1', status: 'active', images: [], createdAt: '2024-01-01' })
      await addListing({ id: 'l8', title: 'LG Refrigerator', price: 35000, category: 'Electronics', location: 'Mumbai', sellerId: 's1', status: 'active', images: [], createdAt: '2024-01-02' })

      const results = await searchListings({ query: 'samsung' })
      expect(results).toHaveLength(1)
    })

    it('sorts by newest first', async () => {
      await addListing({ id: 'l9', title: 'Old Listing', price: 100, category: 'General', location: 'Mumbai', sellerId: 's1', status: 'active', images: [], createdAt: '2024-01-01' })
      await addListing({ id: 'l10', title: 'New Listing', price: 100, category: 'General', location: 'Mumbai', sellerId: 's1', status: 'active', images: [], createdAt: '2024-06-01' })

      const results = await searchListings({})
      expect(results[0].title).toBe('New Listing')
    })
  })

  describe('Listing Details', () => {
    it('gets listing by ID', async () => {
      await addListing({ id: 'detail-1', title: 'Detail Item', price: 1000, category: 'General', location: 'Test', sellerId: 's1', status: 'active', images: [], createdAt: '2024-01-01' })
      const listing = await getListingDetails('detail-1')
      expect(listing).toBeDefined()
      expect(listing!.title).toBe('Detail Item')
    })

    it('returns undefined for missing listing', async () => {
      const listing = await getListingDetails('missing')
      expect(listing).toBeUndefined()
    })
  })

  describe('Categories', () => {
    it('returns all categories', async () => {
      await addCategory({ id: 'cat-a', name: 'Electronics', slug: 'electronics', parentId: null, itemCount: 10 })
      await addCategory({ id: 'cat-b', name: 'Furniture', slug: 'furniture', parentId: null, itemCount: 5 })
      const all = await getCategories()
      expect(all).toHaveLength(2)
    })

    it('returns empty when no categories', async () => {
      const all = await getCategories()
      expect(all).toHaveLength(0)
    })
  })

  describe('Seller Info', () => {
    it('gets seller by ID', async () => {
      await addSeller({ id: 'seller-1', name: 'Alice', rating: 4.5, listingCount: 10, joinedAt: '2024-01-01' })
      const seller = await getSellerInfo('seller-1')
      expect(seller).toBeDefined()
      expect(seller!.name).toBe('Alice')
    })

    it('returns undefined for missing seller', async () => {
      const seller = await getSellerInfo('missing')
      expect(seller).toBeUndefined()
    })
  })

  describe('Seed Data', () => {
    it('seeds marketplace with sample data', async () => {
      await seedMarketplaceData()
      const all = await searchListings({})
      expect(all.length).toBeGreaterThan(0)
      const cats = await getCategories()
      expect(cats.length).toBeGreaterThan(0)
    })
  })
})
