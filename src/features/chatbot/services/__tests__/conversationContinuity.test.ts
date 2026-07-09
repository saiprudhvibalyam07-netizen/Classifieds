import { describe, it, expect, beforeEach } from 'vitest'
import { summarizeConversation, buildContinuityContext, findRelatedConversations, clearSummaries, getConversationSummary } from '../conversationContinuity'
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

describe('ConversationContinuity', () => {
  beforeEach(async () => {
    await clearAllMemories()
    await clearSummaries()
  })

  describe('summarizeConversation', () => {
    it('creates a summary from messages', async () => {
      const messages = [
        makeMsg({ id: 'm1', content: 'I am looking for a laptop' }),
        makeMsg({ id: 'm2', role: 'assistant', content: 'What is your budget?' }),
        makeMsg({ id: 'm3', content: 'Around 50000' }),
      ]
      const summary = await summarizeConversation('conv-1', 'user-1', 'sess-1', messages)
      expect(summary.conversationId).toBe('conv-1')
      expect(summary.userId).toBe('user-1')
      expect(summary.sessionId).toBe('sess-1')
      expect(summary.summary.length).toBeGreaterThan(0)
      expect(summary.topics.length).toBeGreaterThanOrEqual(1)
      expect(summary.messageCount).toBe(3)
    })

    it('extracts topics from messages', async () => {
      const messages = [
        makeMsg({ id: 'm1', content: 'Looking for furniture and electronics' }),
        makeMsg({ id: 'm2', role: 'assistant', content: 'I can help with that' }),
      ]
      const summary = await summarizeConversation('conv-2', 'user-1', 'sess-1', messages)
      expect(summary.topics.length).toBeGreaterThanOrEqual(1)
    })

    it('handles empty message list', async () => {
      const summary = await summarizeConversation('conv-3', 'user-1', 'sess-1', [])
      expect(summary.summary).toBe('No messages')
      expect(summary.topics).toHaveLength(0)
      expect(summary.messageCount).toBe(0)
    })

    it('stores conversation summary in memory', async () => {
      const messages = [makeMsg({ id: 'm1', content: 'Looking for a car' })]
      await summarizeConversation('conv-4', 'user-1', 'sess-1', messages)
      const stored = await getConversationSummary('conv-4')
      expect(stored).toBeDefined()
      expect(stored!.conversationId).toBe('conv-4')
    })
  })

  describe('findRelatedConversations', () => {
    it('finds conversations by topic match', async () => {
      const msgs1 = [makeMsg({ id: 'm1', content: 'Looking for a laptop for programming' })]
      await summarizeConversation('conv-1', 'user-1', 'sess-1', msgs1)
      const msgs2 = [makeMsg({ id: 'm2', content: 'I need furniture for my room' })]
      await summarizeConversation('conv-2', 'user-1', 'sess-2', msgs2)

      const related = await findRelatedConversations('user-1', 'laptop')
      expect(related.length).toBeGreaterThanOrEqual(1)
      expect(related.some((r) => r.conversationId === 'conv-1')).toBe(true)
    })

    it('returns empty for no matches', async () => {
      const related = await findRelatedConversations('user-1', 'nonexistent_topic_xyz')
      expect(related).toHaveLength(0)
    })

    it('only returns conversations for the same user', async () => {
      await summarizeConversation('conv-1', 'user-1', 'sess-1', [makeMsg({ content: 'Looking for a laptop' })])
      const related = await findRelatedConversations('user-2', 'laptop')
      expect(related).toHaveLength(0)
    })
  })

  describe('buildContinuityContext', () => {
    it('builds context from related conversations', async () => {
      await summarizeConversation('conv-1', 'user-1', 'sess-1', [
        makeMsg({ id: 'm1', content: 'Looking for a laptop' }),
      ])
      const context = await buildContinuityContext('user-1', 'sess-2', 'laptop')
      expect(context).toContain('Previous Conversation')
      expect(context).toContain('laptop')
    })

    it('returns empty string for unauthenticated user', async () => {
      const context = await buildContinuityContext(null, null, 'laptop')
      expect(context).toBe('')
    })

    it('returns empty string when no related conversations found', async () => {
      const context = await buildContinuityContext('user-1', null, 'xyz_nonexistent')
      expect(context).toBe('')
    })
  })
})
