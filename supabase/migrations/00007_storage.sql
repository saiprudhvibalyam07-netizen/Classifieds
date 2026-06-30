-- ============================================================================
-- Phase 1: Chat Architecture v2 — Storage Buckets & Policies
-- ============================================================================
-- Buckets are private. The app must use signed URLs for access.
--   supabase.storage.from('chat-images').createSignedUrl(path, 3600)

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- Drop old chat-attachments bucket policies from migration 00003
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own chat attachments" ON storage.objects;

-- chat-images policies
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Participants can view chat images" ON storage.objects;
CREATE POLICY "Participants can view chat images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-images'
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = (storage.foldername(name))[1]::uuid
      AND profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can upload chat images" ON storage.objects;
CREATE POLICY "Participants can upload chat images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = (storage.foldername(name))[1]::uuid
      AND profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Senders can delete chat images" ON storage.objects;
CREATE POLICY "Senders can delete chat images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = (storage.foldername(name))[1]::uuid
      AND profile_id = auth.uid()
    )
  );

-- chat-files policies
DROP POLICY IF EXISTS "Anyone can view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Participants can view chat files" ON storage.objects;
CREATE POLICY "Participants can view chat files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-files'
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = (storage.foldername(name))[1]::uuid
      AND profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can upload chat files" ON storage.objects;
CREATE POLICY "Participants can upload chat files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-files'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = (storage.foldername(name))[1]::uuid
      AND profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Senders can delete chat files" ON storage.objects;
CREATE POLICY "Senders can delete chat files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-files'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = (storage.foldername(name))[1]::uuid
      AND profile_id = auth.uid()
    )
  );
