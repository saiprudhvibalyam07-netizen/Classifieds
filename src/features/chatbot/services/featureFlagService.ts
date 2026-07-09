import { logger } from './logger'
import type { FeatureFlag, FeatureFlagContext, EvaluationResult } from '../types'
import { FlagEvaluationError } from '../types'

export { FeatureFlag, FeatureFlagContext, EvaluationResult, FlagEvaluationError }

export class FeatureFlagService {
  private static instance: FeatureFlagService
  private flags: Map<string, FeatureFlag> = new Map()
  private environmentOverrides: Map<string, Partial<FeatureFlag>> = new Map()
  private defaultValues: Map<string, unknown> = new Map()

  private constructor() {}

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService()
    }
    return FeatureFlagService.instance
  }

  loadFlags(flags: FeatureFlag[]): void {
    this.flags.clear()
    flags.forEach(flag => {
      this.flags.set(flag.id, {
        ...flag,
        lastModified: new Date().toISOString(),
        version: flag.version || 1,
      })
    })

    logger.info('feature_flags_loaded', {
      details: { flagsLoaded: flags.length, flagIds: flags.map(f => f.id) },
    })
  }

  loadDefaultValues(defaults: Record<string, unknown>): void {
    Object.entries(defaults).forEach(([key, value]) => {
      this.defaultValues.set(key, value)
    })

    logger.info('feature_flag_defaults_loaded', {
      details: { defaultsCount: Object.keys(defaults).length, defaultKeys: Object.keys(defaults) },
    })
  }

  setEnvironmentOverride(flagId: string, override: Partial<FeatureFlag>): void {
    this.environmentOverrides.set(flagId, override)

    logger.info('feature_flag_override_set', {
      details: { flagId, changes: Object.keys(override) },
    })
  }

  evaluateFlag<T>(flagId: string, context?: FeatureFlagContext): EvaluationResult<T> {
    const flag = this.flags.get(flagId)
    if (!flag) {
      return this.createDefaultResult<T>(flagId)
    }

    const override = this.environmentOverrides.get(flagId)
    let effectiveFlag = flag

    if (override) {
      const overrideEnv = (override as Record<string, unknown>).environment as string | undefined
      const contextEnv = context?.environment || 'production'
      if (overrideEnv && overrideEnv === contextEnv) {
        effectiveFlag = { ...flag, ...override }
      }
    }

    const isEnabled = this.shouldFlagBeEnabled(effectiveFlag, context)
    const result = isEnabled ? effectiveFlag.trueValue : effectiveFlag.falseValue

    logger.info('feature_flag_evaluated', {
      details: { flagId, enabled: isEnabled, source: override ? 'override' : 'flag', context },
    })

    return {
      value: result as T,
      source: override ? 'override' : 'flag',
      flagName: flag.name,
      version: effectiveFlag.version,
      reason: isEnabled ? 'enabled' : 'disabled',
    }
  }

  private shouldFlagBeEnabled(flag: FeatureFlag, context?: FeatureFlagContext): boolean {
    if (!flag.enabled) return false

    const matchesConditions = flag.conditions ? this.evaluateConditions(flag.conditions, context) : true
    if (!matchesConditions) return false

    const targets = flag.targets || []
    if (targets.length > 0 && context?.userId) {
      if (!targets.includes('user')) return false
    }

    const environmentMatches = flag.environment ? flag.environment === (context?.environment || 'production') : true

    return environmentMatches
  }

  private evaluateConditions(conditions?: FeatureFlag['conditions'], context?: FeatureFlagContext): boolean {
    if (!conditions) return true

    if (conditions.userRole && context?.userRole) {
      if (!conditions.userRole.includes(context.userRole)) return false
    }

    if (conditions.userId && context?.userId) {
      if (conditions.userId !== context.userId) return false
    }

    if (conditions.sessionId && context?.sessionId) {
      if (conditions.sessionId !== context.sessionId) return false
    }

    return true
  }

  createDefaultResult<T>(flagId: string): EvaluationResult<T> {
    const defaultValue = this.defaultValues.has(flagId) ? this.defaultValues.get(flagId) : false

    logger.warn('feature_flag_not_found', {
      details: { flagId, defaultValue, availableFlags: Array.from(this.flags.keys()) },
    })

    return {
      value: defaultValue as T,
      source: 'default',
      reason: 'flag_not_found',
    }
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values())
  }

  getFlag(flagId: string): FeatureFlag | null {
    return this.flags.get(flagId) || null
  }

  updateFlag(flagId: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(flagId)
    if (!flag) return false

    const updatedFlag = { ...flag, ...updates, lastModified: new Date().toISOString() }
    this.flags.set(flagId, updatedFlag)

    logger.info('feature_flag_updated', {
      details: {
        flagId,
        updates: Object.keys(updates),
        previousVersion: flag.version,
        newVersion: updatedFlag.version,
      },
    })

    return true
  }

  createFlag(flag: FeatureFlag): boolean {
    const existingFlag = this.flags.get(flag.id)
    if (existingFlag) return false

    this.flags.set(flag.id, { ...flag, lastModified: new Date().toISOString() })

    logger.info('feature_flag_created', {
      details: { flagId: flag.id, name: flag.name, version: 1 },
    })

    return true
  }

  deleteFlag(flagId: string): boolean {
    const flag = this.flags.get(flagId)
    if (!flag) return false

    this.flags.delete(flagId)

    logger.info('feature_flag_deleted', {
      details: { flagId, name: flag.name, version: flag.version },
    })

    return true
  }

  getEvaluationContext(request?: {
    userId?: string
    sessionId?: string
    userRole?: string
    headers?: Record<string, string>
  }): FeatureFlagContext {
    return {
      userId: request?.userId,
      sessionId: request?.sessionId,
      userRole: request?.userRole,
      environment: this.extractEnvironment(request?.headers),
      customData: {},
    }
  }

  private extractEnvironment(headers?: Record<string, string>): string {
    if (headers?.['x-environment']) return headers['x-environment']
    if (headers?.['x-service-environment']) return headers['x-service-environment']
    return 'production'
  }

  invalidateFlagCache(flagId: string): void {
    logger.info('feature_flag_cache_invalidated', {
      details: { flagId },
    })
  }

  validateFlags(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    this.flags.forEach((flag, id) => {
      if (!flag.id) errors.push(`Flag missing ID: ${id}`)
      if (!flag.name) errors.push(`Flag missing name: ${id}`)
      if (typeof flag.enabled !== 'boolean') errors.push(`Flag enabled must be boolean: ${id}`)
      if (!flag.enabled && !flag.falseValue) errors.push(`Flag falseValue missing: ${id}`)
      if (flag.enabled && !flag.trueValue) errors.push(`Flag trueValue missing: ${id}`)
    })

    const valid = errors.length === 0

    logger.info('feature_flag_validation', {
      details: { valid, errorCount: errors.length, errorMessages: errors, totalFlags: this.flags.size },
    })

    return { valid, errors }
  }

  dispose(): void {
    this.flags.clear()
    this.environmentOverrides.clear()
    this.defaultValues.clear()
  }
}
