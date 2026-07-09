import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildUserPrompt, getPromptVersion } from '../promptBuilder'
import { buildConversationContext, buildFullMessageList } from '../contextBuilder'
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

describe('Prompt Validation', () => {
  describe('System Prompt Consistency', () => {
    it('always starts with ValBot identity', () => {
      const prompt = buildSystemPrompt('visitor')
      expect(prompt).toContain('You are ValBot')
    })

    it('always identifies the platform as ValClassifieds', () => {
      const prompt = buildSystemPrompt('visitor')
      expect(prompt).toContain('ValClassifieds')
    })

    it('includes all required sections for every role', () => {
      const roles = ['visitor', 'buyer', 'seller', 'admin'] as const
      roles.forEach((role) => {
        const prompt = buildSystemPrompt(role)
        expect(prompt).toContain('Your Responsibilities')
        expect(prompt).toContain('Safety Rules')
        expect(prompt).toContain('Marketplace Scope')
        expect(prompt).toContain('Unsupported Requests')
        expect(prompt).toContain('Refusal Strategy')
        expect(prompt).toContain('Prompt Version')
      })
    })

    it('maintains consistent structure across roles', () => {
      const visitor = buildSystemPrompt('visitor')
      const admin = buildSystemPrompt('admin')
      const visitorSections = visitor.split('##').length
      const adminSections = admin.split('##').length
      expect(visitorSections).toBe(adminSections)
    })
  })

  describe('Prompt Versioning', () => {
    it('returns current version', () => {
      expect(getPromptVersion()).toBe('v1')
    })

    it('includes version in system prompt', () => {
      const prompt = buildSystemPrompt('visitor')
      expect(prompt).toContain('v1')
    })
  })

  describe('Context Assembly', () => {
    it('assembles messages in chronological order', () => {
      const messages = [
        msg('First'),
        msg('Second'),
        msg('Third'),
      ]
      const ctx = buildConversationContext(messages)
      expect(ctx[0].content).toBe('First')
      expect(ctx[ctx.length - 1].content).toBe('Third')
    })

    it('preserves assistant messages', () => {
      const messages = [msg('Hello', 'user'), msg('Hi there', 'assistant')]
      const ctx = buildConversationContext(messages)
      expect(ctx).toHaveLength(2)
      expect(ctx[1].role).toBe('assistant')
    })

    it('builds full message list with system prompt first', () => {
      const systemPrompt = buildSystemPrompt('visitor')
      const context = buildConversationContext([msg('Hello')])
      const full = buildFullMessageList(systemPrompt, context, 'How are you?')
      expect(full[0].role).toBe('system')
      expect(full[full.length - 1].role).toBe('user')
    })
  })

  describe('Token Budgeting', () => {
    it('respects token limit in context building', () => {
      const long = msg('A very long message '.repeat(500))
      const messages = [long, msg('Short message')]
      const ctx = buildConversationContext(messages, 50)
      const totalTokens = ctx.reduce((sum, m) => sum + Math.ceil(m.content.length * 0.25), 0)
      expect(totalTokens).toBeLessThanOrEqual(60)
    })

    it('includes all messages under token budget', () => {
      const messages = [msg('A'), msg('B'), msg('C')]
      const ctx = buildConversationContext(messages, 500)
      expect(ctx).toHaveLength(3)
    })
  })

  describe('Context Truncation', () => {
    it('truncates oldest messages when over limit', () => {
      const messages = Array.from({ length: 25 }, (_, i) => msg(`Message ${i}`))
      const ctx = buildConversationContext(messages, 10000)
      expect(ctx.length).toBeLessThanOrEqual(20)
    })

    it('preserves newest messages when truncating', () => {
      const messages = Array.from({ length: 25 }, (_, i) => msg(`Message ${i}`))
      const ctx = buildConversationContext(messages, 10000)
      const lastContent = ctx[ctx.length - 1].content
      expect(lastContent).toBe('Message 24')
    })

    it('handles empty message arrays', () => {
      const ctx = buildConversationContext([])
      expect(ctx).toHaveLength(0)
    })

    it('handles single message', () => {
      const ctx = buildConversationContext([msg('Only message')])
      expect(ctx).toHaveLength(1)
    })
  })

  describe('User Prompt Building', () => {
    it('trims leading whitespace', () => {
      expect(buildUserPrompt('  hello')).toBe('hello')
    })

    it('trims trailing whitespace', () => {
      expect(buildUserPrompt('hello  ')).toBe('hello')
    })

    it('preserves internal whitespace', () => {
      expect(buildUserPrompt('hello world how are you')).toBe('hello world how are you')
    })

    it('returns empty string for empty input', () => {
      expect(buildUserPrompt('')).toBe('')
    })
  })
})
