-- ============================================================================
-- Phase 2: Fix RLS infinite recursion in chat policies
-- ============================================================================
--
-- Root cause (00005_rls.sql:59-62):
--   Policy "Participants can view participant list" ON conversation_participants
--   FOR SELECT queries conversation_participants in its USING clause, causing
--   PostgreSQL to detect infinite self-recursion.
--
-- Cross-table cycle discovered:
--   conversations  SELECT → queries conversation_participants
--   conversation_participants SELECT → queries conversations (after fix)
--   → PostgreSQL detects cross-table recursion.
--
-- Downstream impact:
--   Every policy that subqueries conversation_participants (messages,
--   message_attachments, message_reads, message_reactions, offers) would also
--   fail because the conversation_participants SELECT policy evaluates
--   recursively regardless of the calling context.
--
-- Fix:
--   A SECURITY DEFINER helper function queries conversation_participants
--   bypassing RLS, breaking every recursion path with a single change.
--   All policies that need to check conversation membership use this function.
-- ============================================================================

-- ============================================================================
-- 1. SECURITY DEFINER helpers — breaks the RLS recursion chain
-- ============================================================================
-- Runs as the function owner (supabase_admin/postgres), so RLS policies on
-- conversation_participants are NOT re-evaluated inside these functions.
-- This eliminates the self-recursion and any cross-table cycle.
-- Each function uses SET search_path = public to prevent search-path hijacking.

CREATE OR REPLACE FUNCTION public.chat_is_participant(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.chat_user_has_role(conv_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
      AND profile_id = auth.uid()
      AND role = ANY(allowed_roles)
  );
$$;

-- ============================================================================
-- 2. Fix conversation_participants  (the self-recursive policy)
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view participant list" ON conversation_participants;
CREATE POLICY "Participants can view participant list"
  ON conversation_participants FOR SELECT
  USING (public.chat_is_participant(conversation_id));

-- ============================================================================
-- 3. Fix conversations  (cross-table cycle partner)
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Participants can view conversations"
  ON conversations FOR SELECT
  USING (public.chat_is_participant(id));

DROP POLICY IF EXISTS "Participants can update conversation" ON conversations;
CREATE POLICY "Participants can update conversation"
  ON conversations FOR UPDATE
  USING (public.chat_is_participant(id));

-- ============================================================================
-- 4. Fix messages  (queries conversation_participants)
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view messages" ON messages;
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (public.chat_is_participant(messages.conversation_id));

DROP POLICY IF EXISTS "Participants can insert messages" ON messages;
CREATE POLICY "Participants can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.chat_is_participant(messages.conversation_id)
  );

-- ============================================================================
-- 5. Fix message_attachments  (queries messages → conversation_participants)
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view attachments" ON message_attachments;
CREATE POLICY "Participants can view attachments"
  ON message_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_id AND public.chat_is_participant(m.conversation_id)
  ));

-- ============================================================================
-- 6. Fix message_reads  (queries conversation_participants)
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view reads" ON message_reads;
CREATE POLICY "Participants can view reads"
  ON message_reads FOR SELECT
  USING (public.chat_is_participant(
    (SELECT conversation_id FROM messages WHERE id = message_reads.message_id)
  ));

-- ============================================================================
-- 7. Fix message_reactions  (queries conversation_participants)
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view reactions" ON message_reactions;
CREATE POLICY "Participants can view reactions"
  ON message_reactions FOR SELECT
  USING (public.chat_is_participant(
    (SELECT conversation_id FROM messages WHERE id = message_reactions.message_id)
  ));

DROP POLICY IF EXISTS "Participants can add reactions" ON message_reactions;
CREATE POLICY "Participants can add reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    AND public.chat_is_participant(
      (SELECT conversation_id FROM messages WHERE id = message_reactions.message_id)
    )
  );

-- ============================================================================
-- 8. Fix offers  (queries conversation_participants)
-- ============================================================================
-- The UPDATE policy also checks role; uses the chat_user_has_role helper
-- instead of directly querying conversation_participants.

DROP POLICY IF EXISTS "Participants can view offers" ON offers;
CREATE POLICY "Participants can view offers"
  ON offers FOR SELECT
  USING (public.chat_is_participant(offers.conversation_id));

DROP POLICY IF EXISTS "Participants can create offers" ON offers;
CREATE POLICY "Participants can create offers"
  ON offers FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.chat_is_participant(offers.conversation_id)
  );

DROP POLICY IF EXISTS "Offer participants can update offers" ON offers;
CREATE POLICY "Offer participants can update offers"
  ON offers FOR UPDATE
  USING (
    sender_id = auth.uid()
    OR public.chat_user_has_role(offers.conversation_id, ARRAY['seller', 'admin'])
  );

-- ============================================================================
-- 9. Verify no remaining self-referencing policies
-- ============================================================================
-- The following policies use ONLY direct column checks (no subqueries on the
-- same table) and are therefore safe. Listed here for audit completeness.
--
-- conversations INSERT: WITH CHECK → references listings only (no subqueries)
-- conversations UPDATE: USING → public.chat_is_participant() (fixed above)
--
-- conversation_participants INSERT: WITH CHECK → references conversations only
-- conversation_participants DELETE: USING → profile_id = auth.uid()
--
-- messages UPDATE (edit): USING/CHECK → sender_id = auth.uid()
-- messages UPDATE (soft-delete): USING/CHECK → sender_id = auth.uid()
--
-- message_attachments INSERT: WITH CHECK → queries messages (no back-cycle)
-- message_attachments DELETE: USING → queries messages (no back-cycle)
--
-- message_reads INSERT: WITH CHECK → profile_id = auth.uid()
-- message_reads UPDATE: USING → profile_id = auth.uid()
--
-- message_reactions DELETE: USING → profile_id = auth.uid()
--
-- notification_events SELECT: USING → user_id = auth.uid()
-- notification_events INSERT: WITH CHECK → auth.role() = 'service_role'
-- notification_events UPDATE: USING/CHECK → user_id = auth.uid()
--
-- user_presence SELECT: USING → true
-- user_presence INSERT: WITH CHECK → user_id = auth.uid()
-- user_presence UPDATE: USING → user_id = auth.uid()
-- ============================================================================

-- ============================================================================
-- 10. Grant function execution to application roles
-- ============================================================================
-- SECURITY DEFINER functions need explicit EXECUTE grants for non-owner roles.
-- RLS policy evaluation runs as the authenticated user, so both authenticated
-- and anon need access (anon for pre-login scenarios).

GRANT EXECUTE ON FUNCTION public.chat_is_participant(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.chat_user_has_role(uuid, text[]) TO authenticated, anon;

-- ============================================================================
-- 11. VERIFICATION QUERIES — run these after migration to confirm fix
-- ============================================================================
--
-- 11a. Confirm the helper functions exist and are SECURITY DEFINER
--
-- SELECT proname, prosecdef FROM pg_proc
-- WHERE proname IN ('chat_is_participant', 'chat_user_has_role')
--   AND pronamespace = 'public'::regnamespace;
-- /* Expected: both rows show prosecdef = true */
--
--
-- 11b. List every RLS policy and inspect its definition for
--      direct conversation_participants references
--
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN (
--   'conversations', 'conversation_participants', 'messages',
--   'message_attachments', 'message_reads', 'message_reactions',
--   'offers', 'notification_events', 'user_presence'
-- )
-- ORDER BY tablename, policyname;
-- /* Manual check: no qual or with_check column should contain the string
--    "conversation_participants" for any policy listed above.
--    The only exception is the original 00005 policy name, but the USING
--    clause itself must not reference the table it protects. */
--
--
-- 11c. Verify the function truly bypasses RLS
--
-- SET ROLE authenticated;
-- SELECT public.chat_is_participant('00000000-0000-0000-0000-000000000000');
-- /* Should return false (no error), proving the function itself does not
--    trigger infinite recursion. If recursion is still present, PostgreSQL
--    will throw "infinite recursion detected in policy for relation..." */
-- RESET ROLE;
--
--
-- 11d. Simulate a real query against each table to confirm no recursion
--
-- -- Replace with an actual conversation_id and user_id from your data
-- -- SELECT * FROM conversations WHERE id = '<conv-uuid>' LIMIT 1;
-- -- SELECT * FROM conversation_participants WHERE conversation_id = '<conv-uuid>' LIMIT 5;
-- -- SELECT * FROM messages WHERE conversation_id = '<conv-uuid>' LIMIT 5;
-- -- SELECT * FROM offers WHERE conversation_id = '<conv-uuid>' LIMIT 5;
-- -- SELECT * FROM message_reads WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = '<conv-uuid>') LIMIT 5;
-- -- SELECT * FROM message_reactions WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = '<conv-uuid>') LIMIT 5;
-- -- SELECT * FROM message_attachments WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = '<conv-uuid>') LIMIT 5;
-- /* None of these should throw recursion errors. */
-- ============================================================================
