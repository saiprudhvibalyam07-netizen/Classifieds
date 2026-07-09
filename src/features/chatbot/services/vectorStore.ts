import type { KnowledgeChunk, ScoredChunk, SearchFilters } from '../types'
import { RAG_CONFIG } from '../config'
import { logger } from './logger'

export interface VectorSearchOptions {
  topK?: number
  minScore?: number
  filters?: SearchFilters
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

interface StoredVector {
  chunkId: string
  embedding: number[]
  metadata: Record<string, unknown>
}

const vectorStore = new Map<string, StoredVector>()

export async function storeEmbedding(
  chunkId: string,
  embedding: number[],
  metadata: Record<string, unknown>
): Promise<void> {
  vectorStore.set(chunkId, { chunkId, embedding, metadata })
}

export async function storeEmbeddings(embeddings: Array<{
  chunkId: string
  embedding: number[]
  metadata: Record<string, unknown>
}>): Promise<void> {
  for (const emb of embeddings) {
    vectorStore.set(emb.chunkId, emb)
  }
}

export async function similaritySearch(
  embedding: number[],
  chunks: Map<string, KnowledgeChunk>,
  options: VectorSearchOptions = {}
): Promise<ScoredChunk[]> {
  const topK = options.topK ?? RAG_CONFIG.topK
  const minScore = options.minScore ?? RAG_CONFIG.minScore
  const filters = options.filters

  const scored: ScoredChunk[] = []

  for (const [, stored] of vectorStore) {
    const chunk = chunks.get(stored.chunkId)
    if (!chunk) continue

    if (filters && !matchFilters(chunk.metadata, filters)) continue

    const score = cosineSimilarity(embedding, stored.embedding)
    if (score >= minScore) {
      scored.push({ chunk, score, rank: 0 })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, topK)
  top.forEach((s, i) => { s.rank = i + 1 })

  logger.info('vector_search_completed', {
    details: { results: top.length, total: scored.length, topK },
  })

  return top
}

export async function deleteEmbedding(chunkId: string): Promise<void> {
  vectorStore.delete(chunkId)
}

export async function clearVectorStore(): Promise<void> {
  vectorStore.clear()
}

export function getVectorCount(): number {
  return vectorStore.size
}

function matchFilters(
  metadata: Record<string, unknown>,
  filters: SearchFilters
): boolean {
  if (filters.categories && filters.categories.length > 0) {
    const chunkCat = metadata.category as string | undefined
    if (chunkCat && !filters.categories.includes(chunkCat)) return false
  }
  if (filters.location) {
    const chunkLoc = (metadata.location as string ?? '').toLowerCase()
    if (!chunkLoc.includes(filters.location.toLowerCase())) return false
  }
  return true
}

export async function keywordSearch(
  query: string,
  chunks: Map<string, KnowledgeChunk>,
  options: VectorSearchOptions = {}
): Promise<ScoredChunk[]> {
  const topK = options.topK ?? RAG_CONFIG.topK
  const minScore = options.minScore ?? RAG_CONFIG.minScore
  const filters = options.filters
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)

  const scored: ScoredChunk[] = []

  for (const [, chunk] of chunks) {
    if (filters && !matchFilters(chunk.metadata, filters)) continue

    const content = chunk.content.toLowerCase()
    let matches = 0
    for (const term of terms) {
      if (content.includes(term)) matches++
    }

    if (terms.length === 0) continue

    if (matches === 0) continue
    const score = matches / terms.length
    if (score > minScore) {
      scored.push({ chunk, score, rank: 0 })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, topK)
  top.forEach((s, i) => { s.rank = i + 1 })

  return top
}
