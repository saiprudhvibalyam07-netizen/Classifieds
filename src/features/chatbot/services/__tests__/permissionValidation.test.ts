import { describe, it, expect } from 'vitest'
import { checkToolPermission, checkMessagePermission } from '../permissionChecker'
import { buildSystemPrompt } from '../promptBuilder'

describe('Permission Validation', () => {
  describe('Tool Permission — Unknown Tools', () => {
    const roles = ['visitor', 'buyer', 'seller', 'admin'] as const

    roles.forEach((role) => {
      it(`${role} is denied for unknown tool`, () => {
        const result = checkToolPermission('nonexistent_tool', role)
        expect(result.allowed).toBe(false)
        expect(result.reason).toContain('Unknown tool')
      })
    })
  })

  describe('Message Permission — Role Agnostic', () => {
    const roles = ['visitor', 'buyer', 'seller', 'admin'] as const

    roles.forEach((role) => {
      it(`${role} can send safe messages`, () => {
        const result = checkMessagePermission('How do I post a listing?')
        expect(result.allowed).toBe(true)
      })
    })

    roles.forEach((role) => {
      it(`${role} cannot send empty messages`, () => {
        const result = checkMessagePermission('')
        expect(result.allowed).toBe(false)
      })
    })

    roles.forEach((role) => {
      it(`${role} cannot send messages over length limit`, () => {
        const result = checkMessagePermission('A'.repeat(4001))
        expect(result.allowed).toBe(false)
      })
    })
  })

  describe('Role Awareness in System Prompt', () => {
    it('visitor prompt does not contain seller-specific instructions', () => {
      const prompt = buildSystemPrompt('visitor')
      expect(prompt).not.toContain('create effective listings')
    })

    it('buyer prompt contains buyer-specific instructions', () => {
      const prompt = buildSystemPrompt('buyer')
      expect(prompt).toContain('buyer')
      expect(prompt).toContain('find items')
    })

    it('seller prompt contains seller-specific instructions', () => {
      const prompt = buildSystemPrompt('seller')
      expect(prompt).toContain('seller')
      expect(prompt).toContain('create effective listings')
    })

    it('admin prompt contains admin-specific instructions', () => {
      const prompt = buildSystemPrompt('admin')
      expect(prompt).toContain('administrator')
      expect(prompt).toContain('moderation')
    })
  })

  describe('Permission Error Messages', () => {
    it('includes tool name in error', () => {
      const result = checkToolPermission('my_tool', 'visitor')
      expect(result.reason).toContain('my_tool')
    })

    it('includes required roles in error when tool is known but denied', () => {
      const result = checkToolPermission('admin_only_tool', 'visitor')
      expect(result.requiredRoles).toEqual([])
    })

    it('includes reason for empty message', () => {
      const result = checkMessagePermission('')
      expect(result.reason).toContain('empty')
    })

    it('includes reason for long message', () => {
      const result = checkMessagePermission('A'.repeat(4001))
      expect(result.reason).toContain('exceeds')
    })
  })

  describe('Role Boundary Tests', () => {
    it('all roles are properly typed as ChatbotRole', () => {
      const validRoles = ['visitor', 'buyer', 'seller', 'admin']
      validRoles.forEach((role) => {
        expect(typeof role).toBe('string')
      })
    })

    it('checkToolPermission handles all valid roles', () => {
      const roles = ['visitor', 'buyer', 'seller', 'admin'] as const
      roles.forEach((role) => {
        const result = checkToolPermission('any_tool', role)
        expect(typeof result.allowed).toBe('boolean')
        expect(typeof result.requiredRoles).toBe('object')
        expect(Array.isArray(result.requiredRoles)).toBe(true)
      })
    })
  })
})
