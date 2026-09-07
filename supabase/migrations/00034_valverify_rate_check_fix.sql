-- ValVerify V2: fix valverify_rate_check OUT-parameter assignment.
-- The original (00033) declared RETURNS TABLE(allowed, remaining, retry_after_seconds)
-- but the body assigned only local v_* variables, so every response emitted NULLs
-- and the early rate-limit probe never rejected an exhausted budget. This replaces
-- the function so RETURN NEXT emits the OUT parameters (allowed, remaining,
-- retry_after_seconds). Session variables are dropped; the RLS/grants metadata is
-- unchanged (CREATE OR REPLACE preserves ACLs).

CREATE OR REPLACE FUNCTION public.valverify_rate_check(
  p_listing_id uuid,
  p_max_requests integer,
  p_window_seconds integer,
  p_exempt boolean
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
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_exempt THEN
    allowed := TRUE;
    remaining := NULL;
    retry_after_seconds := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT user_id INTO v_user_id FROM public.listings WHERE id = p_listing_id;
  IF v_user_id IS NULL THEN
    allowed := TRUE;
    remaining := NULL;
    retry_after_seconds := NULL;
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
      allowed := FALSE;
      remaining := 0;
      retry_after_seconds := GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (
          v_window_started_at + make_interval(secs => p_window_seconds) - clock_timestamp()
        )))::INTEGER
      );
      RETURN NEXT;
      RETURN;
    END IF;

    allowed := TRUE;
    remaining := GREATEST(0, p_max_requests - v_count);
    retry_after_seconds := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  allowed := TRUE;
  remaining := p_max_requests;
  retry_after_seconds := NULL;
  RETURN NEXT;
  RETURN;
END;
$function$;

COMMENT ON FUNCTION public.valverify_rate_check(UUID, INTEGER, INTEGER, BOOLEAN) IS
  'Non-authoritative early probe to reject an already-exhausted per-user budget before image fetch or Gemini work. The atomic claim RPC is the real enforcement point.';