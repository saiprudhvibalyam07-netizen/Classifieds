import { AI_CONFIG, RAG_CONFIG } from '../config'
import { logger } from './logger'

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>
  generateEmbeddings(texts: string[]): Promise<number[][]>
  getDimensions(): number
}

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private cache = new Map<string, { embedding: number[]; timestamp: number }>()

  getDimensions(): number {
    return RAG_CONFIG.embeddingDimensions
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const cached = this.cache.get(text)
    if (cached && Date.now() - cached.timestamp < RAG_CONFIG.cacheTTL) {
      return cached.embedding
    }

    const response = await fetch(RAG_CONFIG.embeddingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AI_CONFIG.openaiKey ? { Authorization: `Bearer ${AI_CONFIG.openaiKey}` } : {}),
      },
      body: JSON.stringify({
        model: RAG_CONFIG.embeddingModel,
        input: text,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new Error(`Embedding API failed: ${response.status} ${errorBody}`)
    }

    const data = await response.json()
    const embedding = data.data?.[0]?.embedding as number[]

    if (RAG_CONFIG.cacheEnabled) {
      this.cache.set(text, { embedding, timestamp: Date.now() })
    }

    return embedding
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = []
    const uncached: { index: number; text: string }[] = []

    if (RAG_CONFIG.cacheEnabled) {
      for (let i = 0; i < texts.length; i++) {
        const cached = this.cache.get(texts[i])
        if (cached && Date.now() - cached.timestamp < RAG_CONFIG.cacheTTL) {
          results[i] = cached.embedding
        } else {
          uncached.push({ index: i, text: texts[i] })
        }
      }
    } else {
      texts.forEach((text, i) => uncached.push({ index: i, text }))
    }

    if (uncached.length > 0) {
      const response = await fetch(RAG_CONFIG.embeddingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(AI_CONFIG.openaiKey ? { Authorization: `Bearer ${AI_CONFIG.openaiKey}` } : {}),
        },
        body: JSON.stringify({
          model: RAG_CONFIG.embeddingModel,
          input: uncached.map((u) => u.text),
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        throw new Error(`Embedding API failed: ${response.status} ${errorBody}`)
      }

      const data = await response.json()
      const embeddings = data.data as Array<{ index: number; embedding: number[] }>

      for (const emb of embeddings) {
        const idx = uncached[emb.index].index
        results[idx] = emb.embedding
        if (RAG_CONFIG.cacheEnabled) {
          this.cache.set(uncached[emb.index].text, { embedding: emb.embedding, timestamp: Date.now() })
        }
      }
    }

    return texts.map((_, i) => results[i])
  }

  clearCache(): void {
    this.cache.clear()
  }
}

class MockEmbeddingProvider implements EmbeddingProvider {
  getDimensions(): number {
    return RAG_CONFIG.embeddingDimensions
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const hash = this.simpleHash(text)
    return Array.from({ length: this.getDimensions() }, (_, i) => {
      const val = Math.sin(hash * (i + 1)) * 0.5 + 0.5
      return Math.max(0, Math.min(1, val))
    })
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)))
  }

  private simpleHash(text: string): number {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0
    }
    return Math.abs(hash) / 2147483647
  }
}

let provider: EmbeddingProvider

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!provider) {
    provider = AI_CONFIG.openaiKey && !import.meta.env.VITE_MOCK_EMBEDDINGS
      ? new OpenAIEmbeddingProvider()
      : new MockEmbeddingProvider()
    logger.info('embedding_provider_initialized', {
      details: { type: provider.constructor.name, dimensions: provider.getDimensions() },
    })
  }
  return provider
}

export function resetEmbeddingProvider(): void {
  provider = undefined as unknown as EmbeddingProvider
}
