import { getItem, setItem, removeItem, getCount } from '../../../lib/indexedDb'

const MAX_MEMORY_ENTRIES = 50
const MAX_DISK_ENTRIES = 200
const DISK_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface CacheEntry {
  blob: Blob
  contentType: string
  cachedAt: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>()

  get(key: string): CacheEntry | null {
    return this.cache.get(key) ?? null
  }

  set(key: string, entry: CacheEntry): void {
    if (this.cache.size >= MAX_MEMORY_ENTRIES) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }
    this.cache.set(key, entry)
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

const memoryCache = new MemoryCache()

export async function getCachedMedia(url: string): Promise<Blob | null> {
  const mem = memoryCache.get(url)
  if (mem) return mem.blob

  const disk = await getItem<{ blob: Blob; contentType: string; cachedAt: number }>('media_cache', url)
  if (disk) {
    if (Date.now() - disk.cachedAt < DISK_TTL_MS) {
      memoryCache.set(url, disk)
      return disk.blob
    }
    await removeItem('media_cache', url)
  }

  return null
}

export async function cacheMedia(url: string, blob: Blob, contentType: string): Promise<void> {
  const entry: CacheEntry = { blob, contentType, cachedAt: Date.now() }
  memoryCache.set(url, entry)

  const count = await getCount('media_cache')
  if (count >= MAX_DISK_ENTRIES) {
    return
  }

  await setItem('media_cache', url, entry)
}

export async function fetchWithCache(url: string): Promise<Blob> {
  const cached = await getCachedMedia(url)
  if (cached) return cached

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)

  const blob = await response.blob()
  const contentType = response.headers.get('content-type') || blob.type || 'application/octet-stream'
  cacheMedia(url, blob, contentType).catch(() => {})
  return blob
}

export function clearMemoryCache(): void {
  memoryCache.clear()
}
