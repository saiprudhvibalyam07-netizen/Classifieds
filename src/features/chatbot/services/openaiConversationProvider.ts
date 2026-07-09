import type { ChatbotRole, MockResponse } from '../types'
import type { ConversationProvider, SendMessageOptions } from './provider'
import { AI_CONFIG } from '../config'
import { orchestrateAI, AIError } from './aiOrchestrator'
import { buildFallbackResponse } from './responseValidator'
import { logger } from './logger'

const ROLE_GREETINGS: Record<ChatbotRole, string> = {
  visitor: 'Welcome to ValClassifieds! I am ValBot, your AI marketplace assistant. How can I help you today?',
  buyer: 'Welcome back! I can help you find listings, understand buying processes, and answer marketplace questions.',
  seller: 'Welcome back! I can help you create better listings, reach buyers, and manage your sales.',
  admin: 'Welcome back! I can assist with moderation, system information, and platform management tasks.',
}

const STARTERS: Record<ChatbotRole, string[]> = {
  visitor: ['What is ValClassifieds?', 'Browse categories', 'How do I buy something?', 'Safety tips'],
  buyer: ['Find phones under 20000', 'How to buy safely?', 'Popular categories', 'Contact seller'],
  seller: ['How to post a listing?', 'Pricing tips', 'Photo advice', 'Promote my listing'],
  admin: ['Active conversations', 'Recent feedback', 'System health', 'Pending items'],
}

export const openaiConversationProvider: ConversationProvider = {
  getRoleResponse(role: ChatbotRole): string {
    return ROLE_GREETINGS[role] ?? ROLE_GREETINGS.visitor
  },

  getStarterPrompts(role: ChatbotRole): string[] {
    return (STARTERS[role] ?? STARTERS.visitor).slice(0, 4)
  },

  async sendMessage(
    content: string,
    role: ChatbotRole,
    options?: SendMessageOptions
  ): Promise<MockResponse> {
    const startTime = Date.now()

    try {
      const result = await orchestrateAI({
        content,
        role,
        messages: options?.messages ?? [],
        onToken: options?.onToken ?? (() => {}),
        signal: options?.signal,
        model: AI_CONFIG.model,
      })

      logger.info('openai_response_received', {
        tokens: result.tokens,
        cost: result.cost,
        duration: Date.now() - startTime,
      })

      return {
        content: result.content,
        delay: Date.now() - startTime,
      }
    } catch (err) {
      const delay = Date.now() - startTime

      if (err instanceof AIError) {
        logger.warn('openai_fallback', {
          duration: delay,
          error: err.message,
          details: { code: err.code },
        })
        return {
          content: buildFallbackResponse(),
          delay,
        }
      }

      logger.error('openai_unexpected_error', {
        duration: delay,
        error: err instanceof Error ? err.message : String(err),
      })
      return {
        content: buildFallbackResponse(),
        delay,
      }
    }
  },
}
