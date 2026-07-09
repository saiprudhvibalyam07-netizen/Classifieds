import { describe, it, expect } from 'vitest'
import { buildConversationContext, buildFullMessageList } from '../contextBuilder'
import type { ChatbotMessage } from '../../types'

function createMsg(content: string, role: 'user' | 'assistant' = 'user'): ChatbotMessage {
  return {
    id: crypto.randomUUID(),
    conversationId: 'conv-1',
    role,
    content,
    createdAt: new Date().toISOString(),
    status: 'sent',
  }
}

describe('contextBuilder', () => {
  describe('buildConversationContext', () => {
    it('returns empty array for no messages', () => {
      const ctx = buildConversationContext([])
      expect(ctx).toHaveLength(0)
    })

    it('builds context from recent messages', () => {
      const messages = [
        createMsg('Hello'),
        createMsg('Hi there!', 'assistant'),
      ]
      const ctx = buildConversationContext(messages)
      expect(ctx).toHaveLength(2)
      expect(ctx[0].role).toBe('user')
      expect(ctx[0].content).toBe('Hello')
      expect(ctx[1].role).toBe('assistant')
    })

    it('limits to MAX_MESSAGES items', () => {
      const messages = Array.from({ length: 30 }, (_, i) => createMsg(`Message ${i}`))
      const ctx = buildConversationContext(messages)
      expect(ctx.length).toBeLessThanOrEqual(20)
    })

    it('includes only user and assistant roles', () => {
      const messages = [createMsg('test')]
      const ctx = buildConversationContext(messages)
      ctx.forEach((m) => {
        expect(['user', 'assistant']).toContain(m.role)
      })
    })

    it('respects token limit', () => {
      const longMsg = createMsg('A'.repeat(5000))
      const messages = [longMsg, createMsg('short')]
      const ctx = buildConversationContext(messages, 100)
      expect(ctx.length).toBeLessThan(2)
    })
  })

  describe('buildFullMessageList', () => {
    it('builds message list with system prompt first', () => {
      const messages = buildFullMessageList('System prompt', [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
      ], 'How are you?')
      expect(messages).toHaveLength(4)
      expect(messages[0].role).toBe('system')
      expect(messages[0].content).toBe('System prompt')
      expect(messages[3].role).toBe('user')
      expect(messages[3].content).toBe('How are you?')
    })
  })
})
