-- ValBot AI Chatbot — Phase 1A: Conversation Storage
-- Adds chatbot_conversations and chatbot_messages tables
-- No RAG, no vector, no embeddings — pure conversation persistence

-- ── Chatbot Conversations ──────────────────────────────────────────────

CREATE TABLE chatbot_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id      TEXT,
  role            TEXT NOT NULL DEFAULT 'visitor',
  title           TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  message_count   INTEGER DEFAULT 0,
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

-- ── Chatbot Messages ──────────────────────────────────────────────────

CREATE TABLE chatbot_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  role              TEXT NOT NULL,
  content           TEXT,
  tool_calls        JSONB DEFAULT NULL,
  tool_call_id      TEXT,
  tool_name         TEXT,
  source_chunks     UUID[],
  tokens            INTEGER DEFAULT 0,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system', 'tool'))
);

CREATE INDEX idx_cm_conversation_id ON chatbot_messages(conversation_id, created_at);
CREATE INDEX idx_cm_created_at ON chatbot_messages(created_at DESC);

-- ── RLS Policies ──────────────────────────────────────────────────────

ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
CREATE POLICY "Users can view own chatbot conversations"
  ON chatbot_conversations FOR SELECT
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND session_id = current_setting('app.session_id', TRUE))
  );

-- Users can create conversations
CREATE POLICY "Users can create chatbot conversations"
  ON chatbot_conversations FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() AND user_id IS NOT NULL)
    OR (user_id IS NULL AND session_id IS NOT NULL)
  );

-- Users can update their own conversations
CREATE POLICY "Users can update own chatbot conversations"
  ON chatbot_conversations FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their chatbot conversations"
  ON chatbot_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM chatbot_conversations
      WHERE user_id = auth.uid()
         OR (user_id IS NULL AND session_id = current_setting('app.session_id', TRUE))
    )
  );

-- Users can insert messages into their conversations
CREATE POLICY "Users can insert messages into their chatbot conversations"
  ON chatbot_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM chatbot_conversations
      WHERE user_id = auth.uid()
         OR (user_id IS NULL AND session_id IS NOT NULL)
    )
  );
