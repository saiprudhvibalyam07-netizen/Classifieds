"use client"

import { logger } from './logger'

interface ConvoIsolationInfo {
  userId: string | null
  sessionId: string | null
  conversationId?: string
  role: 'guest' | 'buyer' | 'seller' | 'admin'
}

class ConversationIsolation {
  private static instance: ConversationIsolation
  private conversationAccess: Map<string, Set<string>> = new Map()

  private constructor() {}

  static getInstance(): ConversationIsolation {
    if (!ConversationIsolation.instance) {
      ConversationIsolation.instance = new ConversationIsolation()
    }
    return ConversationIsolation.instance
  }

  createIsolation(convoId: string, userId: string | null, sessionId?: string, role: ConvoIsolationInfo['role'] = 'guest'): void {
    const accessKeys = new Set<string>()
    if (userId) accessKeys.add(`user:${userId}`)
    if (sessionId) accessKeys.add(`session:${sessionId}`)
    if (role !== 'guest') accessKeys.add(`role:${role}`)

    this.conversationAccess.set(convoId, accessKeys)

    logger.info('conversation_isolation_created', {
      details: { conversationId: convoId, accessKeys: Array.from(accessKeys) },
    })
  }

  isAllowed(convoId: string, context: ConvoIsolationInfo): boolean {
    const accessKeys = this.conversationAccess.get(convoId)

    if (!accessKeys) {
      logger.warn('conversation_access_denied_no_policy', {
        details: { conversationId: convoId, context },
      })
      return false
    }

    const userKey = context.userId ? `user:${context.userId}` : null
    const sessionKey = context.sessionId ? `session:${context.sessionId}` : null
    const roleKey = `role:${context.role}`

    const isUserAllowed = userKey ? accessKeys.has(userKey) : false
    const isSessionAllowed = sessionKey ? accessKeys.has(sessionKey) : false
    const isRoleAllowed = context.role !== 'guest' ? accessKeys.has(roleKey) : true

    const allowed = isUserAllowed || isSessionAllowed || isRoleAllowed

    if (!allowed) {
      logger.warn('conversation_access_denied', {
        details: { conversationId: convoId, context, reason: 'insufficient_permissions' },
      })
    }

    return allowed
  }

  dispose(convoId: string): void {
    this.conversationAccess.delete(convoId)
  }
}

export { ConversationIsolation }
export type { ConvoIsolationInfo }