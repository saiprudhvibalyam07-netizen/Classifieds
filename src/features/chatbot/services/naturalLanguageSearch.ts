import type { NLSearchResult, SearchFilters } from '../types'
import { NL_CONFIG } from '../config'
import { logger } from './logger'

const PRICE_PATTERNS = [
  /(?:under|below|less than|upto?|max|budget)\s*(?:₹|Rs\.?\s*)?(\d[\d,]*)/i,
  /(?:₹|Rs\.?\s*)?(\d[\d,]*)\s*(?:and below|or less|max|budget)/i,
  /(?:₹|Rs\.?\s*)?(\d[\d,]*)\s*(?:-|to)\s*(?:₹|Rs\.?\s*)?(\d[\d,]*)/i,
  /(?:above|over|more than|min|starting from)\s*(?:₹|Rs\.?\s*)?(\d[\d,]*)/i,
]

const CATEGORY_MAP: Record<string, string[]> = {
  phone: ['Electronics'],
  mobile: ['Electronics'],
  smartphone: ['Electronics'],
  laptop: ['Electronics'],
  computer: ['Electronics'],
  electronics: ['Electronics'],
  tablet: ['Electronics'],
  headphones: ['Electronics'],
  car: ['Vehicles'],
  bike: ['Vehicles'],
  vehicle: ['Vehicles'],
  automobile: ['Vehicles'],
  furniture: ['Furniture'],
  sofa: ['Furniture'],
  table: ['Furniture'],
  chair: ['Furniture'],
  bed: ['Furniture'],
  apartment: ['Real Estate'],
  house: ['Real Estate'],
  flat: ['Real Estate'],
  property: ['Real Estate'],
  rent: ['Real Estate'],
  job: ['Jobs'],
  vacancy: ['Jobs'],
  clothing: ['Clothing'],
  dress: ['Clothing'],
  book: ['Books & Media'],
  textbook: ['Books & Media'],
  service: ['Services'],
  pet: ['Pets'],
  dog: ['Pets'],
  cat: ['Pets'],
}

const LOCATION_KEYWORDS = [
  'in ', 'near ', 'at ', 'around ',
]

export function parseNaturalLanguage(query: string): NLSearchResult {
  const filters: SearchFilters = {}
  let q = query.trim()
  let confidence = 1.0

  if (!q) {
    return { query: '', filters: {}, confidence: 0 }
  }

  const priceResult = extractPrice(q)
  if (priceResult) {
    Object.assign(filters, priceResult.filters)
    q = priceResult.remaining
    if (priceResult.confidence < 1) confidence *= priceResult.confidence
  }

  const categoryResult = extractCategory(q)
  if (categoryResult) {
    filters.categories = categoryResult.categories
    if (categoryResult.confidence < 1) confidence *= categoryResult.confidence
  }

  const locationResult = extractLocation(q)
  if (locationResult) {
    filters.location = locationResult.location
    q = locationResult.remaining
    if (locationResult.confidence < 1) confidence *= locationResult.confidence
  }

  if (confidence < NL_CONFIG.minConfidence) {
    logger.info('nl_search_low_confidence', { details: { query, confidence } })
  }

  filters.query = q

  logger.info('nl_search_parsed', {
    details: { original: query, filters, confidence },
  })

  return { query, filters, confidence }
}

function extractPrice(text: string): {
  filters: { minPrice?: number; maxPrice?: number }
  remaining: string
  confidence: number
} | null {
  for (const pattern of PRICE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const cleaned = text.replace(pattern, '').trim()
      const nums = match.slice(1).map((s) => parseFloat(s.replace(/,/g, '')))

      if (nums.length === 2) {
        return {
          filters: { minPrice: nums[0], maxPrice: nums[1] },
          remaining: cleaned,
          confidence: 0.95,
        }
      }

      const kw = match[0].toLowerCase()
      if (/under|below|less than|upto?|max|budget/.test(kw)) {
        return {
          filters: { maxPrice: nums[0] },
          remaining: cleaned,
          confidence: 0.9,
        }
      }
      if (/above|over|more than|min|starting/.test(kw)) {
        return {
          filters: { minPrice: nums[0] },
          remaining: cleaned,
          confidence: 0.9,
        }
      }
      if (/(?:-|to)/.test(kw)) {
        return {
          filters: { minPrice: nums[0], maxPrice: nums[1] },
          remaining: cleaned,
          confidence: 0.85,
        }
      }
    }
  }
  return null
}

function extractCategory(text: string): {
  categories: string[]
  confidence: number
} | null {
  const lower = text.toLowerCase()

  for (const [key, cats] of Object.entries(CATEGORY_MAP)) {
    const regex = new RegExp(`\\b${key}s?\\b`, 'i')
    if (regex.test(lower) || lower.includes(key)) {
      return { categories: cats, confidence: 0.85 }
    }
  }

  return null
}

function extractLocation(text: string): {
  location: string
  remaining: string
  confidence: number
} | null {
  for (const prefix of LOCATION_KEYWORDS) {
    const idx = text.toLowerCase().indexOf(prefix)
    if (idx >= 0) {
      const after = text.slice(idx + prefix.length).trim()
      const locationMatch = after.match(/^[A-Za-z\s]+(?:\b|$)/)
      if (locationMatch) {
        const location = locationMatch[0].trim()
        const remaining = text.slice(0, idx) + text.slice(idx + prefix.length + location.length)
        return { location, remaining: remaining.trim(), confidence: 0.8 }
      }
    }
  }
  return null
}
