import { logger, setAnalyticsHook } from './logger'
import type { CostRecord as LoggerCostRecord, AnalyticsEventData } from './logger'

export type CostRecord = LoggerCostRecord

export type AnalyticsSummary = {
  period: string
  metrics: {
    conversations: number
    uniqueUsers: number
    activeUsers: number
    avgSessionDuration: number
    avgConversationLength: number
    avgTokensPerConversation: number
    avgCostPerConversation: number
    totalCost: number
    totalTokens: number
    userSatisfaction: number
    recommendationUsage: number
    ragUsage: number
    memoryUsage: number
  }
}

export type CostSummary = {
  period: string
  metrics: {
    totalCost: number
    openaiCost: number
    anthropicCost: number
    promptTokens: number
    completionTokens: number
    totalTokens: number
    costPerConversation: number
    costPerUser: number
    costPerFeature: Record<string, number>
    costByModel: Record<string, number>
    providerUsage: Record<string, number>
  }
}

export type UsageMetrics = {
  daily?: {
    conversations: number
    users: number
    activeUsers: number
    messages: number
    tokens: number
    cost: number
    latency: number
    errorRate: number
  }[]
  weekly?: {
    conversations: number
    users: number
    activeUsers: number
    messages: number
    tokens: number
    cost: number
    latency: number
    errorRate: number
  }
}

export type KPIs = {
  period: string
  userEngagement: number
  responseQuality: number
  systemReliability: number
  costEfficiency: number
  featureAdoption: Record<string, number>
}

export class AIFailureError extends Error {
  constructor(message: string, public code: string, public context?: Record<string, unknown>) {
    super(message)
    this.name = 'AIFailureError'
  }
}

export class AnalyticsService {
  private static instance: AnalyticsService
  private analyticsBuffer: AnalyticsEventData[] = []
  private processingInterval: ReturnType<typeof setInterval> | null = null
  private startTime: number = Date.now()
  private conversationsToday = 0
  private activeUsers = 0
  private avgResponseTime = 0

  private constructor() {
    this.setupAnalyticsHook()
    this.processingInterval = setInterval(() => this.processBuffer(), 60_000)
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).analyticsService = this
    }
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  private setupAnalyticsHook(): void {
    setAnalyticsHook({
      trackEvent: (eventData: AnalyticsEventData) => {
        this.analyticsBuffer.push(eventData)
      },
      trackPerformance: (_ctx: AnalyticsEventData, metrics?: { latency?: number; tokens?: number; cost?: number }) => {
        if (metrics?.latency) {
          this.avgResponseTime = (this.avgResponseTime + metrics.latency) / 2
        }
      },
      trackCost: (costRecord: LoggerCostRecord) => {
        this.trackCostRecord(costRecord)
      },
    })
  }

  private trackCostRecord(record: CostRecord): void {
    logger.info('cost_record', { details: record as unknown as Record<string, unknown> })
  }

  trackEvent(eventData: AnalyticsEventData): void {
    const validEvents: string[] = [
      'session_started', 'conversation_started', 'message_sent', 'assistant_response',
      'tool_executed', 'permission_denied', 'prompt_used', 'response_validated',
      'memory_operation', 'recommendation_generated', 'rag_retrieved',
      'embedding_computed', 'citation_generated', 'error',
    ]

    if (validEvents.includes(eventData.event)) {
      this.analyticsBuffer.push(eventData)
    }

    logger.info(eventData.event, {
      userId: eventData.userId,
      sessionId: eventData.sessionId,
      conversationId: eventData.conversationId,
      details: eventData.data as Record<string, unknown>,
    })
  }

  trackPerformance(context: AnalyticsEventData, metrics?: { latency?: number; tokens?: number; cost?: number }): void {
    logger.performance(context.event, {
      userId: context.userId,
      sessionId: context.sessionId,
      conversationId: context.conversationId,
      duration: metrics?.latency,
      tokens: metrics?.tokens ? { promptTokens: metrics.tokens, completionTokens: 0, totalTokens: metrics.tokens } : undefined,
      cost: metrics?.cost ? { promptCost: metrics.cost, completionCost: 0, totalCost: metrics.cost, currency: 'usd' } : undefined,
    })
  }

  trackCost(costRecord: CostRecord): void {
    logger.info('cost_record', { details: costRecord as unknown as Record<string, unknown> })
  }

  trackUserSession(userId: string, sessionId: string, conversationId: string): void {
    this.trackEvent({ event: 'session_started' as AnalyticsEventData['event'], userId, sessionId, conversationId })
    this.conversationsToday++
  }

  trackConversationStart(userId: string | undefined, sessionId: string | undefined, conversationId: string): void {
    if (!userId) return
    this.trackEvent({ event: 'conversation_started' as AnalyticsEventData['event'], userId, sessionId, conversationId })
  }

  trackMessage(userId: string | undefined, sessionId: string | undefined, conversationId: string, message: { role: string; content: string; timestamp: string }): void {
    this.trackEvent({
      event: 'message_sent' as AnalyticsEventData['event'],
      userId,
      sessionId,
      conversationId,
      data: { role: message.role, contentLength: message.content.length, timestamp: message.timestamp },
    })
  }

  trackAssistantResponse(userId: string | undefined, sessionId: string | undefined, conversationId: string, response: { content: string; tokens: number; cost: number; latency: number; model: string; provider: string }): void {
    this.trackEvent({
      event: 'assistant_response',
      userId,
      sessionId,
      conversationId,
      data: { responseLength: response.content.length, model: response.model, provider: response.provider },
    })

    this.trackCost({
      date: new Date().toISOString().split('T')[0],
      userId,
      model: response.model,
      promptTokens: response.tokens / 2,
      completionTokens: response.tokens / 2,
      totalTokens: response.tokens,
      cost: response.cost,
      provider: response.provider,
      conversationId,
    })
  }

  trackToolExecution(userId: string | undefined, sessionId: string | undefined, conversationId: string, toolName: string, success: boolean, latency?: number): void {
    this.trackEvent({
      event: 'tool_executed',
      userId,
      sessionId,
      conversationId,
      data: { toolName, success, latency },
    })
  }

  trackPermissionDenied(userId: string | undefined, sessionId: string | undefined, conversationId: string, reason?: string): void {
    if (!userId) return
    this.trackEvent({
      event: 'permission_denied',
      userId,
      sessionId,
      conversationId,
      data: { reason },
    })
  }

  trackPromptUsage(userId: string | undefined, sessionId: string | undefined, conversationId: string, promptId: string, version: number, source: string): void {
    this.trackEvent({
      event: 'prompt_used',
      userId,
      sessionId,
      conversationId,
      data: { promptId, version, source },
    })
  }

  trackResponseValidation(userId: string | undefined, sessionId: string | undefined, conversationId: string, isValid: boolean, score?: number, reasons?: string[]): void {
    this.trackEvent({
      event: 'response_validated',
      userId,
      sessionId,
      conversationId,
      data: { isValid, score, reasons },
    })
  }

  trackMemoryOperation(userId: string | undefined, operation: 'read' | 'write' | 'delete', scope: string, count?: number): void {
    if (!userId) return
    this.trackEvent({
      event: 'memory_operation' as AnalyticsEventData['event'],
      userId,
      data: { operation, scope, count },
    })
  }

  trackRecommendation(userId: string | undefined, sessionId: string | undefined, conversationId: string, source: string, success: boolean, count?: number): void {
    this.trackEvent({
      event: 'recommendation_generated',
      userId,
      sessionId,
      conversationId,
      data: { source, success, count },
    })
  }

  trackRAGRetrieval(userId: string | undefined, sessionId: string | undefined, conversationId: string, source: string, success: boolean, latency?: number, score?: number): void {
    this.trackEvent({
      event: 'rag_retrieved',
      userId,
      sessionId,
      conversationId,
      data: { source, success, latency, score },
    })
  }

  trackEmbeddingComputed(userId: string | undefined, sessionId: string | undefined, conversationId: string, source: string, model: string): void {
    this.trackEvent({
      event: 'embedding_computed',
      userId,
      sessionId,
      conversationId,
      data: { source, model },
    })
  }

  trackCitationGenerated(userId: string | undefined, sessionId: string | undefined, conversationId: string, source: string, citationCount: number): void {
    this.trackEvent({
      event: 'citation_generated',
      userId,
      sessionId,
      conversationId,
      data: { source, citationCount },
    })
  }

  trackError(userId: string | undefined, sessionId: string | undefined, conversationId: string, error: Error, context?: Record<string, unknown>): void {
    this.trackEvent({
      event: 'error',
      userId,
      sessionId,
      conversationId,
      data: { error: error.message, stack: error.stack, context },
    })
  }

  getAnalyticsData(): {
    conversationsToday: number
    activeUsers: number
    avgResponseTime: number
    startTime: number
  } {
    return {
      conversationsToday: this.conversationsToday,
      activeUsers: this.activeUsers,
      avgResponseTime: this.avgResponseTime,
      startTime: this.startTime,
    }
  }

  private processBuffer(): void {
    if (this.analyticsBuffer.length > 0) {
      this.analyticsBuffer.splice(0)
    }
  }

  clear(): void {
    this.analyticsBuffer = []
  }

  getBuffer(): AnalyticsEventData[] {
    return [...this.analyticsBuffer]
  }

  dispose(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    setAnalyticsHook(null)
    this.clear()
  }
}

export class CostService {
  private static instance: CostService
  private costRecords: CostRecord[] = []
  private cache = new Map<string, number>()
  private totalCostToday = 0

  private constructor() {}

  static getInstance(): CostService {
    if (!CostService.instance) {
      CostService.instance = new CostService()
    }
    return CostService.instance
  }

  recordUsage(
    userId: string | undefined,
    model: string,
    promptTokens: number,
    completionTokens: number,
    cost: number,
    provider: 'openai' | 'anthropic' = 'openai',
    conversationId?: string,
  ): void {
    const date = new Date().toISOString().split('T')[0]
    const record: CostRecord = {
      date,
      userId: userId ?? undefined,
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cost,
      provider,
      conversationId,
    }

    this.costRecords.push(record)
    this.totalCostToday += cost
    logger.info('cost_record', { details: record as unknown as Record<string, unknown> })

    const cacheKey = this.getCacheKey(date, userId ?? null, model)
    this.cache.set(cacheKey, (this.cache.get(cacheKey) ?? 0) + cost)
  }

  getCostSummary(): { totalCostToday: number } {
    return { totalCostToday: this.totalCostToday }
  }

  getCostAnalysis(startDate: string, endDate: string): CostSummary {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const records = this.costRecords.filter(r => {
      const recordDate = new Date(r.date)
      return recordDate >= start && recordDate <= end
    })

    const totalCost = records.reduce((sum, r) => sum + r.cost, 0)
    const openaiCost = records.filter(r => r.provider === 'openai').reduce((sum, r) => sum + r.cost, 0)
    const anthropicCost = records.filter(r => r.provider === 'anthropic').reduce((sum, r) => sum + r.cost, 0)
    const promptTokens = records.reduce((sum, r) => sum + r.promptTokens, 0)
    const completionTokens = records.reduce((sum, r) => sum + r.completionTokens, 0)
    const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0)

    const costPerConversation = records.length > 0 ? totalCost / records.length : 0
    const uniqueUsers = new Set(records.map(r => r.userId).filter(Boolean)).size
    const costPerUser = uniqueUsers > 0 ? totalCost / uniqueUsers : 0

    const costByModel: Record<string, number> = {}
    const providerUsage: Record<string, number> = {}

    records.forEach(r => {
      costByModel[r.model] = (costByModel[r.model] ?? 0) + r.cost
      providerUsage[r.provider] = (providerUsage[r.provider] ?? 0) + 1
    })

    const costPerFeature = {
      assistant: totalCost * 0.7,
      tools: totalCost * 0.15,
      rag: totalCost * 0.1,
      memory: totalCost * 0.05,
    }

    return {
      period: `${startDate} to ${endDate}`,
      metrics: {
        totalCost,
        openaiCost,
        anthropicCost,
        promptTokens,
        completionTokens,
        totalTokens,
        costPerConversation,
        costPerUser,
        costPerFeature,
        costByModel,
        providerUsage,
      },
    }
  }

  getUsageMetrics(startDate: string, endDate: string): UsageMetrics {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const startOfWeek = new Date(start)
    startOfWeek.setDate(start.getDate() - start.getDay())

    const daily: NonNullable<UsageMetrics['daily']> = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayRecords = this.costRecords.filter(r => r.date === dateStr)
      const conversations = new Set(dayRecords.map(r => r.conversationId).filter(Boolean)).size
      const users = new Set(dayRecords.map(r => r.userId).filter(Boolean)).size
      const tokens = dayRecords.reduce((sum, r) => sum + r.totalTokens, 0)
      const cost = dayRecords.reduce((sum, r) => sum + r.cost, 0)

      daily.push({
        conversations,
        users,
        activeUsers: users,
        messages: dayRecords.length * 2,
        tokens,
        cost,
        latency: 0,
        errorRate: 0,
      })
    }

    const weekRecords = this.costRecords.filter(r => {
      const recordDate = new Date(r.date)
      return recordDate >= startOfWeek && recordDate <= end
    })

    const weekly: NonNullable<UsageMetrics['weekly']> = {
      conversations: new Set(weekRecords.map(r => r.conversationId).filter(Boolean)).size,
      users: new Set(weekRecords.map(r => r.userId).filter(Boolean)).size,
      activeUsers: new Set(weekRecords.map(r => r.userId).filter(Boolean)).size,
      messages: weekRecords.length * 2,
      tokens: weekRecords.reduce((sum, r) => sum + r.totalTokens, 0),
      cost: weekRecords.reduce((sum, r) => sum + r.cost, 0),
      latency: 0,
      errorRate: 0,
    }

    return { daily, weekly }
  }

  getKPIs(startDate: string, endDate: string): KPIs {
    const costSummary = this.getCostAnalysis(startDate, endDate)
    const usageMetrics = this.getUsageMetrics(startDate, endDate)

    const uniqueUsers = usageMetrics.weekly?.users ?? 0
    const activeUsers = usageMetrics.weekly?.activeUsers ?? 0
    const userEngagement = uniqueUsers > 0 ? (activeUsers / uniqueUsers) * 100 : 0
    const totalCost = costSummary.metrics.totalCost
    const totalTokens = costSummary.metrics.totalTokens
    const costEfficiency = totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0

    return {
      period: `${startDate} to ${endDate}`,
      userEngagement,
      responseQuality: 95,
      systemReliability: 98,
      costEfficiency,
      featureAdoption: { assistant: 100, tools: 65, rag: 80, memory: 70 },
    }
  }

  getConversationAnalytics(): AnalyticsSummary {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    const dailyMetrics = this.getUsageMetrics(todayStr, todayStr)
    const dailyArr = dailyMetrics.daily ?? []
    const totalConversations = dailyArr.reduce((sum, d) => sum + d.conversations, 0)
    const uniqueUsers = new Set(
      this.costRecords
        .filter(r => r.date >= todayStr)
        .map(r => r.userId)
        .filter(Boolean),
    ).size

    const totalTokens = this.costRecords
      .filter(r => r.date >= todayStr)
      .reduce((sum, r) => sum + r.totalTokens, 0)

    const totalCost = this.costRecords
      .filter(r => r.date >= todayStr)
      .reduce((sum, r) => sum + r.cost, 0)

    const totalMessages = dailyArr.reduce((sum, d) => sum + d.messages, 0)
    const avgConversationLength = totalConversations > 0 ? totalMessages / totalConversations : 0
    const avgTokensPerConversation = totalConversations > 0 ? totalTokens / totalConversations : 0
    const avgCostPerConversation = totalConversations > 0 ? totalCost / totalConversations : 0

    return {
      period: todayStr,
      metrics: {
        conversations: totalConversations,
        uniqueUsers,
        activeUsers: uniqueUsers,
        avgSessionDuration: 180_000,
        avgConversationLength,
        avgTokensPerConversation,
        avgCostPerConversation,
        totalCost,
        totalTokens,
        userSatisfaction: 92,
        recommendationUsage: 45,
        ragUsage: 85,
        memoryUsage: 72,
      },
    }
  }

  private getCacheKey(date: string, userId: string | null, model: string): string {
    return `${date}:${userId ?? 'anon'}:${model}`
  }

  clear(): void {
    this.costRecords = []
    this.cache.clear()
    this.totalCostToday = 0
  }

  dispose(): void {
    this.clear()
  }
}
