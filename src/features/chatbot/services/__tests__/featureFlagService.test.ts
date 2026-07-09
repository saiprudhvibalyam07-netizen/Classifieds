import { describe, it, expect, beforeEach } from 'vitest'
import { FeatureFlagService, EvaluationResult } from '../featureFlagService'

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), performance: vi.fn(), cost: vi.fn() },
}))

describe('FeatureFlagService', () => {
  let service: FeatureFlagService

  beforeEach(() => {
    vi.clearAllMocks()
    service = FeatureFlagService.getInstance()
    service.dispose()
  })

  describe('Flag Loading and Basic Operations', () => {
    it('loads flags successfully', () => {
      const flags = [
        { id: 'streaming', name: 'Streaming Feature', enabled: true, trueValue: true, falseValue: false, version: 1 },
        { id: 'rag', name: 'RAG Feature', enabled: true, trueValue: true, falseValue: false, version: 1 },
      ]

      service.loadFlags(flags)
      service.loadDefaultValues({ streaming: false, rag: false })

      expect(service.getAllFlags()).toHaveLength(2)
      expect(service.getFlag('streaming')).toBeDefined()
    })

    it('evaluates enabled flag correctly', () => {
      const flags = [
        { id: 'streaming', name: 'Streaming', enabled: true, trueValue: true, falseValue: false, version: 1 },
      ]
      service.loadFlags(flags)

      const result = service.evaluateFlag('streaming', { userId: 'user-1', environment: 'production' })

      expect(result.source).toBe('flag')
      expect(result.value).toBe(true)
      expect(result.reason).toBe('enabled')
    })

    it('evaluates disabled flag correctly', () => {
      const flags = [
        { id: 'streaming', name: 'Streaming', enabled: false, trueValue: true, falseValue: false, version: 1 },
      ]
      service.loadFlags(flags)

      const result = service.evaluateFlag('streaming', { userId: 'user-1' })

      expect(result.value).toBe(false)
      expect(result.reason).toBe('disabled')
    })

    it('returns default for non-existent flag', () => {
      service.loadDefaultValues({ streaming: false })

      const result = service.evaluateFlag('non-existent-flag') as EvaluationResult<boolean>

      expect(result.source).toBe('default')
      expect(result.value).toBe(false)
      expect(result.reason).toBe('flag_not_found')
    })

    it('sets environment overrides', () => {
      service.loadFlags([{ id: 'streaming', name: 'Streaming', enabled: true, trueValue: true, falseValue: false, version: 1 }])

      service.setEnvironmentOverride('streaming', { enabled: false })

      const result1 = service.evaluateFlag('streaming', { environment: 'production' })
      expect(result1.value).toBe(true)

      const result2 = service.evaluateFlag('streaming', { environment: 'staging' })
      expect(result2.value).toBe(true)
    })
  })

  describe('Flag Evaluation with Context', () => {
    beforeEach(() => {
      service.dispose()
      service.loadFlags([{
        id: 'advanced_feature',
        name: 'Advanced Feature',
        enabled: true,
        trueValue: 'enabled_advanced',
        falseValue: 'enabled_basic',
        version: 1,
        conditions: {
          userRole: ['admin', 'moderator'],
          userId: 'user-123',
          sessionId: 'session-abc',
        },
      }])
    })

    it('evaluates with matching userRole', () => {
      const result = service.evaluateFlag('advanced_feature', { userRole: 'admin' }) as EvaluationResult<string>

      expect(result.value).toBe('enabled_advanced')
    })

    it('evaluates with matching userId', () => {
      const result = service.evaluateFlag('advanced_feature', { userId: 'user-123' }) as EvaluationResult<string>

      expect(result.value).toBe('enabled_advanced')
    })

    it('evaluates with matching sessionId', () => {
      const result = service.evaluateFlag('advanced_feature', { sessionId: 'session-abc' }) as EvaluationResult<string>

      expect(result.value).toBe('enabled_advanced')
    })

    it('evaluates with no matching conditions', () => {
      const result = service.evaluateFlag('advanced_feature', { userRole: 'user' }) as EvaluationResult<string>

      expect(result.value).toBe('enabled_basic')
    })

    it('evaluates with environment matching', () => {
      const flags = [{
        id: 'env_feature',
        name: 'Environment Feature',
        enabled: true,
        trueValue: 'staging_value',
        falseValue: 'production_value',
        version: 1,
        environment: 'staging',
      }]
      service.loadFlags(flags)

      const result1 = service.evaluateFlag('env_feature', { environment: 'production' }) as EvaluationResult<string>
      expect(result1.value).toBe('production_value')

      const result2 = service.evaluateFlag('env_feature', { environment: 'staging' }) as EvaluationResult<string>
      expect(result2.value).toBe('staging_value')
    })
  })

  describe('Flag Management Operations', () => {
    it('creates new flag', () => {
      const flag = {
        id: 'new_feature',
        name: 'New Feature',
        enabled: true,
        trueValue: 'on',
        falseValue: 'off',
        version: 1,
      }

      const result = service.createFlag(flag)

      expect(result).toBe(true)
      expect(service.getFlag('new_feature')).toBeDefined()
    })

    it('prevents duplicate flag creation', () => {
      service.createFlag({
        id: 'duplicate',
        name: 'Duplicate Feature',
        enabled: true,
        trueValue: 'yes',
        falseValue: 'no',
        version: 1,
      })

      const result = service.createFlag({
        id: 'duplicate',
        name: 'Duplicate Feature 2',
        enabled: true,
        trueValue: 'yes2',
        falseValue: 'no2',
        version: 1,
      })

      expect(result).toBe(false)
    })

    it('updates existing flag', () => {
      service.createFlag({
        id: 'update_test',
        name: 'Update Test',
        enabled: true,
        trueValue: 'old',
        falseValue: 'old2',
        version: 1,
      })

      const result = service.updateFlag('update_test', { enabled: false })

      expect(result).toBe(true)
      expect(service.getFlag('update_test')!.enabled).toBe(false)
    })

    it('deletes flag', () => {
      service.createFlag({
        id: 'delete_test',
        name: 'Delete Test',
        enabled: true,
        trueValue: 'yes',
        falseValue: 'no',
        version: 1,
      })

      const result = service.deleteFlag('delete_test')

      expect(result).toBe(true)
      expect(service.getFlag('delete_test')).toBeNull()
    })

    it('validates flags correctly', () => {
      service.loadFlags([
        { id: 'valid', name: 'Valid', enabled: true, trueValue: 'yes', falseValue: 'no', version: 1 },
        { id: 'invalid', name: 'Invalid', enabled: 'not_a_boolean', version: 1 },
        { id: 'missing_false', name: 'Missing False', enabled: false, version: 1 },
      ])

      const validation = service.validateFlags()

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('validates flags correctly when all are valid', () => {
      service.loadFlags([
        { id: 'valid1', name: 'Valid1', enabled: true, trueValue: 'yes', falseValue: 'no', version: 1 },
        { id: 'valid2', name: 'Valid2', enabled: false, trueValue: 'yes', falseValue: 'no', version: 1 },
      ])

      const validation = service.validateFlags()

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('Utility Functions', () => {
    it('gets evaluation context with all fields', () => {
      const context = service.getEvaluationContext({
        userId: 'user-1',
        sessionId: 'session-1',
        userRole: 'admin',
        headers: { 'x-environment': 'staging' },
      })

      expect(context.userId).toBe('user-1')
      expect(context.sessionId).toBe('session-1')
      expect(context.userRole).toBe('admin')
      expect(context.environment).toBe('staging')
    })

    it('gets evaluation context with defaults', () => {
      const context = service.getEvaluationContext({})

      expect(context.userId).toBeUndefined()
      expect(context.sessionId).toBeUndefined()
      expect(context.userRole).toBeUndefined()
      expect(context.environment).toBe('production')
    })

    it('invalidates flag cache', () => {
      expect(() => service.invalidateFlagCache('test')).not.toThrow()
    })
  })
})
