import type { ValidationResult } from '../types'

const BLOCKED_PATTERNS: RegExp[] = [
  /contact\s+(me|us|support)\s+(at|@)\s*\S+@\S+/i,
  /(call|text|whatsapp)\s+(me|us)\s+(at|:)?\s*\+?\d[\d\s()-]{5,}/i,
  /(pay|payment|transfer|send\s+money)\s+(to|via|through)\s+(paypal|venmo|cashapp?|zelle)/i,
  /(price|value|worth|apprais(al|e))\s*(estimate|apprais)/i,
  /\b(legal\s+advice|lawyer|attorney|sue|lawsuit)\b/i,
]

const MAX_RESPONSE_LENGTH = 8000
const MIN_RESPONSE_LENGTH = 1

const FALLBACK_RESPONSE = 'I apologize, but I am unable to process that request. Please try rephrasing or contact our support team for assistance.'

export function validateResponse(content: string): ValidationResult {
  if (!content || content.trim().length < MIN_RESPONSE_LENGTH) {
    return { valid: false, reason: 'Response is empty' }
  }

  if (content.length > MAX_RESPONSE_LENGTH) {
    return { valid: false, reason: `Response exceeds maximum length of ${MAX_RESPONSE_LENGTH} characters` }
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      return { valid: false, reason: 'Response contains prohibited content pattern' }
    }
  }

  return { valid: true }
}

export function buildFallbackResponse(): string {
  return FALLBACK_RESPONSE
}
