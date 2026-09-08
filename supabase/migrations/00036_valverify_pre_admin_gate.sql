-- ValVerify V2: pre-Admin quality gate.
--
-- Adds a 'rejected' listing status driven only by a finalized
-- COMPLETED + REJECT ValVerify result. ValVerify never sets 'active' and
-- never overwrites an Admin decision: the trusted pending -> rejected
-- transition runs INSIDE finalize_listing_verification, only after every
-- staleness/ownership guard has succeeded and only while the listing is
-- still 'pending'. No JWT-dependent trigger is involved.
--
-- THIS FILE OVERRIDES finalize_listing_verification, which was originally
-- defined in 00031. Historical migration files 00025-00035 are NOT modified;
-- the override is applied here using CREATE OR REPLACE with identical logic
-- plus the added rejected transition.

-- 1. Extend the listings status domain. Existing semantics are untouched.
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_status_check;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_status_check
    CHECK (status IN ('pending', 'active', 'sold', 'inactive', 'rejected'));

-- 2. Trusted reject transition integrated into finalize_listing_verification.
-- Identical to the 00031 definition except for the appended COMPLETED+REJECT ->
-- pending->rejected UPDATE that runs only after:
--   * the service_role guard succeeds
--   * the listing row is locked FOR UPDATE
--   * the listing.updated_at / expected-input (stale) guard succeeds
--   * run_id and content_hash match the current verification row (so a stale
--     result cannot reject newer content)
--   * the verification UPDATE actually applied (NOT FOUND -> SUPERSEDED)
-- The transition is idempotent, same transaction as finalization, and bounded
-- by status='pending' so a late result can never override an Admin decision.
CREATE OR REPLACE FUNCTION public.finalize_listing_verification(
  p_listing_id UUID,
  p_run_id UUID,
  p_content_hash TEXT,
  p_expected_listing_updated_at TIMESTAMPTZ,
  p_result JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_listing_updated_at TIMESTAMPTZ;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_listing_id IS NULL OR p_run_id IS NULL OR p_content_hash IS NULL OR length(p_content_hash) = 0 THEN
    RAISE EXCEPTION 'Invalid verification finalization' USING ERRCODE = '22023';
  END IF;

  IF p_result IS NULL OR jsonb_typeof(p_result) <> 'object'
     OR p_result->>'content_hash' IS DISTINCT FROM p_content_hash
     OR p_result->>'verification_status' NOT IN ('COMPLETED', 'ERROR') THEN
    RAISE EXCEPTION 'Invalid verification result' USING ERRCODE = '22023';
  END IF;

  SELECT l.updated_at
  INTO current_listing_updated_at
  FROM public.listings AS l
  WHERE l.id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'LISTING_MISSING';
  END IF;

  IF p_expected_listing_updated_at IS NOT NULL
     AND current_listing_updated_at IS DISTINCT FROM p_expected_listing_updated_at THEN
    RETURN 'STALE_LISTING';
  END IF;

  UPDATE public.listing_verifications
  SET verification_status = p_result->>'verification_status',
      recommendation = p_result->>'recommendation',
      confidence = CASE
        WHEN p_result->'confidence' IS NULL OR jsonb_typeof(p_result->'confidence') = 'null' THEN NULL
        ELSE (p_result->>'confidence')::SMALLINT
      END,
      risk_score = CASE
        WHEN p_result->'risk_score' IS NULL OR jsonb_typeof(p_result->'risk_score') = 'null' THEN NULL
        ELSE (p_result->>'risk_score')::SMALLINT
      END,
      checks = CASE
        WHEN p_result->'checks' IS NULL OR jsonb_typeof(p_result->'checks') = 'null' THEN '{}'::JSONB
        ELSE p_result->'checks'
      END,
      summary = p_result->>'summary',
      reasons = CASE
        WHEN p_result->'reasons' IS NULL OR jsonb_typeof(p_result->'reasons') = 'null' THEN '[]'::JSONB
        ELSE p_result->'reasons'
      END,
      provider = p_result->>'provider',
      model = p_result->>'model',
      content_hash = p_content_hash,
      verified_at = CASE
        WHEN p_result->'verified_at' IS NULL OR jsonb_typeof(p_result->'verified_at') = 'null' THEN NULL
        ELSE (p_result->>'verified_at')::TIMESTAMPTZ
      END,
      error = CASE
        WHEN p_result->'error' IS NULL OR jsonb_typeof(p_result->'error') = 'null' THEN NULL
        ELSE p_result->'error'
      END
  WHERE listing_id = p_listing_id
    AND run_id = p_run_id
    AND content_hash = p_content_hash;

  IF NOT FOUND THEN
    RETURN 'SUPERSEDED';
  END IF;

  -- V2: trusted rejected transition. Runs only for a finalized
  -- COMPLETED + REJECT result, only while the listing is still pending, and
  -- in the same transaction as the successful finalization above. Never
  -- touches active/sold/inactive/already-rejected and never sets active.
  IF p_result->>'verification_status' = 'COMPLETED'
     AND p_result->>'recommendation' = 'REJECT' THEN
    UPDATE public.listings
    SET status = 'rejected'
    WHERE id = p_listing_id
      AND status = 'pending';
  END IF;

  RETURN 'UPDATED';
END;
$function$;

-- finalize_listing_verification must remain service-role only (least privilege).
REVOKE EXECUTE ON FUNCTION public.finalize_listing_verification(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_listing_verification(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finalize_listing_verification(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_listing_verification(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB) TO service_role;

-- 3. Owner-safe verification read. SELLER-SAFE fields only: the RPC never
-- returns content_hash, run_id, provider, model, error, checks, confidence,
-- risk_score, or the raw result container. Owners read their own listing;
-- Admins may read any listing; anon and other sellers are denied.
CREATE OR REPLACE FUNCTION public.get_listing_verification(p_listing_id UUID)
RETURNS TABLE (
  recommendation TEXT,
  summary TEXT,
  reasons JSONB,
  verified_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $function$
DECLARE
  caller_uid UUID;
  caller_role TEXT;
  is_owner BOOLEAN;
BEGIN
  caller_uid := auth.uid();

  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = caller_uid;

  IF caller_role = 'admin' THEN
    RETURN QUERY
      SELECT v.recommendation, v.summary, v.reasons, v.verified_at
      FROM public.listing_verifications v
      WHERE v.listing_id = p_listing_id;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.listings l
    WHERE l.id = p_listing_id AND l.user_id = caller_uid
  )
  INTO is_owner;

  IF NOT is_owner THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT v.recommendation, v.summary, v.reasons, v.verified_at
    FROM public.listing_verifications v
    WHERE v.listing_id = p_listing_id;
END;
$function$;

-- 4. ACL hygiene. finalize_listing_verification stays service-role only. The
-- owner-safe read is granted to authenticated only. No new browser authority;
-- there is no trusted-reject trigger function to grant.
REVOKE EXECUTE ON FUNCTION public.get_listing_verification(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_listing_verification(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_listing_verification(UUID) FROM service_role;
GRANT EXECUTE ON FUNCTION public.get_listing_verification(UUID) TO authenticated;
