import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildUserPrompt, getPromptVersion } from '../promptBuilder'

describe('promptBuilder', () => {
  describe('buildSystemPrompt', () => {
    it('includes base system instructions', () => {
      const prompt = buildSystemPrompt('visitor')
      expect(prompt).toContain('ValBot')
      expect(prompt).toContain('ValClassifieds')
      expect(prompt).toContain('Safety Rules')
      expect(prompt).toContain('Marketplace Scope')
      expect(prompt).toContain('Unsupported Requests')
      expect(prompt).toContain('Refusal Strategy')
    })

    it('includes role-specific instructions for visitor', () => {
      const prompt = buildSystemPrompt('visitor')
      expect(prompt).toContain('visitor exploring')
    })

    it('includes role-specific instructions for buyer', () => {
      const prompt = buildSystemPrompt('buyer')
      expect(prompt).toContain('buyer')
    })

    it('includes role-specific instructions for seller', () => {
      const prompt = buildSystemPrompt('seller')
      expect(prompt).toContain('seller')
    })

    it('includes role-specific instructions for admin', () => {
      const prompt = buildSystemPrompt('admin')
      expect(prompt).toContain('administrator')
    })

    it('falls back to visitor for unknown roles', () => {
      const prompt = buildSystemPrompt('unknown' as never)
      expect(prompt).toContain('visitor')
    })

    it('includes prompt version', () => {
      const prompt = buildSystemPrompt('visitor')
      expect(prompt).toContain('Prompt Version')
    })
  })

  describe('buildUserPrompt', () => {
    it('trims whitespace', () => {
      expect(buildUserPrompt('  hello  ')).toBe('hello')
    })

    it('returns content as-is when already trimmed', () => {
      expect(buildUserPrompt('hello world')).toBe('hello world')
    })
  })

  describe('getPromptVersion', () => {
    it('returns version string', () => {
      expect(getPromptVersion()).toBe('v1')
    })
  })
})
