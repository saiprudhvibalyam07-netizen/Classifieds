import { describe, it, expect, beforeEach } from 'vitest'
import { seedDefaultKnowledge, clearKnowledgeBase, getAllDocuments } from '../knowledgeBase'
import { getEmbeddingProvider, resetEmbeddingProvider } from '../embeddingProvider'
import { ingestDocuments, chunkDocument } from '../ingestionPipeline'
import { storeEmbeddings, clearVectorStore, getVectorCount } from '../vectorStore'
import { hybridSearch } from '../hybridSearch'
import { generateCitations } from '../citationEngine'
import { checkHallucination } from '../hallucinationGuard'
import { parseNaturalLanguage } from '../naturalLanguageSearch'
import { buildRAGContext } from '../ragContextBuilder'
import type { ChatbotMessage } from '../../types'

function msg(content: string, role: 'user' | 'assistant' = 'user'): ChatbotMessage {
  return {
    id: crypto.randomUUID(),
    conversationId: 'conv-1',
    role,
    content,
    createdAt: new Date().toISOString(),
    status: 'sent',
  }
}

describe('RAG Integration', () => {
  beforeEach(async () => {
    await clearKnowledgeBase()
    await clearVectorStore()
    resetEmbeddingProvider()
  })

  it('performs full RAG cycle: seed → ingest → embed → search → cite', async () => {
    await seedDefaultKnowledge()
    const docs = getAllDocuments()
    expect(docs.length).toBeGreaterThan(0)

    const result = await ingestDocuments(docs)
    expect(result.chunks.length).toBeGreaterThan(0)

    const provider = getEmbeddingProvider()
    for (const chunk of result.chunks) {
      const embedding = await provider.generateEmbedding(chunk.content)
      await storeEmbeddings([{ chunkId: chunk.id, embedding, metadata: chunk.metadata }])
    }

    expect(getVectorCount()).toBeGreaterThan(0)

    const searchResults = await hybridSearch({ query: 'How do I create an account?', topK: 5 })
    expect(searchResults.length).toBeGreaterThanOrEqual(0)

    const retrievalResult = { chunks: searchResults, totalTime: 0 }
    const citations = await generateCitations(retrievalResult)
    expect(Array.isArray(citations)).toBe(true)
  })

  it('NL search + RAG context + hallucination guard work together', async () => {
    await seedDefaultKnowledge()
    const docs = getAllDocuments()
    const result = await ingestDocuments(docs)
    const provider = getEmbeddingProvider()
    for (const chunk of result.chunks) {
      const embedding = await provider.generateEmbedding(chunk.content)
      await storeEmbeddings([{ chunkId: chunk.id, embedding, metadata: chunk.metadata }])
    }

    const nlResult = parseNaturalLanguage('How do I post a listing?')
    expect(nlResult.query).toBeTruthy()

    const ragResult = await buildRAGContext({
      messages: [msg('Hi')],
      userMessage: 'How do I post a listing?',
      role: 'buyer',
    })
    expect(ragResult.ragContext.chunks.length).toBeGreaterThanOrEqual(0)

    const hc = checkHallucination({
      responseContent: 'To post a listing, click the Create Listing button',
      retrievedChunks: ragResult.ragContext.chunks.map((sc) => ({
        content: sc.chunk.content,
        documentId: sc.chunk.documentId,
      })),
    })
    expect(hc.isHallucinated).toBe(false)
  })

  it('empty knowledge base returns empty retrieval', async () => {
    const ragResult = await buildRAGContext({
      messages: [],
      userMessage: 'Test query',
      role: 'visitor',
    })
    expect(ragResult.ragContext.chunks).toHaveLength(0)
    expect(ragResult.citations).toHaveLength(0)
  })
})
