"use client"

import { logger } from './logger'
import type { SecurityContext } from './securityMiddleware'

interface DataRedactionRecord {
  toolCall: string
  timestamp: string
  userId: string | null
  redactedFields: string[]
}

class DataRedactionService {
  private static instance: DataRedactionService
  private redactionRecords: DataRedactionRecord[] = []

  private constructor() {}

  static getInstance(): DataRedactionService {
    if (!DataRedactionService.instance) {
      DataRedactionService.instance = new DataRedactionService()
    }
    return DataRedactionService.instance
  }

  redactToolResult(toolName: string, result: unknown, context: SecurityContext): unknown {
    if (typeof result === 'string' && this.containsSensitiveData(result)) {
      const record: DataRedactionRecord = {
        toolCall: toolName,
        timestamp: new Date().toISOString(),
        userId: context.userId,
        redactedFields: ['sensitive_data'],
      }

      this.redactionRecords.push(record)
      logger.info('tool_result_redacted', {
        details: { toolName, userId: context.userId, redactedFields: ['sensitive_data'] },
      })

      return 'Access denied: Sensitive data hidden'
    }

    return result
  }

  redactToolParameters(params: Record<string, unknown>, context: SecurityContext): Record<string, unknown> {
    const redacted = { ...params }
    let hasRedactions = false

    Object.keys(redacted).forEach(key => {
      if (this.isSensitiveKey(key) && typeof redacted[key] === 'string') {
        redacted[key] = '***REDACTED***'
        hasRedactions = true
      }
    })

    if (hasRedactions) {
      const record: DataRedactionRecord = {
        toolCall: 'unknown',
        timestamp: new Date().toISOString(),
        userId: context.userId,
        redactedFields: Object.keys(redacted).filter(k => k !== 'password' && k !== 'secret' && k !== 'token'),
      }

      this.redactionRecords.push(record)
      logger.info('tool_parameters_redacted', {
        details: { userId: context.userId, redactedCount: Object.keys(redacted).filter(k => k !== 'password' && k !== 'secret' && k !== 'token').length },
      })
    }

    return redacted
  }

  getRedactionHistory(userId: string): DataRedactionRecord[] {
    return this.redactionRecords.filter(r => r.userId === userId)
  }

  private containsSensitiveData(text: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /auth/i,
      /token/i,
      /credential/i,
      /api[_-]?key/i,
      /jwt/i,
      /private[_-]?key/i,
      /connection[_-]?string/i,
      /url/i,
      /endpoint/i,
    ]

    return sensitivePatterns.some(pattern => pattern.test(text))
  }

  private isSensitiveKey(key: string): boolean {
    return [
      'password',
      'secret',
      'key',
      'auth',
      'token',
      'credential',
      'api_key',
      'jwt_secret',
      'private_key',
      'connection_string',
      'url',
      'endpoint',
    ].includes(key.toLowerCase())
  }
}

export { DataRedactionService }
