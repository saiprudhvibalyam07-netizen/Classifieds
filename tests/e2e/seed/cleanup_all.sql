-- Cleanup all test data (idempotent)
-- Run this between test suites or after full suite completion.

DO $$
DECLARE
  test_emails TEXT[] := ARRAY['buyer@test.com', 'seller@test.com', 'admin@test.com'];
BEGIN
  -- Delete test messages
  DELETE FROM messages WHERE conversation_id IN (
    SELECT id FROM conversations WHERE title LIKE 'Test Conversation - %'
  );

  -- Delete test conversation participants
  DELETE FROM conversations_participants WHERE conversation_id IN (
    SELECT id FROM conversations WHERE title LIKE 'Test Conversation - %'
  );

  -- Delete test conversations
  DELETE FROM conversations WHERE title LIKE 'Test Conversation - %';

  -- Delete test favorites
  DELETE FROM favorites WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = ANY(test_emails)
  );

  -- Delete test listings
  DELETE FROM listings WHERE title LIKE 'Test Listing - %';

  -- Delete test users
  DELETE FROM auth.users WHERE email = ANY(test_emails);
END $$;
