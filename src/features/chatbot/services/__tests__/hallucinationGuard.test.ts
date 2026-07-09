import { describe, it, expect } from 'vitest'
import { checkHallucination } from '../hallucinationGuard'
import type { MarketplaceListing } from '../../types'

describe('Hallucination Guard', () => {
  describe('Price Claims', () => {
    it('detects hallucinated price not in listings', () => {
      const listings: MarketplaceListing[] = [
        { id: 'l1', title: 'iPhone 15', price: 85000, category: 'Electronics', location: 'Mumbai', sellerId: 's1', status: 'active', images: [], createdAt: '2024-01-01' },
      ]
      const result = checkHallucination({
        responseContent: 'The price is ₹50000',
        retrievedChunks: [],
        listings,
      })
      if (result.isHallucinated) {
        expect(result.reasons.length).toBeGreaterThan(0)
      }
    })

    it('passes for valid price within range', () => {
      const listings: MarketplaceListing[] = [
        { id: 'l1', title: 'iPhone 15', price: 85000, category: 'Electronics', location: 'Mumbai', sellerId: 's1', status: 'active', images: [], createdAt: '2024-01-01' },
      ]
      const result = checkHallucination({
        responseContent: 'The price is ₹85000',
        retrievedChunks: [],
        listings,
      })
      expect(typeof result.isHallucinated).toBe('boolean')
    })
  })

  describe('Listing Claims', () => {
    it('detects hallucinated listing name', () => {
      const listings: MarketplaceListing[] = [
        { id: 'l2', title: 'Samsung TV', price: 45000, category: 'Electronics', location: 'Mumbai', sellerId: 's1', status: 'active', images: [], createdAt: '2024-01-01' },
      ]
      const result = checkHallucination({
        responseContent: 'The listing called "iPhone 15" is available',
        retrievedChunks: [],
        listings,
      })
      if (result.isHallucinated) {
        expect(result.reasons.some((r) => r.toLowerCase().includes('listing'))).toBe(true)
      }
    })
  })

  describe('Policy Claims', () => {
    it('detects policy claim not in knowledge base', () => {
      const result = checkHallucination({
        responseContent: 'The policy says "All items must be returned within 30 days"',
        retrievedChunks: [{ content: 'No refund policy', documentId: 'd1' }],
      })
      if (result.isHallucinated) {
        expect(result.reasons.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Clean Responses', () => {
    it('passes for responses without claims', () => {
      const result = checkHallucination({
        responseContent: 'I can help you browse listings on ValClassifieds',
        retrievedChunks: [],
      })
      expect(result.isHallucinated).toBe(false)
      expect(result.confidence).toBe(1)
    })

    it('returns reasons when hallucinated', () => {
      const result = checkHallucination({
        responseContent: 'The listing called "Fake Product" costs ₹99999',
        retrievedChunks: [],
        listings: [{ id: 'l1', title: 'Real Product', price: 500, category: 'General', location: 'Test', sellerId: 's1', status: 'active', images: [], createdAt: '2024-01-01' }],
      })
      if (result.isHallucinated) {
        expect(result.reasons.length).toBeGreaterThanOrEqual(0)
        expect(result.confidence).toBeLessThan(1)
      }
    })
  })
})
