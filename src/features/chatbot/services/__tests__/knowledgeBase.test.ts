import { describe, it, expect, beforeEach } from 'vitest'
import { addDocument, getDocument, getAllDocuments, clearKnowledgeBase, seedDefaultKnowledge, getDocumentCount, getChunkCount } from '../knowledgeBase'
import { ingestDocument, chunkDocument, ingestDocuments } from '../ingestionPipeline'
import type { KnowledgeDocument } from '../../types'

function makeDoc(id: string, title: string, content: string): KnowledgeDocument {
  return {
    id, title, sourceType: 'faq', content,
    metadata: { category: 'test', keywords: ['test'] },
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('Knowledge Base', () => {
  beforeEach(async () => {
    await clearKnowledgeBase()
  })

  describe('Document Management', () => {
    it('adds and retrieves a document', async () => {
      const doc = makeDoc('doc-1', 'Test Doc', 'Test content')
      await addDocument(doc)
      const retrieved = await getDocument('doc-1')
      expect(retrieved).toBeDefined()
      expect(retrieved!.title).toBe('Test Doc')
      expect(getDocumentCount()).toBe(1)
    })

    it('returns undefined for missing document', async () => {
      const doc = await getDocument('nonexistent')
      expect(doc).toBeUndefined()
    })

    it('lists all documents', async () => {
      await addDocument(makeDoc('a', 'A', 'Content A'))
      await addDocument(makeDoc('b', 'B', 'Content B'))
      const all = getAllDocuments()
      expect(all).toHaveLength(2)
    })

    it('clears all documents', async () => {
      await addDocument(makeDoc('x', 'X', 'X'))
      await clearKnowledgeBase()
      expect(getDocumentCount()).toBe(0)
    })

    it('seeds default knowledge', async () => {
      await seedDefaultKnowledge()
      expect(getDocumentCount()).toBeGreaterThan(0)
    })

    it('seeds knowledge with chunks', async () => {
      await seedDefaultKnowledge()
      const docs = getAllDocuments()
      for (const doc of docs) {
        const result = await ingestDocument(doc)
        expect(result.chunks.length).toBeGreaterThan(0)
      }
      expect(getChunkCount()).toBeGreaterThan(0)
    })
  })

  describe('Chunking', () => {
    it('chunks a document into pieces', () => {
      const content = 'A. '.repeat(100)
      const doc = makeDoc('doc-big', 'Big Doc', content)
      const chunks = chunkDocument(doc, 50, 10)
      expect(chunks.length).toBeGreaterThan(1)
      chunks.forEach((c, i) => {
        expect(c.documentId).toBe('doc-big')
        expect(c.sequence).toBe(i)
        expect(c.content.length).toBeGreaterThan(0)
      })
    })

    it('creates single chunk for short content', () => {
      const doc = makeDoc('short', 'Short', 'Hello')
      const chunks = chunkDocument(doc, 512, 64)
      expect(chunks).toHaveLength(1)
      expect(chunks[0].content).toBe('Hello')
    })

    it('includes metadata in chunks', () => {
      const doc = makeDoc('meta', 'Meta Doc', 'Some content here')
      const chunks = chunkDocument(doc)
      expect(chunks[0].metadata.sourceTitle).toBe('Meta Doc')
    })

    it('tracks sequence numbers', () => {
      const content = 'Paragraph one. Paragraph two. Paragraph three. '
      const doc = makeDoc('seq', 'Seq Doc', content.repeat(20))
      const chunks = chunkDocument(doc, 30, 5)
      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].sequence).toBe(i)
      }
    })
  })

  describe('Ingestion Pipeline', () => {
    it('ingests a single document', async () => {
      const doc = makeDoc('ingest-1', 'Ingest Test', 'Content for ingestion testing')
      const result = await ingestDocument(doc)
      expect(result.chunks.length).toBeGreaterThan(0)
      expect(result.totalTokens).toBeGreaterThan(0)
      expect(getChunkCount()).toBe(result.chunks.length)
    })

    it('ingests multiple documents', async () => {
      const docs = [
        makeDoc('m1', 'M1', 'Doc one content'),
        makeDoc('m2', 'M2', 'Doc two content'),
      ]
      const result = await ingestDocuments(docs)
      expect(result.chunks.length).toBeGreaterThanOrEqual(2)
      expect(getChunkCount()).toBe(result.chunks.length)
    })
  })
})
