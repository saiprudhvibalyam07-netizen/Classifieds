import type { ConversationSummary, ChatbotMessage, MemoryEntry } from '../types'
import { storeMemory } from './memoryStore'

const summaries = new Map<string, ConversationSummary>()

export async function summarizeConversation(
  conversationId: string,
  userId: string | null,
  sessionId: string | null,
  messages: ChatbotMessage[]
): Promise<ConversationSummary> {
  const userMessages = messages.filter((m) => m.role === 'user')
  const lastMessage = messages[messages.length - 1]

  const topics = extractTopics(messages)
  const keyMentions = extractKeyMentions(messages)
  const summary = buildSummary(userMessages, topics)

  const convSummary: ConversationSummary = {
    conversationId,
    userId,
    sessionId,
    summary,
    topics,
    keyMentions,
    messageCount: messages.length,
    createdAt: messages[0]?.createdAt ?? new Date().toISOString(),
    lastMessageAt: lastMessage?.createdAt ?? new Date().toISOString(),
  }

  summaries.set(conversationId, convSummary)

  const entry: MemoryEntry = {
    id: crypto.randomUUID(),
    userId,
    sessionId,
    scope: 'conversation',
    key: `conversation_summary:${conversationId}`,
    value: summary,
    confidence: 0.8,
    createdAt: convSummary.createdAt,
    updatedAt: convSummary.lastMessageAt,
    expiresAt: null,
  }
  await storeMemory(entry)

  for (const topic of topics) {
    const topicEntry: MemoryEntry = {
      id: crypto.randomUUID(),
      userId,
      sessionId,
      scope: 'interest',
      key: 'topic',
      value: topic,
      confidence: 0.5,
      createdAt: convSummary.createdAt,
      updatedAt: convSummary.lastMessageAt,
      expiresAt: null,
    }
    await storeMemory(topicEntry)
  }

  return convSummary
}

export async function findRelatedConversations(
  userId: string,
  currentTopic: string
): Promise<ConversationSummary[]> {
  const topicWords = currentTopic.toLowerCase().split(/\s+/)

  const related: ConversationSummary[] = []
  for (const [, summary] of summaries) {
    if (summary.userId !== userId) continue

    const summaryText = summary.summary.toLowerCase()
    const matchCount = topicWords.filter((w) => summaryText.includes(w)).length
    if (matchCount > 0) {
      related.push(summary)
    }
  }

  related.sort((a, b) => {
    const aWords = a.summary.toLowerCase().split(/\s+/)
    const bWords = b.summary.toLowerCase().split(/\s+/)
    const aScore = topicWords.filter((w) => aWords.includes(w)).length
    const bScore = topicWords.filter((w) => bWords.includes(w)).length
    return bScore - aScore
  })

  return related.slice(0, 3)
}

export async function buildContinuityContext(
  userId: string | null,
  _sessionId: string | null,
  currentQuery: string
): Promise<string> {
  if (!userId) return ''

  const related = await findRelatedConversations(userId, currentQuery)
  if (related.length === 0) return ''

  const parts = related.map((r, i) => {
    return `[Previous Conversation ${i + 1}]: ${r.summary} (${r.topics.join(', ')})`
  })

  return `\n## Related Previous Conversations\n${parts.join('\n')}`
}

export function buildSummary(userMessages: ChatbotMessage[], topics: string[]): string {
  if (userMessages.length === 0) return 'No messages'
  const topicStr = topics.length > 0 ? topics.join(', ') : 'general discussion'
  const firstMsg = userMessages[0].content.slice(0, 100)
  return `User discussed "${topicStr}" — started with "${firstMsg}..."`
}

function extractTopics(messages: ChatbotMessage[]): string[] {
  const topicSet = new Set<string>()
  const topicPatterns = [
    /(?:about|regarding|looking for|interested in)\s+([^.!?]+)/gi,
    /(?:how (?:do|can|to)|questions? about)\s+([^.!?]+)/gi,
  ]

  for (const msg of messages) {
    if (msg.role !== 'user') continue
    const lower = msg.content.toLowerCase()

    for (const pattern of topicPatterns) {
      let m: RegExpExecArray | null
      while ((m = pattern.exec(lower)) !== null) {
        const topic = m[1].trim()
        if (topic.length > 2 && topic.length < 80) {
          topicSet.add(topic)
        }
      }
    }

    const categoryWords = ['phone', 'laptop', 'car', 'furniture', 'apartment', 'job', 'services']
    for (const word of categoryWords) {
      if (lower.includes(word)) {
        topicSet.add(word)
      }
    }
  }

  return Array.from(topicSet).slice(0, 5)
}

function extractKeyMentions(messages: ChatbotMessage[]): string[] {
  const mentions: string[] = []
  const pricePattern = /(?:₹|Rs\.?\s*)?(\d[\d,]*)/g

  for (const msg of messages) {
    const m = msg.content.match(pricePattern)
    if (m) mentions.push(...m)
  }

  return mentions.slice(0, 5)
}

export async function getConversationSummary(conversationId: string): Promise<ConversationSummary | undefined> {
  return summaries.get(conversationId)
}

export async function clearSummaries(): Promise<void> {
  summaries.clear()
}
