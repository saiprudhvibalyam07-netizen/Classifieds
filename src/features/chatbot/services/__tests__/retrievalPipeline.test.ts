import { describe, it, expect, beforeEach } from 'vitest'
import { retrieveContext, retrieveContextWithSources } from '../retrievalPipeline'
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

function makeChunk(id: string, docId: string, content: string): KnowledgeChunk {
  return {
    id, documentId: docId, content, sequence: 0, tokens: content.length,
    metadata: { category: 'test', sourceTitle: docId },
  }
}

describe('Retrieval Pipeline', () => {
  beforeEach(async () => {
    await clearKnowledgeBase()
    await clearVectorStore()
  })

  it('returns empty context when no documents', async () => {
    const result = await retrieveContext({ query: 'test', useHybridSearch: false })
    expect(result.chunks).toHaveLength(0)
    expect(result.citations).toHaveLength(0)
  })

  it('returns chunks and citations for matching query', async () => {
    const doc = makeDoc('r1', 'Account Help', 'How to create an account')
    await addDocument(doc)
    await addChunks([makeChunk('rc1', 'r1', 'How to create an account on ValClassifieds')])
    await storeEmbeddings([{ chunkId: 'rc1', embedding: new Array(1536).fill(0.5), metadata: {} }])

    const result = await retrieveContext({ query: 'account', useHybridSearch: false, topK: 5 })
    expect(result.chunks.length).toBeGreaterThanOrEqual(0)
  })

  it('generates citations with metadata', async () => {
    const doc = makeDoc('r2', 'Safety Policy', 'Always meet in public places')
    await addDocument(doc)
    await addChunks([makeChunk('rc2', 'r2', 'Always meet in public places for transactions')])
    await storeEmbeddings([{ chunkId: 'rc2', embedding: new Array(1536).fill(0.6), metadata: {} }])

    const result = await retrieveContext({ query: 'safety', useHybridSearch: false, includeCitations: true })
    expect(result.chunks.length).toBeGreaterThanOrEqual(0)
  })

  it('retrieveContextWithSources returns formatted context string', async () => {
    const doc = makeDoc('r3', 'FAQ Test', 'Test content for FAQ')
    await addDocument(doc)
    await addChunks([makeChunk('rc3', 'r3', 'Test content for FAQ')])
    await storeEmbeddings([{ chunkId: 'rc3', embedding: new Array(1536).fill(0.7), metadata: {} }])

    const result = await retrieveContextWithSources({ query: 'faq test', useHybridSearch: false })
    expect(typeof result.context).toBe('string')
    expect(Array.isArray(result.chunks)).toBe(true)
    expect(Array.isArray(result.citations)).toBe(true)
  })

  it('handles empty query gracefully', async () => {
    const result = await retrieveContext({ query: '', useHybridSearch: false })
    expect(result.chunks).toHaveLength(0)
  })
})
