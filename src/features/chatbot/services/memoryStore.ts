import type { MemoryEntry, MemoryQuery, MemoryStats } from '../types'
import { logger } from './logger'

const sessionStore = new Map<string, MemoryEntry[]>()
const persistentStore = new Map<string, MemoryEntry[]>()

function storeKey(userId?: string | null, sessionId?: string | null): string {
  return userId ?? sessionId ?? 'anon'
}

export async function storeMemory(entry: MemoryEntry): Promise<void> {
  const store = entry.scope === 'session' ? sessionStore : persistentStore
  const key = entry.scope === 'session' ? storeKey(null, entry.sessionId) : storeKey(entry.userId, null)
  const entries = store.get(key) ?? []
  const existingIdx = entries.findIndex(
    (e) => e.key === entry.key && e.scope === entry.scope && JSON.stringify(e.value) === JSON.stringify(entry.value)
  )
  if (existingIdx >= 0) {
    entries[existingIdx] = { ...entries[existingIdx], ...entry, updatedAt: new Date().toISOString() }
  } else {
    entries.push(entry)
  }
  store.set(key, entries)
  logger.info('memory_stored', { details: { scope: entry.scope, key: entry.key, userId: entry.userId } })
}

export async function storeMemories(entries: MemoryEntry[]): Promise<void> {
  for (const entry of entries) {
    await storeMemory(entry)
  }
}

export async function getMemory(query: MemoryQuery): Promise<MemoryEntry[]> {
  const results: MemoryEntry[] = []

  if (query.sessionId) {
    const sessionKey = storeKey(null, query.sessionId)
    let entries = sessionStore.get(sessionKey) ?? []
    if (query.key) entries = entries.filter((e) => e.key === query.key)
    if (query.scope) entries = entries.filter((e) => e.scope === query.scope)
    entries = entries.filter((e) => !e.expiresAt || new Date(e.expiresAt) > new Date())
    results.push(...entries)
  }

  if (query.userId) {
    const persistentKey = storeKey(query.userId, null)
    let entries = persistentStore.get(persistentKey) ?? []
    if (query.key) entries = entries.filter((e) => e.key === query.key)
    if (query.scope) entries = entries.filter((e) => e.scope === query.scope)
    entries = entries.filter((e) => !e.expiresAt || new Date(e.expiresAt) > new Date())
    results.push(...entries)
  }

  if (!query.userId && !query.sessionId) {
    for (const [, entries] of sessionStore) {
      let filtered = entries
      if (query.key) filtered = filtered.filter((e) => e.key === query.key)
      if (query.scope) filtered = filtered.filter((e) => e.scope === query.scope)
      filtered = filtered.filter((e) => !e.expiresAt || new Date(e.expiresAt) > new Date())
      results.push(...filtered)
    }
    for (const [, entries] of persistentStore) {
      let filtered = entries
      if (query.key) filtered = filtered.filter((e) => e.key === query.key)
      if (query.scope) filtered = filtered.filter((e) => e.scope === query.scope)
      filtered = filtered.filter((e) => !e.expiresAt || new Date(e.expiresAt) > new Date())
      results.push(...filtered)
    }
  }

  results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const limit = query.limit ?? 50
  logger.info('memory_retrieved', { details: { results: results.length, query } })
  return results.slice(0, limit)
}

export async function deleteMemory(id: string): Promise<void> {
  for (const store of [sessionStore, persistentStore]) {
    for (const [key, entries] of store) {
      const idx = entries.findIndex((e) => e.id === id)
      if (idx >= 0) {
        entries.splice(idx, 1)
        if (entries.length === 0) store.delete(key)
        logger.info('memory_deleted', { details: { id } })
        return
      }
    }
  }
}

export async function deleteUserMemories(userId: string): Promise<number> {
  let count = 0
  for (const store of [sessionStore, persistentStore]) {
    const key = storeKey(userId, null)
    const entries = store.get(key)
    if (entries) {
      count += entries.length
      store.delete(key)
    }
  }
  logger.info('user_memories_deleted', { details: { userId, count } })
  return count
}

export async function deleteSessionMemories(sessionId: string): Promise<number> {
  const entries = sessionStore.get(sessionId)
  const count = entries?.length ?? 0
  sessionStore.delete(sessionId)
  logger.info('session_memories_deleted', { details: { sessionId, count } })
  return count
}

export async function getAllMemories(userId?: string, sessionId?: string): Promise<MemoryEntry[]> {
  const results: MemoryEntry[] = []

  if (sessionId) {
    const sessionKey = storeKey(null, sessionId)
    const sessionEntries = sessionStore.get(sessionKey) ?? []
    results.push(...sessionEntries)
  }

  if (userId) {
    const persistentKey = storeKey(userId, null)
    const persistentEntries = persistentStore.get(persistentKey) ?? []
    results.push(...persistentEntries)
  }

  return results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function exportMemories(userId: string): Promise<string> {
  const entries = await getAllMemories(userId)
  return JSON.stringify({ userId, exportedAt: new Date().toISOString(), entries }, null, 2)
}

export async function getMemoryStats(): Promise<MemoryStats> {
  let sessionEntries = 0
  let persistentEntries = 0

  for (const [, entries] of sessionStore) sessionEntries += entries.length
  for (const [, entries] of persistentStore) persistentEntries += entries.length

  const allEntries = [...sessionStore.values(), ...persistentStore.values()].flat()
  const totalEntries = allEntries.length
  const preferenceCount = allEntries.filter((e) => e.scope === 'preference').length
  const conversationCount = allEntries.filter((e) => e.scope === 'conversation').length

  const dates = allEntries.map((e) => e.createdAt).sort()
  const estimatedTokens = allEntries.reduce((sum, e) => {
    const val = typeof e.value === 'string' ? e.value : JSON.stringify(e.value)
    return sum + Math.ceil(val.length * 0.25)
  }, 0)

  return {
    totalEntries,
    sessionEntries,
    persistentEntries,
    preferenceCount,
    conversationCount,
    oldestEntry: dates[0] ?? null,
    newestEntry: dates[dates.length - 1] ?? null,
    estimatedTokens,
  }
}

export async function clearAllMemories(): Promise<void> {
  sessionStore.clear()
  persistentStore.clear()
  logger.info('all_memories_cleared')
}

export async function pruneExpiredMemories(): Promise<number> {
  let pruned = 0
  const now = new Date()
  for (const store of [sessionStore, persistentStore]) {
    for (const [key, entries] of store) {
      const active = entries.filter((e) => !e.expiresAt || new Date(e.expiresAt) > now)
      if (active.length !== entries.length) {
        pruned += entries.length - active.length
        if (active.length === 0) {
          store.delete(key)
        } else {
          store.set(key, active)
        }
      }
    }
  }
  if (pruned > 0) {
    logger.info('expired_memories_pruned', { details: { count: pruned } })
  }
  return pruned
}
