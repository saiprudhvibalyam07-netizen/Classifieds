-- ============================================================================
-- Migration 00017: Fix conversations SELECT RLS policy
-- ============================================================================
--
-- PROBLEM
-- =======
-- The conversations SELECT policy (created in 00009) uses
-- `public.chat_is_participant(id)`, which checks whether the current user
-- has a row in `conversation_participants`.
--
-- This creates a hard dependency: every conversation MUST have corresponding
-- rows in `conversation_participants` for the buyer and seller. If they are
-- missing (e.g. conversations created before the trigger existed, or before
-- the backfill in 00004 was applied), `chat_is_participant` returns false
-- for EVERY conversation, and `SELECT ... FROM conversations` is rejected
-- with HTTP 403 Forbidden.
--
-- FIX
-- ===
-- Replace the indirect `conversation_participants` check with a direct column
-- check on `buyer_id` and `seller_id`. This removes ALL dependency on the
-- `conversation_participants` table being correctly populated.
--
-- The policy now reads: "a user can SELECT a conversation if and only if
-- auth.uid() equals buyer_id OR auth.uid() equals seller_id."
--
-- This is:
--   • Equally restrictive — only conversation participants can read
--   • Correct by schema definition — buyer_id and seller_id are NOT NULL
--     columns on the conversations table itself
--   • Free of cross-table dependencies — no subqueries, no SECURITY DEFINER
--     functions, no backfill requirements
--   • Consistent with the INSERT and UPDATE policies which already use
--     direct column checks (INSERT checks buyer_id; UPDATE uses this policy)
-- ============================================================================

-- ============================================================================
-- 1. Rewrite conversations SELECT policy
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view conversations" ON conversations;

CREATE POLICY "Participants can view conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ============================================================================
-- 2. Backfill missing conversation_participants rows
-- ============================================================================
-- While the SELECT policy no longer depends on this table, other policies
-- (messages, message_attachments, etc.) still use chat_is_participant().
-- This backfill ensures those policies work for existing conversations.

INSERT INTO conversation_participants (conversation_id, profile_id, role)
SELECT c.id, c.buyer_id, 'buyer' FROM conversations c
WHERE c.buyer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.profile_id = c.buyer_id
  );

INSERT INTO conversation_participants (conversation_id, profile_id, role)
SELECT c.id, c.seller_id, 'seller' FROM conversations c
WHERE c.seller_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.profile_id = c.seller_id
  );

-- ============================================================================
-- 3. Verification queries
-- ============================================================================
--
-- 3a. Confirm the policy is using direct column checks (no function call)
--
-- SELECT schemaname, tablename, policyname, qual
-- FROM pg_policies
-- WHERE tablename = 'conversations' AND cmd = 'SELECT';
-- /* Expected: qual contains "buyer_id" and "seller_id", NOT "chat_is_participant" */
--
--
-- 3b. Simulate an authenticated SELECT as a known participant
--
-- SET ROLE authenticated;
-- SELECT * FROM conversations WHERE auth.uid() = buyer_id OR auth.uid() = seller_id LIMIT 5;
-- /* Expected: returns rows where the user is buyer or seller */
-- RESET ROLE;
