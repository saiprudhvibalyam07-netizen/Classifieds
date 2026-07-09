import { describe, it, expect } from 'vitest'
import { checkToolPermission, checkMessagePermission } from '../permissionChecker'

describe('permissionChecker', () => {
  describe('checkToolPermission', () => {
    it('denies permission for unknown tools', () => {
      const result = checkToolPermission('unknown_tool', 'visitor')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Unknown tool')
    })

    it('returns empty required roles for unknown tools', () => {
      const result = checkToolPermission('unknown_tool', 'visitor')
      expect(result.requiredRoles).toEqual([])
    })
  })

  describe('checkMessagePermission', () => {
    it('allows valid messages', () => {
      const result = checkMessagePermission('Hello, I need help')
      expect(result.allowed).toBe(true)
    })

    it('denies empty messages', () => {
      const result = checkMessagePermission('')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('empty')
    })

    it('denies whitespace-only messages', () => {
      const result = checkMessagePermission('   ')
      expect(result.allowed).toBe(false)
    })

    it('denies messages exceeding max length', () => {
      const longContent = 'A'.repeat(4001)
      const result = checkMessagePermission(longContent)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('exceeds')
    })

    it('allows messages at exactly max length', () => {
      const content = 'A'.repeat(4000)
      const result = checkMessagePermission(content)
      expect(result.allowed).toBe(true)
    })
  })
})
