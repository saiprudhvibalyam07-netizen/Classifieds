import type { TokenUsage } from '../types'

const TOKENS_PER_CHAR = 0.25
const OVERHEAD_PER_MESSAGE = 4
const OVERHEAD_TOTAL = 3

export function estimateTokens(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR)
}

export function countMessageTokens(messages: Array<{ role: string; content: string }>): number {
  let total = 0
  for (const msg of messages) {
    total += estimateTokens(msg.content) + OVERHEAD_PER_MESSAGE
  }
  return total + OVERHEAD_TOTAL
}

export function createTokenUsage(promptTokens: number, completionTokens: number): TokenUsage {
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  }
}
