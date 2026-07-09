import type { RetrievalResult, SearchFilters, Citation, ScoredChunk, RAGContext } from '../types'
import { RAG_CONFIG } from '../config'
import { getEmbeddingProvider } from './embeddingProvider'
import { getAllChunks } from './knowledgeBase'
import { similaritySearch } from './vectorStore'
import { hybridSearch } from './hybridSearch'
import { generateCitations } from './citationEngine'
import { logger } from './logger'

export interface RetrievalOptions {
  query: string
  filters?: SearchFilters
  topK?: number
  useHybridSearch?: boolean
  includeCitations?: boolean
}

export async function retrieveContext(options: RetrievalOptions): Promise<RAGContext> {
  const startTime = Date.now()
  const useHybrid = options.useHybridSearch ?? RAG_CONFIG.useHybridSearch
  const topK = options.topK ?? RAG_CONFIG.topK

  let chunks: ScoredChunk[]

  if (useHybrid) {
    chunks = await hybridSearch({
      query: options.query,
      filters: options.filters,
      topK,
    })
  } else {
    const embeddingProvider = getEmbeddingProvider()
    const queryEmbedding = await embeddingProvider.generateEmbedding(options.query)
    chunks = await similaritySearch(queryEmbedding, getAllChunks(), {
      topK,
      minScore: RAG_CONFIG.minScore,
      filters: options.filters,
    })
  }

  const elapsed = Date.now() - startTime

  const result: RetrievalResult = {
    chunks,
    totalTime: elapsed,
  }

  const includeCitations = options.includeCitations ?? true
  const citations: Citation[] = includeCitations
    ? await generateCitations(result)
    : []

  logger.info('retrieval_completed', {
    duration: elapsed,
    details: {
      chunks: chunks.length,
      citations: citations.length,
      useHybrid,
      query: options.query.slice(0, 100),
    },
  })

  return { chunks: result.chunks, citations }
}

export async function retrieveContextWithSources(
  options: RetrievalOptions
): Promise<{
  context: string
  chunks: ScoredChunk[]
  citations: Citation[]
}> {
  const rag = await retrieveContext(options)
  const context = buildContextString(rag)
  return { context, chunks: rag.chunks, citations: rag.citations }
}

function buildContextString(rag: RAGContext): string {
  if (rag.chunks.length === 0) return ''

  const parts = rag.chunks.map((sc, i) => {
    const docTitle = (sc.chunk.metadata.sourceTitle as string) ?? 'Unknown'
    return `[Source ${i + 1}: ${docTitle}]\n${sc.chunk.content}`
  })

  return `\n\nRelevant Information:\n${parts.join('\n\n')}`
}
