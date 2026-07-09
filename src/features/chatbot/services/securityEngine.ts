"use client"

import { logger } from './logger'
import type { SecurityContext } from './securityMiddleware'

export interface SecurityValidation {
  valid: boolean
  reason: string
}

class SecurityEngine {
  private static instance: SecurityEngine

  private constructor() {}

  static getInstance(): SecurityEngine {
    if (!SecurityEngine.instance) {
      SecurityEngine.instance = new SecurityEngine()
    }
    return SecurityEngine.instance
  }

  validatePromptInjection(prompt: string): SecurityValidation {
    const dangerousPatterns = [
      /ignore.*previous.*instruction/i,
      /ignore.*safety/i,
      /show.*prompt/i,
      /hidden.*instruction/i,
      /pretend.*you.*are.*developer/i,
      /show.*admin/i,
      /execute.*hidden/i,
      /print.*environment/i,
      /dump.*database/i,
      /access.*filesystem/i,
      /sql/i,
      /shell/i,
      /exec/i,
      /run.*command/i,
      /eval/i,
    ]

    const normalizedPrompt = prompt.toLowerCase()
    for (const pattern of dangerousPatterns) {
      if (pattern.test(normalizedPrompt) && !this.isFalsePositive(pattern, prompt)) {
        logger.warn('prompt_injection_attempt', {
          details: { pattern: pattern.source, promptExcerpt: prompt.substring(0, 100) },
        })
        return {
          valid: false,
          reason: `Prompt contains potentially dangerous content`
        }
      }
    }

    return { valid: true, reason: 'Prompt approved' }
  }

  validatePersonalData(prompt: string, context: SecurityContext): SecurityValidation {
    const sensitivePatterns = [
      /password/i,
      /api[_-]?key/i,
      /jwt/i,
      /secret/i,
      /credential/i,
      /auth/i,
      /token/i,
      /private[_-]?key/i,
    ]

    const normalizedPrompt = prompt.toLowerCase()
    for (const pattern of sensitivePatterns) {
      if (pattern.test(normalizedPrompt)) {
        logger.warn('personal_data_request_detected', {
          details: {
            pattern: pattern.source,
            context: { userId: context.userId, role: context.role },
            promptExcerpt: prompt.substring(0, 100),
          },
        })
        return {
          valid: false,
          reason: `Requests for sensitive information are not allowed`
        }
      }
    }

    return { valid: true, reason: 'No sensitive data patterns detected' }
  }

  private isFalsePositive(pattern: RegExp, prompt: string): boolean {
    const falsePositivePatterns = [/password/i, /secret/i, /key/i, /auth/i, /private/i]

    return falsePositivePatterns.some(fp => fp.test(prompt) && !pattern.test(prompt))
  }
}

export { SecurityEngine }