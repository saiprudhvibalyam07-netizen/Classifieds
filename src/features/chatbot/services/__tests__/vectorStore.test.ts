import { describe, it, expect, beforeEach } from 'vitest'
import { storeEmbedding, storeEmbeddings, similaritySearch, keywordSearch, clearVectorStore, getVectorCount } from '../vectorStore'
import { getAllChunks } from '../knowledgeBase'
import type { KnowledgeChunk } from '../../types'

function makeChunk(id: string, content: string, metadata: Record<string, unknown> = {}): KnowledgeChunk {
  return { id, documentId: 'doc-1', content, sequence: 0, tokens: content.length, metadata }
}

function makeEmbedding(values: number[]): number[] {
  const emb = new Array(1536).fill(0)
  values.forEach((v, i) => { if (i < 1536) emb[i] = v })
  return emb
}

describe('Vector Store', () => {
  beforeEach(async () => {
    await clearVectorStore()
  })

  describe('Store & Retrieve', () => {
    it('stores and retrieves single embedding', async () => {
      await storeEmbedding('chunk-1', makeEmbedding([1, 0, 0]), { text: 'hello' })
      expect(getVectorCount()).toBe(1)
    })

    it('stores multiple embeddings in batch', async () => {
      await storeEmbeddings([
        { chunkId: 'a', embedding: makeEmbedding([1, 0, 0]), metadata: {} },
        { chunkId: 'b', embedding: makeEmbedding([0, 1, 0]), metadata: {} },
      ])
      expect(getVectorCount()).toBe(2)
    })

    it('clears all embeddings', async () => {
      await storeEmbedding('x', makeEmbedding([1, 0, 0]), {})
      await clearVectorStore()
      expect(getVectorCount()).toBe(0)
    })
  })

  describe('Similarity Search', () => {
    it('returns empty when no chunks match', async () => {
      const chunks = new Map<string, KnowledgeChunk>()
      const results = await similaritySearch(makeEmbedding([1, 0, 0]), chunks)
      expect(results).toHaveLength(0)
    })

    it('ranks by cosine similarity', async () => {
      const chunks = new Map<string, KnowledgeChunk>()
      chunks.set('a', makeChunk('a', 'Apple'))
      chunks.set('b', makeChunk('b', 'Banana'))
      chunks.set('c', makeChunk('c', 'Cherry'))

      await storeEmbeddings([
        { chunkId: 'a', embedding: makeEmbedding([1, 0, 0]), metadata: {} },
        { chunkId: 'b', embedding: makeEmbedding([0, 1, 0]), metadata: {} },
        { chunkId: 'c', embedding: makeEmbedding([0, 0, 1]), metadata: {} },
      ])

      const results = await similaritySearch(makeEmbedding([1, 0, 0]), chunks, { topK: 3, minScore: 0 })
      expect(results).toHaveLength(3)
      expect(results[0].chunk.id).toBe('a')
      expect(results[0].score).toBeGreaterThan(results[1].score)
    })

    it('respects topK limit', async () => {
      const chunks = new Map<string, KnowledgeChunk>()
      for (let i = 0; i < 10; i++) {
        const id = `chunk-${i}`
        chunks.set(id, makeChunk(id, `Content ${i}`))
        await storeEmbedding(id, makeEmbedding([1, 0, 0]), {})
      }
      const results = await similaritySearch(makeEmbedding([1, 0, 0]), chunks, { topK: 3, minScore: 0 })
      expect(results).toHaveLength(3)
    })

    it('filters by metadata', async () => {
      const chunks = new Map<string, KnowledgeChunk>()
      chunks.set('a', makeChunk('a', 'Electronics item', { category: 'Electronics' }))
      chunks.set('b', makeChunk('b', 'Furniture item', { category: 'Furniture' }))

      await storeEmbeddings([
        { chunkId: 'a', embedding: makeEmbedding([1, 0, 0]), metadata: { category: 'Electronics' } },
        { chunkId: 'b', embedding: makeEmbedding([1, 0, 0]), metadata: { category: 'Furniture' } },
      ])

      const results = await similaritySearch(makeEmbedding([1, 0, 0]), chunks, {
        topK: 5, minScore: 0, filters: { categories: ['Electronics'] },
      })
      expect(results).toHaveLength(1)
      expect(results[0].chunk.id).toBe('a')
    })
  })

  describe('Keyword Search', () => {
    it('finds content by keyword', async () => {
      const chunks = new Map<string, KnowledgeChunk>()
      chunks.set('a', makeChunk('a', 'How to create an account'))
      chunks.set('b', makeChunk('b', 'How to delete your account'))

      const results = await keywordSearch('delete account', chunks, { topK: 5, minScore: 0 })
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results[0].chunk.id).toBe('b')
    })

    it('returns empty for no matches', async () => {
      const chunks = new Map<string, KnowledgeChunk>()
      chunks.set('a', makeChunk('a', 'Hello world'))
      const results = await keywordSearch('xyzzy', chunks, { topK: 5, minScore: 0 })
      expect(results).toHaveLength(0)
    })

    it('ignores short terms (< 3 chars)', async () => {
      const chunks = new Map<string, KnowledgeChunk>()
      chunks.set('a', makeChunk('a', 'Hi there'))
      const results = await keywordSearch('hi', chunks, { topK: 5, minScore: 0 })
      expect(results).toHaveLength(0)
    })
  })
})
