import { getAll, setItem, removeItem, getAllFromIndex, clearStore } from '../../../lib/indexedDb'
import { eventBus, ChatEvents } from '../../../lib/eventBus'

export type OfflineActionType =
  | 'send_message'
  | 'edit_message'
  | 'delete_message'
  | 'mark_read'
  | 'upload_file'

export interface OfflineQueueItem {
  id: string
  type: OfflineActionType
  payload: Record<string, unknown>
  createdAt: string
  retryCount: number
  lastError: string | null
}

const MAX_RETRIES = 3
const MAX_QUEUE_SIZE = 100
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const STORE = 'offline_queue'

export async function enqueueAction(type: OfflineActionType, payload: Record<string, unknown>): Promise<void> {
  const existing = await getAll<OfflineQueueItem>(STORE)
  if (existing.length >= MAX_QUEUE_SIZE) {
    const oldest = existing.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]
    await removeItem(STORE, oldest.id)
  }

  const item: OfflineQueueItem = {
    id: crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    lastError: null,
  }
  await setItem(STORE, item.id, item)
  eventBus.emit(ChatEvents.ToastShown, { message: 'Action queued for when you\'re back online', type: 'info' })
}

export async function getQueuedActions(): Promise<OfflineQueueItem[]> {
  const all = await getAll<OfflineQueueItem>(STORE)
  const now = Date.now()
  const valid = all.filter((item) => now - new Date(item.createdAt).getTime() < MAX_AGE_MS)
  const expired = all.filter((item) => now - new Date(item.createdAt).getTime() >= MAX_AGE_MS)
  for (const item of expired) {
    await removeItem(STORE, item.id)
  }
  return valid.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export async function getQueuedActionsByType(type: OfflineActionType): Promise<OfflineQueueItem[]> {
  return getAllFromIndex<OfflineQueueItem>(STORE, 'by_type', type)
}

export async function removeQueuedAction(id: string): Promise<void> {
  await removeItem(STORE, id)
}

export function getBackoffDelay(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 30000)
}

export async function incrementRetry(id: string, error: string): Promise<OfflineQueueItem | null> {
  const item = await getAll<OfflineQueueItem>(STORE).then(
    (items) => items.find((i) => i.id === id)
  )
  if (!item) return null

  item.retryCount++
  item.lastError = error
  if (item.retryCount >= MAX_RETRIES) {
    await removeItem(STORE, id)
    eventBus.emit(ChatEvents.ToastShown, { message: `Action failed after ${MAX_RETRIES} retries`, type: 'error' })
    return null
  } else {
    await setItem(STORE, id, item)
    return item
  }
}

export async function clearQueue(): Promise<void> {
  await clearStore(STORE)
}

export async function getQueueSize(): Promise<number> {
  const items = await getAll<OfflineQueueItem>(STORE)
  return items.length
}
