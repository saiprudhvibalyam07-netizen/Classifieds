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
    },
  },
  LOG_CONFIG: { enabled: false, level: 'error', maxEntries: 10 },
  CHATBOT_CONFIG: { enabled: true, mockMode: true },
}))

function createStreamResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  const lines = chunks.map((text) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`)
  lines.push('data: [DONE]\n\n')
  const body = lines.join('')
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
            const chunk = body.slice(pos, pos + body.length)
            pos = body.length
            return Promise.resolve({ done: false, value: encoder.encode(chunk) })
          },
          releaseLock() {},
        }
      },
    },
  }
}

function createErrorResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(body),
  }
}

describe('AI Orchestrator Edge Cases', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Error Recovery', () => {
    it('returns fallback for invalid AI response content', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createStreamResponse(['contact me at user@test.com']))
      const result = await orchestrateAI({
        content: 'Hi',
        role: 'visitor',
        messages: [],
        onToken: () => {},
      })
      expect(result.content).toContain('apologize')
    })

    it('recovers after single API failure', async () => {
      const fetchMock = vi.fn()
        .mockRejectedValueOnce(new Error('Network issue'))
        .mockResolvedValueOnce(createStreamResponse(['Recovered']))
      globalThis.fetch = fetchMock
      const result = await orchestrateAI({
        content: 'Test',
        role: 'visitor',
        messages: [],
        onToken: () => {},
      })
      expect(result.content).toBe('Recovered')
    })

    it('exhausts retries and throws', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Persistent failure'))
      await expect(orchestrateAI({
        content: 'Test',
        role: 'visitor',
        messages: [],
        onToken: () => {},
      })).rejects.toThrow(AIError)
    })
  })

  describe('Retry Flow', () => {
    it('retries exactly maxRetries times before success', async () => {
      let calls = 0
      const fetchMock = vi.fn().mockImplementation(() => {
        calls++
        if (calls <= 2) return Promise.reject(new Error(`Attempt ${calls} failed`))
        return Promise.resolve(createStreamResponse(['Success']))
      })
      globalThis.fetch = fetchMock
      const result = await orchestrateAI({
        content: 'Test',
        role: 'visitor',
        messages: [],
        onToken: () => {},
      })
      expect(result.content).toBe('Success')
      expect(calls).toBe(3)
    })

    it('does not retry on permission denied', async () => {
      await expect(orchestrateAI({
        content: '',
        role: 'visitor',
        messages: [],
        onToken: () => {},
      })).rejects.toThrow(AIError)
    })
  })

  describe('Timeout Behaviour', () => {
    it('throws error when API does not respond within timeout', async () => {
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

  describe('Permission Errors', () => {
    it('throws AIError for empty content', async () => {
      try {
        await orchestrateAI({
          content: '',
          role: 'visitor',
          messages: [],
          onToken: () => {},
        })
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(AIError)
        expect((err as AIError).code).toBe('PERMISSION_DENIED')
      }
    })

    it('throws AIError for content exceeding max length', async () => {
      try {
        await orchestrateAI({
          content: 'A'.repeat(4001),
          role: 'visitor',
          messages: [],
          onToken: () => {},
        })
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(AIError)
        expect((err as AIError).code).toBe('PERMISSION_DENIED')
      }
    })
  })

  describe('API Error Codes', () => {
    it('throws AIError for 500 status', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createErrorResponse(500, 'Internal error'))
      try {
        await orchestrateAI({
          content: 'Hi',
          role: 'visitor',
          messages: [],
          onToken: () => {},
        })
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(AIError)
        expect((err as AIError).code).toBe('API_ERROR')
      }
    })

    it('throws AIError for 429 status (rate limit)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createErrorResponse(429, 'Rate limited'))
      try {
        await orchestrateAI({
          content: 'Hi',
          role: 'visitor',
          messages: [],
          onToken: () => {},
        })
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(AIError)
        expect((err as AIError).code).toBe('API_ERROR')
      }
    })

    it('throws AIError for 400 status (bad request)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createErrorResponse(400, 'Bad request'))
      try {
        await orchestrateAI({
          content: 'Hi',
          role: 'visitor',
          messages: [],
          onToken: () => {},
        })
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(AIError)
      }
    })
  })

  describe('Model Configuration', () => {
    it('uses default model when not specified', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(createStreamResponse(['OK']))
      await orchestrateAI({
        content: 'Hi',
        role: 'visitor',
        messages: [],
        onToken: () => {},
      })
      const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.model).toBe('gpt-4o-mini')
    })
  })
})
