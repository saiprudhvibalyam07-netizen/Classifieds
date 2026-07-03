-- ============================================================================
-- Phase 3: Fix trigger RLS recursion on conversation_participants INSERT
-- ============================================================================
--
-- Root cause:
--   The populate_conversation_participants AFTER INSERT trigger on
--   conversations inserts buyer and seller into conversation_participants
--   in a single multi-row INSERT:
--
--     INSERT INTO conversation_participants (conversation_id, profile_id, role)
--     VALUES (NEW.id, NEW.buyer_id, 'buyer'),
--            (NEW.id, NEW.seller_id, 'seller');
--
--   The conversation_participants INSERT policy uses a subquery on
--   conversations, which is guarded by the conversations SELECT RLS policy
--   (chat_is_participant).  Since chat_is_participant queries
--   conversation_participants and the multi-row INSERT is a single SQL
--   statement, the MVCC snapshot taken at the start of the statement does
--   NOT include the buyer row being inserted by the same statement.
--   chat_is_participant returns false, the subquery returns no rows,
--   and the WITH CHECK for the seller row fails — causing the entire
--   conversation creation to roll back.
--
-- Fix:
--   Make populate_conversation_participants SECURITY DEFINER so it
--   bypasses RLS on conversation_participants entirely.  This is safe
--   because:
--     1. The trigger only fires for conversations that already passed
--        the conversations INSERT RLS (auth.uid() = buyer_id,
--        buyer_id != seller_id, listing belongs to seller).
--     2. It inserts only buyer_id (= auth.uid()) and seller_id
--        (= verified listing owner).  No arbitrary data.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.populate_conversation_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO conversation_participants (conversation_id, profile_id, role)
  VALUES
    (NEW.id, NEW.buyer_id, 'buyer'),
    (NEW.id, NEW.seller_id, 'seller');
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Verification
-- ============================================================================
--
-- Confirm the function is now SECURITY DEFINER:
-- SELECT prosecdef FROM pg_proc
-- WHERE proname = 'populate_conversation_participants'
--   AND pronamespace = 'public'::regnamespace;
-- /* Expected: prosecdef = true */
--
-- Test conversation creation end-to-end:
-- BEGIN;
-- INSERT INTO conversations (listing_id, buyer_id, seller_id)
-- VALUES ('<listing-uuid>', '<current-user-uuid>', '<seller-uuid>')
-- RETURNING id;
-- SELECT * FROM conversation_participants
-- WHERE conversation_id = '<returned-id>';
-- /* Expected: 2 rows (buyer + seller) */
-- ROLLBACK;
-- ============================================================================
