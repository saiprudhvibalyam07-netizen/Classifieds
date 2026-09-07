-- ValVerify V2: durable per-user verification quota (Gemini cost-abuse control).
-- Closes Step 10A MED-1: a trusted server/DB bound limits new paid verification
-- runs per authenticated user before any expensive AI work. No CAPTCHA, no
-- client throttling, no IP-based limiting.

CREATE TABLE IF NOT EXISTS public.valverify_rate_quota (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.valverify_rate_quota ENABLE ROW LEVEL SECURITY;

-- No RLS policies: only the SECURITY DEFINER function below may touch the
-- table. Browser roles and even service_role hold no direct table right.
REVOKE ALL ON TABLE public.valverify_rate_quota FROM PUBLIC;
REVOKE ALL ON TABLE public.valverify_rate_quota FROM anon;
REVOKE ALL ON TABLE public.valverify_rate_quota FROM authenticated;
REVOKE ALL ON TABLE public.valverify_rate_quota FROM service_role;

COMMENT ON TABLE public.valverify_rate_quota IS
  'Fixed-window per-user verification budget, consumed only by claim_listing_verification_with_quota().';

-- Claims a verification run and charges the user budget ONLY for a genuinely
-- new run (CLAIMED). REUSE and IN_PROGRESS never touch the budget. When the
-- budget is exhausted the pre-claim row is restored inside the same
-- transaction and LIMITED is returned, so a denied request leaves no leftover
-- RUNNING row and starts no Gemini work.
CREATE OR REPLACE FUNCTION public.claim_listing_verification_with_quota(
  p_listing_id UUID,
  p_run_id UUID,
  p_content_hash TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER,
  p_exempt BOOLEAN
)
RETURNS TABLE (
  claim_status TEXT,
  verification_row JSONB,
  quota_allowed BOOLEAN,
  quota_remaining INTEGER,
  quota_retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id UUID;
  v_before public.listing_verifications%ROWTYPE;
  v_claim RECORD;
  v_window_started_at TIMESTAMPTZ;
  v_count INTEGER;
  v_retry_after INTEGER;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_listing_id IS NULL OR p_run_id IS NULL OR p_content_hash IS NULL OR length(p_content_hash) = 0 THEN
    RAISE EXCEPTION 'Invalid verification claim' USING ERRCODE = '22023';
  END IF;

  -- Quota identity is the listing OWNER resolved from the database. The trusted
  -- server caller has already proved the authenticated user is this owner (or
  -- an exempt admin). No user identifier is ever accepted from the caller, so a
  -- request can never charge another user's budget.
  SELECT user_id INTO v_user_id FROM public.listings WHERE id = p_listing_id;
  IF v_user_id IS NULL THEN
    claim_status := 'LISTING_MISSING';
    verification_row := NULL;
    quota_allowed := FALSE;
    quota_remaining := NULL;
    quota_retry_after_seconds := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Snapshot the existing verification row so an over-budget CLAIMED run can be
  -- rolled back exactly (same transaction, so no other actor observes an
  -- intermediate state). REUSE/IN_PROGRESS outcomes make no writes below.
  SELECT * INTO v_before
  FROM public.listing_verifications
  WHERE listing_id = p_listing_id
  FOR UPDATE;

  SELECT * INTO v_claim
  FROM public.claim_listing_verification(p_listing_id, p_run_id, p_content_hash) AS claim_result;

  -- REUSE and IN_PROGRESS never start paid work and never consume budget.
  IF v_claim.claim_status <> 'CLAIMED' THEN
    claim_status := v_claim.claim_status;
    verification_row := v_claim.verification_row;
    quota_allowed := TRUE;
    quota_remaining := NULL;
    quota_retry_after_seconds := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF NOT p_exempt THEN
    -- Atomically consume one budget slot in the current fixed window. The
    -- single-statement UPSERT serializes concurrent checks on the quota row.
    INSERT INTO public.valverify_rate_quota (user_id, window_started_at, request_count)
    VALUES (v_user_id, clock_timestamp(), 1)
    ON CONFLICT (user_id) DO UPDATE SET
      request_count = CASE
        WHEN public.valverify_rate_quota.window_started_at
          <= clock_timestamp() - make_interval(secs => p_window_seconds)
          THEN 1
        WHEN public.valverify_rate_quota.request_count >= p_max_requests
          THEN p_max_requests + 1
        ELSE public.valverify_rate_quota.request_count + 1
      END,
      window_started_at = CASE
        WHEN public.valverify_rate_quota.window_started_at
          <= clock_timestamp() - make_interval(secs => p_window_seconds)
          THEN clock_timestamp()
        ELSE public.valverify_rate_quota.window_started_at
      END
    RETURNING window_started_at, request_count INTO v_window_started_at, v_count;

    IF v_count > p_max_requests THEN
      v_retry_after := GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (
          v_window_started_at + make_interval(secs => p_window_seconds) - clock_timestamp()
        )))::INTEGER
      );

      -- Roll the claim back so the denied request leaves no RUNNING row and the
      -- pre-existing generation (if any) is preserved.
      DELETE FROM public.listing_verifications WHERE listing_id = p_listing_id;
      IF v_before.listing_id IS NOT NULL THEN
        INSERT INTO public.listing_verifications SELECT (v_before).*;
      END IF;

      claim_status := 'LIMITED';
      verification_row := NULL;
      quota_allowed := FALSE;
      quota_remaining := 0;
      quota_retry_after_seconds := v_retry_after;
      RETURN NEXT;
      RETURN;
    END IF;

    quota_allowed := TRUE;
    quota_remaining := GREATEST(0, p_max_requests - v_count);
  ELSE
    quota_allowed := TRUE;
    quota_remaining := NULL;
  END IF;

  claim_status := v_claim.claim_status;
  verification_row := NULL;
  quota_retry_after_seconds := NULL;
  RETURN NEXT;
  RETURN;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_listing_verification_with_quota(UUID, UUID, TEXT, INTEGER, INTEGER, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_listing_verification_with_quota(UUID, UUID, TEXT, INTEGER, INTEGER, BOOLEAN) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_listing_verification_with_quota(UUID, UUID, TEXT, INTEGER, INTEGER, BOOLEAN) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_listing_verification_with_quota(UUID, UUID, TEXT, INTEGER, INTEGER, BOOLEAN) FROM service_role;
GRANT EXECUTE ON FUNCTION public.claim_listing_verification_with_quota(UUID, UUID, TEXT, INTEGER, INTEGER, BOOLEAN) TO service_role;

COMMENT ON FUNCTION public.claim_listing_verification_with_quota(UUID, UUID, TEXT, INTEGER, INTEGER, BOOLEAN) IS
  'Atomic claim + per-user verification rate limiting. Only a new CLAIMED run consumes budget; REUSE/IN_PROGRESS are free. Returns LIMITED (429) without leaving any claim mutation when the budget is exhausted. Exempt (admin) callers bypass the budget.';

-- Cheap early probe so an over-quota user is rejected BEFORE any image fetch or
-- Gemini work. The atomic claim remains the authoritative boundary; this only
-- avoids wasted work on an already-exhausted budget. Non-authoritative: the
-- claim RPC re-enforces the limit under a row lock.
CREATE OR REPLACE FUNCTION public.valverify_rate_check(
  p_listing_id UUID,
  p_max_requests INTEGER,
  p_window_seconds INTEGER,
  p_exempt BOOLEAN
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id UUID;
  v_window_started_at TIMESTAMPTZ;
  v_count INTEGER;
  v_allowed BOOLEAN;
  v_remaining INTEGER;
  v_retry_after INTEGER;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_exempt THEN
    v_allowed := TRUE;
    v_remaining := NULL;
    v_retry_after := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT user_id INTO v_user_id FROM public.listings WHERE id = p_listing_id;
  IF v_user_id IS NULL THEN
    v_allowed := TRUE;
    v_remaining := NULL;
    v_retry_after := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.valverify_rate_quota
    WHERE user_id = v_user_id
  ) THEN
    SELECT window_started_at, request_count INTO v_window_started_at, v_count
    FROM public.valverify_rate_quota
    WHERE user_id = v_user_id;

    IF v_window_started_at > clock_timestamp() - make_interval(secs => p_window_seconds)
       AND v_count >= p_max_requests THEN
      v_allowed := FALSE;
      v_remaining := 0;
      v_retry_after := GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (
          v_window_started_at + make_interval(secs => p_window_seconds) - clock_timestamp()
        )))::INTEGER
      );
      RETURN NEXT;
      RETURN;
    END IF;

    v_allowed := TRUE;
    v_remaining := GREATEST(0, p_max_requests - v_count);
    v_retry_after := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  v_allowed := TRUE;
  v_remaining := p_max_requests;
  v_retry_after := NULL;
  RETURN NEXT;
  RETURN;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.valverify_rate_check(UUID, INTEGER, INTEGER, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.valverify_rate_check(UUID, INTEGER, INTEGER, BOOLEAN) FROM anon;
REVOKE EXECUTE ON FUNCTION public.valverify_rate_check(UUID, INTEGER, INTEGER, BOOLEAN) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.valverify_rate_check(UUID, INTEGER, INTEGER, BOOLEAN) FROM service_role;
GRANT EXECUTE ON FUNCTION public.valverify_rate_check(UUID, INTEGER, INTEGER, BOOLEAN) TO service_role;

COMMENT ON FUNCTION public.valverify_rate_check(UUID, INTEGER, INTEGER, BOOLEAN) IS
  'Non-authoritative early probe to reject an already-exhausted per-user budget before image fetch or Gemini work. The atomic claim RPC is the real enforcement point.';