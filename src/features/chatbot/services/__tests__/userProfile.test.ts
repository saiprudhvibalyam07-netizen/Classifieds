import { describe, it, expect, beforeEach } from 'vitest'
import { buildUserProfile, buildProfileContext } from '../userProfile'
import { storeMemory, clearAllMemories } from '../memoryStore'
import type { MemoryEntry } from '../../types'

function makePrefEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: overrides.id ?? 'pref-1',
    userId: overrides.userId ?? 'user-1',
    sessionId: overrides.sessionId ?? null,
    scope: 'preference',
    key: overrides.key ?? 'preferred_category',
    value: overrides.value ?? 'Electronics',
    confidence: overrides.confidence ?? 0.8,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    expiresAt: null,
  }
}

describe('UserProfile', () => {
  beforeEach(async () => {
    await clearAllMemories()
  })

  describe('buildUserProfile', () => {
    it('builds a profile from memory entries', async () => {
      await storeMemory(makePrefEntry({ id: 'p1', key: 'preferred_category', value: 'Electronics', confidence: 0.9 }))
      await storeMemory(makePrefEntry({ id: 'p2', key: 'preferred_location', value: 'Mumbai', confidence: 0.7 }))
      await storeMemory({ ...makePrefEntry({ id: 'p3', key: 'topic', value: 'laptops' }), scope: 'interest' })
      await storeMemory({ ...makePrefEntry({ id: 'p4', key: 'viewed_listing', value: 'MacBook Pro' }), scope: 'interaction' })

      const profile = await buildUserProfile('user-1', 'buyer')
      expect(profile.userId).toBe('user-1')
      expect(profile.role).toBe('buyer')
      expect(profile.preferences.length).toBeGreaterThanOrEqual(2)
      expect(profile.recentTopics.length).toBeGreaterThanOrEqual(1)
      expect(profile.viewedListings.length).toBeGreaterThanOrEqual(1)
      expect(profile.sessionCount).toBeGreaterThanOrEqual(1)
      expect(profile.firstSeen).toBeDefined()
      expect(profile.lastSeen).toBeDefined()
    })

    it('returns default profile when no memories exist', async () => {
      const profile = await buildUserProfile('new-user', 'visitor')
      expect(profile.userId).toBe('new-user')
      expect(profile.role).toBe('visitor')
      expect(profile.preferences).toHaveLength(0)
      expect(profile.recentTopics).toHaveLength(0)
      expect(profile.viewedListings).toHaveLength(0)
      expect(profile.sessionCount).toBe(1)
    })

    it('returns preferences sorted by confidence descending', async () => {
      await storeMemory(makePrefEntry({ id: 'p1', key: 'preferred_category', value: 'Cars', confidence: 0.3 }))
      await storeMemory(makePrefEntry({ id: 'p2', key: 'preferred_category', value: 'Electronics', confidence: 0.9 }))
      await storeMemory(makePrefEntry({ id: 'p3', key: 'preferred_category', value: 'Furniture', confidence: 0.6 }))
      const profile = await buildUserProfile('user-1', 'buyer')
      expect(profile.preferences[0].value).toBe('Electronics')
      expect(profile.preferences[1].value).toBe('Furniture')
      expect(profile.preferences[2].value).toBe('Cars')
    })
  })

  describe('buildProfileContext', () => {
    it('formats preferences into context string', async () => {
      await storeMemory(makePrefEntry({ id: 'p1', key: 'preferred_category', value: 'Electronics', confidence: 0.9 }))
      await storeMemory(makePrefEntry({ id: 'p2', key: 'preferred_location', value: 'Mumbai', confidence: 0.7 }))
      const profile = await buildUserProfile('user-1', 'buyer')
      const context = await buildProfileContext(profile)
      expect(context).toContain('User Preferences')
      expect(context).toContain('Electronics')
      expect(context).toContain('Mumbai')
    })

    it('returns empty string for empty profile', async () => {
      const profile = await buildUserProfile('new-user', 'visitor')
      const context = await buildProfileContext(profile)
      expect(context).toBe('')
    })

    it('filters low confidence preferences', async () => {
      await storeMemory(makePrefEntry({ id: 'p1', key: 'preferred_category', value: 'Random', confidence: 0.1 }))
      const profile = await buildUserProfile('user-1', 'buyer')
      const context = await buildProfileContext(profile)
      expect(context).not.toContain('Random')
    })

    it('includes recent topics when available', async () => {
      await storeMemory(makePrefEntry({ id: 'p1', key: 'preferred_category', value: 'Electronics', confidence: 0.9 }))
      await storeMemory({ ...makePrefEntry({ id: 'p2', key: 'topic', value: 'gaming laptops' }), scope: 'interest' })
      const profile = await buildUserProfile('user-1', 'buyer')
      const context = await buildProfileContext(profile)
      expect(context).toContain('Recently Discussed Topics')
    })
  })
})
