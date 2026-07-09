import type { ChatbotMessage, UserProfile, MemoryEntry } from '../types'
import { MEMORY_CONFIG } from '../config'
import {
  getMemory, deleteMemory, deleteUserMemories, deleteSessionMemories,
  pruneExpiredMemories, clearAllMemories, getMemoryStats,
} from './memoryStore'
import { buildUserProfile, buildProfileContext } from './userProfile'
import { learnFromMessage, learnViewedListing } from './preferenceLearner'
import { summarizeConversation, buildContinuityContext } from './conversationContinuity'
import { recommendAll } from './recommendationEngine'
import { logger } from './logger'

export interface ConversationContext {
  profile: UserProfile | null
  profileContext: string
  continuityContext: string
  memoryEntries: MemoryEntry[]
}

export interface ProcessMessageResult {
  learned: MemoryEntry[]
  context: ConversationContext
}

export async function processMessage(
  userId: string | null,
  sessionId: string | null,
  message: ChatbotMessage,
  conversationHistory: ChatbotMessage[]
): Promise<ProcessMessageResult> {
  if (!MEMORY_CONFIG.enabled) {
    return { learned: [], context: { profile: null, profileContext: '', continuityContext: '', memoryEntries: [] } }
  }

  const role = message.role === 'system' ? 'user' as const : message.role
  const learned = await learnFromMessage(userId, sessionId, message.content, role)

  await pruneExpiredMemories()

  let profile: UserProfile | null = null
  let profileContext = ''
  let continuityContext = ''

  if (userId) {
    profile = await buildUserProfile(userId, 'buyer' as const, sessionId)
    profileContext = await buildProfileContext(profile)
  }

  if (userId && conversationHistory.length >= MEMORY_CONFIG.summarizationMinMessages) {
    await summarizeConversation(
      conversationHistory[0].id ?? 'conv',
      userId,
      sessionId,
      conversationHistory
    )
  }

  if (message.role === 'user' && userId) {
    continuityContext = await buildContinuityContext(userId, sessionId, message.content)
  }

  const memoryEntries = await getMemory({
    userId,
    sessionId,
    limit: MEMORY_CONFIG.maxSessionEntries,
  })

  logger.info('memory_manager_processed', {
    details: { userId, sessionId, learned: learned.length, hasProfile: !!profile },
  })

  return {
    learned,
    context: { profile, profileContext, continuityContext, memoryEntries },
  }
}

export async function trackListingView(
  userId: string | null,
  sessionId: string | null,
  listingTitle: string,
  category: string
): Promise<void> {
  await learnViewedListing(userId, sessionId, listingTitle, category)
  logger.info('listing_view_tracked', { details: { listingTitle, category } })
}

export async function getRecommendations(
  userId: string | null,
  sessionId: string | null
) {
  if (!userId) {
    return { listings: [], categories: [], sellers: [], resources: [] }
  }

  const profile = await buildUserProfile(userId, 'buyer' as const, sessionId ?? undefined as string | undefined)
  const preferences = profile.preferences

  if (preferences.length === 0) {
    return { listings: [], categories: [], sellers: [], resources: [] }
  }

  return recommendAll(preferences)
}

export async function getContext(
  userId: string | null,
  sessionId: string | null,
  query?: string
): Promise<ConversationContext> {
  const memoryEntries = await getMemory({ userId, sessionId, limit: 50 })

  let profile: UserProfile | null = null
  let profileContext = ''
  if (userId) {
    profile = await buildUserProfile(userId, 'buyer' as const, sessionId)
    profileContext = await buildProfileContext(profile)
  }

  let continuityContext = ''
  if (userId && query) {
    continuityContext = await buildContinuityContext(userId, sessionId, query)
  }

  return { profile, profileContext, continuityContext, memoryEntries }
}

export async function forgetMemory(id: string): Promise<void> {
  await deleteMemory(id)
  logger.info('memory_manager_forgot', { details: { id } })
}

export async function forgetUserMemories(userId: string): Promise<number> {
  const count = await deleteUserMemories(userId)
  logger.info('memory_manager_forgot_user', { details: { userId, count } })
  return count
}

export async function forgetSessionMemories(sessionId: string): Promise<number> {
  const count = await deleteSessionMemories(sessionId)
  logger.info('memory_manager_forgot_session', { details: { sessionId, count } })
  return count
}

export async function resetAll(): Promise<void> {
  await clearAllMemories()
  logger.info('memory_manager_reset')
}

export { pruneExpiredMemories, getMemoryStats }
