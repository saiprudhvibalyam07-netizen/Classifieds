import { describe, it, expect } from 'vitest'
import { validateResponse, buildFallbackResponse } from '../responseValidator'

describe('responseValidator', () => {
  describe('validateResponse', () => {
    it('accepts valid responses', () => {
      const result = validateResponse('Here is a helpful response about listings.')
      expect(result.valid).toBe(true)
    })

    it('rejects empty responses', () => {
      const result = validateResponse('')
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('empty')
    })

    it('rejects whitespace-only responses', () => {
      const result = validateResponse('   ')
      expect(result.valid).toBe(false)
    })

    it('rejects responses with contact info patterns', () => {
      const result = validateResponse('contact me at user@example.com')
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('prohibited')
    })

    it('rejects responses with phone numbers', () => {
      const result = validateResponse('call me at +1 555-123-4567')
      expect(result.valid).toBe(false)
    })

    it('rejects responses with external payment mentions', () => {
      const result = validateResponse('send payment via paypal')
      expect(result.valid).toBe(false)
    })

    it('rejects responses with valuation language', () => {
      const result = validateResponse('I can provide a price estimate for your item')
      expect(result.valid).toBe(false)
    })

    it('rejects responses with legal advice', () => {
      const result = validateResponse('You should consult a lawyer')
      expect(result.valid).toBe(false)
    })

    it('rejects overly long responses', () => {
      const longContent = 'A'.repeat(8001)
      const result = validateResponse(longContent)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('exceeds')
    })

    it('accepts responses at exactly max length', () => {
      const content = 'A'.repeat(8000)
      const result = validateResponse(content)
      expect(result.valid).toBe(true)
    })
  })

  describe('buildFallbackResponse', () => {
    it('returns a non-empty fallback message', () => {
      const fallback = buildFallbackResponse()
      expect(fallback.length).toBeGreaterThan(0)
      expect(fallback).toContain('apologize')
    })
  })
})
