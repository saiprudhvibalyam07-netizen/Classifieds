-- ValBot Chatbot — RLS fix for anonymous conversations
--
-- Root cause of "Starting conversation..." hang:
-- The anonymous INSERT/SELECT policies referenced
-- current_setting('app.session_id'), which is set by set_chatbot_session()
-- using set_config(..., true) — transaction-local. Because Supabase's HTTP
-- API serves each request on a separate connection/transaction, that setting
-- is gone by the time the next query runs, so the policy never matched and
-- the anonymous INSERT was rejected with "42501 row-level security policy".
--
-- This migration recreates the conversation/message policies using the
-- session_id COLUMN directly (unguessable random UUID), which works across
-- stateless HTTP requests without relying on a per-request GUC.

-- ── Conversations ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own chatbot conversations" ON chatbot_conversations;
DROP POLICY IF EXISTS "Users can create chatbot conversations" ON chatbot_conversations;
DROP POLICY IF EXISTS "Users can update own chatbot conversations" ON chatbot_conversations;

CREATE POLICY "Users can view own chatbot conversations"
  ON chatbot_conversations FOR SELECT
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can create chatbot conversations"
  ON chatbot_conversations FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() AND user_id IS NOT NULL)
    OR (user_id IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can update own chatbot conversations"
  ON chatbot_conversations FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Messages ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON chatbot_messages;
DROP POLICY IF EXISTS "Users can insert messages into their conversations" ON chatbot_messages;

CREATE POLICY "Users can view messages in their conversations"
  ON chatbot_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM chatbot_conversations
      WHERE user_id = auth.uid()
         OR (user_id IS NULL AND session_id IS NOT NULL)
    )
  );

CREATE POLICY "Users can insert messages into their conversations"
  ON chatbot_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM chatbot_conversations
      WHERE user_id = auth.uid()
         OR (user_id IS NULL AND session_id IS NOT NULL)
    )
  );
