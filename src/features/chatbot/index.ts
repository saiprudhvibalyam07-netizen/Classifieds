export { ChatWidget } from './components/ChatWidget'
export { ChatProvider } from './contexts/ChatContext'
export { useChat } from './hooks/useChat'
export { useChatAuth } from './hooks/useChatAuth'

export type {
  ChatbotConversation,
  ChatbotMessage,
  ChatbotRole,
  ChatState,
  ConversationStatus,
  MessageStatus,
  AIModelConfig,
  TokenUsage,
  CostEstimate,
  LogEntry,
  ToolDefinition,
  PermissionCheck,
  ValidationResult,
  AIResponse,
} from './types'

export type { ConversationProvider } from './services/provider'
export { getConversationProvider } from './services/provider'
export { CHATBOT_CONFIG, AI_CONFIG, COST_CONFIG, LOG_CONFIG, RAG_CONFIG, NL_CONFIG, MEMORY_CONFIG } from './config'

export type { EmbeddingProvider } from './services/embeddingProvider'
export { getEmbeddingProvider, resetEmbeddingProvider } from './services/embeddingProvider'

export { registerPhase2Tools } from './services/toolImplementations'
export { retrieveContext, retrieveContextWithSources } from './services/retrievalPipeline'
export { hybridSearch } from './services/hybridSearch'
export { generateCitations, formatCitations, citationsToMarkdown } from './services/citationEngine'
export { checkHallucination } from './services/hallucinationGuard'
export { parseNaturalLanguage } from './services/naturalLanguageSearch'
export { buildRAGContext, buildFullMessageList } from './services/ragContextBuilder'
export {
  seedDefaultKnowledge,
  clearKnowledgeBase,
  getAllDocuments,
  getDocument,
  searchDocuments,
} from './services/knowledgeBase'
export { seedMarketplaceData, clearMarketplaceData } from './services/marketplaceIntelligence'
export { ingestDocument, ingestDocuments, chunkDocument } from './services/ingestionPipeline'
export {
  storeEmbedding,
  storeEmbeddings,
  similaritySearch,
  keywordSearch,
  clearVectorStore,
} from './services/vectorStore'
export { searchListings, getListingDetails, getCategories, getSellerInfo } from './services/marketplaceIntelligence'

export {
  storeEmbedding as storeVectorEmbedding,
  similaritySearch as vectorSimilaritySearch,
} from './services/vectorStore'

// Phase 3: Memory & Personalization
export type { MemoryEntry, MemoryQuery, MemoryScope, MemoryStats } from './types'
export type { UserProfile, UserPreference, ConversationSummary, Recommendation } from './types'
export type { PrivacySettings, PrivacyFilterResult, PrivacyAuditLog } from './services/memoryPrivacy'
export type { ConversationContext, ProcessMessageResult } from './services/memoryManager'

export {
  storeMemory, getMemory, deleteMemory, deleteUserMemories, deleteSessionMemories,
  getAllMemories, exportMemories, getMemoryStats, clearAllMemories, pruneExpiredMemories,
} from './services/memoryStore'

export { buildUserProfile, buildProfileContext } from './services/userProfile'
export { learnFromMessage, learnViewedListing, getLearnedPreferences } from './services/preferenceLearner'

export {
  summarizeConversation, findRelatedConversations, buildContinuityContext, getConversationSummary,
} from './services/conversationContinuity'

export {
  recommendListings, recommendCategories, recommendResources, recommendSellers, recommendAll,
} from './services/recommendationEngine'

export {
  processMessage, trackListingView, getRecommendations, getContext,
  forgetMemory, forgetUserMemories, forgetSessionMemories, resetAll,
} from './services/memoryManager'

export {
  filterSensitiveData, scrubSensitiveMemories, exportUserData, deleteAllUserData,
  getPrivacySettings, updatePrivacySettings, getAuditLogs, clearAuditLogs,
} from './services/memoryPrivacy'
