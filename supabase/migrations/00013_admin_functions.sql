-- Migration 00013: Admin functions and email confirmation support
-- 
-- This migration adds:
-- 1. promote_to_admin() function for promoting users to admin role
-- 2. get_user_role() helper for server-side role checks

-- ============================================================
-- promote_to_admin(email TEXT)
-- ============================================================
-- Promotes a user to admin role by email.
-- Usage: SELECT promote_to_admin('user@example.com');
-- Returns the user's profile id on success, or raises an error.

CREATE OR REPLACE FUNCTION public.promote_to_admin(target_email TEXT)
RETURNS UUID
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_id UUID;
BEGIN
  SELECT id INTO profile_id
  FROM public.profiles
  WHERE email = target_email;

  IF profile_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email: %', target_email;
  END IF;

  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = profile_id;

  RETURN profile_id;
END;
$$;

-- ============================================================
-- get_user_role(user_id UUID)
-- ============================================================
-- Returns the role for a given user id.
-- Used for server-side authorization checks.
-- Returns 'user' if profile not found.

CREATE OR REPLACE FUNCTION public.get_user_role(target_id UUID)
RETURNS TEXT
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = target_id;

  RETURN COALESCE(user_role, 'user');
END;
$$;
