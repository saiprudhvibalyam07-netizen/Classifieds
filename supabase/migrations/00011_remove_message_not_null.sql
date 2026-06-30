-- ============================================================================
-- Phase 2: Remove NOT NULL from messages.message column
-- ============================================================================
--
-- Context:
--   The new architecture uses `content` as the primary text field and `type`
--   to distinguish message kinds (text, image, file, offer, etc.).  The old
--   `message` column is kept for backward compatibility, but its NOT NULL
--   constraint is incorrect because attachment-only messages (e.g. images
--   without text) store the content in `message_attachments`, not in
--   `message`.
--
--   The frontend now always populates `message` (with `''` for attachment-
--   only sends) to satisfy the constraint, but the correct long-term fix is
--   to make the column nullable.
--
-- Backfill + migration:
--   1. Copy `message` → `content` for any rows that were missed by the
--      00004 backfill (idempotent).
--   2. Drop the NOT NULL constraint on `message`.
--   3. Preserve the column — it remains available for legacy readers.
-- ============================================================================

-- Idempotent backfill: content = message for any rows still missing content
UPDATE messages
SET content = message
WHERE content IS NULL AND message IS NOT NULL;

-- Remove NOT NULL constraint from the legacy message column
ALTER TABLE messages ALTER COLUMN message DROP NOT NULL;

-- ============================================================================
-- Verification
-- ============================================================================
--
-- -- Confirm column is now nullable
-- SELECT is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'messages' AND column_name = 'message';
-- /* Expected: is_nullable = YES */
--
-- -- Confirm no remaining NULL content with non-null message
-- SELECT COUNT(*) FROM messages WHERE content IS NULL AND message IS NOT NULL;
-- /* Expected: 0 */
-- ============================================================================
