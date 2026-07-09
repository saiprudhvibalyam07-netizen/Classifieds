import type { ChatbotMessage } from '../types'
import { estimateTokens } from './tokenCounter'

const MAX_CONTEXT_TOKENS = 3000
const MAX_MESSAGES = 20

interface ContextMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function buildConversationContext(messages: ChatbotMessage[], maxTokens: number = MAX_CONTEXT_TOKENS): ContextMessage[] {
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

export function buildFullMessageList(
  systemPrompt: string,
  contextMessages: ContextMessage[],
  userMessage: string
): Array<{ role: string; content: string }> {
  return [
    { role: 'system', content: systemPrompt },
    ...contextMessages,
    { role: 'user', content: userMessage },
  ]
}
