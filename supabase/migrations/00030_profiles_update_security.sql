-- Restrict browser profile updates to fields exposed by Profile.tsx.
-- RLS continues to require that the caller owns the profile row.

REVOKE UPDATE ON TABLE public.profiles FROM authenticated;

GRANT UPDATE (full_name, phone)
  ON TABLE public.profiles
  TO authenticated;
