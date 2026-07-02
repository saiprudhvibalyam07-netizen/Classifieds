-- Seed test conversations and messages (requires seed_test_users.sql and seed_test_listings.sql)
-- Idempotent: deletes existing test conversations before insert.

DO $$
DECLARE
  buyer_id UUID;
  seller_id UUID;
  listing_id UUID;
  conv_id UUID;
BEGIN
  SELECT id INTO buyer_id FROM auth.users WHERE email = 'buyer@test.com';
  SELECT id INTO seller_id FROM auth.users WHERE email = 'seller@test.com';
  SELECT id INTO listing_id FROM listings WHERE title = 'Test Listing - Vintage Camera' LIMIT 1;

  DELETE FROM messages WHERE conversation_id IN (
    SELECT id FROM conversations WHERE title = 'Test Conversation - Camera'
  );
  DELETE FROM conversations WHERE title = 'Test Conversation - Camera';

  INSERT INTO conversations (id, title, listing_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Test Conversation - Camera', listing_id, now() - interval '1 day', now())
  RETURNING id INTO conv_id;

  INSERT INTO conversations_participants (conversation_id, user_id)
  VALUES (conv_id, buyer_id), (conv_id, seller_id);

  INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
  VALUES
    (gen_random_uuid(), conv_id, buyer_id, 'Hi, is the vintage camera still available?', now() - interval '20 hours'),
    (gen_random_uuid(), conv_id, seller_id, 'Yes, it is! I can meet this weekend.', now() - interval '19 hours'),
    (gen_random_uuid(), conv_id, buyer_id, 'Great, can you do Saturday morning?', now() - interval '18 hours');
END $$;
