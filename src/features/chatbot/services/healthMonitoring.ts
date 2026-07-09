import { logger } from './logger'

export interface ProviderStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latency: number
  errorRate: number
  lastCheck: string
  details?: Record<string, unknown>
}

export interface HealthCheckResult {
  service: string
  status: 'healthy' | 'degraded' | 'down'
  timestamp: string
  latency: number
  message?: string
  details?: Record<string, unknown>
}

export interface HealthSummary {
  overall: 'healthy' | 'degraded' | 'down'
  timestamp: string
  services: Record<string, HealthCheckResult>
  providerHealth: Record<string, ProviderStatus>
  uptime: number
  lastDegraded?: string
  lastDown?: string
}

export interface ServiceHealth {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  check: () => Promise<HealthCheckResult>
}

export class HealthChecker {
  private static instance: HealthChecker
  private checks: Map<string, ServiceHealth> = new Map()
  private results: Map<string, HealthCheckResult> = new Map()

  private constructor() {}

  static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker()
    }
    return HealthChecker.instance
  }

  registerCheck(name: string, check: ServiceHealth['check']): void {
    this.checks.set(name, {
      name,
      status: 'healthy',
      check,
    })
    logger.info('health_check_registered', { details: { service: name } })
  }

  unregisterCheck(name: string): void {
    this.checks.delete(name)
    this.results.delete(name)
  }

  async runCheck(name: string): Promise<HealthCheckResult> {
    const service = this.checks.get(name)
    if (!service) {
      throw new Error(`Health check not registered: ${name}`)
    }

    const start = Date.now()
    try {
      const result = await service.check()
      const latency = Date.now() - start
      const enriched: HealthCheckResult = {
        ...result,
        latency,
        timestamp: new Date().toISOString(),
      }
      service.status = enriched.status
      this.results.set(name, enriched)
      return enriched
    } catch (error) {
      const latency = Date.now() - start
      const failResult: HealthCheckResult = {
        service: name,
        status: 'down',
        timestamp: new Date().toISOString(),
        latency,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
      service.status = 'down'
      this.results.set(name, failResult)
      logger.warn('health_check_failed', { details: { service: name, error: failResult.message } })
      return failResult
    }
  }

  async runAllChecks(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>()
    const names = Array.from(this.checks.keys())

    const checkPromises = names.map(async (name) => {
      const result = await this.runCheck(name)
      results.set(name, result)
    })

    await Promise.allSettled(checkPromises)
    return results
  }

  getResult(name: string): HealthCheckResult | undefined {
    return this.results.get(name)
  }

  getAllResults(): Map<string, HealthCheckResult> {
    return new Map(this.results)
  }

  getServiceStatus(name: string): 'healthy' | 'degraded' | 'down' {
    const service = this.checks.get(name)
    return service?.status ?? 'down'
  }

  getRegisteredServices(): string[] {
    return Array.from(this.checks.keys())
  }

  dispose(): void {
    this.checks.clear()
    this.results.clear()
  }
}

export class HealthMonitor {
  private static instance: HealthMonitor
  private healthChecker: HealthChecker
  private providerStatuses: Map<string, ProviderStatus> = new Map()
  private monitoringInterval: ReturnType<typeof setInterval> | null = null
  private startTime: number = Date.now()
  private lastDegraded: string | undefined
  private lastDown: string | undefined
  private healthHistory: HealthSummary[] = []
  private readonly maxHistoryLimit = 50

  private constructor() {
    this.healthChecker = HealthChecker.getInstance()
  }

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor()
    }
    return HealthMonitor.instance
  }

  startMonitoring(intervalMs: number = 60_000): void {
    if (this.monitoringInterval) {
      return
    }
    this.monitoringInterval = setInterval(async () => {
      await this.collectHealthData()
    }, intervalMs)
    logger.info('health_monitoring_started', { details: { intervalMs } })
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      logger.info('health_monitoring_stopped')
    }
  }

  async collectHealthData(): Promise<HealthSummary> {
    const results = await this.healthChecker.runAllChecks()
    const overall = this.calculateOverallStatus(results)

    const summary: HealthSummary = {
      overall,
      timestamp: new Date().toISOString(),
      services: Object.fromEntries(results),
      providerHealth: Object.fromEntries(this.providerStatuses),
      uptime: (Date.now() - this.startTime) / 1000,
      lastDegraded: this.lastDegraded,
      lastDown: this.lastDown,
    }

    if (overall === 'degraded') {
      this.lastDegraded = summary.timestamp
    } else if (overall === 'down') {
      this.lastDown = summary.timestamp
    }

    this.healthHistory.unshift(summary)
    if (this.healthHistory.length > this.maxHistoryLimit) {
      this.healthHistory = this.healthHistory.slice(0, this.maxHistoryLimit)
    }

    logger.info('health_data_collected', { details: { overall, serviceCount: results.size } })
    return summary
  }

  updateProviderStatus(status: ProviderStatus): void {
    this.providerStatuses.set(status.name, status)
    logger.info('provider_status_updated', {
      details: {
        provider: status.name,
        status: status.status,
        latency: status.latency,
      },
    })
  }

  getProviderStatus(name: string): ProviderStatus | undefined {
    return this.providerStatuses.get(name)
  }

  getAllProviderStatuses(): Map<string, ProviderStatus> {
    return new Map(this.providerStatuses)
  }

  getHealthSummary(): HealthSummary {
    const services = Object.fromEntries(this.healthChecker.getAllResults())
    const overall = this.calculateOverallStatus(this.healthChecker.getAllResults())

    return {
      overall,
      timestamp: new Date().toISOString(),
      services,
      providerHealth: Object.fromEntries(this.providerStatuses),
      uptime: (Date.now() - this.startTime) / 1000,
      lastDegraded: this.lastDegraded,
      lastDown: this.lastDown,
    }
  }

  getHealthHistory(limit?: number): HealthSummary[] {
    const history = [...this.healthHistory]
    if (limit && limit > 0) {
      return history.slice(0, limit)
    }
    return history
  }

  private calculateOverallStatus(results: Map<string, HealthCheckResult>): 'healthy' | 'degraded' | 'down' {
    let hasDown = false
    let hasDegraded = false

    for (const result of results.values()) {
      if (result.status === 'down') {
        hasDown = true
      } else if (result.status === 'degraded') {
        hasDegraded = true
      }
    }

    if (hasDown) return 'down'
    if (hasDegraded) return 'degraded'
    return 'healthy'
  }

  dispose(): void {
    this.stopMonitoring()
    this.providerStatuses.clear()
    this.healthHistory = []
  }
}

export class HealthMonitoringService {
  private static instance: HealthMonitoringService
  private healthMonitor: HealthMonitor
  private healthChecker: HealthChecker

  private constructor() {
    this.healthMonitor = HealthMonitor.getInstance()
    this.healthChecker = HealthChecker.getInstance()
    this.registerDefaultChecks()
  }

  static getInstance(): HealthMonitoringService {
    if (!HealthMonitoringService.instance) {
      HealthMonitoringService.instance = new HealthMonitoringService()
    }
    return HealthMonitoringService.instance
  }

  private registerDefaultChecks(): void {
    this.healthChecker.registerCheck('memory', async () => ({
      service: 'memory',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      latency: 0,
      message: 'Memory service available',
    }))

    this.healthChecker.registerCheck('analytics', async () => ({
      service: 'analytics',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      latency: 0,
      message: 'Analytics service available',
    }))
  }

  getHealthSummary(): HealthSummary {
    return this.healthMonitor.getHealthSummary()
  }

  async checkService(serviceName: string): Promise<HealthCheckResult> {
    return this.healthChecker.runCheck(serviceName)
  }

  async checkAll(): Promise<HealthSummary> {
    return this.healthMonitor.collectHealthData()
  }

  updateProviderStatus(status: ProviderStatus): void {
    this.healthMonitor.updateProviderStatus(status)
  }

  getProviderStatus(name: string): ProviderStatus | undefined {
    return this.healthMonitor.getProviderStatus(name)
  }

  startMonitoring(intervalMs?: number): void {
    this.healthMonitor.startMonitoring(intervalMs)
  }

  stopMonitoring(): void {
    this.healthMonitor.stopMonitoring()
  }

  getHealthHistory(limit?: number): HealthSummary[] {
    return this.healthMonitor.getHealthHistory(limit)
  }

  registerCheck(name: string, check: ServiceHealth['check']): void {
    this.healthChecker.registerCheck(name, check)
  }

  dispose(): void {
    this.healthMonitor.dispose()
    this.healthChecker.dispose()
  }
}
