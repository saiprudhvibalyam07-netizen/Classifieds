import { describe, it, expect } from 'vitest'
import { estimateCost } from '../costEstimator'

describe('costEstimator', () => {
  it('estimates cost for gpt-4o-mini', () => {
    const cost = estimateCost('gpt-4o-mini', 1000, 500)
    expect(cost.promptCost).toBeGreaterThan(0)
    expect(cost.completionCost).toBeGreaterThan(0)
    expect(cost.totalCost).toBe(cost.promptCost + cost.completionCost)
    expect(cost.currency).toBe('USD')
  })

  it('estimates higher cost for gpt-4o', () => {
    const mini = estimateCost('gpt-4o-mini', 1000, 500)
    const full = estimateCost('gpt-4o', 1000, 500)
    expect(full.totalCost).toBeGreaterThan(mini.totalCost)
  })

  it('returns zero cost for zero tokens', () => {
    const cost = estimateCost('gpt-4o-mini', 0, 0)
    expect(cost.totalCost).toBe(0)
  })

  it('falls back to gpt-4o-mini rates for unknown models', () => {
    const known = estimateCost('gpt-4o-mini', 1000, 0)
    const unknown = estimateCost('unknown-model', 1000, 0)
    expect(unknown.totalCost).toBe(known.totalCost)
  })

  it('calculates cost proportionally to token count', () => {
    const half = estimateCost('gpt-4o-mini', 500, 0)
    const full = estimateCost('gpt-4o-mini', 1000, 0)
    expect(full.totalCost).toBeCloseTo(half.totalCost * 2, 6)
  })
})
