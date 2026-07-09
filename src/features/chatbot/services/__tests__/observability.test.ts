import { describe, it, expect, beforeEach } from 'vitest'
import { logger } from '../logger'

describe('Observability', () => {
  beforeEach(() => {
    logger.clear()
  })

  describe('Log Structure', () => {
    it('every entry has a timestamp', () => {
      logger.info('test')
      const entry = logger.getEntries()[0]
      expect(entry.timestamp).toBeTruthy()
      expect(() => new Date(entry.timestamp)).not.toThrow()
    })

    it('every entry has a level', () => {
      logger.info('test')
      const entry = logger.getEntries()[0]
      expect(['info', 'warn', 'error', 'debug']).toContain(entry.level)
    })

    it('every entry has an event name', () => {
      logger.info('test_event')
      expect(logger.getEntries()[0].event).toBe('test_event')
    })
  })

  describe('Token Tracking', () => {
    it('logs prompt tokens', () => {
      logger.info('tokens', { tokens: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } })
      expect(logger.getEntries()[0].tokens?.promptTokens).toBe(100)
    })

    it('logs completion tokens', () => {
      logger.info('tokens', { tokens: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } })
      expect(logger.getEntries()[0].tokens?.completionTokens).toBe(50)
    })

    it('logs total tokens', () => {
      logger.info('tokens', { tokens: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } })
      expect(logger.getEntries()[0].tokens?.totalTokens).toBe(150)
    })
  })

  describe('Cost Tracking', () => {
    it('logs prompt cost', () => {
      logger.info('cost', { cost: { promptCost: 0.001, completionCost: 0.002, totalCost: 0.003, currency: 'USD' } })
      expect(logger.getEntries()[0].cost?.promptCost).toBe(0.001)
    })

    it('logs completion cost', () => {
      logger.info('cost', { cost: { promptCost: 0.001, completionCost: 0.002, totalCost: 0.003, currency: 'USD' } })
      expect(logger.getEntries()[0].cost?.completionCost).toBe(0.002)
    })

    it('logs total cost', () => {
      logger.info('cost', { cost: { promptCost: 0.001, completionCost: 0.002, totalCost: 0.003, currency: 'USD' } })
      expect(logger.getEntries()[0].cost?.totalCost).toBe(0.003)
    })

    it('logs currency', () => {
      logger.info('cost', { cost: { promptCost: 0, completionCost: 0, totalCost: 0, currency: 'USD' } })
      expect(logger.getEntries()[0].cost?.currency).toBe('USD')
    })
  })

  describe('Latency Tracking', () => {
    it('logs duration in milliseconds', () => {
      logger.info('latency', { duration: 1234 })
      expect(logger.getEntries()[0].duration).toBe(1234)
    })

    it('handles zero duration', () => {
      logger.info('instant', { duration: 0 })
      expect(logger.getEntries()[0].duration).toBe(0)
    })
  })

  describe('Error Tracking', () => {
    it('logs error messages', () => {
      logger.error('failed', { error: 'Something broke' })
      expect(logger.getEntries()[0].error).toBe('Something broke')
    })

    it('logs error with tokens', () => {
      logger.error('failed', {
        error: 'API error',
        tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      })
      expect(logger.getEntries()[0].tokens).toBeDefined()
      expect(logger.getEntries()[0].error).toBe('API error')
    })
  })

  describe('Retry Tracking', () => {
    it('logs retry attempt count', () => {
      logger.warn('retry', { details: { attempt: 2, maxRetries: 3 } })
      expect(logger.getEntries()[0].details?.attempt).toBe(2)
      expect(logger.getEntries()[0].details?.maxRetries).toBe(3)
    })

    it('logs retry delay', () => {
      logger.warn('retry', { details: { delay: 1000 } })
      expect(logger.getEntries()[0].details?.delay).toBe(1000)
    })
  })

  describe('Provider Failure Tracking', () => {
    it('logs provider failure with error details', () => {
      logger.error('provider_failure', {
        error: 'OpenAI API returned 500',
        duration: 5000,
        details: { statusCode: 500, endpoint: '/chat/completions' },
      })
      const entry = logger.getEntries()[0]
      expect(entry.error).toContain('OpenAI')
      expect(entry.details?.statusCode).toBe(500)
    })
  })

  describe('Validation Failure Tracking', () => {
    it('logs validation failure with reason', () => {
      logger.warn('validation_failed', {
        details: { reason: 'Response contains prohibited content pattern', pattern: 'email' },
      })
      const entry = logger.getEntries()[0]
      expect(entry.details?.reason).toContain('prohibited')
    })
  })

  describe('Log Capacity', () => {
    it('limits entries to maxEntries', () => {
      for (let i = 0; i < 200; i++) {
        logger.info(`event_${i}`)
      }
      expect(logger.getEntries().length).toBeLessThanOrEqual(100)
    })

    it('keeps most recent entries when capped', () => {
      for (let i = 0; i < 150; i++) {
        logger.info(`event_${i}`)
      }
      const entries = logger.getEntries()
      expect(entries[entries.length - 1].event).toBe('event_149')
    })
  })
})
