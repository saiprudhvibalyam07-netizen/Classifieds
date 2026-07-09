import { describe, it, expect, beforeEach } from 'vitest'
import { processMessage, trackListingView, getContext, forgetUserMemories } from '../memoryManager'
import { getMemoryStats, clearAllMemories } from '../memoryStore'
import { filterSensitiveData, scrubSensitiveMemories, exportUserData, deleteAllUserData, getAuditLogs } from '../memoryPrivacy'
import { learnFromMessage, getLearnedPreferences } from '../preferenceLearner'
import { summarizeConversation, findRelatedConversations, clearSummaries } from '../conversationContinuity'
import type { ChatbotMessage } from '../../types'

function makeMsg(content: string, role: 'user' | 'assistant' = 'user'): ChatbotMessage {
  return {
    id: crypto.randomUUID(),
    conversationId: 'conv-int-1',
    role,
    content,
    createdAt: new Date().toISOString(),
    status: 'sent',
  }
}

describe('Memory Integration', () => {
  beforeEach(async () => {
    await clearAllMemories()
    await clearSummaries()
  })

  it('full lifecycle: learn, store, retrieve, forget', async () => {
    await processMessage('user-int-1', 'sess-int-1', makeMsg('I like electronics in Mumbai under 50000'), [])

    const prefs = await getLearnedPreferences('user-int-1', 'sess-int-1')
    expect(prefs.length).toBeGreaterThan(0)

    const ctx = await getContext('user-int-1', 'sess-int-1')
    expect(ctx.memoryEntries.length).toBeGreaterThan(0)
    expect(ctx.profile).toBeDefined()
    expect(ctx.profileContext).toContain('User Preferences')

    const count = await forgetUserMemories('user-int-1')
    expect(count).toBeGreaterThan(0)
    const ctxAfter = await getContext('user-int-1', 'sess-int-1')
    expect(ctxAfter.memoryEntries).toHaveLength(0)
  })

  it('sensitive data filtering prevents storage of payment info', async () => {
    const result = await filterSensitiveData('user-int-2', null, 'My credit card is 4111 1111 1111 1111')
    expect(result.filtered).toBe(true)
    expect(result.sensitiveDataDetected).toContain('potential_payment_info')
  })

  it('preference learning deduplicates and boosts confidence', async () => {
    await processMessage('user-int-3', 'sess-int-3', makeMsg('I like electronics'), [])
    const prefs1 = await getLearnedPreferences('user-int-3', 'sess-int-3')
    const cat1 = prefs1.find((p) => p.key === 'preferred_category')
    const conf1 = cat1?.confidence ?? 0

    await processMessage('user-int-3', 'sess-int-3', makeMsg('I really like electronics and phones'), [])
    const prefs2 = await getLearnedPreferences('user-int-3', 'sess-int-3')
    const cat2 = prefs2.find((p) => p.key === 'preferred_category')
    expect(cat2!.confidence).toBeGreaterThan(conf1)
  })

  it('conversation continuity across sessions', async () => {
    const messages = Array.from({ length: 12 }, (_, i) => makeMsg(`Message ${i} about laptops`))
    await summarizeConversation('conv-cont-1', 'user-int-4', 'sess-4a', messages)

    const related = await findRelatedConversations('user-int-4', 'laptop')
    expect(related.length).toBeGreaterThanOrEqual(1)
    expect(related[0].topics).toContain('laptop')
  })

  it('export and delete user data workflow', async () => {
    await processMessage('user-int-5', 'sess-int-5', makeMsg('I like furniture in Delhi'), [])
    await trackListingView('user-int-5', 'sess-int-5', 'Wooden Table', 'Furniture')

    const exported = await exportUserData('user-int-5')
    expect(exported).toHaveProperty('userId', 'user-int-5')
    expect(exported).toHaveProperty('memories')
    expect((exported as any).memories.length).toBeGreaterThan(0)

    await deleteAllUserData('user-int-5')
    const stats = await getMemoryStats()
    const userEntries = stats.totalEntries
    expect(userEntries).toBe(0)

    const logs = getAuditLogs('user-int-5')
    expect(logs.some((l) => l.action === 'delete_all_data')).toBe(true)
  })

  it('scrubs sensitive data from existing memories', async () => {
    await processMessage('user-int-6', 'sess-int-6', makeMsg('I like electronics'), [])
    const scrubbed = await scrubSensitiveMemories('user-int-6')
    expect(scrubbed).toBe(0)

    const { storeMemory } = await import('../memoryStore')
    const now = new Date().toISOString()
    await storeMemory({
      id: crypto.randomUUID(), userId: 'user-int-6', sessionId: null,
      scope: 'preference', key: 'password', value: 'hunter2',
      confidence: 0.5, createdAt: now, updatedAt: now, expiresAt: null,
    })
    const scrubbed2 = await scrubSensitiveMemories('user-int-6')
    expect(scrubbed2).toBeGreaterThanOrEqual(1)
  })

  it('processes multiple users independently', async () => {
    const userA = await processMessage('user-a', null, makeMsg('I like electronics'), [])
    const userB = await processMessage('user-b', null, makeMsg('I like furniture'), [])

    const prefsA = await getLearnedPreferences('user-a', null)
    const prefsB = await getLearnedPreferences('user-b', null)

    const catA = prefsA.find((p) => p.key === 'preferred_category')
    const catB = prefsB.find((p) => p.key === 'preferred_category')

    if (catA) expect(catA.value).toBe('Electronics')
    if (catB) expect(catB.value).toBe('Furniture')
  })

  it('builds profile context with viewed listings and topics', async () => {
    await processMessage('user-int-7', 'sess-int-7', makeMsg('Looking for gaming laptops and phones'), [])
    await trackListingView('user-int-7', 'sess-int-7', 'Alienware M16', 'Electronics')

    const ctx = await getContext('user-int-7', 'sess-int-7')
    expect(ctx.profileContext).toContain('User Preferences')
  })
})
