import type { HallucinationCheck, MarketplaceListing, MarketplaceCategory, MarketplaceSeller } from '../types'
import { logger } from './logger'

export interface HallucinationGuardOptions {
  responseContent: string
  retrievedChunks: Array<{ content: string; documentId: string }>
  listings?: MarketplaceListing[]
  categories?: MarketplaceCategory[]
  sellers?: MarketplaceSeller[]
}

export function checkHallucination(options: HallucinationGuardOptions): HallucinationCheck {
  const reasons: string[] = []
  let confidence = 1.0

  const priceClaim = extractPriceClaims(options.responseContent)
  const listingClaim = extractListingClaims(options.responseContent)
  const policyClaim = extractPolicyClaims(options.responseContent)

  if (priceClaim && options.listings) {
    const actualPrices = options.listings.map((l) => l.price)
    const matched = actualPrices.some((p) => Math.abs(p - priceClaim) / p < 0.1)
    if (!matched) {
      reasons.push(`Price ₹${priceClaim} not found in retrieved listing data`)
      confidence *= 0.5
    }
  }

  if (listingClaim && options.listings) {
    const listingTitles = options.listings.map((l) => l.title.toLowerCase())
    const found = listingTitles.some((t) => t.includes(listingClaim.toLowerCase()))
    if (!found) {
      reasons.push(`Listing "${listingClaim}" not found in retrieved results`)
      confidence *= 0.4
    }
  }

  if (policyClaim && options.retrievedChunks.length > 0) {
    const chunkContent = options.retrievedChunks.map((c) => c.content.toLowerCase()).join(' ')
    if (!chunkContent.includes(policyClaim.toLowerCase())) {
      reasons.push(`Policy claim "${policyClaim}" not present in retrieved knowledge`)
      confidence *= 0.3
    }
  }

  const isHallucinated = confidence < 0.5 || reasons.length > 1

  if (isHallucinated) {
    logger.warn('hallucination_detected', {
      details: { confidence, reasons, responsePreview: options.responseContent.slice(0, 100) },
    })
  }

  return { isHallucinated, confidence, reasons }
}

function extractPriceClaims(text: string): number | null {
  const patterns = [
    /(?:price|cost|worth|value|rate)\s*(?:is|:)?\s*(?:₹|Rs\.?\s*)?(\d[\d,]*)/i,
    /(?:₹|Rs\.?\s*)(\d[\d,]*)\s*(?:only|per\s+item)?/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''))
    }
  }

  return null
}

function extractListingClaims(text: string): string | null {
  const match = text.match(/(?:listing|item|product)\s+(?:called|named|titled|:)?\s*"([^"]+)"/i)
  return match?.[1] ?? null
}

function extractPolicyClaims(text: string): string | null {
  const match = text.match(/(?:policy|rule|regulation)\s+(?:says|states|requires|prohibits|allows)\s+"([^"]+)"/i)
  return match?.[1] ?? null
}
