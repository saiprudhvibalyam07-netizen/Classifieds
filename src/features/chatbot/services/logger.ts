import type { LogLevel, LogEntry } from '../types'
import { LOG_CONFIG } from '../config'

export type AnalyticsEvent =
  | 'conversation_started' | 'conversation_ended'
  | 'user_message_sent' | 'assistant_response'
  | 'tool_executed' | 'permission_denied'
  | 'prompt_used' | 'response_validated'
  | 'memory_retrieved' | 'memory_stored'
  | 'recommendation_generated' | 'rag_retrieved'
  | 'embedding_computed' | 'citation_generated'
  | 'error' | 'warning' | 'info' | 'debug'

export interface AnalyticsEventData {
  userId?: string
  sessionId?: string
  conversationId?: string
  event: AnalyticsEvent
  data?: Record<string, unknown>
  provider?: 'openai' | 'anthropic' | 'mock'
  latency?: number
  tokenCount?: number
  cost?: number
  success?: boolean
  error?: string
}

export interface CostRecord {
  date: string
  userId?: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
  provider: string
  conversationId?: string
}

export interface HealthStatus {
  openai: 'healthy' | 'degraded' | 'down'
  supabase: 'healthy' | 'degraded' | 'down'
  vectorDb: 'healthy' | 'degraded' | 'down'
  embeddingProvider: 'healthy' | 'degraded' | 'down'
  knowledgeBase: 'healthy' | 'degraded' | 'down'
  memorySystem: 'healthy' | 'degraded' | 'down'
  streaming: 'healthy' | 'degraded' | 'down'
  toolRouter: 'healthy' | 'degraded' | 'down'
}

const entries: LogEntry[] = []

type AnalyticsHook = {
  trackEvent?: (eventData: AnalyticsEventData) => void
  trackPerformance?: (context: AnalyticsEventData, metrics?: { latency?: number; tokens?: number; cost?: number }) => void
  trackCost?: (costRecord: CostRecord) => void
}

let analyticsHook: AnalyticsHook | null = null

export function setAnalyticsHook(hook: AnalyticsHook | null): void {
  analyticsHook = hook
}

function createEntry(level: LogLevel, event: string, data?: Partial<LogEntry>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    details: data?.details,
    duration: data?.duration,
    tokens: data?.tokens,
    cost: data?.cost,
    error: data?.error,
  }
}

function push(entry: LogEntry): void {
  if (!LOG_CONFIG.enabled) return
  entries.push(entry)
  if (entries.length > LOG_CONFIG.maxEntries) {
    entries.shift()
  }
}

const levelOrder: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[LOG_CONFIG.level]
}

export const logger = {
  info(event: string, data?: Partial<LogEntry> & { userId?: string; sessionId?: string; conversationId?: string; provider?: string }): void {
    if (!shouldLog('info')) return
    const entry = createEntry('info', event, data)
    push(entry)
    if (LOG_CONFIG.analyticsEnabled && analyticsHook?.trackEvent) {
      analyticsHook.trackEvent({
        event: (event as AnalyticsEvent),
        userId: data?.userId,
        sessionId: data?.sessionId,
        conversationId: data?.conversationId,
        provider: data?.provider as AnalyticsEventData['provider'],
        latency: data?.duration,
        tokenCount: data?.tokens?.totalTokens,
        cost: data?.cost?.totalCost,
        success: !event.includes('error'),
        error: event.includes('error') ? data?.error : undefined,
        data: data?.details,
      })
    }
  },

  warn(event: string, data?: Partial<LogEntry> & { userId?: string; sessionId?: string; conversationId?: string; provider?: string }): void {
    if (!shouldLog('warn')) return
    const entry = createEntry('warn', event, data)
    push(entry)
    if (LOG_CONFIG.analyticsEnabled && analyticsHook?.trackEvent) {
      analyticsHook.trackEvent({
        event: (event as AnalyticsEvent),
        userId: data?.userId,
        sessionId: data?.sessionId,
        conversationId: data?.conversationId,
        provider: data?.provider as AnalyticsEventData['provider'],
        latency: data?.duration,
        tokenCount: data?.tokens?.totalTokens,
        cost: data?.cost?.totalCost,
        success: false,
        error: data?.error,
        data: data?.details,
      })
    }
  },

  error(event: string, data?: Partial<LogEntry> & { userId?: string; sessionId?: string; conversationId?: string; provider?: string }): void {
    if (!shouldLog('error')) return
    const entry = createEntry('error', event, data)
    push(entry)
    if (LOG_CONFIG.analyticsEnabled && analyticsHook?.trackEvent) {
      analyticsHook.trackEvent({
        event: (event as AnalyticsEvent),
        userId: data?.userId,
        sessionId: data?.sessionId,
        conversationId: data?.conversationId,
        provider: data?.provider as AnalyticsEventData['provider'],
        latency: data?.duration,
        tokenCount: data?.tokens?.totalTokens,
        cost: data?.cost?.totalCost,
        success: false,
        error: data?.error,
        data: data?.details,
      })
    }
  },

  debug(event: string, data?: Partial<LogEntry> & { userId?: string; sessionId?: string; conversationId?: string; provider?: string }): void {
    if (!shouldLog('debug')) return
    const entry = createEntry('debug', event, data)
    push(entry)
    if (LOG_CONFIG.analyticsEnabled && analyticsHook?.trackEvent) {
      analyticsHook.trackEvent({
        event: (event as AnalyticsEvent),
        userId: data?.userId,
        sessionId: data?.sessionId,
        conversationId: data?.conversationId,
        provider: data?.provider as AnalyticsEventData['provider'],
        latency: data?.duration,
        tokenCount: data?.tokens?.totalTokens,
        cost: data?.cost?.totalCost,
        success: true,
        data: data?.details,
      })
    }
  },

  performance(event: string, data?: Partial<LogEntry> & { userId?: string; sessionId?: string; conversationId?: string; provider?: string }): void {
    if (!shouldLog('info')) return
    const entry = createEntry('info', event, data)
    push(entry)
    if (LOG_CONFIG.analyticsEnabled && analyticsHook?.trackPerformance) {
      analyticsHook.trackPerformance(
        {
          event: (event as AnalyticsEvent),
          userId: data?.userId,
          sessionId: data?.sessionId,
          conversationId: data?.conversationId,
          provider: data?.provider as AnalyticsEventData['provider'],
          latency: data?.duration,
          tokenCount: data?.tokens?.totalTokens,
          cost: data?.cost?.totalCost,
          success: true,
          data: data?.details,
        },
        {
          latency: data?.duration,
          tokens: data?.tokens?.totalTokens,
          cost: data?.cost?.totalCost,
        }
      )
    }
  },

  cost(event: string, data?: Partial<LogEntry> & CostRecord): void {
    if (!shouldLog('info')) return
    const entry = createEntry('info', event, data)
    push(entry)
    if (LOG_CONFIG.analyticsEnabled && analyticsHook?.trackCost) {
      analyticsHook.trackCost(data as CostRecord)
    }
  },

  logHealth(status: HealthStatus): void {
    const allHealthy = Object.values(status).every((s) => s === 'healthy')
    if (!allHealthy) {
      const degraded = Object.entries(status).filter(([, s]) => s === 'degraded')
      logger.warn('health_degraded', { details: Object.fromEntries(degraded.map(([k, v]) => [k, v])) } as Partial<LogEntry>)
    }
    logger.info('health_status', status as unknown as Partial<LogEntry>)
  },

  logFeatureFlag(feature: string, enabled: boolean): void {
    logger.info('feature_flag', { feature, enabled } as Partial<LogEntry>)
  },

  logPromptChange(promptId: string, version: number, changes: string[]): void {
    logger.info('prompt_changed', { promptId, version, changes } as Partial<LogEntry>)
  },

  logToolStatus(toolName: string, status: 'available' | 'unavailable'): void {
    const level = status === 'available' ? 'info' : 'warn'
    logger[level](`tool_${status}`, { toolName } as Partial<LogEntry>)
  },

  logPermissionDenied(userId: string, sessionId?: string, reason?: string): void {
    logger.warn('permission_denied', { userId, sessionId, reason } as Partial<LogEntry>)
  },

  logRetrieval(source: string, success: boolean, latency?: number): void {
    const event = success ? 'retrieval_success' : 'retrieval_failed'
    logger.info(event, { source, success, latency } as Partial<LogEntry>)
  },

  logRecommendation(source: string, success: boolean, count?: number): void {
    const event = success ? 'recommendation_generated' : 'recommendation_failed'
    logger.info(event, { source, success, count } as Partial<LogEntry>)
  },

  logMemory(operation: 'read' | 'write' | 'delete', scope: string, count?: number): void {
    logger.info('memory_operation', { operation, scope, count } as Partial<LogEntry>)
  },

  getEntries(): LogEntry[] {
    return [...entries]
  },

  clear(): void {
    entries.length = 0
  },
}

export default logger
