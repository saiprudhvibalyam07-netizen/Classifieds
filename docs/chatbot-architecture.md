# ValClassifieds AI Chatbot — Architecture Document

> **Status:** Architecture & Design  
> **Version:** 1.0  
> **AI Model:** OpenAI GPT-4o-mini (primary), text-embedding-3-small (embeddings)  
> **Vector Store:** Supabase pgvector  
> **Scope:** Marketplace-specific assistant (buying, selling, listings, policies, help)

---

## Table of Contents

1. [Overall Architecture](#1-overall-architecture)
2. [Component Diagram](#2-component-diagram)
3. [Database Design](#3-database-design)
4. [Conversation Flow](#4-conversation-flow)
5. [Authentication Flow](#5-authentication-flow)
6. [Memory Architecture](#6-memory-architecture)
7. [RAG Architecture](#7-rag-architecture)
8. [OpenAI Integration](#8-openai-integration)
9. [Tool Permission Matrix](#9-tool-permission-matrix)
10. [Response Contracts](#10-response-contracts)
11. [Prompt Engineering Strategy](#11-prompt-engineering-strategy)
12. [Context Management](#12-context-management)
13. [Token Optimization](#13-token-optimization)
14. [Error Handling](#14-error-handling)
15. [Security](#15-security)
16. [Rate Limiting](#16-rate-limiting)
17. [Cost Optimization](#17-cost-optimization)
18. [Caching](#18-caching)
19. [Conversation Storage](#19-conversation-storage)
20. [Admin Monitoring](#20-admin-monitoring)
21. [Analytics](#21-analytics)
22. [Observability](#22-observability)
23. [Future Expansion](#23-future-expansion)

---

## 1. Overall Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           ValClassifieds SPA (React 18)                │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │  Main    │  │  Chat Widget  │  │  Other Pages   │  │  │
│  │  │  Layout  │  │  (Floating)   │  │  (Listings,    │  │  │
│  │  │          │  │              │  │   Detail, etc) │  │  │
│  │  └──────────┘  └──────┬───────┘  └────────────────┘  │  │
│  └───────────────────────┼───────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │    HTTPS / Streaming    │
              └────────────┬────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                  Vercel Edge / Serverless                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           AI Chat API (api/chat.mjs)                 │   │
│  │                                                      │   │
│  │  ┌──────────────┐  ┌────────────┐  ┌──────────────┐│   │
│  │  │  Auth Guard  │  │ Rate       │  │  Session     ││   │
│  │  │  (JWT + key) │  │ Limiter    │  │  Manager     ││   │
│  │  └──────┬───────┘  └─────┬──────┘  └──────┬───────┘│   │
│  │         │                │                 │         │   │
│  │  ┌──────┴────────────────┴─────────────────┴───────┐│   │
│  │  │           Conversation Manager                   ││   │
│  │  └──────────────────────┬──────────────────────────┘│   │
│  │                         │                            │   │
│  │  ┌──────────────────────┴──────────────────────────┐│   │
│  │  │              AI Orchestrator                     ││   │
│  │  │  ┌────────────┐ ┌──────────┐ ┌───────────────┐  ││   │
│  │  │  │  Prompt    │ │ Context  │ │  Tool Router  │  ││   │
│  │  │  │  Builder   │ │ Builder  │ │  + Permission │  ││   │
│  │  │  └─────┬──────┘ └────┬─────┘ └──────┬────────┘  ││   │
│  │  │        │              │              │           ││   │
│  │  │  ┌─────┴──────┐ ┌────┴─────┐ ┌──────┴────────┐  ││   │
│  │  │  │ RAG Engine │ │ Response │ │  Cost Tracker │  ││   │
│  │  │  │            │ │Validator │ │  + Analytics  │  ││   │
│  │  │  └─────┬──────┘ └────┬─────┘ └───────────────┘  ││   │
│  │  └────────┼─────────────┼──────────────────────────┘│   │
│  │           │             │                            │   │
│  │  ┌────────┴─────────────┴──────────────────────────┐│   │
│  │  │           OpenAI Adapter                         ││   │
│  │  │  ┌──────────────────┐  ┌──────────────────────┐ ││   │
│  │  │  │ chatCompletion() │  │ generateEmbedding()  │ ││   │
│  │  │  └──────────────────┘  └──────────────────────┘ ││   │
│  │  └──────────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────┴──┐  ┌─────┴─────┐  ┌───┴──────────┐
     │  Supabase │  │   OpenAI  │  │   Supabase   │
     │  (Auth,   │  │  (GPT-4o, │  │  pgvector    │
     │  Messages)│  │  Embed)   │  │  (RAG Store) │
     └───────────┘  └───────────┘  └──────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | Chat widget embedded in SPA |
| **State** | React Context + useReducer | Chat state, session, UI state |
| **API Layer** | Vercel Serverless (api/chat.mjs) | AI proxy, auth, rate limiting |
| **AI Model** | OpenAI GPT-4o-mini | Primary conversation model |
| **Embeddings** | OpenAI text-embedding-3-small | Vector embeddings for RAG |
| **Vector Store** | Supabase pgvector | Store + query knowledge embeddings |
| **Database** | Supabase PostgreSQL | Conversations, messages, feedback |
| **Streaming** | Server-Sent Events (SSE) | Real-time token streaming to client |
| **Cache** | In-memory + Supabase | Session cache, embedding cache |

### Architecture Principles

1. **Provider-agnostic AI layer** — The orchestrator talks to an `AIProvider` interface. OpenAI is the default; swapping to Anthropic, Google, or open-source requires only a new adapter.
2. **Backend-for-frontend (BFF)** — All AI calls route through our serverless function. The OpenAI API key never touches the browser.
3. **Streaming-first** — Responses stream via SSE for perceived low latency.
4. **Stateless API** — Each request carries the conversation ID; the server loads context from the database.
5. **Fail-soft** — If OpenAI is down, fall back to a rule-based response suggesting the user try again later or contact support.

---

## 2. Component Diagram

### Frontend Component Tree

```
<App>
  <AuthProvider>
    <ChatProvider>                    ← Chat state, session, API client
      <Layout>
        <Header />
        <Outlet />                     ← Page content
        <Footer />
        <ChatWidget>                   ← Floating button + panel
          <ChatToggle />               ← Floating action button
          <ChatPanel>                  ← Slide-up / slide-over panel
            <ChatHeader />             ← Title, online status, close
            <ChatMessages>             ← Scrollable message list
              <WelcomeMessage />       ← First-visit greeting
              <MessageBubble />        ← User message
              <AssistantBubble />      ← AI response (streaming-aware)
                <ListingCard />        ← Interactive listing result
                <SuggestedReplies />   ← Quick reply chips
                <SourcesDropdown />    ← RAG source citations
              <TypingIndicator />      ← "..." animation
            </ChatMessages>
            <ChatInput />              ← Textarea + send button
              <AttachmentButton />     ← (future) file upload
            <QuickActions />           ← Role-based action buttons
          </ChatPanel>
        </ChatWidget>
      </Layout>
    </ChatProvider>
  </AuthProvider>
</App>
```

### Backend Component Tree

```
api/chat.mjs (Vercel Serverless)
  │
  ├── verifyAuth()              ← JWT / session validation
  ├── rateLimiter()             ← Token bucket per user/IP
  ├── ConversationManager
  │     ├── loadConversation()  ← Fetch history from DB
  │     ├── saveMessage()       ← Persist user + assistant messages
  │     ├── updateContext()     ← Track conversation state
  │     └── manageSession()     ← Session create/resume/expire
  │
  ├── AI Orchestrator           ← Single entry point for all AI requests
  │     ├── PromptBuilder
  │     │     ├── buildSystemPrompt()    ← Assemble role-aware prompt
  │     │     ├── buildUserPrompt()      ← Format user message + context
  │     │     └── buildToolPrompt()      ← Format tool results for LLM
  │     ├── ContextBuilder
  │     │     ├── injectRoleContext()    ← User role + profile data
  │     │     ├── injectPageContext()    ← Current page the user is on
  │     │     ├── injectHistory()        ← Conversation history (truncated)
  │     │     └── injectRagContext()     ← Knowledge base chunks
  │     ├── ToolRouter
  │     │     ├── parseToolCalls()       ← Parse LLM function call requests
  │     │     ├── dispatchTool()         ← Route to correct tool handler
  │     │     ├── validateArgs()         ← Validate parameters against schema
  │     │     └── formatResult()         ← Format tool output for LLM
  │     ├── PermissionChecker
  │     │     ├── checkToolAccess()      ← Verify role has tool permission
  │     │     ├── checkDataVisibility()  ← Filter response data by role
  │     │     └── checkActionAllowed()   ← Verify role can perform action
  │     ├── RAGEngine
  │     │     ├── embedQuery()           ← OpenAI embedding call
  │     │     ├── vectorSearch()         ← pgvector similarity search
  │     │     ├── keywordSearch()        ← Full-text search fallback
  │     │     └── rerankResults()        ← Cross-encoder re-ranking
  │     ├── ResponseValidator
  │     │     ├── validateResponse()     ← Guardrail enforcement
  │     │     ├── checkHallucination()   ← Verify against sources
  │     │     ├── filterPII()            ← Strip personal data
  │     │     └── checkOutOfScope()      ← Refusal detection
  │     ├── CostTracker
  │     │     ├── trackTokenUsage()      ← Prompt + completion tokens
  │     │     ├── estimateCost()         ← Running cost per conversation
  │     │     └── checkBudget()          ← Budget threshold alerts
  │     └── AnalyticsLogger
  │           ├── logEvent()             ← Structured event logging
  │           ├── logLatency()           ← Per-component timing
  │           └── logError()             ← Error categorization
  │
  ├── Tool Handlers
  │     ├── searchListings()     ← Natural language listing search
  │     ├── getListingDetail()   ← Fetch single listing
  │     ├── getCategories()      ← Category list
  │     ├── getSellerInfo()      ← Public profile
  │     ├── getPolicies()        ← FAQ/policy lookup
  │     └── escalateToHuman()    ← Create support ticket
  │
  ├── OpenAIAdapter
  │     ├── chatCompletion()     ← GPT-4o-mini with streaming
  │     └── generateEmbedding()  ← text-embedding-3-small
  │
  └── errorHandler()             ← Global error boundary
```

### Data Flow — End-to-End

```
User types: "Show phones under ₹20,000 in Hyderabad"
        │
        ▼
ChatInput → ChatProvider.sendMessage(text)
        │
        ▼
POST /api/chat/stream
  Headers: { Authorization: "Bearer <jwt-or-session>" }
  Body: { conversationId, message, role }
        │
        ▼
api/chat.mjs
  ├── verifyAuth() → extracts user / visitor session
  ├── rateLimiter() → checks quota
  ├── ConversationManager
  │     ├── loadConversation(conversationId)
  │     ├── saveMessage(userMessage)
  │     └── manageSession()
  │
  ├── AI Orchestrator.run()
  │     ├── PromptBuilder.buildSystemPrompt(role, context)
  │     ├── ContextBuilder
  │     │     ├── injectRoleContext(user)
  │     │     ├── injectHistory(conversationId)
  │     │     └── injectPageContext(currentPage)
  │     ├── RAGEngine.search("phones under 20000 Hyderabad")
  │     │     ├── embedQuery()
  │     │     ├── vectorSearch(pgvector)
  │     │     ├── keywordSearch(FTS)
  │     │     └── rerankResults()
  │     ├── PermissionChecker.checkToolAccess(role, searchListings) → ✅
  │     ├── OpenAIAdapter.chatCompletion({
  │     │     messages: [system, history, user],
  │     │     tools: [searchListings, getCategories, ...],
  │     │     stream: true,
  │     │   })
  │     ├── ToolRouter.parseToolCalls() → dispatch searchListings
  │     ├── ToolRouter.validateArgs({ query, maxPrice: 20000, city: "Hyderabad" })
  │     ├── ToolRouter.dispatchTool(searchListings, args)
  │     │     └── Supabase: SELECT * FROM listings WHERE ...
  │     ├── ResponseValidator.validateResponse(llmResult)
  │     ├── CostTracker.trackTokenUsage(promptTokens, completionTokens)
  │     ├── AnalyticsLogger.logEvent("ai_response", { latency, tokens })
  │     └── Stream response via SSE
        │
        ▼
Client receives SSE stream
  ├── ChatProvider updates messages state incrementally
  ├── AssistantBubble renders streaming text
  └── On complete → render ListingCard(s) + SuggestedReplies
```

---

## 3. Database Design

### New Tables

#### 3.1 `chatbot_conversations`

Stores AI chatbot conversation sessions.

```sql
CREATE TABLE chatbot_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id      TEXT,                           -- anonymous visitor session
  role            TEXT NOT NULL DEFAULT 'visitor', -- visitor | buyer | seller | admin
  title           TEXT,                           -- auto-generated summary
  status          TEXT NOT NULL DEFAULT 'active',  -- active | archived | escalated
  message_count   INTEGER DEFAULT 0,
  token_count     INTEGER DEFAULT 0,
  last_activity   TIMESTAMPTZ DEFAULT now(),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_role CHECK (role IN ('visitor', 'buyer', 'seller', 'admin')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'archived', 'escalated')),
  CONSTRAINT has_owner CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE INDEX idx_cc_user_id ON chatbot_conversations(user_id);
CREATE INDEX idx_cc_session_id ON chatbot_conversations(session_id);
CREATE INDEX idx_cc_status ON chatbot_conversations(status);
CREATE INDEX idx_cc_last_activity ON chatbot_conversations(last_activity DESC);
CREATE INDEX idx_cc_created_at ON chatbot_conversations(created_at DESC);
```

#### 3.2 `chatbot_messages`

Stores individual messages within AI conversations.

```sql
CREATE TABLE chatbot_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  role              TEXT NOT NULL,           -- user | assistant | system | tool
  content           TEXT,
  tool_calls        JSONB DEFAULT NULL,       -- OpenAI function call data
  tool_call_id      TEXT,
  tool_name         TEXT,
  source_chunks     UUID[],                  -- references to retrieved knowledge chunks
  tokens            INTEGER DEFAULT 0,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system', 'tool'))
);

CREATE INDEX idx_cm_conversation_id ON chatbot_messages(conversation_id, created_at);
CREATE INDEX idx_cm_created_at ON chatbot_messages(created_at DESC);
```

#### 3.3 `chatbot_knowledge_base`

Source documents for RAG (FAQs, Help Center, Policies, Documentation).

```sql
CREATE TABLE chatbot_knowledge_base (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type     TEXT NOT NULL,           -- faq | help_center | policy | documentation | uploaded
  source_id       TEXT,                    -- original document ID / URL / path
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  content_html    TEXT,
  category        TEXT,                    -- general | buying | selling | listings | policies | safety
  tags            TEXT[] DEFAULT '{}',
  embedding       VECTOR(1536),            -- OpenAI text-embedding-3-small
  chunk_index     INTEGER DEFAULT 0,       -- position within source document
  parent_id       UUID REFERENCES chatbot_knowledge_base(id),
  is_active       BOOLEAN DEFAULT true,
  version         INTEGER DEFAULT 1,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_source_type CHECK (source_type IN ('faq', 'help_center', 'policy', 'documentation', 'uploaded'))
);

CREATE INDEX idx_ckb_source ON chatbot_knowledge_base(source_type, source_id);
CREATE INDEX idx_ckb_category ON chatbot_knowledge_base(category);
CREATE INDEX idx_ckb_active ON chatbot_knowledge_base(is_active);
CREATE INDEX idx_ckb_embedding ON chatbot_knowledge_base USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
CREATE INDEX idx_ckb_tags ON chatbot_knowledge_base USING GIN(tags);
CREATE INDEX idx_ckb_content_fts ON chatbot_knowledge_base
  USING GIN(to_tsvector('english', content));
```

#### 3.4 `chatbot_feedback`

User feedback on AI responses (thumbs up/down, comments).

```sql
CREATE TABLE chatbot_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID NOT NULL REFERENCES chatbot_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating          INTEGER NOT NULL,         -- 1 (thumbs down) or 2 (thumbs up)
  comment         TEXT,
  category        TEXT,                    -- irrelevant | incorrect | helpful | harmful
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_rating CHECK (rating IN (1, 2))
);

CREATE INDEX idx_cf_message ON chatbot_feedback(message_id);
CREATE INDEX idx_cf_user ON chatbot_feedback(user_id);
CREATE INDEX idx_cf_rating ON chatbot_feedback(rating);
```

#### 3.5 `chatbot_analytics_events`

Event tracking for admin dashboard and monitoring.

```sql
CREATE TABLE chatbot_analytics_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,           -- conversation_started | message_sent | tool_called
                                           -- | escalation | rating | error | session_timeout
  conversation_id UUID REFERENCES chatbot_conversations(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id      TEXT,
  metadata        JSONB DEFAULT '{}',
  duration_ms     INTEGER,
  token_count     INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cae_type ON chatbot_analytics_events(event_type, created_at DESC);
CREATE INDEX idx_cae_user ON chatbot_analytics_events(user_id);
CREATE INDEX idx_cae_date ON chatbot_analytics_events(created_at);
```

#### 3.6 `chatbot_escalations`

Tracks when the AI escalates to human support.

```sql
CREATE TABLE chatbot_escalations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id      TEXT,
  reason          TEXT NOT NULL,
  context         JSONB DEFAULT '{}',      -- last N messages, user info
  status          TEXT NOT NULL DEFAULT 'open',  -- open | in_progress | resolved | closed
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_esc_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

CREATE INDEX idx_ce_status ON chatbot_escalations(status);
CREATE INDEX idx_ce_assigned ON chatbot_escalations(assigned_to);
```

### Supabase pgvector Setup

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embed function for use in triggers/API
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  source_type TEXT,
  category TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.source_type,
    kb.category,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM chatbot_knowledge_base kb
  WHERE kb.is_active = true
    AND (filter_category IS NULL OR kb.category = filter_category)
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Entity Relationship Summary

```
profiles ──1:N──> chatbot_conversations (user_id)
                    │
                    │ 1
                    │ N
                    ├── chatbot_messages (conversation_id)
                    │     │
                    │     │ 1
                    │     │ N
                    │     ├── chatbot_feedback (message_id)
                    │     └── (references) chatbot_knowledge_base (source_chunks[])
                    │
                    ├── chatbot_analytics_events (conversation_id)
                    │
                    └── chatbot_escalations (conversation_id)

chatbot_knowledge_base ──self──> chatbot_knowledge_base (parent_id)
```

---

## 4. Conversation Flow

### State Machine

```
                    ┌──────────────┐
                    │   IDLE       │ ← Chat widget closed / hidden
                    └──────┬───────┘
                           │ user opens widget
                           ▼
                    ┌──────────────┐
              ┌────>│ WELCOME      │ ← First message / greeting
              │     └──────┬───────┘
              │            │ user sends message
              │            ▼
              │     ┌──────────────┐
              │     │ PROCESSING   │ ← Awaiting AI response
              │     └──────┬───────┘
              │            │
              │     ┌──────┴───────┐
              │     │              │
              │     ▼              ▼
              │  ┌────────┐  ┌──────────┐
              │  │ AI      │  │ TOOL     │ ← LLM called a tool
              │  │ STREAM  │  │ EXECUTE  │   (e.g., searchListings)
              │  └────┬───┘  └────┬─────┘
              │       │           │
              │       └─────┬─────┘
              │             │ response complete
              │             ▼
              │     ┌──────────────┐
              │     │ RESPONSE     │ ← AI response displayed
              │     │ READY        │
              │     └──────┬───────┘
              │            │
              │     ┌──────┴───────┐
              │     │              │
              │     ▼              ▼
              │  ┌────────┐  ┌──────────┐
              │  │ USER   │  │ CLOSE /  │ ← User closes or
              │  │ FOLLOW-│  │ TIMEOUT  │   session expires
              │  │ UP     │  └────┬─────┘
              │  └───┬────┘       │
              │      │            │
              └──────┘            │
                                  ▼
                           ┌──────────────┐
                           │   ENDED      │
                           └──────────────┘
```

### Detailed Message Flow

```
Step 1: User opens chat widget
  ├── ChatProvider initializes
  ├── Check localStorage for session_id
  ├── If existing session → resume conversation
  ├── If new visitor → create session, show welcome message
  └── Fetch any existing messages for the conversation

Step 2: User sends message
  ├── Optimistically add user message to UI
  ├── POST /api/chat/stream
  ├── Show TypingIndicator
  └── Wait for SSE stream

Step 3: Server processes message
  ├── Load conversation history (last N messages)
  ├── Build system prompt with role context
  ├── RAG: embed query + search knowledge base
  ├── Call OpenAI with:
  │     messages = [system + history + user]
  │     tools = [searchListings, getListingDetail, getCategories, getSellerInfo, getPolicies]
  │     stream = true
  ├── Stream response tokens to client via SSE
  └── On complete:
        Store assistant message in DB
        Update conversation metadata

Step 4: Client receives response
  ├── Stream tokens into AssistantBubble
  ├── On complete:
  │     Render action cards (listing results, etc.)
  │     Show SuggestedReplies
  └── Scroll to bottom

Step 5: User provides feedback
  ├── Thumbs up/down on assistant message
  ├── POST /api/chat/feedback
  └── Store in chatbot_feedback
```

---

## 5. Authentication Flow

### Session Strategy

| User Type | Identifier | Storage | Persistence |
|-----------|-----------|---------|-------------|
| **Visitor** | `session_id` (UUID v4) | localStorage | Cleared on logout / 30d expiry |
| **Logged-in** | `user_id` from `useAuth()` | JWT in Authorization header | Supabase session |

### Auth Guard — API Layer

```
Request: POST /api/chat/stream
  │
  ├── Check Authorization header
  │     ├── Valid JWT → extract user_id, fetch profile → ROLE = buyer/seller/admin
  │     └── No JWT → check session_id in request body
  │           ├── Valid session_id → ROLE = visitor
  │           └── No session_id → generate new session_id → ROLE = visitor
  │
  └── Attach { userId, sessionId, role, profile } to request context
```

### Role-Based Behavior

| Role | Behavior |
|------|----------|
| **Visitor** | General marketplace info, category browsing, public listing queries. Cannot access account-specific features. |
| **Buyer** | Everything a visitor can do + saved searches, favorite alerts, purchase guidance, listing inquiry help, price history. |
| **Seller** | Everything a buyer can do + listing creation tips, promotion advice, performance insights, policy compliance help, pricing suggestions. |
| **Admin** | Everything above + policy override explanations, monitoring queries, content moderation guidance, analytics interpretation. |

### Frontend: ChatProvider Auth Integration

```typescript
// Conceptual — not implementation
function useChatAuth() {
  const { user, profile } = useAuth()
  const [sessionId, setSessionId] = useState<string>()

  useEffect(() => {
    if (user) {
      setSessionId(null)  // authenticated — use JWT
    } else {
      // Restore or create anonymous session
      const stored = localStorage.getItem('chat_session_id')
      if (stored) {
        setSessionId(stored)
      } else {
        const newId = crypto.randomUUID()
        localStorage.setItem('chat_session_id', newId)
        setSessionId(newId)
      }
    }
  }, [user])

  return {
    userId: user?.id ?? null,
    sessionId: sessionId ?? null,
    role: determineRole(profile),
    user,
    profile,
  }
}
```

---

## 6. Memory Architecture

### Memory Tiers

```
┌──────────────────────────────────────────────────────┐
│                   MEMORY PYRAMID                      │
│                                                      │
│  Tier 1: Session (Visitor)                          │
│  ┌──────────────────────────────────────────────┐   │
│  │  • Current conversation messages              │   │
│  │  • Last N messages in context window          │   │
│  │  • Cleared when session expires / tab closes  │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Tier 2: Persistent (Logged-in)                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  • All conversation history in DB             │   │
│  │  • Cross-session context                      │   │
│  │  • Last 5 conversations summarized            │   │
│  │  • User preferences and past intents          │   │
│  │  • Persists across devices (via account)      │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Tier 3: Knowledge (All Users)                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  • FAQ embeddings in pgvector                 │   │
│  │  • Policy / help center chunks               │   │
│  │  • Live listing data (queried real-time)     │   │
│  │  • Shared across all conversations            │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Context Injection Strategy

The system prompt dynamically includes:

1. **User context** (from DB/profile):
   ```
   User: { full_name, role, member_since }
   Role: buyer | seller | visitor | admin
   ```

2. **Conversation summary** (for cross-session):
   ```
   Previous conversations summary:
   - Asked about selling electronics (3 days ago)
   - Inquired about listing promotion (yesterday)
   ```

3. **Active page context** (from client):
   ```
   Current page: /listings?category=mobiles-tablets
   ```

4. **Time context**:
   ```
   Current date: 2026-07-08
   ```

### Memory Retention Policy

| Data Type | Visitor | Logged-in |
|-----------|---------|-----------|
| Current conversation | Session lifetime | 90 days |
| Conversation history | Not persisted | 90 days |
| User preferences | Not persisted | 1 year |
| Feedback | Not persisted | 1 year |
| Session ID | 30 days (localStorage) | N/A |
| Knowledge base | Permanent | Permanent |

---

## 7. RAG Architecture

### Pipeline Overview

```
User Query: "How do I post a listing with multiple photos?"
        │
        ▼
┌─────────────────────────────┐
│    1. QUERY ANALYSIS        │
│    ├── Classify intent      │
│    ├── Extract entities     │
│    └── Detect language      │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│    2. EMBEDDING             │
│    ├── text-embedding-3-small│
│    └── dimensions: 1536      │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│    3. HYBRID SEARCH         │
│    ├── Vector search         │
│    │   (pgvector, cosine)   │
│    ├── Full-text search     │
│    │   (PostgreSQL tsvector)│
│    └── Weighted fusion      │
│        (0.7 vector + 0.3 FTS) │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│    4. RE-RANKING            │
│    ├── Cross-encoder        │
│    │   (or simple score)    │
│    └── Top-K = 5 chunks     │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│    5. CONTEXT ASSEMBLY      │
│    ├── Format as:           │
│    │   [Source: FAQ]        │
│    │   Q: ... A: ...        │
│    ├── Inject into prompt   │
│    └── Trim to token budget │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│    6. LLM GENERATION        │
│    ├── Augment with context │
│    ├── Apply guardrails     │
│    └── Stream response      │
└─────────────────────────────┘
```

### Knowledge Sources

| Source | Type | Chunk Size | Update Frequency | Priority |
|--------|------|-----------|-----------------|----------|
| **FAQs** | Structured Q&A | Per Q&A pair | Manual | High |
| **Help Center** | Markdown articles | 512 tokens | Manual | High |
| **Policies** | Legal documents | 512 tokens | Manual | High |
| **Documentation** | Technical guides | 512 tokens | Manual | Medium |
| **Uploaded docs** | PDF/Markdown | 512 tokens | On upload | Medium |
| **Live listings** | Database records | N/A (API call) | Real-time | Low |

### Chunking Strategy

```typescript
// Conceptual chunking configuration
const chunkConfig = {
  chunkSize: 512,          // tokens
  chunkOverlap: 64,        // tokens
  separators: ['\n## ', '\n### ', '\n\n', '\n', '. ', ' '],
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
}
```

### Hybrid Search Implementation

```sql
-- Conceptual hybrid search query
WITH vector_results AS (
  SELECT id, title, content, source_type,
         1 - (embedding <=> $query_embedding) AS score
  FROM chatbot_knowledge_base
  WHERE is_active = true
  ORDER BY embedding <=> $query_embedding
  LIMIT 20
),
fts_results AS (
  SELECT id, title, content, source_type,
         ts_rank(to_tsvector('english', content), plainto_tsquery('english', $query_text)) AS score
  FROM chatbot_knowledge_base
  WHERE is_active = true
    AND to_tsvector('english', content) @@ plainto_tsquery('english', $query_text)
  ORDER BY score DESC
  LIMIT 20
),
combined AS (
  SELECT id, title, content, source_type,
         COALESCE(v.score * 0.7, 0) + COALESCE(f.score * 0.3, 0) AS score
  FROM vector_results v
  FULL OUTER JOIN fts_results f USING (id)
)
SELECT * FROM combined
ORDER BY score DESC
LIMIT 5;
```

### Re-Ranking

For production, use a lightweight cross-encoder. For initial launch, use score fusion:

```
final_score = 0.7 × vector_similarity + 0.3 × fts_relevance + category_bonus
```

Where `category_bonus` adds +0.1 if the chunk's category matches the detected query intent.

### RAG Trigger Conditions

RAG is triggered when the query relates to:
- "How do I..." (procedural questions)
- Policy questions (fees, refunds, disputes)
- Help Center topics
- General marketplace questions

RAG is NOT triggered for:
- Listing search queries (handled by tools)
- Greetings / small talk (handled directly)
- Clarification requests

---

## 8. OpenAI Integration

### API Endpoint Design

```
POST /api/chat/stream       ← Main chat endpoint (SSE stream)
POST /api/chat/message      ← Non-streaming fallback
POST /api/chat/feedback     ← Submit thumbs up/down
GET  /api/chat/history      ← Fetch conversation history
DELETE /api/chat/conversation  ← Delete conversation
POST /api/chat/escalate     ← Escalate to human support
```

### Configuration

```typescript
// Conceptual configuration
const openAIConfig = {
  model: 'gpt-4o-mini',
  temperature: 0.3,           // Low for factual accuracy
  max_tokens: 1024,           // Per response
  stream: true,
  presence_penalty: 0.0,      // No penalty — stay on topic
  frequency_penalty: 0.3,     // Slight penalty to reduce repetition
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  maxHistoryTokens: 4096,     // Token budget for conversation history
  maxRagTokens: 2048,         // Token budget for RAG context
  maxToolTokens: 1024,        // Token budget for tool results
}
```

### Streaming Protocol (SSE)

```
Event: message
Data: {"type": "token", "content": "Based"}

Event: message
Data: {"type": "token", "content": " on"}

Event: message
Data: {"type": "token", "content": " your"}

Event: message
Data: {"type": "token", "content": " query..."}

Event: message
Data: {"type": "tool_call", "tool": "searchListings", "args": {"query": "phones", "maxPrice": 20000, "city": "Hyderabad"}}

Event: message
Data: {"type": "tool_result", "tool": "searchListings", "results": [
  {"id": "abc", "title": "iPhone 13", "price": 18000, ...}
]}

Event: message
Data: {"type": "listing_card", "listings": [{"id": "abc", ...}]}

Event: message
Data: {"type": "suggestions", "replies": ["Show me iPhones", "What about Samsung?", "Price filter"]}

Event: done
Data: {"type": "done", "messageId": "msg_123", "tokens": 342}
```

### Function/Tool Definitions

```typescript
// Conceptual tool definitions
const tools = [
  {
    type: 'function',
    function: {
      name: 'searchListings',
      description: 'Search for listings using natural language. Supports filtering by category, price range, location, condition, and keywords.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language search query' },
          category: { type: 'string', description: 'Category slug (e.g., "mobiles-tablets", "vehicles")', enum: categorySlugs },
          minPrice: { type: 'number' },
          maxPrice: { type: 'number' },
          location: { type: 'string', description: 'City or area name' },
          condition: { type: 'string', enum: ['new', 'used'] },
          sort: { type: 'string', enum: ['newest', 'price_asc', 'price_desc'] },
          limit: { type: 'number', default: 5 },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getListingDetail',
      description: 'Get detailed information about a specific listing by ID.',
      parameters: {
        type: 'object',
        properties: {
          listingId: { type: 'string', description: 'UUID of the listing' },
        },
        required: ['listingId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCategories',
      description: 'Get all available listing categories.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getSellerInfo',
      description: 'Get public information about a seller.',
      parameters: {
        type: 'object',
        properties: {
          sellerId: { type: 'string', description: 'UUID of the seller' },
        },
        required: ['sellerId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPolicies',
      description: 'Get information about ValClassifieds policies, fees, refunds, safety guidelines.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Policy topic (e.g., "listing fees", "refunds", "safety", "prohibited items")' },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalateToHuman',
      description: 'Escalate the conversation to a human support agent. Use when the user explicitly asks for human help or expresses frustration.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Reason for escalation' },
        },
        required: ['reason'],
      },
    },
  },
]
```

---

## 9. Tool Permission Matrix

### Permission Model

Every tool invocation passes through the PermissionChecker which validates:
1. **Role authorization** — Is this role allowed to call this tool?
2. **Input validation** — Are all required parameters present and valid?
3. **Rate limit check** — Has this conversation exceeded the tool's rate limit?
4. **Output filtering** — Is the response data appropriate for this role?

### Tool Permissions by Role

| Tool | Visitor | Buyer | Seller | Admin |
|------|---------|-------|--------|-------|
| **searchListings** | ✅ | ✅ | ✅ | ✅ |
| **getListingDetail** | ✅ | ✅ | ✅ | ✅ |
| **getCategories** | ✅ | ✅ | ✅ | ✅ |
| **getSellerInfo** | ✅ | ✅ | ✅ | ✅ |
| **getPolicies** | ✅ | ✅ | ✅ | ✅ |
| **escalateToHuman** | ✅ | ✅ | ✅ | ✅ |

### Tool Permission Specifications

#### T-01: searchListings

| Property | Value |
|----------|-------|
| **Allowed Roles** | Visitor, Buyer, Seller, Admin |
| **Input** | `query` (string, req), `category` (string, opt), `minPrice` (number, opt), `maxPrice` (number, opt), `location` (string, opt), `condition` (string, opt), `sort` (string, opt), `limit` (number, opt, default:5, max:10) |
| **Output** | `Listing[]` — title, price, location, condition, images, seller name, URL |
| **Failure Behaviour** | Return empty array with error message if DB query fails |
| **Timeout** | 5 seconds |
| **Retry Policy** | 1 retry after 1s delay |
| **Rate Limit** | 10 calls per conversation |
| **Data Visibility** | All roles see same listing data (public) |

#### T-02: getListingDetail

| Property | Value |
|----------|-------|
| **Allowed Roles** | Visitor, Buyer, Seller, Admin |
| **Input** | `listingId` (string, req, UUID format) |
| **Output** | Full `Listing` object — all fields including images, category, seller profile |
| **Failure Behaviour** | Return "Listing not found" if ID invalid or inactive |
| **Timeout** | 3 seconds |
| **Retry Policy** | 1 retry after 500ms |
| **Rate Limit** | 20 calls per conversation |
| **Data Visibility** | All roles see same listing detail (public) |

#### T-03: getCategories

| Property | Value |
|----------|-------|
| **Allowed Roles** | Visitor, Buyer, Seller, Admin |
| **Input** | None |
| **Output** | `Category[]` — name, slug, description, icon, listing count |
| **Failure Behaviour** | Return cached list if DB unavailable |
| **Timeout** | 2 seconds |
| **Retry Policy** | None (cache fallback) |
| **Rate Limit** | 5 calls per conversation |
| **Data Visibility** | All roles see same categories (public) |

#### T-04: getSellerInfo

| Property | Value |
|----------|-------|
| **Allowed Roles** | Visitor, Buyer, Seller, Admin |
| **Input** | `sellerId` (string, req, UUID format) |
| **Output** | Public profile — name, member_since, listing_count, response_rate, avatar URL. No contact info. |
| **Failure Behaviour** | Return "Seller not found" if ID invalid |
| **Timeout** | 3 seconds |
| **Retry Policy** | 1 retry after 500ms |
| **Rate Limit** | 15 calls per conversation |
| **Data Visibility** | All roles see same seller info (public). Admin additionally sees contact info. |

#### T-05: getPolicies

| Property | Value |
|----------|-------|
| **Allowed Roles** | Visitor, Buyer, Seller, Admin |
| **Input** | `topic` (string, req) — listing_fees, refunds, safety, prohibited_items, account, privacy, etc. |
| **Output** | Policy text with source citation |
| **Failure Behaviour** | Return "I don't have information on that specific policy" |
| **Timeout** | 3 seconds (includes RAG) |
| **Retry Policy** | 1 retry |
| **Rate Limit** | 10 calls per conversation |
| **Data Visibility** | Same public policies for all roles |

#### T-06: escalateToHuman

| Property | Value |
|----------|-------|
| **Allowed Roles** | Visitor, Buyer, Seller, Admin |
| **Input** | `reason` (string, req) |
| **Output** | Escalation confirmation with ticket ID and expected response time |
| **Failure Behaviour** | Log error, inform user escalation was received |
| **Timeout** | 3 seconds |
| **Retry Policy** | 1 retry |
| **Rate Limit** | 3 calls per conversation |
| **Data Visibility** | Escalation context shared with admin only |

### Admin-Only Tools

The following tools are restricted to admin role only:

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| **adminGetConversation** | Browse any conversation by ID | `conversationId` (UUID) | Full conversation with all messages |
| **adminListConversations** | List all conversations with filters | `status`, `dateFrom`, `dateTo`, `limit` | `Conversation[]` with metadata |
| **adminGetAnalytics** | Retrieve aggregated analytics | `metric`, `period` | Aggregated metric data |
| **adminGetFeedback** | View feedback reports | `dateFrom`, `dateTo`, `rating` | `Feedback[]` with context |
| **adminUpdateKnowledge** | Upload / re-index knowledge base content | `sourceType`, `content` | Confirmation with chunk count |
| **adminResolveEscalation** | Mark an escalation as resolved | `escalationId`, `note` | Updated escalation status |
| **adminGetCostReport** | View cost and token usage | `period` | Cost breakdown by time period |

### Permission Enforcement Flow

```
User message arrives
        │
        ▼
Orchestrator identifies required tool(s)
        │
        ▼
PermissionChecker.checkToolAccess(role, tool)
        │
        ├── Denied → Return permission error to LLM
        │             LLM responds: "I'm sorry, that feature is not available for your account type."
        │
        ├── Allowed → Proceed to ToolRouter
        │
        ▼
ToolRouter.validateArgs(args, schema)
        │
        ├── Invalid → Return validation error to LLM
        │
        ▼
ToolRouter.dispatchTool(tool, args)
        │
        ▼
PermissionChecker.checkDataVisibility(role, result)
        │
        ├── Strip fields not visible to role
        ▼
Return filtered result to LLM
```

---

## 10. Response Contracts

### Standard Response Types

Every chatbot response conforms to one of the following types. Each type has a defined JSON schema and rendering rules.

#### RT-01: Plain Text

```json
{
  "type": "text",
  "content": "Here are 5 phones under ₹20,000 in Hyderabad.",
  "format": "markdown"
}
```

**Rendering:** Simple text bubble. Supports basic markdown (bold, italic, lists, links).

---

#### RT-02: Listing Card

```json
{
  "type": "listing_card",
  "data": {
    "id": "abc-123",
    "title": "iPhone 13 128GB",
    "price": 45000,
    "currency": "INR",
    "location": "Hyderabad",
    "condition": "used",
    "imageUrl": "https://...",
    "isFeatured": false,
    "postedAt": "2026-07-06T10:00:00Z",
    "url": "/listings/abc-123"
  }
}
```

**Rendering:** Card with thumbnail image, title, price (₹), location, condition badge, "View Listing" link.

---

#### RT-03: Category Card

```json
{
  "type": "category_card",
  "data": {
    "slug": "mobiles-tablets",
    "name": "Mobiles & Tablets",
    "description": "Smartphones, tablets, accessories",
    "icon": "smartphone",
    "listingCount": 1234,
    "url": "/listings?category=mobiles-tablets"
  }
}
```

**Rendering:** Card with icon, category name, listing count, "Browse Category" link.

---

#### RT-04: Seller Card

```json
{
  "type": "seller_card",
  "data": {
    "id": "user-456",
    "name": "Priya S.",
    "avatarUrl": "https://...",
    "memberSince": "2024-01-15",
    "listingCount": 12,
    "responseRate": 98,
    "url": "/profile/user-456"
  }
}
```

**Rendering:** Card with avatar, name, member badge, listing count, response rate, "View Profile" link.

---

#### RT-05: Policy Card

```json
{
  "type": "policy_card",
  "data": {
    "topic": "listing_fees",
    "question": "Is it free to list on ValClassifieds?",
    "answer": "Yes! Basic listings are completely free. Featured/promoted listings have an optional fee starting at ₹99.",
    "source": "Help Center > Pricing",
    "sourceUrl": "/help/pricing"
  }
}
```

**Rendering:** Card with question, answer, source citation, "Read More" link.

---

#### RT-06: Carousel

```json
{
  "type": "carousel",
  "data": {
    "items": [
      { "type": "listing_card", "data": { ... } },
      { "type": "listing_card", "data": { ... } },
      { "type": "listing_card", "data": { ... } }
    ],
    "currentIndex": 0,
    "totalItems": 3
  }
}
```

**Rendering:** Horizontally scrollable card set with pagination dots. Left/right arrows or swipe.

---

#### RT-07: FAQ Card

```json
{
  "type": "faq_card",
  "data": {
    "question": "How do I reset my password?",
    "answer": "Go to Settings > Account > Change Password. Enter your current password, then your new password.",
    "category": "account",
    "helpful": true
  }
}
```

**Rendering:** Accordion-style Q&A with expandable answer. "Was this helpful?" prompt.

---

#### RT-08: Pagination

```json
{
  "type": "pagination",
  "data": {
    "page": 1,
    "totalPages": 5,
    "totalResults": 23,
    "items": [ ... ],
    "loadMoreLabel": "Show more results"
  }
}
```

**Rendering:** "Showing 1-5 of 23 results" + "Load More" button.

---

#### RT-09: Warning

```json
{
  "type": "warning",
  "data": {
    "severity": "info",
    "title": "Search limited to 5 results",
    "message": "I can show up to 5 listings at a time. Try narrowing your search for more precise results.",
    "action": { "label": "Narrow Search", "payload": { "filter": "refine" } }
  }
}
```

**Rendering:** Colored banner (info/yellow, warning/orange, error/red) with optional action button.

---

#### RT-10: Error

```json
{
  "type": "error",
  "data": {
    "code": "search_failed",
    "message": "I couldn't complete the search. Please try again.",
    "recoverable": true,
    "retryLabel": "Try Again"
  }
}
```

**Rendering:** Error banner with retry button if recoverable.

---

#### RT-11: Escalation

```json
{
  "type": "escalation",
  "data": {
    "ticketId": "TKT-789",
    "status": "created",
    "message": "I've created a support ticket. A team member will reach out within 2 hours.",
    "expectedResponseTime": "2 hours"
  }
}
```

**Rendering:** Confirmation card with ticket ID, status badge, expected response time.

---

#### RT-12: Typing

```json
{
  "type": "typing",
  "data": {
    "status": "thinking" | "searching" | "processing" | "typing",
    "label": "Searching listings..."
  }
}
```

**Rendering:** Animated dots + contextual label. Transitions to next state automatically.

---

#### RT-13: Loading

```json
{
  "type": "loading",
  "data": {
    "progress": 0.6,
    "stage": "Fetching listing details...",
    "showProgress": false
  }
}
```

**Rendering:** Skeleton placeholder or progress indicator. Used during multi-step operations.

---

#### RT-14: Empty State

```json
{
  "type": "empty_state",
  "data": {
    "icon": "search",
    "title": "No listings found",
    "message": "No listings matched your search for \"vintage camera under ₹5,000 in Delhi\".",
    "suggestions": [
      "Broaden your price range",
      "Try a different city",
      "Check the category"
    ],
    "actions": [
      { "label": "Try a New Search", "payload": { "action": "new_search" } },
      { "label": "Browse All Listings", "payload": { "action": "browse_all" } }
    ]
  }
}
```

**Rendering:** Icon + title + message + suggestion list + action buttons.

### Response Type Selection Rules

| Condition | Response Type |
|-----------|--------------|
| Simple informational reply | `text` |
| Single listing result | `listing_card` |
| Multiple listings (2-5) | `carousel` of `listing_card` |
| Category information | `category_card` |
| Seller information | `seller_card` |
| Policy or FAQ content | `policy_card` or `faq_card` |
| More results available | Append `pagination` |
| Non-critical notice | `warning` (info severity) |
| Operation failed | `error` |
| Human handoff confirmed | `escalation` |
| Waiting for processing | `typing` → `loading` |
| No results found | `empty_state` |

### Streaming Response Flow

```
User message → Orchestrator processes → OpenAI streams tokens
        │
        ├── First event: { type: "typing", data: { status: "thinking" } }
        │
        ├── While generating:
        │     { type: "token", content: "Here" }
        │     { type: "token", content: " are" }
        │     { type: "token", content: " the" }
        │
        ├── If tool called:
        │     { type: "typing", data: { status: "searching", label: "Searching listings..." } }
        │     { type: "tool_result", tool: "searchListings", ... }
        │
        ├── Final text tokens:
        │     { type: "token", content: " listings." }
        │
        ├── Rich content appended:
        │     { type: "carousel", data: { items: [...] } }
        │     { type: "suggestions", replies: ["Filter by price", "Show in Delhi"] }
        │
        └── Done:
              { type: "done", messageId: "msg_123", tokens: 342 }
```

---

## 11. Prompt Engineering Strategy

### System Prompt Template

```
You are ValBot, an AI assistant specialized exclusively in ValClassifieds — a classified marketplace platform.

## CORE RULES
1. ONLY answer questions about ValClassifieds: buying, selling, listings, categories, policies, help, account management.
2. If asked about anything outside this scope (general knowledge, coding, math, recipes, travel, homework, etc.), politely decline: "I'm specialized in helping with ValClassifieds marketplace questions. I can't assist with that request."
3. Be concise and helpful. Use bullet points for lists.
4. Cite sources when using knowledge base information. Format: [Source: FAQ/Policy/Help Center]
5. If you don't know something, say so honestly. Do not fabricate information.

## USER CONTEXT
- Role: {role}  ← visitor | buyer | seller | admin
- Name: {full_name}
- Account age: {member_since}
{additional_context}

## MARKETPLACE KNOWLEDGE
{rag_context}

## AVAILABLE ACTIONS
You can search listings, get listing details, browse categories, look up seller info, and check policies.
Use these when the user asks about specific items, sellers, or marketplace rules.

## TONE
- Professional but friendly
- Adapt detail level to user role (sellers get more selling-specific advice)
- Use Indian English conventions (₹ for currency, familiar local terms)
- For pricing questions, use "₹" symbol

## CURRENT PAGE CONTEXT
The user is currently on: {current_page}
Use this to provide contextually relevant suggestions.
```

### System Prompt Assembly

```typescript
// Conceptual prompt assembly
function buildSystemPrompt(context: ChatContext): string {
  const sections = [
    baseInstructions,
    roleSection(context.role, context.profile),
    ragSection(context.ragResults),
    pageContextSection(context.currentPage),
    conversationSummarySection(context.summaries),
    toolsAvailable,
  ]

  return sections.filter(Boolean).join('\n\n')
}
```

### Guardrail Implementation

Guardrails are enforced both in the prompt AND via a post-processing step:

1. **Prompt-level**: System prompt explicitly restricts scope
2. **Response-level**: After generation, check response against:
   - Regex patterns for out-of-scope topics
   - Blocked terms list
   - PII detection (phone numbers, emails in AI responses)
3. **If guardrail triggered**: Replace with: "I can only help with ValClassifieds marketplace questions. Let me know how I can help with buying, selling, or listings."

### Rejection Patterns

```typescript
const outOfScopePatterns = [
  /how to (code|program|write|build|deploy)/i,
  /recipe|ingredient|cook|bake/i,
  /math|equation|calculate|formula/i,
  /travel|flight|hotel|booking/i,
  /homework|assignment|exam|study/i,
  /crypto|bitcoin|stock|invest/i,
  /weather|news|sports|score/i,
  /medical|diagnose|symptom|treatment/i,
]
```

---

## 12. Context Management

### Context Window Budget

```
Total context window: 16,384 tokens (gpt-4o-mini)
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  System Prompt     Conversation        Tool Results
  3,000 tokens      History             + RAG Context
                    5,000 tokens         6,000 tokens
                                          │
                                    ┌─────┴─────┐
                                    ▼           ▼
                                RAG Context  Tool Results
                                3,000        3,000
                                tokens       tokens

                                  User Message
                                  1,384 tokens
                                  (reserved)
```

### History Truncation Strategy

```
Strategy: Sliding window with summarization

1. Keep last N messages (configurable, default 20)
2. If total history > 5,000 tokens:
   a. Keep last 6 messages in full
   b. Summarize earlier messages into a single compressed message
   c. Include: { user_intent, key_facts, resolved_questions }

Example truncation:
  Original: [msg1, msg2, msg3, msg4, msg5, msg6, msg7, msg8]
  Truncated: [summary(1-4), msg5, msg6, msg7, msg8]
```

### Conversation Summary

```typescript
// Conceptual — stored in chatbot_conversations.metadata
type ConversationSummary = {
  userIntent: string            // e.g., "Looking for budget smartphones"
  keyFacts: string[]            // e.g., ["Budget under ₹20,000", "Hyderabad location"]
  resolvedQuestions: string[]   // e.g., ["How to post a listing with photos"]
  unresolvedNeeds: string[]     // e.g., ["Compare iPhone vs Samsung"]
  lastTopic: string             // e.g., "listing creation help"
  productPreferences: { category: string; minPrice?: number; maxPrice?: number; location?: string }[]
}
```

---

## 13. Token Optimization

### Optimization Techniques

| Technique | Implementation | Estimated Savings |
|-----------|---------------|-------------------|
| **History truncation** | Sliding window + summarization | ~40% |
| **RAG chunk dedup** | Skip chunks already included | ~10% |
| **Tool result caching** | Cache listing search results (60s TTL) | ~15% |
| **Short responses** | System prompt: "Be concise" | ~20% |
| **Skip RAG for greeting** | Intent classification bypass | ~100% on greetings |
| **Batch embeddings** | Group multiple queries | ~50% on embedding calls |

### Token Budget Allocation

```typescript
const tokenBudget = {
  maxTotal: 16384,          // gpt-4o-mini context window
  allocation: {
    systemPrompt: 3000,     // Includes role context + instructions
    conversationHistory: 5000,  // Last messages + summary
    ragContext: 3000,       // Retrieved knowledge chunks
    toolResults: 3000,      // Listing search results + tool output
    userMessage: 1384,      // Current user input (reserved)
  },
  limits: {
    maxHistoryMessages: 20,
    maxRagChunks: 5,
    maxToolResults: 3,      // Max listing cards to include
    maxResponseTokens: 1024,
  },
}
```

---

## 14. Error Handling

### Error Categories

| Error Type | HTTP Code | Handling Strategy |
|-----------|-----------|-------------------|
| **Auth Error** | 401 | Return clear message: "Please sign in to continue this conversation." |
| **Rate Limited** | 429 | "You've reached the message limit. Please wait a moment before sending another message." |
| **OpenAI Timeout** | 502 | Fall back: "I'm having trouble connecting. Please try again in a moment." + retry with backoff |
| **OpenAI Invalid Response** | 502 | Log + return generic error, auto-retry once |
| **RAG Not Found** | 200 | Respond with general knowledge (no RAG context) |
| **Tool Execution Error** | 200 | Log error, respond: "I found some information but couldn't complete the search. Try rephrasing your question." |
| **Rate Limit (OpenAI)** | 429 | Exponential backoff, queue request |
| **Context Overflow** | 200 | Auto-truncate history, proceed |
| **Validation Error** | 400 | Return specific field errors |

### Retry Strategy

```typescript
const retryConfig = {
  maxRetries: 2,
  baseDelay: 1000,           // ms
  maxDelay: 5000,            // ms
  backoffFactor: 2,          // exponential
  retryableErrors: [
    'insufficient_quota',
    'rate_limit_exceeded',
    'internal_error',
    'timeout',
    'server_error',
  ],
}
```

### Client-Side Error Handling

```typescript
// Conceptual
function ChatProvider({ children }) {
  const [error, setError] = useState<ChatError | null>(null)

  const sendMessage = async (text: string) => {
    try {
      setError(null)
      // ... stream handling
    } catch (err) {
      if (err.status === 429) {
        setError({ type: 'rate_limit', message: 'Please wait before sending another message.' })
      } else if (err.status === 401) {
        setError({ type: 'auth', message: 'Please sign in to continue.' })
      } else {
        setError({ type: 'server', message: 'Something went wrong. Please try again.' })
      }
    }
  }

  return <ChatContext.Provider value={{ ...state, error, sendMessage }}>{children}</ChatContext.Provider>
}
```

---

## 15. Security

### Threat Model

| Threat | Impact | Mitigation |
|--------|--------|-----------|
| **API Key Leak** | Attacker uses OpenAI key | Key stored server-only; never sent to client. Rotated regularly. |
| **Prompt Injection** | Attacker bypasses guardrails | System prompt hardening + output scanning + rate limits. |
| **Data Exfiltration** | Attacker extracts knowledge base | RAG chunks are non-sensitive. No PII in vector store. |
| **JWT Forgery** | Impersonate other users | Use Supabase JWT validation. Short expiry (1h). |
| **Rate Limit Bypass** | Flood API, incur costs | Token bucket per user+IP. Global pool limit. |
| **Listing Data Scraping** | Bulk extract via chatbot | Limit tool results to 5 per call. Rate limit per session. |
| **PII in Conversation** | User shares sensitive data | Content filter on output. No PII stored in analytics. |

### Security Architecture

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────┐
│   Browser    │────>│   Vercel Edge/API    │────>│   OpenAI     │
│              │     │                      │     │              │
│  • Chat UI   │     │  • OpenAI API key    │     │  • API key   │
│  • JWT/sess  │     │    (env var)         │     │    (server)  │
│  • No API key│     │  • JWT validation    │     │              │
└──────────────┘     │  • Rate limiting     │     └──────────────┘
                     │  • Content filter    │
                     │  • Request logging   │
                     │  • CORS restricted   │
                     └──────────────────────┘
                               │
                     ┌─────────┴─────────┐
                     │     Supabase       │
                     │                    │
                     │  • RLS policies    │
                     │  • Encrypted at    │
                     │    rest            │
                     │  • pgvector        │
                     └────────────────────┘
```

### Data Privacy

- **Conversation data**: Stored in Supabase with RLS. Users can only access their own conversations.
- **Visitor sessions**: No PII stored for anonymous visitors. Session ID is an anonymous UUID.
- **Knowledge base**: Contains only public information (FAQs, policies, help articles). No personal data.
- **Analytics**: Aggregated, anonymized. No conversation content in analytics events.
- **OpenAI data**: API calls to OpenAI do NOT have data retention enabled (opt out via `require: false` in org settings).

### RLS Policies (Conceptual)

```sql
-- chatbot_conversations: users see their own
CREATE POLICY "Users can view own conversations"
  ON chatbot_conversations FOR SELECT
  USING (user_id = auth.uid() OR (session_id = current_setting('app.session_id') AND user_id IS NULL));

-- chatbot_messages: within visible conversations
CREATE POLICY "Users can view messages in their conversations"
  ON chatbot_messages FOR SELECT
  USING (conversation_id IN (SELECT id FROM chatbot_conversations WHERE user_id = auth.uid() OR session_id = current_setting('app.session_id')));
```

---

## 16. Rate Limiting

### Rate Limit Tiers

| Tier | Limit | Applied To | Window |
|------|-------|-----------|--------|
| **Global** | 1,000 requests/min | All sessions | 1 minute |
| **Per User (logged-in)** | 30 requests/min | user_id | 1 minute |
| **Per Visitor (anonymous)** | 10 requests/min | session_id | 1 minute |
| **Per IP** | 60 requests/min | IP address | 1 minute |
| **OpenAI Token** | 100,000 tokens/min | API key | 1 minute |
| **Concurrent** | 5 concurrent streams | user_id | — |

### Implementation

```typescript
// Conceptual — token bucket algorithm
const rateLimiters = {
  global: new TokenBucket({ capacity: 1000, refillRate: 1000, refillInterval: 60000 }),
  perUser: new TokenBucket({ capacity: 30, refillRate: 30, refillInterval: 60000 }),
  perVisitor: new TokenBucket({ capacity: 10, refillRate: 10, refillInterval: 60000 }),
  perIP: new TokenBucket({ capacity: 60, refillRate: 60, refillInterval: 60000 }),
}

function checkRateLimit(context: RequestContext): RateLimitResult {
  if (!rateLimiters.global.tryConsume()) return { allowed: false, retryAfter: 5000 }
  if (context.userId && !rateLimiters.perUser.tryConsume(context.userId)) {
    return { allowed: false, retryAfter: 2000 }
  }
  if (!context.userId && context.sessionId && !rateLimiters.perVisitor.tryConsume(context.sessionId)) {
    return { allowed: false, retryAfter: 6000 }
  }
  // ... per IP check
  return { allowed: true }
}
```

### Rate Limit Headers

Every response includes:

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1680883200
Retry-After: 2
```

---

## 17. Cost Optimization

### Estimated Monthly Costs

| Component | Volume (est.) | Unit Cost | Monthly Cost |
|-----------|--------------|-----------|-------------|
| **GPT-4o-mini** (input) | 500K messages × 2K tokens | $0.15/1M tokens | ~$150 |
| **GPT-4o-mini** (output) | 500K messages × 500 tokens | $0.60/1M tokens | ~$150 |
| **Embeddings** (text-embedding-3-small) | 10K queries × 100 tokens | $0.02/1M tokens | ~$0.02 |
| **Supabase pgvector** | 10GB vector storage | Included in Pro plan | $0 |
| **Vercel Serverless** | 1M invocations × 5s avg | $0.60/1M invocations | ~$3 |
| **Total Estimated** | | | **~$303/month** |

### Cost Reduction Strategies

| Strategy | Implementation | Savings |
|----------|---------------|---------|
| **Caching** | Cache common Q&A responses (60s TTL) | ~20% |
| **Short responses** | `max_tokens: 1024`, concise prompt | ~30% |
| **Skip RAG for known patterns** | Intent-based routing | ~15% |
| **Model tiering** | Use gpt-4o-mini for 90%, gpt-4o for 10% (complex) | ~40% vs gpt-4o |
| **Conversation timeout** | Auto-archive inactive conversations (>1h) | ~5% |
| **Batch embeddings** | Cache recent embeddings | ~80% on embedding costs |

### Model Tiering Strategy

```
                    ┌──────────────────────┐
                    │   Query Classifier   │
                    │   (simple heuristic) │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
     ┌────────────────┐ ┌──────────────┐ ┌──────────────┐
     │ Simple Query   │ │ Complex Query │ │ Listing      │
     │ (greeting,     │ │ (multi-step,  │ │ Search       │
     │  policy lookup)│ │  comparison)  │ │ (tool-heavy) │
     └────────┬───────┘ └──────┬───────┘ └──────┬───────┘
              │                │                 │
              ▼                ▼                 ▼
     ┌────────────────┐ ┌──────────────┐ ┌──────────────┐
     │ gpt-4o-mini    │ │ gpt-4o       │ │ gpt-4o-mini  │
     │ (cheap, fast)  │ │ (smart,      │ │ + tool calls │
     │                │ │  expensive)  │ │              │
     └────────────────┘ └──────────────┘ └──────────────┘

     Ratio: ~90%         ~5%              ~5%
```

---

## 18. Caching

### Cache Layers

| Cache | Key | TTL | Storage | Size |
|-------|-----|-----|---------|------|
| **RAG Embeddings** | `emb:{query_hash}` | 1 hour | In-memory (Map) | 1,000 entries |
| **Tool Results** | `tool:{name}:{hash(args)}` | 60 seconds | In-memory (Map) | 500 entries |
| **Category List** | `categories` | 5 minutes | In-memory | 1 entry |
| **FAQ Responses** | `faq:{query_hash}` | 1 hour | In-memory (Map) | 500 entries |
| **Session State** | `session:{session_id}` | Session | Supabase | Per session |

### Cache Invalidation

```
RAG Embeddings:    TTL expiry only (1h)
Tool Results:      TTL expiry (60s) + manual on listing change
Category List:     TTL expiry (5min) + admin trigger
FAQ Responses:     TTL expiry (1h) + content update trigger
Session State:     On logout / session expiry
```

---

## 19. Conversation Storage

### Storage Strategy

```
┌─────────────────────────────────────────────┐
│          chatbot_conversations               │
│  id (PK)                                     │
│  user_id / session_id                        │
│  title (auto-generated from first message)   │
│  status: active | archived | escalated       │
│  metadata: { summary, preferences, intents } │
└──────────────┬──────────────────────────────┘
               │ 1
               │ N
┌─────────────────────────────────────────────┐
│           chatbot_messages                   │
│  id (PK)                                     │
│  conversation_id (FK)                        │
│  role: user | assistant | system | tool      │
│  content (message text)                      │
│  tool_calls (JSONB — function call data)     │
│  source_chunks (UUID[] — RAG citations)      │
│  tokens (token count for this message)       │
│  created_at                                   │
└─────────────────────────────────────────────┘
```

### Data Lifecycle

```
Conversation Created (active)
        │
        │ user activity
        ▼
     active ─────────────────────────────────┐
        │                                    │
        │ 24h no activity                    │  user explicitly archives
        ▼                                    ▼
     archived                            archived
        │                                    │
        │ 90 days (logged-in)                │
        │ 24 hours (visitor)                 │
        ▼                                    ▼
     auto-deleted (purging PII)              │
        │                                    │
        ▼                                    ▼
   Aggregated analytics only           retention complete
```

---

## 20. Admin Monitoring

### Admin Dashboard Metrics

| Metric | Source | Refresh |
|--------|--------|---------|
| Active conversations (now) | chatbot_conversations | Real-time |
| Messages today | chatbot_messages | 5 min |
| Avg response time | chatbot_messages | 5 min |
| User satisfaction rate | chatbot_feedback | 1 hour |
| Escalation rate | chatbot_escalations | 1 hour |
| Token usage | chatbot_messages | 1 hour |
| Cost per conversation | derived | 1 hour |
| Top user intents | chatbot_messages (NLU) | 1 day |
| Error rate | logs | 5 min |
| Rate limit hits | logs | 5 min |
| RAG performance | chatbot_messages (source_chunks) | 1 hour |
| Model breakdown | chatbot_messages | 1 hour |

### Monitoring API

```
GET  /api/admin/chatbot/stats            ← Dashboard summary
GET  /api/admin/chatbot/conversations    ← Browse conversations
GET  /api/admin/chatbot/conversation/:id ← Full conversation detail
GET  /api/admin/chatbot/feedback         ← Feedback report
GET  /api/admin/chatbot/escalations      ← Open escalations
PATCH /api/admin/chatbot/escalation/:id  ← Resolve escalation
POST /api/admin/chatbot/knowledge        ← Upload/re-index knowledge
GET  /api/admin/chatbot/analytics        ← Raw analytics
```

### Admin Alert Conditions

```
- Escalation rate > 10% in 1 hour
- Error rate > 5% in 5 minutes
- User satisfaction < 70% in 1 day
- Cost spike > 2x daily average
- OpenAI rate limit warnings
- Knowledge base sync failures
```

---

## 21. Analytics

### Events Tracked

| Event | Trigger | Properties |
|-------|---------|-----------|
| `conversation_started` | Widget opened, new conv | role, source_page, session_type |
| `message_sent` | User sends message | conversation_id, message_length, has_listing_context |
| `ai_response` | AI completes response | tokens_used, latency_ms, has_rag, has_tool_calls |
| `tool_called` | Tool function invoked | tool_name, success, result_count |
| `listing_viewed` | Listing card clicked | listing_id, position_in_results |
| `feedback_received` | Thumbs up/down | rating, category |
| `escalation_requested` | Escalation triggered | reason, previous_messages_count |
| `session_timeout` | Visitor session expired | conversation_length, last_activity_age |
| `error_occurred` | Any error | error_type, error_message, recoverable |

### Analytics Schema

```sql
-- chatbot_analytics_events (designed above)
-- Queried via:
--   Time-series: event_type + created_at
--   User-centric: user_id + event_type
--   Session: session_id + event_type
```

### Dashboard Queries

```sql
-- Daily active users
SELECT DATE(created_at) as day, COUNT(DISTINCT user_id) as dau
FROM chatbot_conversations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY day;

-- User satisfaction rate
SELECT
  DATE(cf.created_at) as day,
  COUNT(*) FILTER (WHERE cf.rating = 2) as thumbs_up,
  COUNT(*) FILTER (WHERE cf.rating = 1) as thumbs_down,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cf.rating = 2) / COUNT(*), 1) as satisfaction_pct
FROM chatbot_feedback cf
WHERE cf.created_at > NOW() - INTERVAL '30 days'
GROUP BY day;

-- Top intents (by tool usage)
SELECT tool_name, COUNT(*) as usage_count
FROM chatbot_messages cm
WHERE cm.role = 'tool' AND cm.created_at > NOW() - INTERVAL '7 days'
GROUP BY tool_name
ORDER BY usage_count DESC;

-- Token usage trends
SELECT
  DATE(created_at) as day,
  SUM(tokens) as total_tokens,
  AVG(tokens) as avg_tokens_per_message
FROM chatbot_messages
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY day;
```

---

## 22. Observability

### Monitored Metrics

| Metric | Source | Granularity | Alert Threshold |
|--------|--------|-------------|-----------------|
| **Prompt tokens** | OpenAI API response | Per message | >3000 tokens |
| **Completion tokens** | OpenAI API response | Per message | >800 tokens |
| **Total tokens** | Sum of prompt + completion | Per conversation | Budget threshold |
| **Estimated cost** | tokens × model rate | Per message, daily | >$20/day |
| **OpenAI latency** | Time from request to first token | Per message | >3s P95 |
| **Tool execution time** | Per-tool handler duration | Per call | >2s |
| **RAG retrieval time** | Embed + search + rerank | Per query | >500ms |
| **Conversation duration** | First message to last | Per conversation | >30m |
| **User feedback** | Thumbs up/down + category | Per message | <70% satisfaction |
| **Errors** | All error types (auth, timeout, parse, etc.) | Per event | >5% error rate |
| **Retry count** | Number of retries per operation | Per operation | >2 retries |
| **Hallucination detection** | Response vs source consistency check | Per response | Any detection |
| **Cache hit ratio** | Cache hits / total lookups | Per minute | <0.5 ratio |

### Observability Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   Observability Pipeline                      │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │  AI         │   │  Cost        │   │  Analytics       │  │
│  │  Orchestrator──►│  Tracker     ──►│  Logger          │  │
│  └─────────────┘   └──────────────┘   └────────┬─────────┘  │
│                                                 │            │
│                    ┌────────────────────────────┼──────────┐ │
│                    │            ▼               ▼          │ │
│                    │  ┌──────────────┐  ┌──────────────┐   │ │
│                    │  │  chatbot_   │  │  chatbot_    │   │ │
│                    │  │  analytics_ │  │  feedback    │   │ │
│                    │  │  events     │  │              │   │ │
│                    │  └──────────────┘  └──────────────┘   │ │
│                    │  ┌──────────────────────────────────┐  │ │
│                    │  │  Logs (Vercel / custom)          │  │ │
│                    │  └──────────────────────────────────┘  │ │
│                    └────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Cost Tracking

```typescript
// Conceptual cost tracking per message
type CostRecord = {
  model: 'gpt-4o-mini' | 'gpt-4o' | 'text-embedding-3-small'
  promptTokens: number
  completionTokens: number
  estimatedCostUsd: number
  latencyMs: number
  timestamp: string
  conversationId: string
  userId?: string
}

function estimateCost(record: CostRecord): number {
  const rates = {
    'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
    'gpt-4o': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
    'text-embedding-3-small': { input: 0.02 / 1_000_000, output: 0 },
  }
  const rate = rates[record.model]
  return (record.promptTokens * rate.input) + (record.completionTokens * rate.output)
}
```

### Hallucination Detection

```typescript
// Conceptual — post-generation consistency check
function detectHallucination(
  response: string,
  ragContext: string[],
  toolResults: ToolResult[]
): { hallucinated: boolean; confidence: number; details?: string } {
  // Check 1: Does response contradict RAG context?
  const contradictsContext = checkContradiction(response, ragContext)

  // Check 2: Does response cite a source that doesn't exist?
  const invalidCitations = findInvalidCitations(response, ragContext)

  // Check 3: Does response fabricate listing data?
  const fabricatedData = checkAgainstToolResults(response, toolResults)

  // Check 4: Does response claim capabilities it doesn't have?
  const falseCapabilities = checkClaimedCapabilities(response)

  return {
    hallucinated: contradictsContext || invalidCitations.length > 0 || fabricatedData || falseCapabilities,
    confidence: calculateConfidence(contradictsContext, invalidCitations, fabricatedData, falseCapabilities),
    details: [...contradictsContext, ...invalidCitations].join('; '),
  }
}
```

### Logging Specification

| Event | Log Level | Payload | Retention |
|-------|-----------|---------|-----------|
| Conversation started | info | conversationId, role, sourcePage | 90 days |
| Message received | info | conversationId, messageLength, role | 90 days |
| AI response sent | info | conversationId, tokens, latency, model | 90 days |
| Tool called | debug | toolName, args, duration | 30 days |
| Tool succeeded | debug | toolName, resultCount | 30 days |
| Tool failed | warn | toolName, error, args | 90 days |
| Rate limit hit | warn | userId/sessionId, limit, retryAfter | 90 days |
| Auth failure | warn | reason, userId/sessionId | 90 days |
| OpenAI error | error | errorType, statusCode, retryCount | 90 days |
| Hallucination detected | critical | conversationId, response, confidence | 180 days |
| Budget exceeded | critical | currentCost, limit | 180 days |
| Escalation created | info | ticketId, reason, conversationId | 90 days |
| Cache hit/miss | debug | cacheKey, hit, ttl | 7 days |

### Admin Alerting Rules

```typescript
const alertRules = [
  {
    id: 'high-error-rate',
    condition: (stats: Metrics) => stats.errorRate > 0.05,  // >5%
    window: '5m',
    severity: 'critical',
    channels: ['slack', 'email'],
  },
  {
    id: 'cost-spike',
    condition: (stats: Metrics) => stats.hourlyCost > 10,  // >$10/hour
    window: '1h',
    severity: 'warning',
    channels: ['slack'],
  },
  {
    id: 'low-satisfaction',
    condition: (stats: Metrics) => stats.satisfactionRate < 0.70,
    window: '1d',
    severity: 'warning',
    channels: ['email'],
  },
  {
    id: 'high-escalation',
    condition: (stats: Metrics) => stats.escalationRate > 0.10,
    window: '1h',
    severity: 'warning',
    channels: ['slack'],
  },
  {
    id: 'rag-degradation',
    condition: (stats: Metrics) => stats.ragLatencyP95 > 2000,  // >2s
    window: '5m',
    severity: 'warning',
    channels: ['slack'],
  },
]
```

### Dashboard Widgets

| Widget | Metric | Chart Type | Refresh |
|--------|--------|-----------|---------|
| Active conversations | Current count | Stat card | Real-time |
| Messages today | Total count | Stat card | 1 min |
| Satisfaction rate | % thumbs up | Gauge | 5 min |
| Token usage | Tokens per hour | Line chart (24h) | 5 min |
| Estimated cost | $ per hour | Line chart (24h) | 5 min |
| OpenAI latency | P50/P95/P99 | Multi-line chart | 1 min |
| Tool latency | Per-tool averages | Bar chart | 5 min |
| Error rate | % of requests | Area chart | 1 min |
| Cache hit ratio | % of cache hits | Gauge | 5 min |
| Top tools | Usage count | Horizontal bar | 1 hour |
| User feedback breakdown | Thumbs up/down by category | Stacked bar | 1 hour |
| Hallucination alerts | Count per day | Timeline | Real-time |

---

## 23. Future Expansion

### Phase 2 — Enhanced Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Image understanding** | User uploads a photo of an item; AI describes it, suggests category, estimates price range | High |
| **Voice interface** | Speech-to-text input via Web Speech API + AI response | Medium |
| **Proactive tips** | Based on user behavior: "We noticed you viewed 5 listings — would you like help comparing them?" | Medium |
| **Multi-language** | Auto-detect and respond in Hindi, Tamil, Telugu, etc. | High |
| **Listing suggestions** | "Based on your conversation, you might like these listings..." | Medium |

### Phase 3 — Advanced AI

| Feature | Description | Priority |
|---------|-------------|----------|
| **Fine-tuned model** | Train a small model on ValClassifieds conversation history | Low |
| **Multi-turn listing search** | Refine search across multiple turns ("Show phones" → "Under 20K" → "In Hyderabad" → "With good camera") | High |
| **Price prediction** | "What's a fair price for a 2020 iPhone 11 with 64GB?" | Medium |
| **Sentiment analysis** | Detect frustrated users and proactively offer escalation | Medium |
| **A/B testing framework** | Compare model versions, prompt variations, RAG strategies | Low |

### Phase 4 — Platform Expansion

| Feature | Description | Priority |
|---------|-------------|----------|
| **WhatsApp integration** | Chat via WhatsApp Business API | Medium |
| **Email support** | Conversation summaries emailed on request | Low |
| **Chatbot-to-human handoff** | Seamless handoff to support team with full context | High |
| **Knowledge base auto-update** | Auto-generate FAQs from new support tickets | Low |
| **Seller assistant** | Dedicated AI for sellers: pricing, timing, listing optimization | Medium |

### Expansion Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Cost overrun** | Medium | High | Strict token budgets, caching, model tiering |
| **User dissatisfaction** | Low | High | Feedback loop, continuous improvement |
| **Model drift** | Medium | Medium | Regular prompt evaluation, A/B testing |
| **Data privacy violation** | Low | Critical | PII filtering, data retention, audit logging |
| **Vendor lock-in (OpenAI)** | Medium | Medium | Provider-agnostic adapter architecture |

---

## Appendix A: Folder Structure

```
src/
├── features/
│   └── chatbot/                    ← New AI Chatbot feature
│       ├── index.ts                 ← Public exports
│       ├── types.ts                 ← Chatbot-specific types
│       ├── constants.ts             ← Config, limits, prompts
│       ├── components/
│       │   ├── ChatWidget.tsx        ← Root widget (floating button + panel)
│       │   ├── ChatToggle.tsx        ← Floating action button
│       │   ├── ChatPanel.tsx         ← Main panel (header + messages + input)
│       │   ├── ChatHeader.tsx        ← Title, status, close, menu
│       │   ├── ChatMessages.tsx      ← Scrollable message container
│       │   ├── WelcomeMessage.tsx    ← First-visit greeting
│       │   ├── MessageBubble.tsx     ← User message bubble
│       │   ├── AssistantBubble.tsx   ← AI message with streaming support
│       │   ├── ListingCard.tsx       ← Interactive listing result
│       │   ├── SuggestedReplies.tsx  ← Quick reply chips
│       │   ├── SourcesDropdown.tsx   ← RAG citations
│       │   ├── TypingIndicator.tsx   ← "..." animation
│       │   ├── ChatInput.tsx         ← Textarea + send button
│       │   └── QuickActions.tsx      ← Role-based action buttons
│       ├── hooks/
│       │   ├── useChat.ts            ← Core chat logic (send, receive, state)
│       │   ├── useChatAuth.ts        ← Auth-aware session management
│       │   ├── useChatHistory.ts     ← Load conversation history
│       │   └── useSSE.ts             ← Server-Sent Events stream hook
│       ├── services/
│       │   ├── chatApi.ts            ← HTTP client for /api/chat/*
│       │   ├── chatStream.ts         ← SSE stream parser
│       │   └── chatCache.ts          ← Local cache for tool results
│       └── contexts/
│           └── ChatProvider.tsx       ← React context for chat state

api/
├── chat.mjs                          ← Main chat handler (Vercel)
├── chat/
│   ├── stream.mjs                    ← SSE streaming endpoint
│   ├── message.mjs                   ← Non-streaming fallback
│   ├── history.mjs                   ← Fetch conversation history
│   └── feedback.mjs                  ← Submit feedback

services/                             ← New shared services (server-side)
├── conversation/
│   ├── conversationManager.mjs       ← Session + message persistence
│   ├── sessionStore.mjs              ← Visitor + logged-in session mgmt
│   └── messageStore.mjs              ← Message CRUD
├── orchestrator/
│   ├── orchestrator.mjs              ← AI Orchestrator — single entry point
│   ├── promptBuilder.mjs             ← System/user/tool prompt assembly
│   ├── contextBuilder.mjs            ← Role, page, history, RAG injection
│   ├── toolRouter.mjs                ← Tool call parsing, dispatch, validation
│   ├── permissionChecker.mjs         ← Role-based tool + data access control
│   ├── responseValidator.mjs         ← Guardrail, hallucination, PII checks
│   ├── costTracker.mjs               ← Token counting + cost estimation
│   └── analyticsLogger.mjs           ← Structured event + latency logging
├── ai/
│   ├── openaiAdapter.mjs             ← OpenAI API calls (chat + embed)
│   └── aiProvider.mjs                ← Provider-agnostic interface
├── rag/
│   ├── ragEngine.mjs                 ← Hybrid search pipeline
│   ├── chunker.mjs                   ← Document chunking
│   ├── embedder.mjs                  ← Embedding generation
│   └── reranker.mjs                  ← Result re-ranking
├── tools/
│   ├── searchListings.mjs            ← Listing search handler
│   ├── getListingDetail.mjs          ← Single listing detail handler
│   ├── getCategories.mjs             ← Category list handler
│   ├── getSellerInfo.mjs             ← Seller profile handler
│   ├── getPolicies.mjs               ← Policy lookup handler
│   └── escalateToHuman.mjs           ← Escalation handler
├── security/
│   ├── rateLimiter.mjs               ← Token bucket rate limiting
│   └── contentFilter.mjs             ← Guardrail enforcement
├── knowledge/
│   └── knowledgeBase.mjs             ← KB CRUD + admin operations
└── monitoring/
    ├── costTracker.mjs               ← Cost tracking + budget alerts
    ├── latencyMonitor.mjs            ← Per-component timing
    └── alertManager.mjs              ← Alert rule evaluation + dispatch

supabase/
└── migrations/
    └── 00020_chatbot.sql             ← New tables + indexes + RLS
```

## Appendix B: API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chat/stream` | JWT/Session | Send message, receive SSE stream |
| POST | `/api/chat/message` | JWT/Session | Send message, receive JSON response |
| GET | `/api/chat/conversations` | JWT/Session | List user's conversations |
| GET | `/api/chat/conversation/:id` | JWT/Session | Get conversation history |
| DELETE | `/api/chat/conversation/:id` | JWT/Session | Delete conversation |
| POST | `/api/chat/feedback` | JWT/Session | Submit thumbs up/down |
| POST | `/api/chat/escalate` | JWT/Session | Escalate to human support |
| GET | `/api/admin/chatbot/stats` | Admin | Dashboard metrics |
| GET | `/api/admin/chatbot/conversations` | Admin | Browse all conversations |
| GET | `/api/admin/chatbot/feedback` | Admin | Feedback report |
| POST | `/api/admin/chatbot/knowledge` | Admin | Upload/re-index knowledge |

## Appendix C: Development Roadmap

### Phase 1A — Foundation: UI & Infrastructure (Weeks 1-2)
- [x] Architecture design (this document)
- [ ] Chat widget UI (floating button + panel, conversation UI)
- [ ] Floating launcher + chat window
- [ ] Session management (visitor + logged-in)
- [ ] Conversation persistence (DB + API contract)
- [ ] Streaming response infrastructure (SSE scaffolding)
- [ ] Authentication awareness (detect role, pass context)
- [ ] Error handling + loading states + typing indicator
- [ ] Unit & integration tests for UI layer
- [ ] Basic API contract (endpoints defined, no AI yet)

**Go/No-Go Gate:** Chat widget renders, sends messages, receives mock SSE stream, persists conversations.

### Phase 1B — AI Engine (Weeks 2-3)
- [ ] OpenAI integration (adapter + streaming)
- [ ] AI Orchestrator (PromptBuilder, ContextBuilder, ToolRouter, PermissionChecker)
- [ ] RAG pipeline (embedding + vector search)
- [ ] Response Validator (guardrails, hallucination check, PII filter)
- [ ] Cost Tracker (token usage, cost estimation)
- [ ] Analytics Logger (structured events, latency tracking)
- [ ] Conversation Manager (context injection, history truncation)
- [ ] Token management + budget enforcement
- [ ] AI analytics pipeline

**Go/No-Go Gate:** End-to-end AI conversation working with streaming, RAG, and tool calls.

### Phase 2 — Core Experience (Weeks 3-4)
- [ ] System prompt engineering + guardrails
- [ ] Tool definitions (searchListings, getCategories, etc.)
- [ ] Listing card rendering in chat
- [ ] Suggested replies
- [ ] Conversation memory (cross-session for logged-in users)
- [ ] Token budget management + history truncation

### Phase 3 — Production Hardening (Weeks 5-6)
- [ ] Rate limiting (user + visitor + global tiers)
- [ ] Error handling + retry logic
- [ ] Admin monitoring dashboard
- [ ] Feedback collection + analytics
- [ ] Escalation workflow
- [ ] Comprehensive testing (unit + integration + E2E)

### Phase 4 — Launch (Week 7)
- [ ] Performance optimization
- [ ] Cost monitoring
- [ ] Gradual rollout (5% → 25% → 100%)
- [ ] User documentation
- [ ] Launch monitoring

## Appendix D: Cost-Benefit Analysis

### Estimated Development Effort

| Component | Developer-Days | Complexity |
|-----------|---------------|------------|
| Database schema + migrations | 2 | Low |
| RAG pipeline | 5 | Medium |
| OpenAI integration | 3 | Medium |
| Chat API (serverless) | 5 | High |
| Chat widget UI | 5 | Medium |
| Prompt engineering | 3 | Medium |
| Security + rate limiting | 2 | Medium |
| Admin dashboard | 3 | Medium |
| Testing | 4 | Medium |
| Documentation | 2 | Low |
| **Total** | **34** | |

### ROI Projections

| Metric | Without Chatbot | With Chatbot | Impact |
|--------|---------------|-------------|--------|
| User support tickets | 500/month | 200/month | -60% |
| Avg support response time | 24 hours | Instant | Near 100% reduction |
| Listing search conversion | 3% | 5% (est.) | +67% |
| User engagement (sessions/user) | 4/month | 6/month (est.) | +50% |
| Bounce rate | 45% | 35% (est.) | -22% |
| Support team cost | $5,000/month | $2,000/month | -60% |

### Break-Even Analysis

```
Monthly chatbot cost: ~$303
Support cost savings: ~$3,000/month
Net monthly savings: ~$2,697
Break-even on development: ~1 month
```

---

> **Document Version:** 1.1  
> **AI Model:** OpenAI GPT-4o-mini (primary), text-embedding-3-small (embeddings)  
> **Vector Store:** Supabase pgvector  
> **RAG Approach:** Hybrid search (vector 0.7 + FTS 0.3) with re-ranking  
> **Architecture Pattern:** AI Orchestrator — single entry point with Conversation Manager → Orchestrator → OpenAI Adapter  
> **Key Components:** PromptBuilder, ContextBuilder, ToolRouter, PermissionChecker, ResponseValidator, CostTracker, AnalyticsLogger  
> **Estimated Monthly Cost:** ~$303 at 500K messages/month  
> **Estimated Development:** ~54 developer-days (7 weeks to MVP launch)
