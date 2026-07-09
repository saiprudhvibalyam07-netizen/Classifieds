import { describe, it, expect, beforeEach } from 'vitest'
import {
  processMessage, trackListingView, getRecommendations, getContext,
  forgetMemory, forgetUserMemories, forgetSessionMemories, resetAll, getMemoryStats,
} from '../memoryManager'
import { clearAllMemories } from '../memoryStore'
import type { ChatbotMessage } from '../../types'

function makeMsg(overrides: Partial<ChatbotMessage> = {}): ChatbotMessage {
  return {
    id: overrides.id ?? 'msg-1',
    conversationId: overrides.conversationId ?? 'conv-1',
    role: overrides.role ?? 'user',
    content: overrides.content ?? 'Hello',
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    status: 'sent',
  }
}

describe('MemoryManager', () => {
  beforeEach(async () => {
    await resetAll()
  })

  describe('processMessage', () => {
    it('extracts preferences from user messages', async () => {
      const msg = makeMsg({ content: 'I am looking for a laptop in Mumbai under 50000' })
      const result = await processMessage('user-1', 'sess-1', msg, [])
      expect(result.learned.length).toBeGreaterThan(0)
      expect(result.context.profile).not.toBeNull()
      expect(result.context.memoryEntries).toBeDefined()
    })

    it('returns empty for messages without userId', async () => {
      const msg = makeMsg({ content: 'Hello' })
      const result = await processMessage(null, null, msg, [])
      expect(result.learned).toHaveLength(0)
      expect(result.context.profile).toBeNull()
    })

    it('builds profile context for returning user', async () => {
      const msg1 = makeMsg({ content: 'I like electronics' })
      await processMessage('user-1', 'sess-1', msg1, [])
      const msg2 = makeMsg({ content: 'Show me phones' })
      const result = await processMessage('user-1', 'sess-1', msg2, [msg1])
      expect(result.context.profileContext).toContain('User Preferences')
    })

    it('summarizes conversations with enough messages', async () => {
      const messages = Array.from({ length: 12 }, (_, i) =>
        makeMsg({ id: `msg-${i}`, content: `Message ${i}` })
      )
      const lastMsg = messages[messages.length - 1]
      const result = await processMessage('user-1', 'sess-1', lastMsg, messages)
      expect(result.context.continuityContext).toBeDefined()
    })
  })

  describe('trackListingView', () => {
    it('tracks a viewed listing', async () => {
      await trackListingView('user-1', 'sess-1', 'MacBook Pro', 'Electronics')
      const result = await getContext('user-1', 'sess-1')
      expect(result.memoryEntries.length).toBeGreaterThanOrEqual(1)
      const listingMemories = result.memoryEntries.filter((m) => m.key === 'viewed_listing')
      expect(listingMemories.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getRecommendations', () => {
    it('returns recommendations for user with preferences', async () => {
      await processMessage('user-1', 'sess-1', makeMsg({ content: 'I like electronics' }), [])
      const recs = await getRecommendations('user-1', 'sess-1')
      expect(recs).toHaveProperty('listings')
      expect(recs).toHaveProperty('categories')
    })

    it('returns empty for user without preferences', async () => {
      const recs = await getRecommendations('user-2', 'sess-1')
      expect(recs.listings).toHaveLength(0)
    })

    it('returns empty for anonymous user', async () => {
      const recs = await getRecommendations(null, null)
      expect(recs.listings).toHaveLength(0)
    })
  })

  describe('getContext', () => {
    it('returns memory context for user', async () => {
      await processMessage('user-1', 'sess-1', makeMsg({ content: 'Hello' }), [])
      const ctx = await getContext('user-1', 'sess-1')
      expect(ctx.profile).toBeDefined()
      expect(ctx.memoryEntries).toBeDefined()
      expect(ctx.profileContext).toBeDefined()
    })
  })

  describe('forgetMemory', () => {
    it('forgets a specific memory', async () => {
      await processMessage('user-1', 'sess-1', makeMsg({ content: 'Hello' }), [])
      const ctx = await getContext('user-1', 'sess-1')
      const id = ctx.memoryEntries[0]?.id
      if (id) {
        await forgetMemory(id)
        const ctx2 = await getContext('user-1', 'sess-1')
        expect(ctx2.memoryEntries.find((m) => m.id === id)).toBeUndefined()
      }
    })
  })

  describe('forgetUserMemories', () => {
    it('forgets all memories for a user', async () => {
      await processMessage('user-1', 'sess-1', makeMsg({ content: 'I like electronics in Mumbai' }), [])
      const count = await forgetUserMemories('user-1')
      expect(count).toBeGreaterThan(0)
      const ctx = await getContext('user-1', 'sess-1')
      expect(ctx.memoryEntries).toHaveLength(0)
    })
  })

  describe('forgetSessionMemories', () => {
    it('forgets session memories', async () => {
      await processMessage('user-1', 'sess-1', makeMsg({ content: 'I like electronics' }), [])
      const count = await forgetSessionMemories('sess-1')
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getMemoryStats', () => {
    it('returns memory statistics', async () => {
      await processMessage('user-1', 'sess-1', makeMsg({ content: 'I like electronics' }), [])
      const stats = await getMemoryStats()
      expect(stats.totalEntries).toBeGreaterThanOrEqual(1)
      expect(stats.estimatedTokens).toBeGreaterThan(0)
    })
  })
})
