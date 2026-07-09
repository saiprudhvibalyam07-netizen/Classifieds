import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdminService } from '../adminOperations'

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    performance: vi.fn(),
    cost: vi.fn(),
    logHealth: vi.fn(),
    logFeatureFlag: vi.fn(),
    logPromptChange: vi.fn(),
    logToolStatus: vi.fn(),
    logPermissionDenied: vi.fn(),
    logRetrieval: vi.fn(),
    logRecommendation: vi.fn(),
    logMemory: vi.fn(),
    getEntries: vi.fn(() => []),
    clear: vi.fn(),
  },
}))

describe('AdminService', () => {
  let adminService: AdminService

  beforeEach(() => {
    vi.clearAllMocks()
    AdminService.resetInstance()
    adminService = AdminService.getInstance()
  })

  describe('Dashboard Operations', () => {
    it('gets dashboard with alerts', () => {
      const result = adminService.getDashboard()

      expect(result).toBeDefined()
      expect(result.alerts).toBeDefined()
      expect(result.metrics).toBeDefined()
      expect(result.status).toBeDefined()
    })

    it('gets compliance report', () => {
      const result = adminService.getComplianceReport('user-123')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('Feature Flag Operations', () => {
    it('creates new feature flag', () => {
      const flag = {
        id: 'test_feature',
        name: 'Test Feature',
        enabled: true,
        trueValue: 'enabled',
        falseValue: 'disabled',
      }

      const result = adminService.createFeatureFlag(flag)

      expect(result).toBe(true)
    })

    it('prevents duplicate feature flag', () => {
      adminService.createFeatureFlag({
        id: 'duplicate',
        name: 'Duplicate',
        enabled: true,
        trueValue: 'yes',
        falseValue: 'no',
      })

      const result = adminService.createFeatureFlag({
        id: 'duplicate',
        name: 'Duplicate 2',
        enabled: true,
        trueValue: 'yes2',
        falseValue: 'no2',
      })

      expect(result).toBe(false)
    })

    it('updates feature flag', () => {
      adminService.createFeatureFlag({
        id: 'update_test',
        name: 'Update Test',
        enabled: true,
        trueValue: 'old',
        falseValue: 'old2',
      })

      const result = adminService.updateFeatureFlag('update_test', { enabled: false })

      expect(result).toBe(true)
    })

    it('deletes feature flag', () => {
      adminService.createFeatureFlag({
        id: 'delete_test',
        name: 'Delete Test',
        enabled: true,
        trueValue: 'yes',
        falseValue: 'no',
      })

      const result = adminService.deleteFeatureFlag('delete_test')

      expect(result).toBe(true)
    })

    it('toggles feature flag', () => {
      adminService.createFeatureFlag({
        id: 'toggle_test',
        name: 'Toggle Test',
        enabled: true,
        trueValue: 'on',
        falseValue: 'off',
      })

      const result = adminService.toggleFeatureFlag('toggle_test', false)

      expect(result).toBe(true)
      const flag = adminService.getFeatureFlag('toggle_test')
      expect(flag).not.toBeNull()
    })
  })

  describe('Prompt Operations', () => {
    it('creates new prompt version', () => {
      const prompt = {
        id: 'test_prompt',
        version: 1,
        name: 'Test Prompt',
        content: 'Hello world',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      }

      const result = adminService.createPromptVersion(prompt)

      expect(result).toBe(true)
    })

    it('prevents duplicate prompt versions', () => {
      const prompt = {
        id: 'unique_prompt',
        version: 1,
        name: 'Unique Prompt',
        content: 'First version',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      }

      adminService.createPromptVersion(prompt)

      const result2 = adminService.createPromptVersion(prompt)

      expect(result2).toBe(false)
    })

    it('promotes prompt version', () => {
      const oldPrompt = {
        id: 'promote_test',
        version: 1,
        name: 'Version 1',
        content: 'Old content',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      }

      adminService.createPromptVersion(oldPrompt)

      const result = adminService.promotePromptVersion('promote_test', 'New content', 'admin')

      expect(result).toBe(true)
    })
  })

  describe('Utility Operations', () => {
    it('gets feature flags', () => {
      adminService.createFeatureFlag({
        id: 'util_test',
        name: 'Util Test',
        enabled: true,
        trueValue: 'yes',
        falseValue: 'no',
      })

      const flags = adminService.getFeatureFlags()

      expect(flags).toHaveLength(1)
      expect(flags[0].id).toBe('util_test')
    })

    it('gets prompt versions', () => {
      adminService.createPromptVersion({
        id: 'util_prompt',
        version: 1,
        name: 'Util Prompt',
        content: 'Content',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      })

      const prompts = adminService.getAllPrompts()

      expect(prompts).toHaveLength(1)
      expect(prompts[0].id).toBe('util_prompt')
    })

    it('gets tool registry', () => {
      const tools = adminService.getToolRegistry()

      expect(Array.isArray(tools)).toBe(true)
    })

    it('gets provider status', () => {
      const status = adminService.getProviderStatus()

      expect(status).toBeDefined()
    })
  })
})
