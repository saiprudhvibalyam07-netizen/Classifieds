import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openaiConversationProvider } from '../openaiConversationProvider'

vi.mock('../../config', () => ({
  AI_CONFIG: {
    model: 'gpt-4o-mini',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    timeout: 5000,
    maxRetries: 0,
    retryDelay: 100,
    openaiEndpoint: '/api/chat',
    openaiKey: '',
  },
  COST_CONFIG: {
    enabled: true,
    currency: 'USD',
    modelRates: {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    },
  },
  LOG_CONFIG: { enabled: false, level: 'error', maxEntries: 10 },
  CHATBOT_CONFIG: { enabled: true, mockMode: true },
}))

describe('openaiConversationProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('getRoleResponse', () => {
    it('returns greeting for visitor', () => {
      const response = openaiConversationProvider.getRoleResponse('visitor')
      expect(response).toContain('ValClassifieds')
    })

    it('returns greeting for buyer', () => {
      const response = openaiConversationProvider.getRoleResponse('buyer')
      expect(response).toContain('find listings')
    })

    it('returns greeting for seller', () => {
      const response = openaiConversationProvider.getRoleResponse('seller')
      expect(response).toContain('listings')
    })

    it('returns greeting for admin', () => {
      const response = openaiConversationProvider.getRoleResponse('admin')
      expect(response).toContain('moderation')
    })

    it('falls back to visitor for unknown roles', () => {
      const response = openaiConversationProvider.getRoleResponse('unknown' as never)
      expect(response).toContain('ValClassifieds')
    })
  })

  describe('getStarterPrompts', () => {
    it('returns prompts for visitor', () => {
      const prompts = openaiConversationProvider.getStarterPrompts('visitor')
      expect(prompts.length).toBeGreaterThan(0)
      expect(prompts.length).toBeLessThanOrEqual(4)
    })

    it('returns prompts for admin', () => {
      const prompts = openaiConversationProvider.getStarterPrompts('admin')
      expect(prompts.length).toBeGreaterThan(0)
    })

    it('falls back to visitor prompts for unknown roles', () => {
      const prompts = openaiConversationProvider.getStarterPrompts('unknown' as never)
      expect(prompts.length).toBeGreaterThan(0)
    })
  })

  describe('sendMessage', () => {
    it('returns fallback response when API fails', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('API unavailable'))
      const response = await openaiConversationProvider.sendMessage('Hello', 'visitor')
      expect(response.content).toContain('apologize')
      expect(response.delay).toBeGreaterThanOrEqual(0)
    })

    it('returns fallback response for invalid API response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      })
      const response = await openaiConversationProvider.sendMessage('Hello', 'visitor')
      expect(response.content).toContain('apologize')
    })
  })
})
