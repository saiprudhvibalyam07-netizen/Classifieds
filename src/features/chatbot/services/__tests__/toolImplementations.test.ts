import { describe, it, expect, beforeEach } from 'vitest'
import { executeToolCall, getRegisteredTools, unregisterTool } from '../toolRouter'
import { registerPhase2Tools } from '../toolImplementations'
import { clearVectorStore } from '../vectorStore'
import { seedMarketplaceData, clearMarketplaceData } from '../marketplaceIntelligence'
import { clearKnowledgeBase, seedDefaultKnowledge } from '../knowledgeBase'

describe('Phase 2 Tool Implementations', () => {
  beforeEach(async () => {
    const tools = getRegisteredTools()
    tools.forEach((name) => unregisterTool(name))
    await clearVectorStore()
    await clearMarketplaceData()
    await clearKnowledgeBase()
    await seedMarketplaceData()
    await seedDefaultKnowledge()
    registerPhase2Tools()
  })

  describe('Tool Registration', () => {
    it('registers all 6 Phase 2 tools', () => {
      const tools = getRegisteredTools()
      expect(tools).toContain('searchListings')
      expect(tools).toContain('getListingDetails')
      expect(tools).toContain('getCategories')
      expect(tools).toContain('getSellerInfo')
      expect(tools).toContain('getPolicies')
      expect(tools).toContain('searchKnowledge')
    })
  })

  describe('searchListings', () => {
    it('returns listings matching query', async () => {
      const result = await executeToolCall('searchListings', { query: 'phone' }, 'visitor')
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(Array.isArray((result.data as any)?.listings)).toBe(true)
    })

    it('filters by category', async () => {
      const result = await executeToolCall('searchListings', { categories: ['Electronics'] }, 'buyer')
      expect(result.success).toBe(true)
    })
  })

  describe('getCategories', () => {
    it('returns all categories', async () => {
      const result = await executeToolCall('getCategories', {}, 'visitor')
      expect(result.success).toBe(true)
      expect(Array.isArray((result.data as any)?.categories)).toBe(true)
    })
  })

  describe('getSellerInfo', () => {
    it('returns success false for unknown seller', async () => {
      const result = await executeToolCall('getSellerInfo', { sellerId: 'unknown' }, 'visitor')
      expect(result.success).toBe(false)
    })
  })

  describe('getPolicies', () => {
    it('returns policies from knowledge base', async () => {
      const result = await executeToolCall('getPolicies', {}, 'visitor')
      expect(result.success).toBe(true)
    })
  })

  describe('searchKnowledge', () => {
    it('searches knowledge base', async () => {
      const result = await executeToolCall('searchKnowledge', { query: 'account', topK: 3 }, 'visitor')
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(Array.isArray((result.data as any)?.chunks)).toBe(true)
    })
  })
})
