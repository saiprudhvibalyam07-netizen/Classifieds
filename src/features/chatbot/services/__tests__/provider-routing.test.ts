import { describe, it, expect, vi } from 'vitest'

vi.mock('../config', () => ({
  CHATBOT_CONFIG: {
    enabled: true,
    mockMode: true,
    typingDelay: { min: 10, max: 20 },
    maxStarterPrompts: 4,
  },
}))

describe('getConversationProvider routing (mockMode: true)', () => {
  it('returns mockConversationProvider and does NOT return fallback', async () => {
    const { getConversationProvider } = await import('../provider')
    const provider = getConversationProvider()

    const response = await provider.sendMessage('hi', 'visitor')

    // Mock provider returns greeting, NOT the OpenAI fallback
    expect(response.content).toContain('Welcome')
    expect(response.content).not.toContain('apologize')
    expect(response.content).not.toContain('unable to process')
  })

  it('returns mockConversationProvider for various inputs', async () => {
    const { getConversationProvider } = await import('../provider')
    const provider = getConversationProvider()

    const tests = [
      { input: 'hello', expected: 'Welcome' },
      { input: 'how to buy', expected: 'Buying' },
      { input: 'is it safe', expected: 'Safety' },
      { input: 'show me categories', expected: 'Mobiles' },
    ]

    for (const { input, expected } of tests) {
      const response = await provider.sendMessage(input, 'visitor')
      expect(response.content).toContain(expected)
      expect(response.content).not.toContain('apologize')
    }
  })
})
