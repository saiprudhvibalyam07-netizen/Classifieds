import type { CostEstimate } from '../types'
import { COST_CONFIG } from '../config'

interface ModelRates {
  input: number
  output: number
}

function getModelRates(model: string): ModelRates {
  return COST_CONFIG.modelRates[model as keyof typeof COST_CONFIG.modelRates] ?? COST_CONFIG.modelRates['gpt-4o-mini']
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): CostEstimate {
  if (!COST_CONFIG.enabled) {
    return { promptCost: 0, completionCost: 0, totalCost: 0, currency: COST_CONFIG.currency }
  }

  const rates = getModelRates(model)
  const promptCost = (inputTokens / 1000) * rates.input
  const completionCost = (outputTokens / 1000) * rates.output

  return {
    promptCost: Math.round(promptCost * 1000000) / 1000000,
    completionCost: Math.round(completionCost * 1000000) / 1000000,
    totalCost: Math.round((promptCost + completionCost) * 1000000) / 1000000,
    currency: COST_CONFIG.currency,
  }
}
