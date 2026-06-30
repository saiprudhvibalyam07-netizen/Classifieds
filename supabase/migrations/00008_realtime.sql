-- ============================================================================
-- Phase 1: Chat Architecture v2 — Realtime Publication
-- ============================================================================
-- PostgreSQL does not support ALTER PUBLICATION ... ADD TABLE IF NOT EXISTS.
-- The DO block checks pg_publication_tables before adding each table,
-- and first verifies the publication itself exists.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversation_participants') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'message_attachments') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE message_attachments;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'message_reads') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'message_reactions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offers') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE offers;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notification_events') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE notification_events;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_presence') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- Verification Queries (run manually to verify)
-- ============================================================================

-- Verify tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
--   'conversation_participants', 'message_attachments', 'message_reads',
--   'message_reactions', 'offers', 'notification_events', 'user_presence', 'call_logs'
-- );

-- Verify RLS enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN (
--   'conversation_participants', 'message_attachments', 'message_reads',
--   'message_reactions', 'offers', 'notification_events', 'user_presence', 'call_logs'
-- );

-- Verify backfill:
-- SELECT COUNT(*) FROM conversation_participants;
-- SELECT COUNT(*) FROM message_reads;
