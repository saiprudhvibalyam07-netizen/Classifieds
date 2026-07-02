-- Seed test listings (requires seed_test_users.sql to be run first)
-- Idempotent: deletes existing test listings before insert.

DO $$
DECLARE
  seller_id UUID;
BEGIN
  SELECT id INTO seller_id FROM auth.users WHERE email = 'seller@test.com';

  DELETE FROM listings WHERE title LIKE 'Test Listing - %';

  INSERT INTO listings (id, title, description, price, category, city, state, user_id, created_at, status)
  VALUES
    (gen_random_uuid(), 'Test Listing - Vintage Camera', 'A vintage film camera in excellent condition.', 150.00, 'Items for Sale', 'Austin', 'TX', seller_id, now() - interval '2 days', 'active'),
    (gen_random_uuid(), 'Test Listing - Mountain Bike', 'Lightweight mountain bike, barely used.', 350.00, 'Items for Sale', 'Austin', 'TX', seller_id, now() - interval '1 day', 'active'),
    (gen_random_uuid(), 'Test Listing - Downtown Apartment', '2BR downtown apartment with great views.', 1200.00, 'Housing', 'Austin', 'TX', seller_id, now() - interval '3 hours', 'active'),
    (gen_random_uuid(), 'Test Listing - Toyota Camry 2020', 'Well-maintained sedan, low mileage.', 18000.00, 'Vehicles', 'Dallas', 'TX', seller_id, now() - interval '5 days', 'active'),
    (gen_random_uuid(), 'Test Listing - Senior Developer', 'Experienced senior developer needed.', 0, 'Jobs', 'Remote', 'US', seller_id, now() - interval '1 hour', 'active'),
    (gen_random_uuid(), 'Test Listing - Guitar Lessons', 'Learn guitar from a professional musician.', 50.00, 'Services', 'Austin', 'TX', seller_id, now() - interval '2 hours', 'active'),
    (gen_random_uuid(), 'Test Listing - Community Garage Sale', 'Annual community garage sale event.', 0, 'Community', 'Austin', 'TX', seller_id, now() - interval '6 hours', 'active'),
    (gen_random_uuid(), 'Test Listing - DSLR Camera Kit', 'Professional DSLR camera with lenses.', 750.00, 'Items for Sale', 'Houston', 'TX', seller_id, now(), 'active');
END $$;
