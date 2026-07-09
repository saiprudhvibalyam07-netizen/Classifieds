import { describe, it, expect, beforeEach } from 'vitest'
import { getEmbeddingProvider, resetEmbeddingProvider } from '../embeddingProvider'
import { RAG_CONFIG } from '../../config'

describe('Embedding Provider', () => {
  beforeEach(() => {
    resetEmbeddingProvider()
  })

  describe('Mock Provider', () => {
    it('returns consistent dimensions', () => {
      const provider = getEmbeddingProvider()
      expect(provider.getDimensions()).toBe(RAG_CONFIG.embeddingDimensions)
    })

    it('generates embedding for text', async () => {
      const provider = getEmbeddingProvider()
      const embedding = await provider.generateEmbedding('Hello world')
      expect(embedding).toHaveLength(RAG_CONFIG.embeddingDimensions)
      expect(embedding.every((v) => typeof v === 'number')).toBe(true)
    })

    it('generates consistent embeddings for same text', async () => {
      const provider = getEmbeddingProvider()
      const e1 = await provider.generateEmbedding('Test text')
      const e2 = await provider.generateEmbedding('Test text')
      expect(e1).toEqual(e2)
    })

    it('generates different embeddings for different text', async () => {
      const provider = getEmbeddingProvider()
      const e1 = await provider.generateEmbedding('Apple')
      const e2 = await provider.generateEmbedding('Banana')
      const areEqual = e1.every((v, i) => v === e2[i])
      expect(areEqual).toBe(false)
    })

    it('generates embeddings in batch', async () => {
      const provider = getEmbeddingProvider()
      const embeddings = await provider.generateEmbeddings(['A', 'B', 'C'])
      expect(embeddings).toHaveLength(3)
      embeddings.forEach((emb) => {
        expect(emb).toHaveLength(RAG_CONFIG.embeddingDimensions)
      })
    })

    it('all values are between 0 and 1', async () => {
      const provider = getEmbeddingProvider()
      const embedding = await provider.generateEmbedding('Range test')
      embedding.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      })
    })
  })
})
