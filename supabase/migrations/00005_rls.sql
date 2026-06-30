-- ============================================================================
-- Phase 1: Chat Architecture v2 — Row Level Security
-- ============================================================================

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY ON ALL NEW TABLES
-- ============================================================================

ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS POLICIES — conversations
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Participants can view conversations"
  ON conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = id AND profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Buyer can create a conversation" ON conversations;
DROP POLICY IF EXISTS "Any authenticated user can create a conversation" ON conversations;
CREATE POLICY "Users can create conversations for valid listings"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id
    AND buyer_id != seller_id
    AND EXISTS (
      SELECT 1 FROM listings
      WHERE id = listing_id
      AND user_id = seller_id
    )
  );

DROP POLICY IF EXISTS "Participants can update conversation" ON conversations;
CREATE POLICY "Participants can update conversation"
  ON conversations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = id AND profile_id = auth.uid()
  ));

-- ============================================================================
-- 6. RLS POLICIES — conversation_participants
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view participant list" ON conversation_participants;
CREATE POLICY "Participants can view participant list"
  ON conversation_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = conversation_id AND cp2.profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Creator added on conversation creation" ON conversation_participants;
CREATE POLICY "Users can add participants when creating conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = conversation_id
        AND c.buyer_id = auth.uid()
        AND profile_id = c.seller_id
      )
    )
  );

DROP POLICY IF EXISTS "Participants can leave conversation" ON conversation_participants;
CREATE POLICY "Participants can leave conversation"
  ON conversation_participants FOR DELETE
  USING (profile_id = auth.uid());

-- ============================================================================
-- 7. RLS POLICIES — messages
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view messages" ON messages;
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id AND profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Participants can insert messages" ON messages;
CREATE POLICY "Participants can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id AND profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can mark messages as read" ON messages;
CREATE POLICY "Sender can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid() AND is_deleted = false)
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Sender can delete own messages" ON messages;
DROP POLICY IF EXISTS "Sender can soft-delete own messages" ON messages;
CREATE POLICY "Sender can soft-delete own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() AND is_deleted = true);

-- ============================================================================
-- 8. RLS POLICIES — message_attachments
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view attachments" ON message_attachments;
CREATE POLICY "Participants can view attachments"
  ON message_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_id AND cp.profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Senders can insert attachments" ON message_attachments;
CREATE POLICY "Senders can insert attachments"
  ON message_attachments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM messages WHERE id = message_id AND sender_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Senders can delete attachments" ON message_attachments;
CREATE POLICY "Senders can delete attachments"
  ON message_attachments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM messages WHERE id = message_id AND sender_id = auth.uid()
  ));

-- ============================================================================
-- 9. RLS POLICIES — message_reads
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view reads" ON message_reads;
CREATE POLICY "Participants can view reads"
  ON message_reads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = (
      SELECT conversation_id FROM messages WHERE id = message_reads.message_id
    ) AND profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can record own reads" ON message_reads;
CREATE POLICY "Users can record own reads"
  ON message_reads FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own reads" ON message_reads;
CREATE POLICY "Users can update own reads"
  ON message_reads FOR UPDATE
  USING (profile_id = auth.uid());

-- ============================================================================
-- 10. RLS POLICIES — message_reactions
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view reactions" ON message_reactions;
CREATE POLICY "Participants can view reactions"
  ON message_reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = (
      SELECT conversation_id FROM messages WHERE id = message_reactions.message_id
    ) AND profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Participants can add reactions" ON message_reactions;
CREATE POLICY "Participants can add reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = (
      SELECT conversation_id FROM messages WHERE id = message_reactions.message_id
    ) AND profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can remove own reactions" ON message_reactions;
CREATE POLICY "Users can remove own reactions"
  ON message_reactions FOR DELETE
  USING (profile_id = auth.uid());

-- ============================================================================
-- 11. RLS POLICIES — offers
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view offers" ON offers;
CREATE POLICY "Participants can view offers"
  ON offers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = offers.conversation_id AND profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Participants can create offers" ON offers;
CREATE POLICY "Participants can create offers"
  ON offers FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = offers.conversation_id AND profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Offer participants can update offers" ON offers;
CREATE POLICY "Offer participants can update offers"
  ON offers FOR UPDATE
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = offers.conversation_id
      AND profile_id = auth.uid()
      AND role IN ('seller', 'admin')
    )
  );

-- ============================================================================
-- 12. RLS POLICIES — notification_events
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own notifications" ON notification_events;
CREATE POLICY "Users can view own notifications"
  ON notification_events FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications" ON notification_events;
CREATE POLICY "System can create notifications"
  ON notification_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can mark own notifications as read" ON notification_events;
CREATE POLICY "Users can mark own notifications as read"
  ON notification_events FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 13. RLS POLICIES — user_presence
-- ============================================================================

DROP POLICY IF EXISTS "Presence is publicly viewable" ON user_presence;
CREATE POLICY "Presence is publicly viewable"
  ON user_presence FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;
CREATE POLICY "Users can update own presence"
  ON user_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can upsert own presence" ON user_presence;
CREATE POLICY "Users can upsert own presence"
  ON user_presence FOR UPDATE
  USING (user_id = auth.uid());
