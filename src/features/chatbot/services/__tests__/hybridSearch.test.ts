import { describe, it, expect, beforeEach } from 'vitest'
import { hybridSearch } from '../hybridSearch'
import { addDocument, addChunks, clearKnowledgeBase } from '../knowledgeBase'
import { storeEmbeddings, clearVectorStore } from '../vectorStore'
import type { KnowledgeDocument, KnowledgeChunk } from '../../types'

function makeDoc(id: string, title: string, content: string): KnowledgeDocument {
  return {
    id, title, sourceType: 'faq', content,
    metadata: { category: 'test', keywords: ['test'] },
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function makeChunk(id: string, docId: string, content: string, seq: number = 0): KnowledgeChunk {
  return {
    id, documentId: docId, content, sequence: seq, tokens: content.length,
    metadata: { category: 'test', sourceTitle: docId },
  }
}

describe('Hybrid Search', () => {
  beforeEach(async () => {
    await clearKnowledgeBase()
    await clearVectorStore()
  })

  it('returns empty when no chunks exist', async () => {
    const results = await hybridSearch({ query: 'test' })
    expect(results).toHaveLength(0)
  })

  it('finds relevant documents by semantic similarity', async () => {
    const doc = makeDoc('d1', 'Account FAQ', 'How to create an account on ValClassifieds')
    await addDocument(doc)

    const chunks = [
      makeChunk('c1', 'd1', 'How to create an account on ValClassifieds'),
      makeChunk('c2', 'd1', 'How to delete your account'),
    ]
    await addChunks(chunks)

    const dims = 1536
    await storeEmbeddings([
      { chunkId: 'c1', embedding: Array.from({ length: dims }, (_, i) => Math.sin(i) * 0.5 + 0.5), metadata: {} },
      { chunkId: 'c2', embedding: Array.from({ length: dims }, (_, i) => Math.cos(i) * 0.5 + 0.5), metadata: {} },
    ])

    const results = await hybridSearch({ query: 'create account', topK: 5, semanticWeight: 1, keywordWeight: 0 })
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('finds documents by keyword when semantic is weak', async () => {
    const doc = makeDoc('d2', 'Pricing FAQ', 'All listings on ValClassifieds are free to post')
    await addDocument(doc)

    const chunks = [
      makeChunk('c3', 'd2', 'All listings on ValClassifieds are free to post'),
      makeChunk('c4', 'd2', 'Premium featured options may be available'),
    ]
    await addChunks(chunks)

    const dims = 1536
    await storeEmbeddings([
      { chunkId: 'c3', embedding: new Array(dims).fill(0.01), metadata: {} },
      { chunkId: 'c4', embedding: new Array(dims).fill(0.01), metadata: {} },
    ])

    const results = await hybridSearch({
      query: 'free listings',
      topK: 5,
      semanticWeight: 0,
      keywordWeight: 1,
    })

    const hasFree = results.some((r) => r.chunk.content.toLowerCase().includes('free'))
    expect(hasFree).toBe(true)
  })

  it('respects topK limit', async () => {
    const doc = makeDoc('d3', 'Test Doc', 'A. '.repeat(100))
    await addDocument(doc)

    const chunks = Array.from({ length: 10 }, (_, i) =>
      makeChunk(`cm${i}`, 'd3', `Content chunk number ${i}`)
    )
    await addChunks(chunks)

    const dims = 1536
    await storeEmbeddings(
      chunks.map((c) => ({
        chunkId: c.id,
        embedding: Array.from({ length: dims }, () => Math.random()),
        metadata: {},
      }))
    )

    const results = await hybridSearch({ query: 'content chunk', topK: 3, semanticWeight: 0.5, keywordWeight: 0.5 })
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('performs full pipeline without error', async () => {
    const doc = makeDoc('d4', 'Safety FAQ', 'Always meet in a public place for transactions')
    await addDocument(doc)
    await addChunks([makeChunk('c5', 'd4', 'Always meet in a public place for transactions')])
    await storeEmbeddings([{
      chunkId: 'c5',
      embedding: new Array(1536).fill(0.5),
      metadata: {},
    }])

    const results = await hybridSearch({ query: 'safety tips', topK: 5 })
    expect(Array.isArray(results)).toBe(true)
  })
})
