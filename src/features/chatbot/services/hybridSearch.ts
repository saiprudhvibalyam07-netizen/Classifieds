import type { ScoredChunk, SearchFilters } from '../types'
import { RAG_CONFIG } from '../config'
import { getEmbeddingProvider } from './embeddingProvider'
import { getAllChunks } from './knowledgeBase'
import { similaritySearch, keywordSearch } from './vectorStore'
import { logger } from './logger'

export interface HybridSearchOptions {
  query: string
  filters?: SearchFilters
  topK?: number
  semanticWeight?: number
  keywordWeight?: number
}

function normalizeScores(results: ScoredChunk[]): ScoredChunk[] {
  if (results.length === 0) return results
  const maxScore = Math.max(...results.map((r) => r.score))
  if (maxScore === 0) return results
  return results.map((r) => ({ ...r, score: r.score / maxScore }))
}

function reciprocalRankFusion(
  semantic: ScoredChunk[],
  keyword: ScoredChunk[],
  semanticWeight: number,
  keywordWeight: number,
  k: number = 60
): ScoredChunk[] {
  const combined = new Map<string, { chunk: ScoredChunk['chunk']; score: number }>()

  for (const result of semantic) {
    const rank = result.rank
    combined.set(result.chunk.id, {
      chunk: result.chunk,
      score: semanticWeight * (1 / (k + rank)),
    })
  }

  for (const result of keyword) {
    const existing = combined.get(result.chunk.id)
    const kwScore = keywordWeight * (1 / (k + result.rank))
    if (existing) {
      existing.score += kwScore
    } else {
      combined.set(result.chunk.id, {
        chunk: result.chunk,
        score: kwScore,
      })
    }
  }

  return Array.from(combined.values())
    .map((item, i) => ({
      chunk: item.chunk,
      score: item.score,
      rank: i + 1,
    }))
    .sort((a, b) => b.score - a.score)
}

function reRank(
  results: ScoredChunk[],
  query: string
): ScoredChunk[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
  if (queryTerms.length === 0) return results

  const rescored = results.map((r) => {
    const content = r.chunk.content.toLowerCase()
    let exactMatchBonus = 0
    let termOverlap = 0

    for (const term of queryTerms) {
      if (content.includes(term)) {
        termOverlap++
        if (content.includes(` ${term} `) || content.startsWith(term) || content.endsWith(term)) {
          exactMatchBonus += 0.1
        }
      }
    }

    const overlapScore = termOverlap / queryTerms.length
    const finalScore = r.score * 0.6 + overlapScore * 0.3 + exactMatchBonus

    return { ...r, score: finalScore }
  })

  rescored.sort((a, b) => b.score - a.score)
  rescored.forEach((s, i) => { s.rank = i + 1 })
  return rescored
}

export async function hybridSearch(
  options: HybridSearchOptions
): Promise<ScoredChunk[]> {
  const startTime = Date.now()
  const topK = options.topK ?? RAG_CONFIG.topK
  const semanticWeight = options.semanticWeight ?? RAG_CONFIG.semanticWeight
  const keywordWeight = options.keywordWeight ?? RAG_CONFIG.keywordWeight
  const chunks = getAllChunks()

  if (chunks.size === 0) {
    logger.info('hybrid_search_empty', { details: { reason: 'no_chunks' } })
    return []
  }

  const embeddingProvider = getEmbeddingProvider()
  const queryEmbedding = await embeddingProvider.generateEmbedding(options.query)
  const filters = options.filters

  const searchOpts = { topK: topK * 3, minScore: 0, filters }

  const [semanticResults, keywordResults] = await Promise.all([
    similaritySearch(queryEmbedding, chunks, searchOpts),
    keywordSearch(options.query, chunks, searchOpts),
  ])

  const normalizedSemantic = normalizeScores(semanticResults)
  const normalizedKeyword = normalizeScores(keywordResults)

  let fused = reciprocalRankFusion(normalizedSemantic, normalizedKeyword, semanticWeight, keywordWeight)

  if (RAG_CONFIG.reRankEnabled) {
    fused = reRank(fused, options.query)
  }

  fused = fused.slice(0, topK)
  fused.forEach((s, i) => { s.rank = i + 1 })

  const elapsed = Date.now() - startTime
  logger.info('hybrid_search_completed', {
    details: {
      results: fused.length,
      semanticResults: semanticResults.length,
      keywordResults: keywordResults.length,
      elapsed,
    },
    duration: elapsed,
  })

  return fused
}
