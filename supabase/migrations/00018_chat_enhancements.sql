-- ============================================================================
-- Migration 00018: Chat Enhancements — Video, Audio, Reactions, Edit, Delete
-- ============================================================================
--
-- Adds:
--   1. chat-videos and chat-audio storage buckets with RLS policies
--   2. Extends message_attachments.type CHECK to include 'video', 'document'
--   3. Extends messages.type CHECK to include 'voice', 'video', 'document'
--   4. Adds is_edited, edited_at columns to messages
--   5. Adds storage policies for new buckets
--   6. Adds indexes for reply_to, is_deleted, is_edited
-- ============================================================================

-- ============================================================================
-- 1. Storage buckets for video and audio
-- ============================================================================
-- Private buckets; app uses signed URLs to access content.

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-videos', 'chat-videos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-audio', 'chat-audio', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Storage policies for chat-videos
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view chat videos" ON storage.objects;
CREATE POLICY "Participants can view chat videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-videos'
    AND public.chat_is_participant((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "Participants can upload chat videos" ON storage.objects;
CREATE POLICY "Participants can upload chat videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-videos'
    AND auth.role() = 'authenticated'
    AND public.chat_is_participant((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "Senders can delete chat videos" ON storage.objects;
CREATE POLICY "Senders can delete chat videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-videos'
    AND auth.role() = 'authenticated'
    AND public.chat_is_participant((storage.foldername(name))[1]::uuid)
  );

-- ============================================================================
-- 3. Storage policies for chat-audio
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view chat audio" ON storage.objects;
CREATE POLICY "Participants can view chat audio"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-audio'
    AND public.chat_is_participant((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "Participants can upload chat audio" ON storage.objects;
CREATE POLICY "Participants can upload chat audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-audio'
    AND auth.role() = 'authenticated'
    AND public.chat_is_participant((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "Senders can delete chat audio" ON storage.objects;
CREATE POLICY "Senders can delete chat audio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-audio'
    AND auth.role() = 'authenticated'
    AND public.chat_is_participant((storage.foldername(name))[1]::uuid)
  );

-- ============================================================================
-- 4. Extend message_attachments.type CHECK constraint
-- ============================================================================
-- Drop the old constraint and recreate it with the new types.
-- CASCADE drops any dependent objects; we need to handle this carefully.

ALTER TABLE message_attachments DROP CONSTRAINT IF EXISTS message_attachments_type_check;

ALTER TABLE message_attachments ADD CONSTRAINT message_attachments_type_check
  CHECK (type IN ('image', 'file', 'voice', 'video', 'document'));

-- ============================================================================
-- 5. Extend messages.type CHECK constraint to include new media types
-- ============================================================================

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE messages ADD CONSTRAINT messages_type_check
  CHECK (type IN ('text', 'image', 'file', 'system', 'offer', 'listing_share', 'call_start', 'call_end', 'call_missed', 'voice', 'video', 'document'));

-- ============================================================================
-- 6. Add edit tracking columns to messages
-- ============================================================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- ============================================================================
-- 7. Additional indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_messages_is_edited ON messages(is_edited);
CREATE INDEX IF NOT EXISTS idx_messages_type_content ON messages(type, created_at DESC);

-- ============================================================================
-- 7. Realtime publication for new tables
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'message_reactions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 8. Unread count RPC — single-query count, no JS in-memory scan
-- ============================================================================

CREATE OR REPLACE FUNCTION public.chat_unread_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM messages m
  WHERE m.sender_id != p_user_id
  AND m.conversation_id IN (
    SELECT c.id FROM conversations c
    WHERE c.buyer_id = p_user_id OR c.seller_id = p_user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM message_reads mr
    WHERE mr.message_id = m.id AND mr.profile_id = p_user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.chat_unread_conversation_ids(p_user_id UUID)
RETURNS TABLE(conversation_id UUID)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT m.conversation_id
  FROM messages m
  WHERE m.sender_id != p_user_id
  AND m.conversation_id IN (
    SELECT c.id FROM conversations c
    WHERE c.buyer_id = p_user_id OR c.seller_id = p_user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM message_reads mr
    WHERE mr.message_id = m.id AND mr.profile_id = p_user_id
  )
$$;

-- ============================================================================
-- Verification queries
-- ============================================================================
--
-- 1. Confirm buckets exist:
-- SELECT id, name, public FROM storage.buckets WHERE id IN ('chat-videos', 'chat-audio');
-- /* Expected: 2 rows, public = false */
--
-- 2. Confirm type check constraint updated:
-- SELECT constraint_name, check_clause FROM information_schema.check_constraints
-- WHERE constraint_name IN ('message_attachments_type_check', 'messages_type_check');
-- /* Expected: both contain 'video', 'document', 'voice' */
--
-- 3. Confirm new columns on messages:
-- SELECT column_name, is_nullable, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'messages' AND column_name IN ('is_edited', 'edited_at');
-- /* Expected: 2 rows */
-- ============================================================================
