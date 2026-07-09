import { describe, it, expect } from 'vitest'
import { buildConversationContext, buildFullMessageList } from '../contextBuilder'
import { buildSystemPrompt } from '../promptBuilder'
import type { ChatbotMessage } from '../../types'

function msg(content: string, role: 'user' | 'assistant' = 'user'): ChatbotMessage {
  return {
    id: crypto.randomUUID(),
    conversationId: 'conv-1',
    role,
    content,
    createdAt: new Date().toISOString(),
    status: 'sent',
  }
}

describe('Conversation Context Edge Cases', () => {
  describe('Empty and Boundary States', () => {
    it('handles null messages gracefully', () => {
      const ctx = buildConversationContext([])
      expect(ctx).toEqual([])
    })

    it('handles single user message', () => {
      const ctx = buildConversationContext([msg('Hello')])
      expect(ctx).toHaveLength(1)
      expect(ctx[0].role).toBe('user')
    })

    it('handles single assistant message', () => {
      const ctx = buildConversationContext([msg('Hello', 'assistant')])
      expect(ctx).toHaveLength(1)
      expect(ctx[0].role).toBe('assistant')
    })

    it('handles alternating messages', () => {
      const messages = [
        msg('A', 'user'),
        msg('B', 'assistant'),
        msg('C', 'user'),
        msg('D', 'assistant'),
      ]
      const ctx = buildConversationContext(messages)
      expect(ctx).toHaveLength(4)
      expect(ctx.map((m) => m.content)).toEqual(['A', 'B', 'C', 'D'])
    })
  })

  describe('Large Histories', () => {
    it('caps at 20 messages', () => {
      const messages = Array.from({ length: 50 }, (_, i) => msg(`Message ${i}`))
      const ctx = buildConversationContext(messages)
      expect(ctx.length).toBeLessThanOrEqual(20)
    })

    it('preserves order when capped', () => {
      const messages = Array.from({ length: 25 }, (_, i) => msg(`Msg ${i}`))
      const ctx = buildConversationContext(messages)
      expect(ctx[0].content).toBe('Msg 5')
      expect(ctx[ctx.length - 1].content).toBe('Msg 24')
    })

    it('handles exactly 20 messages', () => {
      const messages = Array.from({ length: 20 }, (_, i) => msg(`Message ${i}`))
      const ctx = buildConversationContext(messages)
      expect(ctx).toHaveLength(20)
    })

    it('handles exactly 21 messages (one over cap)', () => {
      const messages = Array.from({ length: 21 }, (_, i) => msg(`Message ${i}`))
      const ctx = buildConversationContext(messages)
      expect(ctx.length).toBeLessThanOrEqual(20)
      expect(ctx[0].content).toBe('Message 1')
    })
  })

  describe('Token-Limited Context', () => {
    it('truncates when messages exceed token budget', () => {
      const longMsg = msg('Long message content '.repeat(200))
      const shortMsg = msg('Short')
      const messages = [longMsg, longMsg, shortMsg]
      const ctx = buildConversationContext(messages, 100)
      expect(ctx.length).toBeLessThan(3)
    })

    it('includes complete messages when under budget', () => {
      const messages = [msg('A'), msg('B'), msg('C')]
      const ctx = buildConversationContext(messages, 1000)
      expect(ctx).toHaveLength(3)
    })

    it('returns empty for messages that all exceed budget', () => {
      const hugeMsg = msg('A'.repeat(10000))
      const ctx = buildConversationContext([hugeMsg], 10)
      expect(ctx).toHaveLength(0)
    })
  })

  describe('Full Message List Assembly', () => {
    it('places system prompt first', () => {
      const system = 'You are ValBot'
      const context = [{ role: 'user' as const, content: 'Hello' }]
      const full = buildFullMessageList(system, context, 'Hi')
      expect(full[0].role).toBe('system')
      expect(full[0].content).toBe(system)
    })

    it('places user message last', () => {
      const system = buildSystemPrompt('visitor')
      const context = [{ role: 'user' as const, content: 'Previous question' }]
      const full = buildFullMessageList(system, context, 'New question')
      expect(full[full.length - 1].role).toBe('user')
      expect(full[full.length - 1].content).toBe('New question')
    })

    it('includes context between system and user', () => {
      const system = buildSystemPrompt('visitor')
      const context = [
        { role: 'user' as const, content: 'Q1' },
        { role: 'assistant' as const, content: 'A1' },
      ]
      const full = buildFullMessageList(system, context, 'Q2')
      expect(full).toHaveLength(4)
      expect(full[1].content).toBe('Q1')
      expect(full[2].content).toBe('A1')
    })

    it('works with empty context', () => {
      const system = buildSystemPrompt('visitor')
      const full = buildFullMessageList(system, [], 'First question')
      expect(full).toHaveLength(2)
      expect(full[0].role).toBe('system')
      expect(full[1].role).toBe('user')
    })
  })

  describe('Role Preservation', () => {
    it('preserves user role', () => {
      const messages = [msg('Hello')]
      const ctx = buildConversationContext(messages)
      expect(ctx[0].role).toBe('user')
    })

    it('preserves assistant role', () => {
      const messages = [msg('Hello', 'assistant')]
      const ctx = buildConversationContext(messages)
      expect(ctx[0].role).toBe('assistant')
    })

    it('filters out system role messages', () => {
      const systemMsg: ChatbotMessage = {
        id: 'sys-1',
        conversationId: 'conv-1',
        role: 'system',
        content: 'System instruction',
        createdAt: new Date().toISOString(),
        status: 'sent',
      }
      const messages = [systemMsg, msg('Hello')]
      const ctx = buildConversationContext(messages)
      expect(ctx).toHaveLength(1)
      expect(ctx[0].role).toBe('user')
    })
  })
})
