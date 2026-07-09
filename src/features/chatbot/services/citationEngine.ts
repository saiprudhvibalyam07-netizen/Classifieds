import type { Citation, RetrievalResult, ScoredChunk } from '../types'
import { getDocument } from './knowledgeBase'

export async function generateCitations(result: RetrievalResult): Promise<Citation[]> {
  if (result.chunks.length === 0) return []

  const citations: Citation[] = []
  const seen = new Set<string>()

  for (const sc of result.chunks) {
    const doc = await getDocument(sc.chunk.documentId)
    if (!doc) continue

    const key = `${doc.id}-${sc.chunk.sequence}`
    if (seen.has(key)) continue
    seen.add(key)

    citations.push({
      id: `cit-${citations.length + 1}`,
      sourceType: doc.sourceType,
      sourceTitle: doc.title,
      sourceSection: getSectionForChunk(sc),
      lastUpdated: doc.updatedAt,
      relevance: Math.round(sc.score * 100),
      excerpt: truncateExcerpt(sc.chunk.content, 150),
    })
  }

  return citations
}

export function formatCitations(citations: Citation[]): string {
  if (citations.length === 0) return ''

  const lines = citations.map((c, i) => {
    const section = c.sourceSection ? ` > ${c.sourceSection}` : ''
    const date = c.lastUpdated ? ` (Updated: ${new Date(c.lastUpdated).toLocaleDateString()})` : ''
    return `[${i + 1}] ${c.sourceTitle}${section}${date}`
  })

  return `\n\nSources:\n${lines.join('\n')}`
}

export function formatInlineCitation(citation: Citation): string {
  return `[${citation.sourceTitle}]`
}

export function formatExcerpt(citation: Citation): string {
  return `"${citation.excerpt}" — ${citation.sourceTitle}`
}

function truncateExcerpt(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

function getSectionForChunk(sc: ScoredChunk): string | undefined {
  const metadata = sc.chunk.metadata
  if (metadata.section) return metadata.section as string
  if (metadata.category) return metadata.category as string
  return undefined
}

export function citationsToMarkdown(citations: Citation[]): string {
  if (citations.length === 0) return ''

  const lines = citations.map((c) => {
    const typeLabel = c.sourceType.charAt(0).toUpperCase() + c.sourceType.slice(1)
    const section = c.sourceSection ? ` — ${c.sourceSection}` : ''
    return `- **${c.sourceTitle}** (${typeLabel}${section}) — Relevance: ${c.relevance}%`
  })

  return `\n\n### Sources\n${lines.join('\n')}`
}
