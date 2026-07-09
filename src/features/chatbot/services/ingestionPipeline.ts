import type { KnowledgeDocument, KnowledgeChunk } from '../types'
import { RAG_CONFIG } from '../config'
import { estimateTokens } from './tokenCounter'
import { logger } from './logger'
import { addChunks } from './knowledgeBase'

export interface ChunkResult {
  chunks: KnowledgeChunk[]
  totalTokens: number
}

export function chunkDocument(
  doc: KnowledgeDocument,
  chunkSize: number = RAG_CONFIG.chunkSize,
  overlap: number = RAG_CONFIG.chunkOverlap
): KnowledgeChunk[] {
  const text = doc.content
  if (!text) return []

  const chunks: KnowledgeChunk[] = []
  let start = 0
  let sequence = 0
  const minProgress = 1

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length)

    if (end > start + chunkSize * 0.5 && end < text.length) {
      const breakChars = ['\n\n', '\n', '. ', '! ', '? ', ', ', ' ']
      for (const bc of breakChars) {
        const idx = text.lastIndexOf(bc, end)
        if (idx > start + chunkSize * 0.3) {
          end = idx + bc.length
          break
        }
      }
    }

    if (end <= start + minProgress) {
      end = Math.min(start + chunkSize, text.length)
    }

    const content = text.slice(start, end).trim()
    if (content) {
      chunks.push({
        id: `${doc.id}-chunk-${sequence}`,
        documentId: doc.id,
        content,
        sequence,
        tokens: estimateTokens(content),
        metadata: { ...doc.metadata, sourceTitle: doc.title, sourceType: doc.sourceType },
      })
    }

    const nextStart = end - overlap
    if (nextStart <= start) {
      start = end
    } else {
      start = nextStart
    }
    sequence++

    if (sequence > 1000) break
  }

  return chunks
}

export async function ingestDocument(
  doc: KnowledgeDocument,
  options?: { chunkSize?: number; overlap?: number }
): Promise<ChunkResult> {
  const chunks = chunkDocument(doc, options?.chunkSize, options?.overlap)
  await addChunks(chunks)

  const totalTokens = chunks.reduce((sum, c) => sum + c.tokens, 0)

  logger.info('document_ingested', {
    details: {
      documentId: doc.id,
      title: doc.title,
      chunkCount: chunks.length,
      totalTokens,
    },
  })

  return { chunks, totalTokens }
}

export async function ingestDocuments(
  docs: KnowledgeDocument[],
  options?: { chunkSize?: number; overlap?: number }
): Promise<ChunkResult> {
  let allChunks: KnowledgeChunk[] = []
  let totalTokens = 0

  for (const doc of docs) {
    const result = await ingestDocument(doc, options)
    allChunks = allChunks.concat(result.chunks)
    totalTokens += result.totalTokens
  }

  return { chunks: allChunks, totalTokens }
}

export function extractMetadata(content: string): Record<string, unknown> {
  const metadata: Record<string, unknown> = {}

  const categoryMatch = content.match(/category:\s*(.+)/i)
  if (categoryMatch) metadata.category = categoryMatch[1].trim()

  const keywordMatch = content.match(/keywords?:\s*(.+)/i)
  if (keywordMatch) {
    metadata.keywords = keywordMatch[1].split(',').map((k) => k.trim())
  }

  return metadata
}
