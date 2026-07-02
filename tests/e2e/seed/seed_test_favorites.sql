-- Seed test favorites (requires seed_test_users.sql and seed_test_listings.sql)
-- Idempotent: deletes existing test favorites before insert.

DO $$
DECLARE
  buyer_id UUID;
  listing_ids UUID[];
BEGIN
  SELECT id INTO buyer_id FROM auth.users WHERE email = 'buyer@test.com';
  SELECT ARRAY_AGG(id) INTO listing_ids FROM listings
    WHERE title LIKE 'Test Listing - %' AND user_id != buyer_id
    LIMIT 3;

  DELETE FROM favorites WHERE user_id = buyer_id;

  IF array_length(listing_ids, 1) > 0 THEN
    INSERT INTO favorites (user_id, listing_id)
    SELECT buyer_id, unnest(listing_ids);
  END IF;
END $$;
