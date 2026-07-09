import type { MemoryEntry, UserPreference } from '../types'
import { MEMORY_CONFIG } from '../config'
import { storeMemory, getMemory } from './memoryStore'
import { logger } from './logger'

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Electronics: ['phone', 'laptop', 'computer', 'tablet', 'electronics', 'gadget', 'tech', 'camera', 'headphone', 'speaker', 'tv', 'monitor'],
  Furniture: ['furniture', 'sofa', 'table', 'chair', 'bed', 'desk', 'cabinet', 'shelf', 'mattress'],
  Vehicles: ['car', 'bike', 'vehicle', 'automobile', 'scooter', 'cycle', 'truck'],
  'Real Estate': ['apartment', 'house', 'flat', 'property', 'rent', 'room', 'villa', 'plot'],
  Clothing: ['clothing', 'dress', 'shirt', 'jeans', 'shoes', 'fashion', 'wear', 'accessory'],
  'Books & Media': ['book', 'magazine', 'comic', 'textbook', 'novel', 'dvd', 'cd', 'vinyl'],
}

const BUDGET_KEYWORDS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /under\s*(?:₹|Rs\.?\s*)?(\d[\d,]*)/i, label: 'budget_under' },
  { pattern: /(?:₹|Rs\.?\s*)?(\d[\d,]*)\s*(?:below|or less)/i, label: 'budget_under' },
  { pattern: /cheap|budget|affordable|inexpensive/i, label: 'budget_conscious' },
  { pattern: /premium|luxury|high.?end/i, label: 'premium' },
]

const LOCATION_KEYWORDS = /\b(in|near|at|around)\s+([A-Za-z\s]+?)(?:\b|$)/i

export async function learnFromMessage(
  userId: string | null,
  sessionId: string | null,
  content: string,
  role: 'user' | 'assistant'
): Promise<MemoryEntry[]> {
  if (!MEMORY_CONFIG.preferenceLearningEnabled) return []
  if (role !== 'user') return []
  if (!userId && !sessionId) return []

  const entries: MemoryEntry[] = []
  const lower = content.toLowerCase()
  const now = new Date().toISOString()

  const categories = extractCategories(lower)
  for (const cat of categories) {
    entries.push(createPreference(userId, sessionId, 'preferred_category', cat, 0.4, now))
  }

  const budget = extractBudget(lower)
  if (budget) {
    entries.push(createPreference(userId, sessionId, budget.key, budget.value, budget.confidence, now))
  }

  const location = extractLocation(content)
  if (location) {
    entries.push(createPreference(userId, sessionId, 'preferred_location', location, 0.35, now))
  }

  const topics = extractTopics(content)
  for (const topic of topics) {
    entries.push({
      id: crypto.randomUUID(),
      userId,
      sessionId,
      scope: 'interest',
      key: 'topic',
      value: topic,
      confidence: 0.3,
      createdAt: now,
      updatedAt: now,
      expiresAt: null,
    })
  }

  if (entries.length > 0) {
    await storeMemoriesWithDedup(entries)
    logger.info('preferences_learned', { details: { entries: entries.length, content: content.slice(0, 50) } })
  }

  return entries
}

export async function learnViewedListing(
  userId: string | null,
  sessionId: string | null,
  listingTitle: string,
  category: string
): Promise<void> {
  if (!userId && !sessionId) return
  const now = new Date().toISOString()

  const entry: MemoryEntry = {
    id: crypto.randomUUID(),
    userId,
    sessionId,
    scope: 'interaction',
    key: 'viewed_listing',
    value: listingTitle,
    confidence: 1.0,
    createdAt: now,
    updatedAt: now,
    expiresAt: null,
  }

  await storeMemory(entry)

  const catEntry: MemoryEntry = {
    id: crypto.randomUUID(),
    userId,
    sessionId,
    scope: 'preference',
    key: 'preferred_category',
    value: category,
    confidence: 0.3,
    createdAt: now,
    updatedAt: now,
    expiresAt: null,
  }

  await storeMemory(catEntry)
}

export async function getLearnedPreferences(
  userId: string | null,
  sessionId: string | null
): Promise<UserPreference[]> {
  const memories = await getMemory({ userId, sessionId, scope: 'preference', limit: 50 })
  return memories
    .filter((m) => m.confidence >= MEMORY_CONFIG.minConfidence)
    .map((m) => ({
      key: m.key,
      value: m.value as string | number | string[],
      confidence: m.confidence,
      source: m.confidence >= 0.8 ? 'explicit' as const : m.confidence >= 0.5 ? 'inferred' as const : 'default' as const,
      updatedAt: m.updatedAt,
    }))
    .sort((a, b) => b.confidence - a.confidence)
}

function extractCategories(text: string): string[] {
  const found: string[] = []
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        found.push(cat)
        break
      }
    }
  }
  return found
}

function extractBudget(text: string): { key: string; value: string; confidence: number } | null {
  for (const { pattern, label } of BUDGET_KEYWORDS) {
    const match = text.match(pattern)
    if (match) {
      if (match[1]) {
        return { key: label, value: match[1].replace(/,/g, ''), confidence: 0.7 }
      }
      return { key: label, value: 'true', confidence: 0.5 }
    }
  }
  return null
}

function extractLocation(text: string): string | null {
  const match = text.match(LOCATION_KEYWORDS)
  if (match) {
    return match[2].trim()
  }
  return null
}

function extractTopics(text: string): string[] {
  const topics: string[] = []
  const topicIndicators = [
    /(?:looking for|interested in|searching for|want to buy|need a)\s+([^.]+)/gi,
    /(?:how (?:do|can|to)|questions? about|help with)\s+([^.]+)/gi,
  ]
  for (const pattern of topicIndicators) {
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) {
      const topic = m[1].trim().toLowerCase()
      if (topic.length > 3 && topic.length < 100) {
        topics.push(topic)
      }
    }
  }
  return topics.slice(0, 3)
}

function createPreference(
  userId: string | null,
  sessionId: string | null,
  key: string,
  value: string | number | string[],
  confidence: number,
  now: string
): MemoryEntry {
  return {
    id: crypto.randomUUID(),
    userId,
    sessionId,
    scope: 'preference',
    key,
    value,
    confidence,
    createdAt: now,
    updatedAt: now,
    expiresAt: null,
  }
}

async function storeMemoriesWithDedup(entries: MemoryEntry[]): Promise<void> {
  for (const entry of entries) {
    const existing = await getMemory({ userId: entry.userId, sessionId: entry.sessionId, key: entry.key, scope: entry.scope, limit: 10 })
    const match = existing.find((e) => JSON.stringify(e.value) === JSON.stringify(entry.value))
    if (match) {
      match.confidence = Math.min(1, match.confidence + 0.1)
      match.updatedAt = new Date().toISOString()
      await storeMemory(match)
    } else {
      await storeMemory(entry)
    }
  }
}
