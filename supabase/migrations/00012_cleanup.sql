-- ============================================================================
-- Phase 2: Cleanup Migration
-- ============================================================================
-- Recommended order of application (idempotent via CREATE OR REPLACE / IF EXISTS):
--   1. Fix handle_new_user() — add SET search_path to SECURITY DEFINER function
--   2. Add INSERT policy on profiles table (for client-side registration flow)
--   3. Drop orphaned chat-attachments bucket from migration 00003
--   4. Rewrite storage policies to use SECURITY DEFINER chat_is_participant
--      instead of direct conversation_participants queries (L8)
--   5. Drop unused messages.attachments column
-- ============================================================================

-- ============================================================================
-- 1. Fix handle_new_user() (M9)
-- ============================================================================
-- SECURITY DEFINER function was created without SET search_path in 00001_schema.
-- While current code only references public.profiles, missing search_path is
-- a potential hijacking vector if a user creates a table named "profiles" in
-- another schema that takes priority in the search path.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Add INSERT policy on profiles table (M10)
-- ============================================================================
-- The trigger handle_new_user() handles profile creation server-side on auth
-- user creation. However, the Register.tsx component also attempts a client-side
-- INSERT into profiles, which would be RLS-blocked without this policy.

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- 3. Drop orphaned chat-attachments bucket (L7)
-- ============================================================================
-- Created in 00003_chat_features.sql as a public bucket, never used.
-- chat-images and chat-files buckets (00007_storage.sql) replaced it.

DELETE FROM storage.objects WHERE bucket_id = 'chat-attachments';
DELETE FROM storage.buckets WHERE id = 'chat-attachments';

-- ============================================================================
-- 4. Rewrite storage policies to use SECURITY DEFINER (L8)
-- ============================================================================
-- Original 00007_storage.sql policies query conversation_participants directly.
-- This is fragile: if the conversation_participants SELECT policy ever changes,
-- storage queries may break. Use public.chat_is_participant() instead, which
-- bypasses RLS via SECURITY DEFINER.

-- chat-images
DROP POLICY IF EXISTS "Participants can view chat images" ON storage.objects;
CREATE POLICY "Participants can view chat images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-images'
    AND public.chat_is_participant((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "Participants can upload chat images" ON storage.objects;
CREATE POLICY "Participants can upload chat images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-images'
    AND auth.role() = 'authenticated'
    AND public.chat_is_participant((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "Senders can delete chat images" ON storage.objects;
CREATE POLICY "Senders can delete chat images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-images'
    AND auth.role() = 'authenticated'
    AND public.chat_is_participant((storage.foldername(name))[1]::uuid)
  );

-- chat-files
DROP POLICY IF EXISTS "Participants can view chat files" ON storage.objects;
CREATE POLICY "Participants can view chat files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-files'
    AND public.chat_is_participant((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "Participants can upload chat files" ON storage.objects;
CREATE POLICY "Participants can upload chat files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-files'
    AND auth.role() = 'authenticated'
    AND public.chat_is_participant((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "Senders can delete chat files" ON storage.objects;
CREATE POLICY "Senders can delete chat files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-files'
    AND auth.role() = 'authenticated'
    AND public.chat_is_participant((storage.foldername(name))[1]::uuid)
  );

-- ============================================================================
-- 5. Drop unused messages.attachments column
-- ============================================================================
-- The old JSONB column was completely replaced by message_attachments table.
-- Frontend was refactored to never read or write this column.

ALTER TABLE messages DROP COLUMN IF EXISTS attachments;
