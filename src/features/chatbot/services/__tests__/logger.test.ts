import { describe, it, expect, beforeEach } from 'vitest'
import { logger } from '../logger'

describe('logger', () => {
  beforeEach(() => {
    logger.clear()
  })

  it('logs info messages', () => {
    logger.info('test_event', { details: { key: 'value' } })
    const entries = logger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].level).toBe('info')
    expect(entries[0].event).toBe('test_event')
  })

  it('logs warn messages', () => {
    logger.warn('warning_event', { error: 'something' })
    const entries = logger.getEntries()
    expect(entries[0].level).toBe('warn')
  })

  it('logs error messages', () => {
    logger.error('error_event', { error: 'failed' })
    const entries = logger.getEntries()
    expect(entries[0].level).toBe('error')
  })

  it('includes timestamp in entries', () => {
    logger.info('timed')
    const entry = logger.getEntries()[0]
    expect(entry.timestamp).toBeTruthy()
    expect(() => new Date(entry.timestamp)).not.toThrow()
  })

  it('includes duration when provided', () => {
    logger.info('slow', { duration: 150 })
    expect(logger.getEntries()[0].duration).toBe(150)
  })

  it('includes tokens when provided', () => {
    logger.info('token_usage', {
      tokens: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    })
    expect(logger.getEntries()[0].tokens?.totalTokens).toBe(150)
  })

  it('includes cost when provided', () => {
    logger.info('cost', {
      cost: { promptCost: 0.001, completionCost: 0.002, totalCost: 0.003, currency: 'USD' },
    })
    expect(logger.getEntries()[0].cost?.totalCost).toBe(0.003)
  })

  it('clear removes all entries', () => {
    logger.info('a')
    logger.info('b')
    expect(logger.getEntries()).toHaveLength(2)
    logger.clear()
    expect(logger.getEntries()).toHaveLength(0)
  })
})
