import { describe, it, expect, beforeEach } from 'vitest'
import { buildRAGContext, buildFullMessageList } from '../ragContextBuilder'
import { clearKnowledgeBase, addDocument, addChunks, seedDefaultKnowledge } from '../knowledgeBase'
import { clearVectorStore, storeEmbeddings } from '../vectorStore'
import { ingestDocument } from '../ingestionPipeline'
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

describe('RAG Context Builder', () => {
  beforeEach(async () => {
    await clearKnowledgeBase()
    await clearVectorStore()
  })

  describe('Context Assembly', () => {
    it('builds context with seeded knowledge', async () => {
      await seedDefaultKnowledge()
      const docs = (await import('../knowledgeBase')).getAllDocuments()
      for (const doc of docs) {
        const embedProvider = (await import('../embeddingProvider')).getEmbeddingProvider()
        const result = await ingestDocument(doc)
        for (const chunk of result.chunks) {
          const embedding = await embedProvider.generateEmbedding(chunk.content)
          await storeEmbeddings([{ chunkId: chunk.id, embedding, metadata: chunk.metadata }])
        }
      }

      const result = await buildRAGContext({
        messages: [msg('Hi')],
        userMessage: 'How do I create an account?',
        role: 'visitor',
      })

      expect(result.messages).toBeDefined()
      expect(Array.isArray(result.citations)).toBe(true)
      expect(result.tokenUsage).toBeGreaterThanOrEqual(0)
    })

    it('returns empty context for empty knowledge base', async () => {
      const result = await buildRAGContext({
        messages: [],
        userMessage: 'Hello',
        role: 'visitor',
      })
      expect(result.messages).toHaveLength(0)
      expect(result.ragContext.chunks).toHaveLength(0)
    })

    it('filters system messages from conversation history', async () => {
      const systemMsg: ChatbotMessage = {
        id: 'sys-1',
        conversationId: 'conv-1',
        role: 'system',
        content: 'System instruction',
        createdAt: new Date().toISOString(),
        status: 'sent',
      }
      const result = await buildRAGContext({
        messages: [systemMsg, msg('Hello')],
        userMessage: 'Query',
        role: 'visitor',
      })
      const systemInHistory = result.messages.some((m) => m.role === 'system')
      expect(systemInHistory).toBe(false)
    })
  })

  describe('Full Message List', () => {
    it('places system prompt first', () => {
      const messages = buildFullMessageList('You are ValBot', [], 'Hello')
      expect(messages[0].role).toBe('system')
      expect(messages[0].content).toBe('You are ValBot')
    })

    it('places user message last', () => {
      const messages = buildFullMessageList('System', [], 'User query')
      expect(messages[messages.length - 1].role).toBe('user')
      expect(messages[messages.length - 1].content).toBe('User query')
    })

    it('includes RAG context when provided', () => {
      const rag = {
        chunks: [{
          chunk: {
            id: 'c1', documentId: 'd1', content: 'Knowledge content', sequence: 0, tokens: 10,
            metadata: { sourceTitle: 'FAQ' },
          },
          score: 0.9, rank: 1,
        }],
        citations: [{
          id: 'cit-1', sourceType: 'faq' as const, sourceTitle: 'FAQ Title',
          relevance: 90, excerpt: 'Knowledge content',
        }],
      }
      const messages = buildFullMessageList('System', [], 'Query', rag)
      const ragMsg = messages.find((m) => m.content.includes('Retrieved Information'))
      expect(ragMsg).toBeDefined()
      expect(messages[messages.length - 1].role).toBe('user')
    })
  })
})
