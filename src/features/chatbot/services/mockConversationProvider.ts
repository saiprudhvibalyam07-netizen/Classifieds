import type { ChatbotRole, MockResponse } from '../types'
import type { ConversationProvider, SendMessageOptions } from './provider'
import { STARTER_PROMPTS } from '../constants'
import { CHATBOT_CONFIG } from '../config'

const ROLE_RESPONSES: Record<ChatbotRole, string> = {
  visitor: 'Welcome to ValClassifieds. How can I help you today?',
  buyer: 'I can help you search listings and answer marketplace questions.',
  seller: 'I can help you improve and manage your listings.',
  admin: 'I can assist with administration and moderation tasks.',
}

const FOLLOW_UPS = [
  'Got it! Is there anything else I can help you with?',
  'I can look into that for you. What specific details are you looking for?',
  'Sure! Let me know what you need help with.',
  'Happy to help! Feel free to ask me any questions about the marketplace.',
]

function randomDelay(): number {
  const { min, max } = CHATBOT_CONFIG.typingDelay
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function buildResponse(trimmed: string, role: ChatbotRole): string {
  if (trimmed === '' || trimmed === 'hi' || trimmed === 'hello' || trimmed === 'hey') {
    const responses: Record<ChatbotRole, string> = {
      visitor: 'Welcome to ValClassifieds. How can I help you today?',
      buyer: 'I can help you search listings and answer marketplace questions.',
      seller: 'I can help you improve and manage your listings.',
      admin: 'I can assist with administration and moderation tasks.',
    }
    return responses[role] ?? responses.visitor
  }

  if (trimmed.includes('bye') || trimmed.includes('goodbye') || trimmed.includes('thanks')) {
    return "You're welcome! Feel free to come back anytime you need help with ValClassifieds."
  }

  if (trimmed.includes('category') || trimmed.includes('categories') || trimmed.includes('browse')) {
    return 'We have several categories including Mobiles & Tablets, Vehicles, Electronics, Home & Furniture, Fashion, Books & Media, Sports, Pets, and more. Which category interests you?'
  }

  if (trimmed.includes('buy') || trimmed.includes('purchase')) {
    return 'Buying on ValClassifieds is easy! Browse listings, find what you like, contact the seller directly, and arrange the transaction. Always follow our safety guidelines when meeting sellers.'
  }

  if (trimmed.includes('sell') || trimmed.includes('post') || trimmed.includes('listing')) {
    return 'To post a listing, click "Create Listing" and fill in the details: add clear photos, write a descriptive title, set a fair price, and choose the right category. Keep your listing accurate to attract serious buyers.'
  }

  if (trimmed.includes('safety') || trimmed.includes('scam') || trimmed.includes('safe')) {
    return 'Safety is important! Always meet in public places, verify items before paying, communicate through the platform, and trust your instincts. Report any suspicious activity to our support team.'
  }

  if (trimmed.includes('policy') || trimmed.includes('fee') || trimmed.includes('free') || trimmed.includes('cost')) {
    return 'Basic listings on ValClassifieds are free! We also offer optional featured/promoted listings for better visibility. For specific policy details, feel free to ask about any particular policy you\'re interested in.'
  }

  return FOLLOW_UPS[Math.floor(Math.random() * FOLLOW_UPS.length)]
}

export const mockConversationProvider: ConversationProvider = {
  getRoleResponse(role: ChatbotRole): string {
    return ROLE_RESPONSES[role] ?? ROLE_RESPONSES.visitor
  },

  async sendMessage(content: string, role: ChatbotRole, options?: SendMessageOptions): Promise<MockResponse> {
    const delay = randomDelay()
    const trimmed = content.trim().toLowerCase()
    const fullResponse = buildResponse(trimmed, role)

    if (options?.onToken) {
      const words = fullResponse.split(' ')
      const chunkDelay = Math.max(30, Math.floor(delay / words.length))

      for (let i = 0; i < words.length; i++) {
        if (options.signal?.aborted) break
        await new Promise((resolve) => setTimeout(resolve, chunkDelay))
        options.onToken(words[i] + (i < words.length - 1 ? ' ' : ''))
      }
    }

    return { content: fullResponse, delay }
  },

  getStarterPrompts(role: ChatbotRole): string[] {
    return (STARTER_PROMPTS[role] ?? STARTER_PROMPTS.visitor).slice(0, CHATBOT_CONFIG.maxStarterPrompts)
  },
}
