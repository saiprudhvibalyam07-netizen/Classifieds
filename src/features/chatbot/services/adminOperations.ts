import { logger } from './logger'
import type { PromptVersion } from '../types'
import type { FeatureFlag } from '../types'

export type { PromptVersion, FeatureFlag }

export interface ComplianceReport {
  timestamp: string
  userId?: string
  action: 'conversation_deletion' | 'memory_deletion' | 'data_export' | 'permission_change' | 'prompt_modification' | 'admin_action'
  details: {
    userId?: string
    resourceId?: string
    actionType: string
    timestamp: string
    performedBy?: string
    retentionPeriod?: number
    sensitiveData?: boolean
    [key: string]: unknown
  }
  auditLogId: string
}

export interface AdminDashboard {
  alerts: {
    total: number
    active: number
    bySeverity: { critical: number; warning: number; info: number }
    lastCheck: string
  }
  metrics: {
    conversationsToday: number
    activeUsers: number
    systemUptime: number
    avgResponseTime: number
    totalCostToday: number
  }
  status: {
    overall: 'healthy' | 'degraded' | 'down'
    services: Record<string, 'healthy' | 'degraded' | 'down'>
  }
}

export class AuditService {
  private static instance: AuditService
  private auditLogs: ComplianceReport[] = []
  private readonly maxLogSize = 10000

  private constructor() {}

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService()
    }
    return AuditService.instance
  }

  logCompliance(action: ComplianceReport['action'], details: ComplianceReport['details'], userId?: string): void {
    const auditLog: ComplianceReport = {
      timestamp: new Date().toISOString(),
      action,
      details: { ...details, timestamp: new Date().toISOString() },
      auditLogId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    if (userId) {
      auditLog.userId = userId
    }

    this.auditLogs.unshift(auditLog)

    if (this.auditLogs.length > this.maxLogSize) {
      this.auditLogs = this.auditLogs.slice(0, this.maxLogSize)
    }

    logger.info('compliance_log', {
      details: { auditLogId: auditLog.auditLogId, action: auditLog.action, userId: auditLog.userId },
    })
  }

  getAuditLogs(userId?: string, action?: ComplianceReport['action']): ComplianceReport[] {
    let filtered = this.auditLogs

    if (userId) {
      filtered = filtered.filter(log => log.userId === userId)
    }

    if (action) {
      filtered = filtered.filter(log => log.action === action)
    }

    return [...filtered]
  }

  logDeletion(userId?: string, resourceType: string = 'conversation', resourceId?: string, _reason?: string, retentionDays?: number): void {
    this.logCompliance('conversation_deletion', {
      userId,
      resourceId,
      actionType: resourceType,
      timestamp: new Date().toISOString(),
      retentionPeriod: retentionDays,
      sensitiveData: false,
    }, userId)
  }

  logMemoryDeletion(userId?: string, resourceId?: string): void {
    this.logCompliance('memory_deletion', {
      userId,
      resourceId,
      actionType: 'memory_entry',
      timestamp: new Date().toISOString(),
      sensitiveData: false,
    }, userId)
  }

  logExport(userId?: string, resourceId?: string): void {
    this.logCompliance('data_export', {
      userId,
      resourceId,
      actionType: 'data_export',
      timestamp: new Date().toISOString(),
      sensitiveData: false,
    }, userId)
  }

  logPermissionChange(userId?: string, changedBy?: string): void {
    this.logCompliance('permission_change', {
      userId,
      actionType: 'permission_update',
      timestamp: new Date().toISOString(),
      performedBy: changedBy,
    }, userId)
  }

  logPromptModification(promptId: string, userId?: string, changedBy?: string, _changes?: string[]): void {
    this.logCompliance('prompt_modification', {
      userId,
      resourceId: promptId,
      actionType: 'prompt_update',
      timestamp: new Date().toISOString(),
      performedBy: changedBy,
      sensitiveData: true,
    }, userId)
  }

  logAdminAction(adminId: string, action: string, details: Record<string, unknown>): void {
    this.logCompliance('admin_action', {
      userId: adminId,
      actionType: action,
      timestamp: new Date().toISOString(),
      ...details,
      sensitiveData: true,
    }, adminId)
  }

  dispose(): void {
    this.auditLogs = []
  }
}

export class AdminService {
  private static instance: AdminService
  private featureFlags: Map<string, FeatureFlag> = new Map()
  private prompts: Map<string, PromptVersion> = new Map()
  private startTime: number = Date.now()

  private constructor() {}

  static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService()
    }
    return AdminService.instance
  }

  static resetInstance(): void {
    if (AdminService.instance) {
      AdminService.instance.dispose()
    }
    AdminService.instance = null as unknown as AdminService
  }

  getDashboard(): AdminDashboard {
    return {
      alerts: {
        total: 0,
        active: 0,
        bySeverity: { critical: 0, warning: 0, info: 0 },
        lastCheck: new Date().toISOString(),
      },
      metrics: {
        conversationsToday: 0,
        activeUsers: 0,
        systemUptime: (Date.now() - this.startTime) / 1000,
        avgResponseTime: 0,
        totalCostToday: 0,
      },
      status: {
        overall: 'healthy',
        services: {},
      },
    }
  }

  getComplianceReport(userId?: string): ComplianceReport[] {
    return AuditService.getInstance().getAuditLogs(userId)
  }

  createFeatureFlag(flag: FeatureFlag): boolean {
    if (this.featureFlags.has(flag.id)) return false
    this.featureFlags.set(flag.id, { ...flag })
    logger.info('feature_flag_created', { details: { flagId: flag.id, name: flag.name } })
    return true
  }

  updateFeatureFlag(id: string, updates: Partial<FeatureFlag>): boolean {
    const existing = this.featureFlags.get(id)
    if (!existing) return false
    this.featureFlags.set(id, { ...existing, ...updates })
    logger.info('feature_flag_updated', { details: { flagId: id } })
    return true
  }

  deleteFeatureFlag(id: string): boolean {
    if (!this.featureFlags.has(id)) return false
    this.featureFlags.delete(id)
    logger.info('feature_flag_deleted', { details: { flagId: id } })
    return true
  }

  toggleFeatureFlag(id: string, enabled: boolean): boolean {
    const existing = this.featureFlags.get(id)
    if (!existing) return false
    this.featureFlags.set(id, { ...existing, enabled })
    logger.info('feature_flag_toggled', { details: { flagId: id, enabled } })
    return true
  }

  getFeatureFlag(id: string): FeatureFlag | null {
    return this.featureFlags.get(id) || null
  }

  getFeatureFlags(): FeatureFlag[] {
    return Array.from(this.featureFlags.values())
  }

  createPromptVersion(prompt: PromptVersion): boolean {
    const key = `${prompt.id}_v${prompt.version}`
    if (this.prompts.has(key)) return false
    this.prompts.set(key, { ...prompt })
    logger.info('prompt_version_created', { details: { promptId: prompt.id, version: prompt.version } })
    return true
  }

  promotePromptVersion(id: string, newContent: string, promotedBy: string): boolean {
    const existingVersions = Array.from(this.prompts.values()).filter(p => p.id === id)
    if (existingVersions.length === 0) return false

    const nextVersion = Math.max(...existingVersions.map(p => p.version)) + 1
    const newPrompt: PromptVersion = {
      id,
      version: nextVersion,
      name: `Version ${nextVersion}`,
      content: newContent,
      description: `Promoted by ${promotedBy}`,
      createdBy: promotedBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    }

    this.prompts.set(`${id}_v${nextVersion}`, newPrompt)
    logger.info('prompt_version_promoted', { details: { promptId: id, version: nextVersion, promotedBy } })
    return true
  }

  getAllPrompts(): PromptVersion[] {
    return Array.from(this.prompts.values())
  }

  getToolRegistry(): unknown[] {
    try {
      const { HealthMonitoringService } = require('./healthMonitoring')
      const health = HealthMonitoringService.getInstance()
      const summary = health.getHealthSummary()
      return Object.entries(summary.services || {}).map(([name, status]) => ({
        name,
        status: (status as { status: string }).status,
      }))
    } catch {
      return []
    }
  }

  getProviderStatus(): Record<string, unknown> {
    try {
      const { HealthMonitoringService } = require('./healthMonitoring')
      const health = HealthMonitoringService.getInstance()
      const summary = health.getHealthSummary()
      return summary.providerHealth || {}
    } catch {
      return {}
    }
  }

  dispose(): void {
    this.featureFlags.clear()
    this.prompts.clear()
  }
}
