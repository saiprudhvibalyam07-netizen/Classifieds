-- Seed test user accounts (run via Supabase admin API or SQL editor)
-- These are idempotent and can be re-run safely.

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
SELECT
  gen_random_uuid(), 'buyer@test.com',
  crypt('TestPass123!', gen_salt('bf')),
  now(),
  '{"name": "Test Buyer"}'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'buyer@test.com');

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
SELECT
  gen_random_uuid(), 'seller@test.com',
  crypt('TestPass123!', gen_salt('bf')),
  now(),
  '{"name": "Test Seller"}'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'seller@test.com');

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
SELECT
  gen_random_uuid(), 'admin@test.com',
  crypt('AdminPass123!', gen_salt('bf')),
  now(),
  '{"name": "Test Admin"}'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@test.com');
