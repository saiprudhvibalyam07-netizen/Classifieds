export type ChatbotRole = 'visitor' | 'buyer' | 'seller' | 'admin'

export type MessageRole = 'user' | 'assistant' | 'system'

export type ConversationStatus = 'active' | 'archived' | 'escalated'

export type MessageStatus = 'sending' | 'sent' | 'failed' | 'streaming'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface ChatbotConversation {
  id: string
  userId: string | null
  sessionId: string | null
  role: ChatbotRole
  title: string | null
  status: ConversationStatus
  messageCount: number
  lastActivity: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ChatbotMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  createdAt: string
  status: MessageStatus
}

export interface ChatState {
  isOpen: boolean
  conversation: ChatbotConversation | null
  messages: ChatbotMessage[]
  isTyping: boolean
  streamingMessageId: string | null
  error: string | null
  offline: boolean
}

export interface SendMessageParams {
  content: string
  role: ChatbotRole
  userId: string | null
  sessionId: string | null
}

export interface MockResponse {
  content: string
  delay: number
}

export interface AIModelConfig {
  model: string
  maxTokens: number
  temperature: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  timeout: number
  maxRetries: number
  retryDelay: number
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface CostEstimate {
  promptCost: number
  completionCost: number
  totalCost: number
  currency: string
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  event: string
  details?: Record<string, unknown>
  duration?: number
  tokens?: TokenUsage
  cost?: CostEstimate
  error?: string
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  requiredRoles: ChatbotRole[]
}

export interface PermissionCheck {
  allowed: boolean
  reason?: string
  requiredRoles: ChatbotRole[]
}

export interface ValidationResult {
  valid: boolean
  reason?: string
}

export interface AIResponse {
  content: string
  tokens: TokenUsage
  cost: CostEstimate
  latency: number
}

export type ChatAction =
  | { type: 'TOGGLE_OPEN' }
  | { type: 'SET_OPEN'; payload: boolean }
  | { type: 'SET_CONVERSATION'; payload: ChatbotConversation }
  | { type: 'SET_MESSAGES'; payload: ChatbotMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatbotMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<ChatbotMessage> } }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_OFFLINE'; payload: boolean }
  | { type: 'RESET' }
  | { type: 'START_STREAM'; payload: { messageId: string; conversationId: string } }
  | { type: 'STREAM_TOKEN'; payload: { messageId: string; token: string } }
  | { type: 'END_STREAM'; payload: { messageId: string } }
  | { type: 'STREAM_ERROR'; payload: { messageId: string; error: string } }

export type SourceType = 'faq' | 'policy' | 'help_center' | 'documentation'

export interface KnowledgeDocument {
  id: string
  title: string
  sourceType: SourceType
  content: string
  metadata: Record<string, unknown>
  version: number
  createdAt: string
  updatedAt: string
}

export interface KnowledgeChunk {
  id: string
  documentId: string
  content: string
  sequence: number
  tokens: number
  metadata: Record<string, unknown>
}

export interface Citation {
  id: string
  sourceType: SourceType
  sourceTitle: string
  sourceSection?: string
  lastUpdated?: string
  relevance: number
  excerpt: string
}

export interface EmbeddingResult {
  chunkId: string
  embedding: number[]
}

export interface SearchFilters {
  categories?: string[]
  minPrice?: number
  maxPrice?: number
  location?: string
  sellerId?: string
  status?: string
  query?: string
}

export interface NLSearchResult {
  query: string
  filters: SearchFilters
  confidence: number
}

export interface MarketplaceListing {
  id: string
  title: string
  price: number
  category: string
  location: string
  sellerId: string
  status: string
  images: string[]
  createdAt: string
}

export interface MarketplaceCategory {
  id: string
  name: string
  slug: string
  parentId: string | null
  itemCount: number
}

export interface MarketplaceSeller {
  id: string
  name: string
  rating: number
  listingCount: number
  joinedAt: string
}

export interface ScoredChunk {
  chunk: KnowledgeChunk
  score: number
  rank: number
}

export interface RetrievalResult {
  chunks: ScoredChunk[]
  expandedQuery?: string
  totalTime: number
}

export interface RAGContext {
  chunks: ScoredChunk[]
  citations: Citation[]
  marketplaceData?: {
    listings?: MarketplaceListing[]
    categories?: MarketplaceCategory[]
    sellers?: MarketplaceSeller[]
  }
}

export interface HallucinationCheck {
  isHallucinated: boolean
  confidence: number
  reasons: string[]
}

export interface RichResponse {
  type: 'text' | 'listing_card' | 'category_card' | 'seller_card' | 'policy_card' | 'faq_card' | 'carousel' | 'empty'
  content: string
  data?: unknown
  items?: unknown[]
  citations?: Citation[]
}

export type MemoryType = 'session' | 'persistent'
export type MemoryScope = 'session' | 'persistent' | 'conversation' | 'preference' | 'interest' | 'interaction'

export interface MemoryEntry {
  id: string
  userId: string | null
  sessionId: string | null
  scope: MemoryScope
  key: string
  value: unknown
  confidence: number
  createdAt: string
  updatedAt: string
  expiresAt: string | null
}

export interface UserProfile {
  userId: string
  role: ChatbotRole
  preferences: UserPreference[]
  recentTopics: string[]
  viewedListings: string[]
  sessionCount: number
  firstSeen: string
  lastSeen: string
}

export interface UserPreference {
  key: string
  value: string | number | string[]
  confidence: number
  source: 'explicit' | 'inferred' | 'default'
  updatedAt: string
}

export interface ConversationSummary {
  conversationId: string
  userId: string | null
  sessionId: string | null
  summary: string
  topics: string[]
  keyMentions: string[]
  messageCount: number
  createdAt: string
  lastMessageAt: string
}

export interface MemoryQuery {
  userId?: string | null
  sessionId?: string | null
  scope?: MemoryScope
  key?: string
  limit?: number
}

export interface Recommendation {
  type: 'listing' | 'category' | 'seller' | 'resource'
  id: string
  title: string
  description: string
  score: number
  reason: string
  image?: string
}

export interface MemoryStats {
  totalEntries: number
  sessionEntries: number
  persistentEntries: number
  preferenceCount: number
  conversationCount: number
  oldestEntry: string | null
  newestEntry: string | null
  estimatedTokens: number
}

export interface PromptVersion {
  id: string
  version: number
  name: string
  content: string
  description?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  isActive: boolean
  stage?: 'draft' | 'testing' | 'staging' | 'production'
  metadata?: Record<string, unknown>
}

export interface PromptVersionComparison {
  differences: Array<{ path: string; old: unknown; new: unknown }>
  similarity: number
  conflicting: boolean
}

export interface ComplianceReport {
  timestamp: string
  userId?: string
  action: 'conversation_deletion' | 'memory_deletion' | 'data_export' | 'permission_change' | 'prompt_modification' | 'admin_action'
  details: {
    userId?: string
    resourceId?: string
    actionType: string
    timestamp: string
    performedBy?: string
    retentionPeriod?: number
    sensitiveData?: boolean
    [key: string]: unknown
  }
  auditLogId: string
}

export interface AdminDashboard {
  alerts: {
    total: number
    active: number
    bySeverity: { critical: number; warning: number; info: number }
    lastCheck: string
  }
  metrics: {
    conversationsToday: number
    activeUsers: number
    systemUptime: number
    avgResponseTime: number
    totalCostToday: number
  }
  status: {
    overall: 'healthy' | 'degraded' | 'down'
    services: Record<string, 'healthy' | 'degraded' | 'down'>
  }
}

export interface FeatureFlag {
  id: string
  name: string
  description?: string
  enabled: boolean
  trueValue: unknown
  falseValue: unknown
  version?: number
  lastModified?: string
  targets?: ('user' | 'session' | 'global')[]
  conditions?: {
    userRole?: string[]
    userId?: string
    sessionId?: string
  }
  environment?: string
  metadata?: Record<string, unknown>
}

export interface FeatureFlagContext {
  userId?: string
  sessionId?: string
  userRole?: string
  environment?: string
  customData?: Record<string, unknown>
}

export interface EvaluationResult<T> {
  value: T
  source: 'flag' | 'default' | 'override'
  flagName?: string
  version?: number
  reason?: string
}

export class FlagEvaluationError extends Error {
  constructor(message: string, public code: string, public flagName?: string) {
    super(message)
    this.name = 'FlagEvaluationError'
  }
}
