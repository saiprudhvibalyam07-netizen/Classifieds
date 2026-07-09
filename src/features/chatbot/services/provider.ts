import type { ChatbotRole, MockResponse } from '../types'
import type { ChatbotMessage } from '../types'
import { CHATBOT_CONFIG } from '../config'
import { mockConversationProvider } from './mockConversationProvider'
import { openaiConversationProvider } from './openaiConversationProvider'

export interface SendMessageOptions {
  onToken?: (token: string) => void
  signal?: AbortSignal
  messages?: ChatbotMessage[]
}

export interface ConversationProvider {
  sendMessage(
    content: string,
    role: ChatbotRole,
    options?: SendMessageOptions
  ): Promise<MockResponse>

  getRoleResponse(role: ChatbotRole): string
  getStarterPrompts(role: ChatbotRole): string[]
}

export function getConversationProvider(): ConversationProvider {
  console.info('[Chatbot] mockMode =', CHATBOT_CONFIG.mockMode)

  if (CHATBOT_CONFIG.mockMode === true) {
    console.info('[Chatbot] Provider: MOCK')
    return mockConversationProvider
  }

  console.info('[Chatbot] Provider: OPENAI')
  return openaiConversationProvider
}
