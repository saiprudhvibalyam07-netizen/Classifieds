import { supabase } from '../../../lib/supabase'
import type { ChatbotConversation, ChatbotMessage, ChatbotRole } from '../types'
import { SESSION_STORAGE_KEY } from '../constants'
import { clearAllMemories } from './memoryStore'

function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  }
  return sessionId
}

async function setSessionContext(sessionId: string): Promise<void> {
  await supabase.rpc('set_chatbot_session', { session_id: sessionId }).maybeSingle()
}

// Emergency-only fallback. Conversations are PERSISTENT by default; an in-memory
// (ephemeral) conversation is used solely when the database is unreachable
// (network failure / Supabase outage). Policy/constraint errors (e.g. RLS 42501)
// are NOT outages and must surface as real errors, never be hidden.
const localConversationIds = new Set<string>()

function isOutage(error: unknown): boolean {
  if (!error) return false
  const status = (error as { status?: number | null })?.status
  if (status === undefined || status === null || status === 0) return true // network / unknown
  if (typeof status === 'number' && status >= 500) return true // server error
  return false
}

function createLocalConversation(
  userId: string | null,
  role: ChatbotRole,
  sessionId: string | null
): ChatbotConversation {
  const id = crypto.randomUUID()
  localConversationIds.add(id)
  const now = new Date().toISOString()
  return {
    id,
    userId,
    sessionId,
    role,
    title: null,
    status: 'active',
    messageCount: 0,
    lastActivity: now,
    metadata: { ephemeral: true },
    createdAt: now,
    updatedAt: now,
  }
}

function isLocalConversation(conversationId: string): boolean {
  return localConversationIds.has(conversationId)
}

// Wipe all client-side chatbot state associated with the current user/session.
// Called on auth change (logout/login/switch) so no conversation, message,
// memory, or ephemeral id can leak to the next account.
//
// `endingUserId` is the identity of the provider being torn down:
//  - a guest (null) refresh must KEEP its session id so the guest conversation
//    can be restored on reload;
//  - an authenticated user's teardown (logout / switch) clears the legacy
//    guest session id so the next account starts clean.
async function resetSession(endingUserId: string | null): Promise<void> {
  localConversationIds.clear()
  if (endingUserId !== null) {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      /* ignore storage errors */
    }
  }
  try {
    await clearAllMemories()
  } catch {
    /* ignore memory-clear errors */
  }
}

export const conversationManager = {
  resetSession,
  async createConversation(userId: string | null, role: ChatbotRole): Promise<ChatbotConversation | null> {
    const sessionId = userId ? null : getSessionId()

    try {
      if (sessionId) {
        await setSessionContext(sessionId).catch(() => {})
      }

      const { data, error } = await supabase
        .from('chatbot_conversations')
        .insert({
          user_id: userId,
          session_id: sessionId,
          role,
          title: null,
          status: 'active',
          message_count: 0,
          metadata: {},
        })
        .select()
        .single()

      if (error) {
        // Database responded with an error. Only treat server/network failures
        // as an outage; configuration errors (RLS, constraints) are surfaced.
        if (isOutage(error)) {
          console.warn('Chatbot DB unavailable — entering temporary offline mode:', error.message)
          return createLocalConversation(userId, role, sessionId)
        }
        console.error('Failed to create conversation:', error.message)
        return null
      }

      return mapConversation(data)
    } catch (err) {
      // Network failure / Supabase unreachable → emergency offline mode.
      console.warn('Chatbot network failure — entering temporary offline mode:', err)
      return createLocalConversation(userId, role, sessionId)
    }
  },

  async getActiveConversation(userId: string | null): Promise<ChatbotConversation | null> {
    try {
      let query = supabase
        .from('chatbot_conversations')
        .select()
        .eq('status', 'active')
        .order('last_activity', { ascending: false })
        .limit(1)

      if (userId) {
        query = query.eq('user_id', userId)
      } else {
        const sessionId = getSessionId()
        await setSessionContext(sessionId).catch(() => {})
        query = query.is('user_id', null).eq('session_id', sessionId)
      }

      const { data, error } = await query

      if (error || !data || data.length === 0) return null

      return mapConversation(data[0])
    } catch (err) {
      console.error('getActiveConversation failed:', err)
      return null
    }
  },

  async getMessages(conversationId: string): Promise<ChatbotMessage[]> {
    if (isLocalConversation(conversationId)) return []

    try {
      const { data, error } = await supabase
        .from('chatbot_messages')
        .select()
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to fetch messages:', error.message)
        return []
      }

      return (data ?? []).map(mapMessage)
    } catch (err) {
      console.error('getMessages failed:', err)
      return []
    }
  },

  async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<ChatbotMessage | null> {
    if (isLocalConversation(conversationId)) {
      return {
        id: crypto.randomUUID(),
        conversationId,
        role,
        content,
        createdAt: new Date().toISOString(),
        status: 'sent',
      }
    }

    try {
      const { data, error } = await supabase
        .from('chatbot_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to save message:', error.message)
        return null
      }

      await supabase
        .from('chatbot_conversations')
        .update({
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .then(() => {})

      return mapMessage(data)
    } catch (err) {
      console.error('saveMessage failed:', err)
      return null
    }
  },
}

function mapConversation(data: Record<string, unknown>): ChatbotConversation {
  return {
    id: data.id as string,
    userId: data.user_id as string | null,
    sessionId: data.session_id as string | null,
    role: data.role as ChatbotRole,
    title: data.title as string | null,
    status: data.status as ChatbotConversation['status'],
    messageCount: (data.message_count as number) ?? 0,
    lastActivity: data.last_activity as string,
    metadata: (data.metadata as Record<string, unknown>) ?? {},
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  }
}

function mapMessage(data: Record<string, unknown>): ChatbotMessage {
  return {
    id: data.id as string,
    conversationId: data.conversation_id as string,
    role: data.role as ChatbotMessage['role'],
    content: (data.content as string) ?? '',
    createdAt: data.created_at as string,
    status: 'sent',
  }
}
