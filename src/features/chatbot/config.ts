export const CHATBOT_CONFIG = {
  enabled: true,
  mockMode: true,
  sessionExpiryDays: 30,
  messageLimit: 50,
  typingDelay: { min: 800, max: 2000 },
  maxStarterPrompts: 4,
}

export const AI_CONFIG = {
  model: 'gpt-4o-mini',
  maxTokens: 4096,
  temperature: 0.7,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  timeout: 30000,
  maxRetries: 2,
  retryDelay: 1000,
  openaiEndpoint: import.meta.env.VITE_OPENAI_ENDPOINT ?? '/api/chat',
  openaiKey: '',
}

export const COST_CONFIG = {
  enabled: true,
  currency: 'USD',
  modelRates: {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4': { input: 0.03, output: 0.06 },
  },
}

export const LOG_CONFIG = {
  enabled: true,
  level: 'info' as const,
  maxEntries: 100,
  analyticsEnabled: true,
}

export const RAG_CONFIG = {
  enabled: true,
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  embeddingEndpoint: import.meta.env.VITE_OPENAI_ENDPOINT
    ? `${import.meta.env.VITE_OPENAI_ENDPOINT.replace(/\/chat\/?$/, '')}/embeddings`
    : '/api/embeddings',
  chunkSize: 512,
  chunkOverlap: 64,
  topK: 5,
  minScore: 0.5,
  semanticWeight: 0.7,
  keywordWeight: 0.3,
  maxContextTokens: 2000,
  cacheEnabled: true,
  cacheTTL: 300_000,
  reRankEnabled: true,
  useHybridSearch: true,
}

export const NL_CONFIG = {
  enabled: true,
  minConfidence: 0.4,
  defaultLocation: '',
  maxPriceLimit: 100_000_000,
}

export const MEMORY_CONFIG = {
  enabled: true,
  sessionTTL: 86_400_000,
  persistentTTL: 2_592_000_000,
  maxSessionEntries: 100,
  maxPersistentEntries: 500,
  minConfidence: 0.3,
  preferenceLearningEnabled: true,
  conversationSummarizationEnabled: true,
  summarizationMinMessages: 10,
  pruningInterval: 86_400_000,
  recommendationTopK: 5,
  maxRecentTopics: 20,
  maxViewedListings: 50,
}

export const ANALYTICS_CONFIG = {
  enabled: true,
  trackConversations: true,
  trackUsers: true,
  trackUsage: true,
  trackPerformance: true,
  trackCost: true,
  trackQuality: true,
  trackReliability: true,
  aggregationWindow: 3600000,
}

export const COST_MONITORING_CONFIG = {
  enabled: true,
  alertThreshold: 100,
  billingCycle: 'monthly',
  trackPerUser: true,
  trackPerConversation: true,
  trackPerFeature: true,
  trackProviderUsage: true,
}

export const QUALITY_MONITORING_CONFIG = {
  enabled: true,
  trackHallucinationRate: true,
  trackCitationUsage: true,
  trackRetrievalQuality: true,
  trackRecommendationSuccess: true,
  trackValidationFailures: true,
  hallucinationAlertThreshold: 0.05,
  failureAlertThreshold: 0.1,
}

export const RELIABILITY_CONFIG = {
  enabled: true,
  trackLatency: true,
  trackTimeouts: true,
  trackRetries: true,
  trackStreaming: true,
  trackProviderFailures: true,
  trackCacheHitRatio: true,
  trackDatabaseLatency: true,
  latencyAlertThreshold: 5000,
  timeoutAlertThreshold: 10,
}

export const FEATURE_FLAGS_CONFIG = {
  enabled: true,
  providers: {
    openai: { enabled: true, fallbackModel: 'gpt-4o-mini' },
    anthropic: { enabled: false, fallbackModel: null },
  },
  features: {
    streaming: { enabled: true, fallback: false },
    rag: { enabled: true, fallback: [] },
    memory: { enabled: true, fallback: null },
    recommendations: { enabled: true, fallback: [] },
    marketplaceIntelligence: { enabled: true, fallback: null },
    embeddings: { enabled: true, fallback: null },
    hybridSearch: { enabled: true, fallback: null },
    citationEngine: { enabled: true, fallback: [] },
    toolRouter: { enabled: true, fallback: [] },
    individualTools: { enabled: true, fallback: [] },
    experimentalFeatures: { enabled: false, fallback: null },
  },
  environmentOverrides: { enabled: true },
  auditLogging: { enabled: true },
}

export const PROMPT_REGISTRY_CONFIG = {
  enabled: true,
  defaultVersion: 1,
  maxVersions: 100,
  rollbackEnabled: true,
  autoPromote: false,
  auditLogging: true,
}

export const ADMIN_OPERATIONS_CONFIG = {
  enabled: true,
  auditLogging: true,
  rateLimiting: { enabled: true, maxRequestsPerMinute: 100 },
  timeout: { enabled: true, defaultTimeout: 10000 },
}

export const RUNTIME_CONFIG_CONFIG = {
  enabled: true,
  validationSchema: { enabled: true },
  hotReload: { enabled: true },
  versionControl: { enabled: true },
  environmentIsolation: { enabled: true },
}

export const ALERT_CONFIG = {
  enabled: true,
  rules: {
    highLatency: { threshold: 5000, window: 60000 },
    highTokenUsage: { threshold: 100000, window: 3600000 },
    costSpike: { percentage: 50, window: 3600000 },
    hallucinations: { threshold: 0.05, window: 3600000 },
    providerUnavailable: { threshold: 1, window: 300000 },
  },
}

export const HEALTH_CONFIG = {
  enabled: true,
  checkInterval: 60000,
  providers: ['openai', 'supabase', 'vectorDb', 'embeddingProvider', 'knowledgeBase', 'memorySystem', 'streaming', 'toolRouter'],
  healthCheckTimeout: 5000,
  consecutiveFailuresBeforeAlert: 3,
}

export const PRIVACY_CONFIG = {
  enabled: true,
  auditLogging: true,
  exportRequests: true,
  deletionLogging: true,
  permissionChanges: true,
  dataRetentionDays: 365,
}
