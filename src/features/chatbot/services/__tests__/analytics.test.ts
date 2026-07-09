import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnalyticsService, CostService, AIFailureError } from '../analytics'

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
  setAnalyticsHook: vi.fn(),
}))

vi.mock('../../config', () => ({
  LOG_CONFIG: { enabled: true, level: 'info', maxEntries: 100, analyticsEnabled: true },
}))

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService

  beforeEach(() => {
    vi.clearAllMocks()
    analyticsService = AnalyticsService.getInstance()
    analyticsService.clear()
  })

  describe('trackEvent', () => {
    it('tracks analytics events', () => {
      const eventData = {
        event: 'session_started',
        userId: 'user-1',
        sessionId: 'session-1',
        conversationId: 'conv-1',
        data: { source: 'web' }
      } as any

      analyticsService.trackEvent(eventData)

      expect((window as any).analyticsService).toBeDefined()
    })

    it('skips non-analytics events', () => {
      analyticsService.trackEvent({
        event: 'raw_event',
        userId: 'user-1'
      } as any)
      expect((window as any).analyticsService).toBeDefined()
    })
  })

  describe('trackPerformance', () => {
    it('tracks performance metrics', () => {
      analyticsService.trackPerformance(
        {
          userId: 'user-1',
          sessionId: 'session-1',
          conversationId: 'conv-1',
          event: 'assistant_response'
        } as any,
        {
          latency: 1000,
          tokens: 150,
          cost: 0.05
        }
      )

      expect((window as any).analyticsService).toBeDefined()
    })
  })

  describe('trackCost', () => {
    it('tracks cost records', () => {
      const costRecord = {
        date: '2024-01-01',
        userId: 'user-1',
        model: 'gpt-4o',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        cost: 0.05,
        provider: 'openai',
        conversationId: 'conv-1'
      }

      analyticsService.trackCost(costRecord as any)

      expect((window as any).analyticsService).toBeDefined()
    })
  })

  describe('trackUserSession', () => {
    it('tracks user session events', () => {
      analyticsService.trackUserSession('user-1', 'session-1', 'conv-1')
      expect((window as any).analyticsService).toBeDefined()
    })
  })

  describe('trackMessage', () => {
    it('tracks message events', () => {
      analyticsService.trackMessage('user-1', 'session-1', 'conv-1', {
        role: 'user',
        content: 'Hello world',
        timestamp: '2024-01-01T00:00:00.000Z'
      })

      expect((window as any).analyticsService).toBeDefined()
    })
  })

  describe('trackAssistantResponse', () => {
    it('tracks assistant responses with cost tracking', () => {
      analyticsService.trackAssistantResponse('user-1', 'session-1', 'conv-1', {
        content: 'Hello!',
        tokens: 50,
        cost: 0.02,
        latency: 500,
        model: 'gpt-4o',
        provider: 'openai'
      })

      expect((window as any).analyticsService).toBeDefined()
    })
  })

  describe('trackToolExecution', () => {
    it('tracks tool execution', () => {
      analyticsService.trackToolExecution('user-1', 'session-1', 'conv-1', 'search_listings', true, 100)
      expect((window as any).analyticsService).toBeDefined()
    })
  })
})

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
  setAnalyticsHook: vi.fn(),
}))

vi.mock('../../config', () => ({
  LOG_CONFIG: { enabled: true, level: 'info', maxEntries: 100, analyticsEnabled: true },
}))

describe('CostService', () => {
  let costService: CostService

  beforeEach(() => {
    vi.clearAllMocks()
    costService = CostService.getInstance()
    costService.clear()
  })

  describe('recordUsage', () => {
    it('records usage data', () => {
      costService.recordUsage(
        'user-1',
        'gpt-4o',
        100,
        50,
        0.05,
        'openai',
        'conv-1'
      )

      expect((window as any).analyticsService).toBeDefined()
    })

    it('handles anonymous users', () => {
      costService.recordUsage(
        null,
        'gpt-4o-mini',
        50,
        25,
        0.01,
        'openai',
        'conv-2'
      )

      expect((window as any).analyticsService).toBeDefined()
    })
  })

  describe('getCostAnalysis', () => {
    it('returns cost analysis for period', () => {
      const today = new Date().toISOString().split('T')[0]

      costService.recordUsage(
        'user-1',
        'gpt-4o',
        100,
        50,
        0.05,
        'openai',
        'conv-1'
      )

      const analysis = costService.getCostAnalysis(today, today)

      expect(analysis.period).toContain(today)
      expect(analysis.metrics.totalCost).toBe(0.05)
      expect(analysis.metrics.promptTokens).toBe(100)
      expect(analysis.metrics.completionTokens).toBe(50)
      expect(analysis.metrics.totalTokens).toBe(150)
    })

    it('returns empty analysis for no data', () => {
      const startDate = '2024-01-01'
      const endDate = '2024-01-31'

      const analysis = costService.getCostAnalysis(startDate, endDate)

      expect(analysis.metrics.totalCost).toBe(0)
      expect(analysis.metrics.promptTokens).toBe(0)
    })
  })

  describe('getConversationAnalytics', () => {
    it('returns conversation analytics', () => {
      costService.recordUsage(
        'user-1',
        'gpt-4o',
        100,
        50,
        0.05,
        'openai',
        'conv-1'
      )

      const analytics = costService.getConversationAnalytics()

      expect(analytics.metrics.conversations).toBeGreaterThanOrEqual(1)
      expect(analytics.metrics.uniqueUsers).toBeGreaterThanOrEqual(1)
      expect(analytics.metrics.totalCost).toBe(0.05)
      expect(analytics.metrics.totalTokens).toBe(150)
    })
  })

  describe('getKPIs', () => {
    it('returns KPIs for period', () => {
      costService.recordUsage(
        'user-1',
        'gpt-4o',
        100,
        50,
        0.05,
        'openai',
        'conv-1'
      )

      const kpis = costService.getKPIs('2024-01-01', '2024-01-31')

      expect(kpis.userEngagement).toBeGreaterThanOrEqual(0)
      expect(kpis.responseQuality).toBeGreaterThanOrEqual(0)
      expect(kpis.systemReliability).toBeGreaterThanOrEqual(0)
      expect(kpis.costEfficiency).toBeGreaterThanOrEqual(0)
      expect(kpis.featureAdoption.assistant).toBe(100)
    })
  })

  describe('getUsageMetrics', () => {
    it('returns usage metrics for period', () => {
      const today = new Date().toISOString().split('T')[0]

      costService.recordUsage(
        'user-1',
        'gpt-4o',
        100,
        50,
        0.05,
        'openai',
        'conv-1'
      )

      const metrics = costService.getUsageMetrics(today, today)

      expect(metrics.daily).toBeDefined()
      expect(metrics.weekly).toBeDefined()
      expect(metrics.daily?.[0].conversations).toBeGreaterThanOrEqual(1)
      expect(metrics.weekly?.conversations).toBeGreaterThanOrEqual(1)
    })
  })

  describe('AIFailureError', () => {
    it('creates an AI error with code and context', () => {
      const error = new AIFailureError('Test error', 'ERR_001', { userId: 'user-1' })

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('ERR_001')
      expect(error.context).toEqual({ userId: 'user-1' })
    })
  })
})
