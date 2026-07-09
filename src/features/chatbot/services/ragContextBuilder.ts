import type { ChatbotMessage, ChatbotRole, RAGContext, Citation } from '../types'
import { RAG_CONFIG } from '../config'
import { estimateTokens } from './tokenCounter'
import { retrieveContext } from './retrievalPipeline'
import { formatCitations } from './citationEngine'
import { logger } from './logger'

const MAX_CONTEXT_TOKENS = RAG_CONFIG.maxContextTokens
const MAX_MESSAGES = 20

interface ContextMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface RAGContextBuilderOptions {
  messages: ChatbotMessage[]
  userMessage: string
  role: ChatbotRole
  tokenBudget?: number
}

export interface RAGContextBuilderResult {
  messages: ContextMessage[]
  ragContext: RAGContext
  citations: Citation[]
  tokenUsage: number
}

export async function buildRAGContext(
  options: RAGContextBuilderOptions
): Promise<RAGContextBuilderResult> {
  const startTime = Date.now()
  const tokenBudget = options.tokenBudget ?? MAX_CONTEXT_TOKENS

  const ctxMessages = buildConversationContext(options.messages, tokenBudget)

  const rag = await retrieveContext({
    query: options.userMessage,
    topK: RAG_CONFIG.topK,
    useHybridSearch: RAG_CONFIG.useHybridSearch,
  })

  const ragTokens = estimateTokens(rag.chunks.map((c) => c.chunk.content).join(' '))
  const msgTokens = ctxMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0)

  const result: RAGContextBuilderResult = {
    messages: ctxMessages,
    ragContext: rag,
    citations: rag.citations,
    tokenUsage: msgTokens + ragTokens,
  }

  logger.info('rag_context_built', {
    duration: Date.now() - startTime,
    details: {
      messages: ctxMessages.length,
      chunks: rag.chunks.length,
      citations: rag.citations.length,
      tokenUsage: result.tokenUsage,
    },
  })

  return result
}

export function buildFullMessageList(
  systemPrompt: string,
  contextMessages: ContextMessage[],
  userMessage: string,
  ragContext?: RAGContext
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...contextMessages,
  ]

  if (ragContext && ragContext.chunks.length > 0) {
    const citations = ragContext.citations
    const citationsText = citations.length > 0 ? formatCitations(citations) : ''
    const chunksText = ragContext.chunks.map((sc, i) =>
      `[${i + 1}] ${sc.chunk.content}`
    ).join('\n\n')

    messages.push({
      role: 'system',
      content: `## Retrieved Information\n${chunksText}${citationsText}`,
    })
  }

  messages.push({ role: 'user', content: userMessage })

  return messages
}

function buildConversationContext(
  messages: ChatbotMessage[],
  maxTokens: number = MAX_CONTEXT_TOKENS
): ContextMessage[] {
  if (messages.length === 0) return []

  const recent = messages.slice(-MAX_MESSAGES)
  const result: ContextMessage[] = []
  let tokenCount = 0

  for (let i = recent.length - 1; i >= 0; i--) {
    const msg = recent[i]
    if (msg.role === 'system') continue

    const estimated = estimateTokens(msg.content)
    if (tokenCount + estimated > maxTokens) break

    result.unshift({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    })
    tokenCount += estimated
  }

  return result
}
