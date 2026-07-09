import { describe, it, expect, vi, beforeEach } from 'vitest'
import { orchestrateAI, AIError } from '../aiOrchestrator'
import { AI_CONFIG } from '../../config'

vi.mock('../../config', () => ({
  AI_CONFIG: {
    model: 'gpt-4o-mini',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    timeout: 5000,
    maxRetries: 1,
    retryDelay: 100,
    openaiEndpoint: 'https://api.openai.com/v1/chat/completions',
    openaiKey: 'test-key',
  },
  COST_CONFIG: {
    enabled: true,
    currency: 'USD',
    modelRates: {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    },
  },
  LOG_CONFIG: { enabled: false, level: 'error', maxEntries: 10 },
  CHATBOT_CONFIG: { enabled: true, mockMode: true },
}))

function createMockStream(chunks: string[]) {
  const encoder = new TextEncoder()
  return {
    body: {
      getReader() {
        let index = 0
        return {
          read() {
            if (index >= chunks.length) {
              return Promise.resolve({ done: true, value: undefined })
            }
            const data = `data: ${JSON.stringify({
              choices: [{ delta: { content: chunks[index] } }],
            })}\n\n`
            index++
            return Promise.resolve({ done: false, value: encoder.encode(data) })
          },
          releaseLock() {},
        }
      },
    },
    ok: true,
    status: 200,
    text: () => Promise.resolve(''),
  }
}

describe('aiOrchestrator', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('throws AIError for empty content', async () => {
    await expect(orchestrateAI({
      content: '',
      role: 'visitor',
      messages: [],
      onToken: () => {},
    })).rejects.toThrow(AIError)
  })

  it('throws AIError for permission denied (overly long)', async () => {
    await expect(orchestrateAI({
      content: 'A'.repeat(4001),
      role: 'visitor',
      messages: [],
      onToken: () => {},
    })).rejects.toThrow(AIError)
  })

  it('streams tokens from the API', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(createMockStream(['Hello', ' ', 'world']))
    const tokens: string[] = []
    const result = await orchestrateAI({
      content: 'Hi',
      role: 'visitor',
      messages: [],
      onToken: (token) => tokens.push(token),
    })
    expect(result.content).toBe('Hello world')
    expect(result.tokens.totalTokens).toBeGreaterThan(0)
    expect(result.cost.totalCost).toBeGreaterThan(0)
    expect(result.latency).toBeGreaterThanOrEqual(0)
  })

  it('returns fallback response for invalid AI output', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(createMockStream(['contact me at test@test.com']))
    const result = await orchestrateAI({
      content: 'Hi',
      role: 'visitor',
      messages: [],
      onToken: () => {},
    })
    expect(result.content).toContain('apologize')
  })

  it('retries on API error', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(createMockStream(['Hello']))
    globalThis.fetch = fetchMock

    const result = await orchestrateAI({
      content: 'Hi',
      role: 'visitor',
      messages: [],
      onToken: () => {},
    })
    expect(result.content).toBe('Hello')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws after exhausting retries', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Persistent error'))
    await expect(orchestrateAI({
      content: 'Hi',
      role: 'visitor',
      messages: [],
      onToken: () => {},
    })).rejects.toThrow()
  })

  it('handles abort signal', async () => {
    const controller = new AbortController()
    controller.abort()
    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    await expect(orchestrateAI({
      content: 'Hi',
      role: 'visitor',
      messages: [],
      onToken: () => {},
      signal: controller.signal,
    })).rejects.toThrow()
  })
})
