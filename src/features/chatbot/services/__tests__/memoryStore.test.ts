import { describe, it, expect, beforeEach } from 'vitest'
import {
  storeMemory, getMemory, deleteMemory, deleteUserMemories, deleteSessionMemories,
  getAllMemories, exportMemories, getMemoryStats, clearAllMemories, pruneExpiredMemories, storeMemories,
} from '../memoryStore'
import type { MemoryEntry } from '../../types'

function makeEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: overrides.id ?? 'mem-1',
    userId: overrides.userId ?? 'user-1',
    sessionId: overrides.sessionId ?? null,
    scope: overrides.scope ?? 'preference',
    key: overrides.key ?? 'test_key',
    value: overrides.value ?? 'test_value',
    confidence: overrides.confidence ?? 0.8,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    expiresAt: overrides.expiresAt ?? null,
  }
}

describe('MemoryStore', () => {
  beforeEach(async () => {
    await clearAllMemories()
  })

  describe('storeMemory', () => {
    it('stores a memory entry', async () => {
      const entry = makeEntry()
      await storeMemory(entry)
      const results = await getMemory({ userId: 'user-1' })
      expect(results).toHaveLength(1)
      expect(results[0].key).toBe('test_key')
    })

    it('stores in session store when scope is session', async () => {
      const entry = makeEntry({ scope: 'session', sessionId: 'sess-1' })
      await storeMemory(entry)
      const results = await getMemory({ sessionId: 'sess-1', scope: 'session' })
      expect(results).toHaveLength(1)
    })

    it('updates existing entry with same key, scope, and value', async () => {
      const entry = makeEntry({ value: 'same_val', confidence: 0.5 })
      await storeMemory(entry)
      const updated = makeEntry({ value: 'same_val', confidence: 0.9 })
      await storeMemory(updated)
      const results = await getMemory({ userId: 'user-1', key: 'test_key' })
      expect(results).toHaveLength(1)
      expect(results[0].confidence).toBe(0.9)
    })
  })

  describe('storeMemories', () => {
    it('stores multiple entries', async () => {
      const entries = [
        makeEntry({ id: 'mem-1', key: 'key1', value: 'val1' }),
        makeEntry({ id: 'mem-2', key: 'key2', value: 'val2' }),
        makeEntry({ id: 'mem-3', key: 'key3', value: 'val3' }),
      ]
      await storeMemories(entries)
      const results = await getMemory({ userId: 'user-1', limit: 10 })
      expect(results).toHaveLength(3)
    })
  })

  describe('getMemory', () => {
    it('returns empty array when no matches', async () => {
      const results = await getMemory({ userId: 'nonexistent' })
      expect(results).toHaveLength(0)
    })

    it('filters by key', async () => {
      await storeMemory(makeEntry({ id: 'm1', key: 'color', value: 'blue' }))
      await storeMemory(makeEntry({ id: 'm2', key: 'size', value: 'large' }))
      const results = await getMemory({ userId: 'user-1', key: 'color' })
      expect(results).toHaveLength(1)
      expect(results[0].key).toBe('color')
    })

    it('filters by scope', async () => {
      await storeMemory(makeEntry({ id: 'm1', scope: 'preference' }))
      await storeMemory(makeEntry({ id: 'm2', scope: 'interest' }))
      const prefs = await getMemory({ userId: 'user-1', scope: 'preference' })
      expect(prefs).toHaveLength(1)
      expect(prefs[0].scope).toBe('preference')
    })

    it('respects limit', async () => {
      for (let i = 0; i < 5; i++) {
        await storeMemory(makeEntry({ id: `mem-${i}`, key: `key${i}` }))
      }
      const results = await getMemory({ userId: 'user-1', limit: 2 })
      expect(results).toHaveLength(2)
    })

    it('filters expired entries', async () => {
      const past = new Date(Date.now() - 86_400_000).toISOString()
      await storeMemory(makeEntry({ id: 'm1', expiresAt: past }))
      await storeMemory(makeEntry({ id: 'm2', expiresAt: null }))
      const results = await getMemory({ userId: 'user-1' })
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('m2')
    })
  })

  describe('deleteMemory', () => {
    it('deletes by id', async () => {
      await storeMemory(makeEntry({ id: 'delete-me' }))
      await deleteMemory('delete-me')
      const results = await getMemory({ userId: 'user-1' })
      expect(results).toHaveLength(0)
    })

    it('does nothing for nonexistent id', async () => {
      await expect(deleteMemory('nonexistent')).resolves.not.toThrow()
    })
  })

  describe('deleteUserMemories', () => {
    it('deletes all entries for a user', async () => {
      await storeMemory(makeEntry({ id: 'm1', userId: 'user-1' }))
      await storeMemory(makeEntry({ id: 'm2', userId: 'user-1', key: 'k2' }))
      await storeMemory(makeEntry({ id: 'm3', userId: 'user-2', key: 'k3' }))
      const count = await deleteUserMemories('user-1')
      expect(count).toBe(2)
      const user1 = await getMemory({ userId: 'user-1' })
      expect(user1).toHaveLength(0)
      const user2 = await getMemory({ userId: 'user-2' })
      expect(user2).toHaveLength(1)
    })

    it('returns 0 for user with no entries', async () => {
      const count = await deleteUserMemories('nonexistent')
      expect(count).toBe(0)
    })
  })

  describe('deleteSessionMemories', () => {
    it('deletes session-scoped entries', async () => {
      await storeMemory(makeEntry({ id: 'm1', scope: 'session', sessionId: 'sess-1' }))
      await storeMemory(makeEntry({ id: 'm2', scope: 'session', sessionId: 'sess-1', key: 'k2' }))
      await storeMemory(makeEntry({ id: 'm3', scope: 'preference', userId: 'user-1', key: 'k3' }))
      const count = await deleteSessionMemories('sess-1')
      expect(count).toBe(2)
      const sessionResults = await getMemory({ sessionId: 'sess-1', scope: 'session' })
      expect(sessionResults).toHaveLength(0)
    })
  })

  describe('getAllMemories', () => {
    it('returns all entries for user including session', async () => {
      await storeMemory(makeEntry({ id: 'm1', userId: 'user-1', sessionId: 'sess-1', scope: 'session' }))
      await storeMemory(makeEntry({ id: 'm2', userId: 'user-1', scope: 'preference' }))
      const all = await getAllMemories('user-1', 'sess-1')
      expect(all).toHaveLength(2)
    })
  })

  describe('exportMemories', () => {
    it('exports as JSON string', async () => {
      await storeMemory(makeEntry({ id: 'm1', userId: 'user-1' }))
      const exported = await exportMemories('user-1')
      const parsed = JSON.parse(exported)
      expect(parsed.userId).toBe('user-1')
      expect(parsed.exportedAt).toBeDefined()
      expect(parsed.entries).toHaveLength(1)
    })
  })

  describe('getMemoryStats', () => {
    it('returns correct stats', async () => {
      await storeMemory(makeEntry({ id: 'm1', scope: 'session', sessionId: 's1' }))
      await storeMemory(makeEntry({ id: 'm2', scope: 'preference' }))
      await storeMemory(makeEntry({ id: 'm3', scope: 'interest' }))
      await storeMemory(makeEntry({ id: 'm4', scope: 'conversation' }))
      const stats = await getMemoryStats()
      expect(stats.totalEntries).toBe(4)
      expect(stats.sessionEntries).toBe(1)
      expect(stats.persistentEntries).toBe(3)
      expect(stats.preferenceCount).toBe(1)
      expect(stats.conversationCount).toBe(1)
      expect(stats.estimatedTokens).toBeGreaterThan(0)
    })

    it('returns zeroes for empty store', async () => {
      const stats = await getMemoryStats()
      expect(stats.totalEntries).toBe(0)
      expect(stats.sessionEntries).toBe(0)
      expect(stats.persistentEntries).toBe(0)
    })
  })

  describe('pruneExpiredMemories', () => {
    it('removes expired entries', async () => {
      const past = new Date(Date.now() - 86_400_000).toISOString()
      await storeMemory(makeEntry({ id: 'm1', value: 'expired_val', expiresAt: past }))
      await storeMemory(makeEntry({ id: 'm2', value: 'active_val', expiresAt: null }))
      const pruned = await pruneExpiredMemories()
      expect(pruned).toBe(1)
      const results = await getMemory({ userId: 'user-1' })
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('m2')
    })

    it('returns 0 when nothing expired', async () => {
      await storeMemory(makeEntry({ id: 'm1' }))
      const pruned = await pruneExpiredMemories()
      expect(pruned).toBe(0)
    })
  })
})
