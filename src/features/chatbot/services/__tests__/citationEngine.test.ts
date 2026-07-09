import { describe, it, expect, beforeEach } from 'vitest'
import { generateCitations, formatCitations, formatInlineCitation, formatExcerpt, citationsToMarkdown } from '../citationEngine'
import { addDocument, clearKnowledgeBase } from '../knowledgeBase'
import type { KnowledgeDocument, RetrievalResult, ScoredChunk } from '../../types'

function makeDoc(id: string, title: string, sourceType: 'faq' | 'policy' | 'help_center' = 'faq'): KnowledgeDocument {
  return {
    id, title, sourceType, content: `${title} content`,
    metadata: { category: 'test', keywords: ['test'] },
    version: 1,
    createdAt: '2024-01-01',
    updatedAt: '2024-06-15',
  }
}

function makeScoredChunk(docId: string, content: string, score: number, sequence: number = 0): ScoredChunk {
  return {
    chunk: {
      id: `${docId}-chunk-${sequence}`,
      documentId: docId,
      content,
      sequence,
      tokens: content.length,
      metadata: { sourceTitle: docId, category: 'test', section: 'General' },
    },
    score,
    rank: 1,
  }
}

describe('Citation Engine', () => {
  beforeEach(async () => {
    await clearKnowledgeBase()
  })

  describe('Citation Generation', () => {
    it('generates empty citations for empty results', async () => {
      const result: RetrievalResult = { chunks: [], totalTime: 0 }
      const citations = await generateCitations(result)
      expect(citations).toHaveLength(0)
    })

    it('generates citations from scored chunks', async () => {
      await addDocument(makeDoc('cd1', 'Account FAQ'))
      const result: RetrievalResult = {
        chunks: [makeScoredChunk('cd1', 'How to create an account', 0.95)],
        totalTime: 10,
      }
      const citations = await generateCitations(result)
      expect(citations.length).toBeGreaterThanOrEqual(1)
      expect(citations[0].sourceTitle).toBe('Account FAQ')
    })

    it('deduplicates citations for same chunk', async () => {
      await addDocument(makeDoc('cd2', 'Policy Doc'))
      const result: RetrievalResult = {
        chunks: [
          makeScoredChunk('cd2', 'Policy content', 0.9, 0),
          makeScoredChunk('cd2', 'Policy content', 0.85, 0),
        ],
        totalTime: 10,
      }
      const citations = await generateCitations(result)
      expect(citations).toHaveLength(1)
    })

    it('sets source type correctly', async () => {
      await addDocument(makeDoc('cd3', 'Policy Title', 'policy'))
      const result: RetrievalResult = {
        chunks: [makeScoredChunk('cd3', 'Policy rules', 0.85)],
        totalTime: 10,
      }
      const citations = await generateCitations(result)
      expect(citations[0].sourceType).toBe('policy')
    })

    it('includes last updated date', async () => {
      await addDocument(makeDoc('cd4', 'Help Article'))
      const result: RetrievalResult = {
        chunks: [makeScoredChunk('cd4', 'Help content', 0.8)],
        totalTime: 10,
      }
      const citations = await generateCitations(result)
      expect(citations[0].lastUpdated).toBeDefined()
    })

    it('computes relevance percentage', async () => {
      await addDocument(makeDoc('cd5', 'Test FAQ'))
      const result: RetrievalResult = {
        chunks: [makeScoredChunk('cd5', 'Test content', 0.75)],
        totalTime: 10,
      }
      const citations = await generateCitations(result)
      expect(citations[0].relevance).toBe(75)
    })
  })

  describe('Citation Formatting', () => {
    it('formats citations as markdown', () => {
      const citations = [
        { id: 'c1', sourceType: 'faq' as const, sourceTitle: 'FAQ Title', relevance: 95, excerpt: 'Content excerpt' },
      ]
      const formatted = citationsToMarkdown(citations)
      expect(formatted).toContain('FAQ Title')
      expect(formatted).toContain('95%')
    })

    it('formatCitations returns empty string for empty list', () => {
      expect(formatCitations([])).toBe('')
    })

    it('formatInlineCitation returns title', () => {
      const citation = { id: 'c1', sourceType: 'faq' as const, sourceTitle: 'My FAQ', relevance: 90, excerpt: '...' }
      expect(formatInlineCitation(citation)).toContain('My FAQ')
    })

    it('formatExcerpt wraps in quotes', () => {
      const citation = { id: 'c1', sourceType: 'faq' as const, sourceTitle: 'Source', relevance: 80, excerpt: 'Short excerpt' }
      const result = formatExcerpt(citation)
      expect(result).toContain('"Short excerpt"')
      expect(result).toContain('Source')
    })
  })
})
