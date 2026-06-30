-- ============================================================================
-- Phase 2: Fix "new row violates RLS" on conversations INSERT
-- ============================================================================
--
-- Root cause:
--   The conversations INSERT policy subqueries listings to verify listing
--   ownership.  That subquery is filtered by the listings SELECT RLS policy
--   ("Anyone can view active listings" → status = 'active' OR own listing).
--   A buyer who isn't the listing owner and whose target listing has a
--   non-active status (e.g. 'pending', 'sold', 'inactive') sees zero rows,
--   the EXISTS returns false, and the INSERT is rejected.
--
--   Additionally, conversations has no AFTER INSERT trigger to populate
--   conversation_participants.  The .select() chained after .insert() in
--   the frontend invokes the conversations SELECT policy, which (after the
--   00009 fix) uses public.chat_is_participant(id) — and since no
--   participant rows exist yet for the new conversation, the SELECT fails.
--
-- Fix A:
--   Replace the direct listings subquery with a SECURITY DEFINER function
--   that checks listing + seller existence, bypassing the listings RLS.
--   Security intent preserved: only real listings with the real owner.
--
-- Fix B:
--   Add an AFTER INSERT trigger on conversations that inserts both the
--   buyer and the seller into conversation_participants atomically.
--   No SECURITY DEFINER needed — the existing
--   conversation_participants INSERT policy already permits this.
-- ============================================================================

-- ============================================================================
-- Fix A: SECURITY DEFINER function for listing-ownership check
-- ============================================================================
-- Bypasses the listings SELECT RLS so conversation creation works regardless
-- of listing status.  Returns only a boolean — no listing data leaked.

CREATE OR REPLACE FUNCTION public.chat_listing_belongs_to_user(listing_id uuid, owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM listings
    WHERE id = listing_id AND user_id = owner_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.chat_listing_belongs_to_user(uuid, uuid) TO authenticated, anon;

-- ============================================================================
-- Fix A (cont.): Rewrite the conversations INSERT policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can create conversations for valid listings" ON conversations;
CREATE POLICY "Users can create conversations for valid listings"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id
    AND buyer_id != seller_id
    AND public.chat_listing_belongs_to_user(listing_id, seller_id)
  );

-- ============================================================================
-- Fix B: Trigger to auto-populate conversation_participants on INSERT
-- ============================================================================
-- When a conversation is created, both the buyer and the seller are
-- automatically added as participants with their respective roles.
-- This ensures:
--   1. The conversations SELECT policy (chat_is_participant) works immediately
--   2. Messages, reads, reactions, and offers can reference the conversation
--   3. The conversation appears in both users' sidebar

CREATE OR REPLACE FUNCTION public.populate_conversation_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO conversation_participants (conversation_id, profile_id, role)
  VALUES
    (NEW.id, NEW.buyer_id, 'buyer'),
    (NEW.id, NEW.seller_id, 'seller');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_conversation_insert_participants ON conversations;
CREATE TRIGGER on_conversation_insert_participants
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_conversation_participants();

-- ============================================================================
-- Verification queries
-- ============================================================================
--
-- 1. Confirm the function exists and is SECURITY DEFINER
-- SELECT proname, prosecdef FROM pg_proc
-- WHERE proname = 'chat_listing_belongs_to_user'
--   AND pronamespace = 'public'::regnamespace;
-- /* Expected: prosecdef = true */
--
-- 2. Confirm the trigger exists
-- SELECT tgname FROM pg_trigger
-- WHERE tgname = 'on_conversation_insert_participants';
-- /* Expected: 1 row */
--
-- 3. Dry-run the INSERT policy logic
-- SELECT public.chat_listing_belongs_to_user(
--   '<listing-uuid>',
--   '<seller-uuid>'
-- );
-- /* Expected: true */
--
-- 4. Create a conversation and verify participants were added
-- BEGIN;
-- INSERT INTO conversations (listing_id, buyer_id, seller_id)
-- VALUES ('<listing-uuid>', '<buyer-uuid>', '<seller-uuid>')
-- RETURNING id;
-- SELECT * FROM conversation_participants
-- WHERE conversation_id = '<returned-id>';
-- ROLLBACK;
-- /* Expected: 2 rows (buyer + seller) */
-- ============================================================================
