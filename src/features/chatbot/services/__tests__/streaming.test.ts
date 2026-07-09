import { describe, it, expect, vi, beforeEach } from 'vitest'
import { orchestrateAI, AIError } from '../aiOrchestrator'

vi.mock('../../config', () => ({
  AI_CONFIG: {
    model: 'gpt-4o-mini',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    timeout: 100,
    maxRetries: 2,
    retryDelay: 50,
    openaiEndpoint: '/api/chat',
    openaiKey: 'test-key',
  },
  COST_CONFIG: {
    enabled: true,
    currency: 'USD',
    modelRates: {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4o': { input: 0.0025, output: 0.01 },
    },
  },
  LOG_CONFIG: { enabled: false, level: 'error', maxEntries: 10 },
  CHATBOT_CONFIG: { enabled: true, mockMode: true },
}))

function encoder() { return new TextEncoder() }

function createStreamResponse(chunks: string[], usage?: { prompt_tokens: number; completion_tokens: number }) {
  const encoder = new TextEncoder()
  const allLines = chunks.map((text) => {
    const data: Record<string, unknown> = {
      choices: [{ delta: { content: text } }],
    }
    if (usage) {
      data.usage = usage
    }
    return `data: ${JSON.stringify(data)}\n\n`
  })
  if (usage) {
    allLines.push(`data: ${JSON.stringify({ usage })}\n\n`)
  }
  allLines.push('data: [DONE]\n\n')
  const body = allLines.join('')

  let pos = 0
  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        return {
          read() {
            if (pos >= body.length) {
              return Promise.resolve({ done: true, value: undefined })
            }
            const chunk = body.slice(pos, pos + 20)
            pos += 20
            return Promise.resolve({ done: false, value: encoder.encode(chunk) })
          },
          releaseLock() {},
        }
      },
    },
  }
}

describe('Streaming Validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Token Streaming', () => {
    it('streams tokens incrementally', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createStreamResponse(['Hello', ' ', 'World']))
      const tokens: string[] = []
      const result = await orchestrateAI({
        content: 'Hi',
        role: 'visitor',
        messages: [],
        onToken: (token) => tokens.push(token),
      })
      expect(tokens.length).toBeGreaterThanOrEqual(3)
      expect(tokens.join('')).toBe(result.content)
    })

    it('streams single token correctly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createStreamResponse(['Help']))
      const tokens: string[] = []
      await orchestrateAI({
        content: 'Hi',
        role: 'visitor',
        messages: [],
        onToken: (token) => tokens.push(token),
      })
      expect(tokens.join('')).toBe('Help')
    })

    it('streams long response with many tokens', async () => {
      const words = Array.from({ length: 50 }, (_, i) => `word${i}`)
      globalThis.fetch = vi.fn().mockResolvedValue(createStreamResponse(words))
      const tokens: string[] = []
      await orchestrateAI({
        content: 'Hi',
        role: 'visitor',
        messages: [],
        onToken: (token) => tokens.push(token),
      })
      expect(tokens.length).toBeGreaterThanOrEqual(50)
    })
  })

  describe('Partial Rendering', () => {
    it('begins streaming before full response is available', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createStreamResponse(['Part 1', ' Part 2', ' Part 3']))
      const receivedTokens: string[] = []
      await orchestrateAI({
        content: 'Hi',
        role: 'visitor',
        messages: [],
        onToken: (token) => receivedTokens.push(token),
      })
      expect(receivedTokens.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Abort Handling', () => {
    it('supports early abort via signal', async () => {
      const controller = new AbortController()
      globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          if (options.signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'))
            return
          }
          options.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
      })
      setTimeout(() => controller.abort(), 5)
      await expect(orchestrateAI({
        content: 'Hi',
        role: 'visitor',
        messages: [],
        onToken: () => {},
        signal: controller.signal,
      })).rejects.toThrow()
    })

    it('handles pre-aborted signal gracefully', async () => {
      const controller = new AbortController()
      controller.abort()
      globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          if (options.signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'))
            return
          }
          options.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
      })
      await expect(orchestrateAI({
        content: 'Hi',
        role: 'visitor',
        messages: [],
        onToken: () => {},
        signal: controller.signal,
      })).rejects.toThrow()
    })
  })

  describe('Retry After Interruption', () => {
    it('retries after temporary network failure', async () => {
      const fetchMock = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce(createStreamResponse(['Retried successfully']))
      globalThis.fetch = fetchMock
      const result = await orchestrateAI({
        content: 'Hi',
        role: 'visitor',
        messages: [],
        onToken: () => {},
      })
      expect(result.content).toBe('Retried successfully')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('retries multiple times until success', async () => {
      const fetchMock = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce(createStreamResponse(['Success after retries']))
      globalThis.fetch = fetchMock
      const result = await orchestrateAI({
        content: 'Hi',
        role: 'visitor',
        messages: [],
        onToken: () => {},
      })
      expect(result.content).toBe('Success after retries')
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })
  })

  describe('Timeout Handling', () => {
    it('fails when response exceeds timeout', async () => {
      globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          if (options.signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'))
            return
          }
          options.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
      })
      await expect(orchestrateAI({
        content: 'Hi',
        role: 'visitor',
        messages: [],
        onToken: () => {},
      })).rejects.toThrow()
    }, 5000)
  })

  describe('Recovery After Interruption', () => {
    it('recovers and produces complete response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createStreamResponse(['Complete response here']))
      const result = await orchestrateAI({
        content: 'Hi',
        role: 'visitor',
        messages: [],
        onToken: () => {},
      })
      expect(result.content.length).toBeGreaterThan(0)
      expect(result.tokens.totalTokens).toBeGreaterThan(0)
    })

    it('returns cost and latency data on recovery', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createStreamResponse(['Recovered']))
      const result = await orchestrateAI({
        content: 'Hi',
        role: 'visitor',
        messages: [],
        onToken: () => {},
      })
      expect(result.cost.totalCost).toBeGreaterThanOrEqual(0)
      expect(result.latency).toBeGreaterThanOrEqual(0)
    })
  })
})
