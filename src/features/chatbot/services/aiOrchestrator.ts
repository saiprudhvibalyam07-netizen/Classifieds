import type { ChatbotMessage, ChatbotRole, TokenUsage, CostEstimate, AIResponse } from '../types'
import { AI_CONFIG } from '../config'
import { buildSystemPrompt, buildUserPrompt } from './promptBuilder'
import { buildConversationContext, buildFullMessageList } from './contextBuilder'
import { checkMessagePermission } from './permissionChecker'
import { validateResponse, buildFallbackResponse } from './responseValidator'
import { estimateTokens, countMessageTokens, createTokenUsage } from './tokenCounter'
import { estimateCost } from './costEstimator'
import { logger } from './logger'

export class AIError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'AIError'
  }
}

export interface OrchestratorParams {
  content: string
  role: ChatbotRole
  messages: ChatbotMessage[]
  onToken: (token: string) => void
  signal?: AbortSignal
  model?: string
}

async function streamFromProvider(
  messages: Array<{ role: string; content: string }>,
  options: {
    onToken: (token: string) => void
    signal?: AbortSignal
    model: string
    timeout: number
  }
): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), options.timeout)

  const signal = options.signal
    ? combineSignals(options.signal, controller.signal)
    : controller.signal

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (AI_CONFIG.openaiKey) {
    headers['Authorization'] = `Bearer ${AI_CONFIG.openaiKey}`
  }

  const response = await fetch(AI_CONFIG.openaiEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: options.model,
      messages,
      stream: true,
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
      top_p: AI_CONFIG.topP,
      frequency_penalty: AI_CONFIG.frequencyPenalty,
      presence_penalty: AI_CONFIG.presencePenalty,
    }),
    signal,
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new AIError(
      `API request failed with status ${response.status}: ${errorBody}`,
      'API_ERROR'
    )
  }

  const reader = response.body?.getReader()
  if (!reader) throw new AIError('Response body is not readable', 'STREAM_ERROR')

  let fullContent = ''
  let promptTokens = 0
  let completionTokens = 0
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += new TextDecoder().decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            fullContent += delta
            options.onToken(delta)
          }

          if (parsed.usage) {
            promptTokens = parsed.usage.prompt_tokens ?? 0
            completionTokens = parsed.usage.completion_tokens ?? 0
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return { content: fullContent, promptTokens, completionTokens }
}

function combineSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}

async function callWithRetry(
  params: OrchestratorParams,
  attempt: number = 0
): Promise<{ content: string; tokens: TokenUsage; cost: CostEstimate; latency: number }> {
  const startTime = Date.now()
  const model = params.model ?? AI_CONFIG.model

  try {
    const systemPrompt = buildSystemPrompt(params.role)
    const userMessage = buildUserPrompt(params.content)
    const contextMessages = buildConversationContext(params.messages)
    const fullMessages = buildFullMessageList(systemPrompt, contextMessages, userMessage)

    const inputTokens = estimateTokens(systemPrompt) + countMessageTokens(
      fullMessages.filter((m) => m.role !== 'system')
    )

    const result = await streamFromProvider(fullMessages, {
      onToken: params.onToken,
      signal: params.signal,
      model,
      timeout: AI_CONFIG.timeout,
    })

    const outputTokens = result.completionTokens || estimateTokens(result.content)
    const totalPromptTokens = result.promptTokens || inputTokens
    const totalCompletionTokens = outputTokens

    const tokens = createTokenUsage(totalPromptTokens, totalCompletionTokens)
    const cost = estimateCost(model, totalPromptTokens, totalCompletionTokens)
    const latency = Date.now() - startTime

    logger.info('ai_request_success', {
      tokens,
      cost,
      duration: latency,
      details: { model, attempt: attempt + 1 },
    })

    return { content: result.content, tokens, cost, latency }
  } catch (err) {
    const latency = Date.now() - startTime

    const isRetryable = err instanceof AIError
      ? err.code === 'API_ERROR'
      : true

    if (isRetryable && attempt < AI_CONFIG.maxRetries) {
      const delay = AI_CONFIG.retryDelay * Math.pow(2, attempt)
      logger.warn('ai_retry', {
        duration: latency,
        error: err instanceof Error ? err.message : String(err),
        details: { attempt: attempt + 1, maxRetries: AI_CONFIG.maxRetries, delay },
      })
      await new Promise((resolve) => setTimeout(resolve, delay))
      return callWithRetry(params, attempt + 1)
    }

    throw err
  }
}

export async function orchestrateAI(params: OrchestratorParams): Promise<AIResponse> {
  const startTime = Date.now()

  const permissionCheck = checkMessagePermission(params.content)
  if (!permissionCheck.allowed) {
    logger.warn('ai_permission_denied', {
      duration: Date.now() - startTime,
      details: { reason: permissionCheck.reason, role: params.role },
    })
    throw new AIError(permissionCheck.reason ?? 'Message permission denied', 'PERMISSION_DENIED')
  }

  try {
    const result = await callWithRetry(params)

    const validation = validateResponse(result.content)
    if (!validation.valid) {
      logger.warn('ai_response_invalid', {
        duration: Date.now() - startTime,
        tokens: result.tokens,
        cost: result.cost,
        details: { reason: validation.reason },
      })

      return {
        content: buildFallbackResponse(),
        tokens: result.tokens,
        cost: result.cost,
        latency: Date.now() - startTime,
      }
    }

    return result
  } catch (err) {
    const latency = Date.now() - startTime
    const message = err instanceof Error ? err.message : 'AI orchestration failed'

    logger.error('ai_orchestration_failed', {
      duration: latency,
      error: message,
      details: { role: params.role },
    })

    if (err instanceof AIError) throw err
    throw new AIError(message, 'ORCHESTRATION_ERROR')
  }
}
