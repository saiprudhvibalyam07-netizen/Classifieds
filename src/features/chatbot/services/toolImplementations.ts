import { registerTool, executeToolCall } from './toolRouter'
import { searchListings, getListingDetails, getCategories, getSellerInfo } from './marketplaceIntelligence'
import { retrieveContext } from './retrievalPipeline'
import { generateCitations, formatInlineCitation } from './citationEngine'
import { logger } from './logger'

export function registerPhase2Tools(): void {
  registerTool({
    name: 'searchListings',
    description: 'Search marketplace listings with filters for category, price range, location, and keywords',
    execute: async (params, _role) => {
      try {
        const filters = {
          categories: params.categories as string[] | undefined,
          minPrice: params.minPrice as number | undefined,
          maxPrice: params.maxPrice as number | undefined,
          location: params.location as string | undefined,
          query: params.query as string | undefined,
        }
        const results = await searchListings(filters)
        return {
          toolName: 'searchListings',
          success: true,
          data: { listings: results, count: results.length },
        }
      } catch (err) {
        return {
          toolName: 'searchListings',
          success: false,
          error: err instanceof Error ? err.message : 'Search failed',
        }
      }
    },
  })

  registerTool({
    name: 'getListingDetails',
    description: 'Get detailed information about a specific listing by ID',
    execute: async (params, _role) => {
      try {
        const id = params.listingId as string
        const listing = await getListingDetails(id)
        if (!listing) {
          return { toolName: 'getListingDetails', success: false, error: 'Listing not found' }
        }
        return { toolName: 'getListingDetails', success: true, data: listing }
      } catch (err) {
        return {
          toolName: 'getListingDetails',
          success: false,
          error: err instanceof Error ? err.message : 'Failed to get listing',
        }
      }
    },
  })

  registerTool({
    name: 'getCategories',
    description: 'Get all available marketplace categories',
    execute: async (_params, _role) => {
      try {
        const cats = await getCategories()
        return { toolName: 'getCategories', success: true, data: { categories: cats } }
      } catch (err) {
        return {
          toolName: 'getCategories',
          success: false,
          error: err instanceof Error ? err.message : 'Failed to get categories',
        }
      }
    },
  })

  registerTool({
    name: 'getSellerInfo',
    description: 'Get public information about a seller by ID',
    execute: async (params, _role) => {
      try {
        const sellerId = params.sellerId as string
        const seller = await getSellerInfo(sellerId)
        if (!seller) {
          return { toolName: 'getSellerInfo', success: false, error: 'Seller not found' }
        }
        return { toolName: 'getSellerInfo', success: true, data: seller }
      } catch (err) {
        return {
          toolName: 'getSellerInfo',
          success: false,
          error: err instanceof Error ? err.message : 'Failed to get seller info',
        }
      }
    },
  })

  registerTool({
    name: 'getPolicies',
    description: 'Get ValClassifieds platform policies including prohibited items, user conduct, and terms',
    execute: async (_params, _role) => {
      try {
        const result = await retrieveContext({ query: 'policies prohibited items conduct', topK: 5, useHybridSearch: false })
        const { chunks } = result
        const citations = await generateCitations({ chunks, totalTime: 0 })
        const policies = chunks.map((sc) => ({
          title: sc.chunk.metadata.sourceTitle as string ?? 'Policy',
          content: sc.chunk.content,
          source: formatInlineCitation(citations[0] ?? { id: '', sourceType: 'policy' as const, sourceTitle: sc.chunk.metadata.sourceTitle as string ?? 'Policy', relevance: 0, excerpt: sc.chunk.content.slice(0, 100) }),
        }))
        return { toolName: 'getPolicies', success: true, data: { policies, count: policies.length } }
      } catch (err) {
        return {
          toolName: 'getPolicies',
          success: false,
          error: err instanceof Error ? err.message : 'Failed to get policies',
        }
      }
    },
  })

  registerTool({
    name: 'searchKnowledge',
    description: 'Search the knowledge base for FAQs, help center articles, policy documents, and documentation',
    execute: async (params, _role) => {
      try {
        const query = params.query as string
        const topK = (params.topK as number) ?? 5
        const result = await retrieveContext({
          query,
          topK,
          useHybridSearch: true,
          includeCitations: true,
        })
        return {
          toolName: 'searchKnowledge',
          success: true,
          data: { chunks: result.chunks, citations: result.citations, count: result.chunks.length },
        }
      } catch (err) {
        return {
          toolName: 'searchKnowledge',
          success: false,
          error: err instanceof Error ? err.message : 'Knowledge search failed',
        }
      }
    },
  })

  logger.info('phase2_tools_registered', { details: { count: 6 } })
}

export { executeToolCall }
