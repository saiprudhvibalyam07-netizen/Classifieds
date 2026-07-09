import { logger } from './logger'

interface RateLimitRecord {
  ip: string
  path: string
  count: number
  window: number
  timestamp: number
  blockedUntil?: string
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipBlockedRequests?: boolean
}

class RateLimitService {
  private static instance: RateLimitService
  private rateLimitMap: Map<string, RateLimitRecord[]> = new Map()

  private constructor() {}

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService()
    }
    return RateLimitService.instance
  }

  isAllowed(ip: string, path: string, config: RateLimitConfig): boolean {
    const now = Date.now()
    const key = `${ip}:${path}`
    let records = this.rateLimitMap.get(key) || []

    records = records.filter(r => now - r.timestamp < r.window)

    const isBlocked = records.some(r => r.blockedUntil && Date.now() < new Date(r.blockedUntil).getTime())

    if (isBlocked) {
      logger.warn('rate_limit_blocked', {
        details: { ip, path, blockedUntil: records.find(r => r.blockedUntil)?.blockedUntil },
      })
      return false
    }

    if (records.length >= config.maxRequests) {
      const oldestRecord = records[0].timestamp || now
      const blockedUntil = new Date(Date.now() + config.windowMs * 2).toISOString()

      records.push({
        ip,
        path,
        count: records.length,
        window: config.windowMs,
        timestamp: oldestRecord,
        blockedUntil,
      })

      logger.warn('rate_limit_exceeded', {
        details: { ip, path, count: records.length, windowMs: config.windowMs, blockedUntil },
      })

      return false
    }

    records.push({
      ip,
      path,
      count: records.length + 1,
      window: config.windowMs,
      timestamp: now,
    })

    this.rateLimitMap.set(key, records)

    return true
  }

  clearRateLimit(ip: string, path: string): void {
    const key = `${ip}:${path}`
    this.rateLimitMap.delete(key)
    logger.info('rate_limit_cleared', {
      details: { ip, path },
    })
  }

  getRateLimitStats(): Record<string, { current: number; max: number; window: number }> {
    const stats: Record<string, { current: number; max: number; window: number }> = {}

    this.rateLimitMap.forEach((records, key) => {
      const now = Date.now()
      const activeRecords = records.filter(r => now - r.timestamp < r.window)
      stats[key] = {
        current: activeRecords.length,
        max: activeRecords.reduce((max, r) => Math.max(max, r.count), 0),
        window: activeRecords[0]?.window || 0,
      }
    })

    return stats
  }
}

export { RateLimitService }