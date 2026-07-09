import type { UserProfile, UserPreference, ChatbotRole, MemoryEntry } from '../types'
import { MEMORY_CONFIG } from '../config'
import { getMemory } from './memoryStore'
import { logger } from './logger'

export async function buildUserProfile(
  userId: string,
  role: ChatbotRole,
  sessionId?: string | null
): Promise<UserProfile> {
  const memories = await getMemory({ userId, sessionId, limit: 100 })
  const preferences = extractPreferences(memories)
  const recentTopics = extractRecentTopics(memories)
  const viewedListings = extractViewedListings(memories)

  const sessionMemories = memories.filter((m) => m.scope === 'session')
  const sessionCount = new Set(sessionMemories.map((m) => m.sessionId)).size
  const dates = memories.map((m) => m.createdAt).sort()
  const timestamps = memories.map((m) => m.updatedAt).sort()

  const profile: UserProfile = {
    userId,
    role,
    preferences,
    recentTopics,
    viewedListings,
    sessionCount: Math.max(1, sessionCount),
    firstSeen: dates[0] ?? new Date().toISOString(),
    lastSeen: timestamps[timestamps.length - 1] ?? new Date().toISOString(),
  }

  logger.info('user_profile_built', {
    details: { userId, role, preferences: preferences.length, topics: recentTopics.length },
  })

  return profile
}

export async function buildProfileContext(profile: UserProfile): Promise<string> {
  const parts: string[] = []

  if (profile.preferences.length > 0) {
    const prefLines = profile.preferences
      .filter((p) => p.confidence >= MEMORY_CONFIG.minConfidence)
      .map((p) => {
        const val = Array.isArray(p.value) ? p.value.join(', ') : p.value
        return `- ${p.key}: ${val} (confidence: ${Math.round(p.confidence * 100)}%)`
      })
    if (prefLines.length > 0) {
      parts.push('## User Preferences')
      parts.push(...prefLines)
    }
  }

  if (profile.recentTopics.length > 0) {
    parts.push(`\n## Recently Discussed Topics\n${profile.recentTopics.slice(0, 5).join(', ')}`)
  }

  if (profile.viewedListings.length > 0) {
    parts.push(`\n## Recently Viewed Listings\n${profile.viewedListings.slice(0, 3).join(', ')}`)
  }

  if (profile.sessionCount > 1) {
    parts.push(`\n## Session Info\nReturning user (${profile.sessionCount} sessions). First seen: ${new Date(profile.firstSeen).toLocaleDateString()}`)
  }

  return parts.join('\n')
}

function extractPreferences(memories: MemoryEntry[]): UserPreference[] {
  return memories
    .filter((m) => m.scope === 'preference')
    .map((m) => ({
      key: m.key,
      value: m.value as string | number | string[],
      confidence: m.confidence,
      source: (m.confidence >= 0.8 ? 'explicit' : m.confidence >= 0.5 ? 'inferred' : 'default') as 'explicit' | 'inferred' | 'default',
      updatedAt: m.updatedAt,
    }))
    .sort((a, b) => b.confidence - a.confidence)
}

function extractRecentTopics(memories: MemoryEntry[]): string[] {
  const topics = new Set<string>()
  const topicEntries = memories
    .filter((m) => m.key === 'topic' || m.key === 'interest')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  for (const entry of topicEntries) {
    const val = entry.value as string
    if (val && topics.size < MEMORY_CONFIG.maxRecentTopics) {
      topics.add(val)
    }
  }
  return Array.from(topics)
}

function extractViewedListings(memories: MemoryEntry[]): string[] {
  const listings: string[] = []
  const viewedEntries = memories
    .filter((m) => m.key === 'viewed_listing')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  for (const entry of viewedEntries) {
    const val = entry.value as string
    if (val && listings.length < MEMORY_CONFIG.maxViewedListings) {
      listings.push(val)
    }
  }
  return listings
}
