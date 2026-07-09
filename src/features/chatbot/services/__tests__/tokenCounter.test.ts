import { describe, it, expect } from 'vitest'
import { estimateTokens, countMessageTokens, createTokenUsage } from '../tokenCounter'

describe('tokenCounter', () => {
  describe('estimateTokens', () => {
    it('estimates tokens for a short string', () => {
      const tokens = estimateTokens('Hello world')
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThan(10)
    })

    it('estimates more tokens for longer text', () => {
      const short = estimateTokens('Hello')
      const long = estimateTokens('Hello world this is a longer sentence')
      expect(long).toBeGreaterThan(short)
    })

    it('returns 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0)
    })
  })

  describe('countMessageTokens', () => {
    it('counts tokens for a single message', () => {
      const messages = [{ role: 'user', content: 'Hello' }]
      const tokens = countMessageTokens(messages)
      expect(tokens).toBeGreaterThan(0)
    })

    it('counts more tokens for multiple messages', () => {
      const one = countMessageTokens([{ role: 'user', content: 'Hello' }])
      const two = countMessageTokens([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ])
      expect(two).toBeGreaterThan(one)
    })
  })

  describe('createTokenUsage', () => {
    it('creates token usage with correct totals', () => {
      const usage = createTokenUsage(100, 50)
      expect(usage.promptTokens).toBe(100)
      expect(usage.completionTokens).toBe(50)
      expect(usage.totalTokens).toBe(150)
    })
  })
})
