import { describe, it, expect, beforeEach } from 'vitest'
import { fetchWithCache, getCachedMedia, cacheMedia, clearMemoryCache } from '../utils/mediaCache'

beforeEach(() => {
  clearMemoryCache()
})

describe('mediaCache', () => {
  it('fetchWithCache fetches and caches a URL', async () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(blob)

    const result = await fetchWithCache('https://example.com/test.txt')
    expect(result).toBeInstanceOf(Blob)

    const cached = await getCachedMedia('https://example.com/test.txt')
    expect(cached).toBeInstanceOf(Blob)

    globalThis.fetch = originalFetch
  })

  it('cacheMedia stores data for retrieval', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' })
    await cacheMedia('key1', blob, 'text/plain')

    const cached = await getCachedMedia('key1')
    expect(cached).toBeInstanceOf(Blob)
  })

  it('clearMemoryCache removes in-memory entries', async () => {
    const blob = new Blob(['data'], { type: 'text/plain' })
    await cacheMedia('memkey', blob, 'text/plain')
    clearMemoryCache()

    const cached = await getCachedMedia('memkey')
    expect(cached).toBeNull()
  })
})
