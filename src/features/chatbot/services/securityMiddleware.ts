"use client"

import { logger } from './logger'

export interface SecurityContext {
  userId: string | null
  sessionId: string | null
  role: 'guest' | 'buyer' | 'seller' | 'admin'
  authenticated: boolean
}

function extractSecurityInfoFromRequest(): SecurityContext {
  let userId: string | null = null
  let sessionId: string | null = null
  let role: SecurityContext['role'] = 'guest'
  let authenticated = false

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('auth.user')
    if (stored) {
      try {
        const userData = JSON.parse(stored)
        userId = userData?.id || null
        authenticated = true
      } catch {}
    }

    const storedProfile = localStorage.getItem('auth.profile')
    if (storedProfile) {
      try {
        const profileData = JSON.parse(storedProfile)
        role = profileData?.role ? mapRole(profileData.role) : 'guest'
      } catch {}
    }

    sessionId = localStorage.getItem('auth.sessionId') || null
  }

  return { userId, sessionId, role, authenticated }
}

function mapRole(profileRole: string): SecurityContext['role'] {
  switch (profileRole.toLowerCase()) {
    case 'admin':
      return 'admin'
    case 'seller':
      return 'seller'
    case 'buyer':
      return 'buyer'
    default:
      return 'guest'
  }
}

function sanitizeOperation(operation: string, params?: Record<string, unknown>): void {
  logger.info('operation_attempt', {
    details: {
      operation,
      params: params ? JSON.stringify(params, (_, v) => sanitizeValue(v)) : undefined,
    },
  })
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string' && isSensitiveData(value)) {
    return '***REDACTED***'
  }
  if (typeof value === 'object' && value !== null) {
    return '[OBJECT]'
  }
  if (Array.isArray(value)) {
    return '[ARRAY]'
  }
  return value
}

function isSensitiveData(value: string): boolean {
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /credential/i,
    /auth/i,
    /jwt/i,
    /api[_-]?key/i,
    /private[_-]?key/i,
    /connection[_-]?string/i,
    /url/i,
    /uri/i,
    /endpoint/i,
    /sql/i,
    /system/i,
    /env/i,
    /config/i,
    /internal/i,
    /server/i,
    /host/i,
    /ip/i,
    /database/i,
    /db/i,
  ]

  return sensitivePatterns.some(pattern => pattern.test(value))
}

function logSecurityEvent(event: string, data: Record<string, unknown>): void {
  logger.warn('security_event', {
    details: {
      event,
      timestamp: new Date().toISOString(),
      ...data,
    },
  })
}

function enforcePolicy(validation: { valid: boolean; reason: string }): boolean {
  if (!validation.valid) {
    logSecurityEvent('policy_violation', {
      reason: validation.reason,
      violation: 'enforced',
    })
    return false
  }
  return true
}

export { extractSecurityInfoFromRequest, sanitizeOperation, logSecurityEvent, enforcePolicy }