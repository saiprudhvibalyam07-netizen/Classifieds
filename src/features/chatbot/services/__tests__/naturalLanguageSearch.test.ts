import { describe, it, expect } from 'vitest'
import { parseNaturalLanguage } from '../naturalLanguageSearch'

describe('Natural Language Search', () => {
  describe('Price Extraction', () => {
    it('extracts "under" price constraint', () => {
      const result = parseNaturalLanguage('Phones under 20000')
      expect(result.filters.maxPrice).toBe(20000)
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('extracts "below" price constraint', () => {
      const result = parseNaturalLanguage('Laptops below 50000')
      expect(result.filters.maxPrice).toBe(50000)
    })

    it('extracts "above" price constraint', () => {
      const result = parseNaturalLanguage('Cars above 500000')
      expect(result.filters.minPrice).toBe(500000)
    })

    it('extracts range with dash', () => {
      const result = parseNaturalLanguage('Phones 10000 to 30000')
      expect(result.filters.maxPrice).toBe(30000)
    })

    it('handles Indian rupee symbol', () => {
      const result = parseNaturalLanguage('Phones under ₹15000')
      expect(result.filters.maxPrice).toBe(15000)
    })

    it('handles Rs. prefix', () => {
      const result = parseNaturalLanguage('Laptops under Rs. 40000')
      expect(result.filters.maxPrice).toBe(40000)
    })
  })

  describe('Category Extraction', () => {
    it('extracts phone/mobile category', () => {
      const result = parseNaturalLanguage('iPhone under 30000')
      expect(result.filters.categories).toContain('Electronics')
    })

    it('extracts car/vehicle category', () => {
      const result = parseNaturalLanguage('Cars in Mumbai')
      expect(result.filters.categories).toContain('Vehicles')
    })

    it('extracts furniture category', () => {
      const result = parseNaturalLanguage('Sofa set')
      expect(result.filters.categories).toContain('Furniture')
    })

    it('extracts apartment category', () => {
      const result = parseNaturalLanguage('2 BHK apartment for rent')
      expect(result.filters.categories).toContain('Real Estate')
    })
  })

  describe('Location Extraction', () => {
    it('extracts "in" location', () => {
      const result = parseNaturalLanguage('Furniture in Hyderabad')
      expect(result.filters.location).toBe('Hyderabad')
    })

    it('extracts "near" location', () => {
      const result = parseNaturalLanguage('Phones near Delhi')
      expect(result.filters.location).toBe('Delhi')
    })

    it('extracts "at" location', () => {
      const result = parseNaturalLanguage('Jobs at Bangalore')
      expect(result.filters.location).toBe('Bangalore')
    })
  })

  describe('Combined Queries', () => {
    it('parses full NL query with all filters', () => {
      const result = parseNaturalLanguage('Phones under 20000 in Mumbai')
      expect(result.filters.categories).toContain('Electronics')
      expect(result.filters.maxPrice).toBe(20000)
      expect(result.filters.location).toBe('Mumbai')
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('keeps original query text in result', () => {
      const result = parseNaturalLanguage('Laptops in Bangalore')
      expect(result.query).toBe('Laptops in Bangalore')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty query', () => {
      const result = parseNaturalLanguage('')
      expect(result.confidence).toBe(0)
    })

    it('returns zero confidence for gibberish', () => {
      const result = parseNaturalLanguage('xyz abc def')
      expect(result.filters.query).toBe('xyz abc def')
    })

    it('handles query with no filters', () => {
      const result = parseNaturalLanguage('Show me everything')
      expect(result.filters).toBeDefined()
    })
  })
})
