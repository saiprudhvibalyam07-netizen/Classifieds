-- ValVerify V1: durable run ownership and stale-write protection.
-- A 45 second lease exceeds the 30 second Vercel limit while covering
-- sequential image fetches (up to 9 seconds) and the 10 second AI timeout.

ALTER TABLE public.listing_verifications
  ADD COLUMN run_id UUID,
  ADD COLUMN run_started_at TIMESTAMPTZ;

-- Preserve the current row while giving every existing generation an owner.
UPDATE public.listing_verifications
SET run_id = COALESCE(run_id, gen_random_uuid()),
    run_started_at = COALESCE(run_started_at, updated_at, created_at, clock_timestamp())
WHERE run_id IS NULL OR run_started_at IS NULL;

ALTER TABLE public.listing_verifications
  ALTER COLUMN run_id SET NOT NULL,
  ALTER COLUMN run_started_at SET NOT NULL;

COMMENT ON COLUMN public.listing_verifications.run_id IS
  'Server-generated identifier for the verification execution that owns this row.';

COMMENT ON COLUMN public.listing_verifications.run_started_at IS
  'Start time of the verification execution identified by run_id; RUNNING leases expire after 45 seconds.';

-- Claiming is serialized at the row boundary. A live RUNNING generation is
-- never stolen; finished generations and expired RUNNING generations may be
-- replaced by a new run.
CREATE OR REPLACE FUNCTION public.claim_listing_verification(
  p_listing_id UUID,
  p_run_id UUID,
  p_content_hash TEXT
)
RETURNS TABLE (claim_status TEXT, verification_row JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_row public.listing_verifications%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_listing_id IS NULL OR p_run_id IS NULL OR p_content_hash IS NULL OR length(p_content_hash) = 0 THEN
    RAISE EXCEPTION 'Invalid verification claim' USING ERRCODE = '22023';
  END IF;

  LOOP
    INSERT INTO public.listing_verifications (
      listing_id,
      run_id,
      run_started_at,
      verification_status,
      recommendation,
      confidence,
      risk_score,
      checks,
      summary,
      reasons,
      provider,
      model,
      content_hash,
      verified_at,
      error
    ) VALUES (
      p_listing_id,
      p_run_id,
      clock_timestamp(),
      'RUNNING',
      NULL,
      NULL,
      NULL,
      '{}'::jsonb,
      NULL,
      '[]'::jsonb,
      NULL,
      NULL,
      p_content_hash,
      NULL,
      NULL
    )
    ON CONFLICT (listing_id) DO NOTHING;

    IF FOUND THEN
      RETURN QUERY SELECT 'CLAIMED'::TEXT, NULL::JSONB;
      RETURN;
    END IF;

    SELECT *
    INTO current_row
    FROM public.listing_verifications
    WHERE listing_id = p_listing_id
    FOR UPDATE;

    EXIT WHEN FOUND;
  END LOOP;

  IF current_row.verification_status = 'COMPLETED'
     AND current_row.content_hash = p_content_hash THEN
    RETURN QUERY SELECT 'REUSED'::TEXT, to_jsonb(current_row);
    RETURN;
  END IF;

  IF current_row.verification_status = 'RUNNING'
     AND current_row.run_started_at > clock_timestamp() - INTERVAL '45 seconds' THEN
    RETURN QUERY SELECT 'IN_PROGRESS'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  UPDATE public.listing_verifications
  SET run_id = p_run_id,
      run_started_at = clock_timestamp(),
      verification_status = 'RUNNING',
      recommendation = NULL,
      confidence = NULL,
      risk_score = NULL,
      checks = '{}'::jsonb,
      summary = NULL,
      reasons = '[]'::jsonb,
      provider = NULL,
      model = NULL,
      content_hash = p_content_hash,
      verified_at = NULL,
      error = NULL
  WHERE listing_id = p_listing_id;

  RETURN QUERY SELECT 'CLAIMED'::TEXT, NULL::JSONB;
END;
$function$;

-- Final writes lock the canonical listing, compare its version token, and
-- then update only the row still owned by this run and content generation.
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

  RETURN 'UPDATED';
END;
$function$;

-- Image rows do not have their own version column. Touching the parent listing
-- makes image insert/update/delete changes participate in the final guard.
CREATE OR REPLACE FUNCTION public.touch_listing_updated_at_from_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE public.listings
    SET updated_at = clock_timestamp()
    WHERE id = OLD.listing_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE')
     AND (TG_OP <> 'UPDATE' OR NEW.listing_id IS DISTINCT FROM OLD.listing_id) THEN
    UPDATE public.listings
    SET updated_at = clock_timestamp()
    WHERE id = NEW.listing_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS listing_images_touch_listing_updated_at ON public.listing_images;
CREATE TRIGGER listing_images_touch_listing_updated_at
  AFTER INSERT OR UPDATE OR DELETE ON public.listing_images
  FOR EACH ROW EXECUTE FUNCTION public.touch_listing_updated_at_from_image();

REVOKE EXECUTE ON FUNCTION public.claim_listing_verification(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_listing_verification(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_listing_verification(UUID, UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_listing_verification(UUID, UUID, TEXT) FROM service_role;
GRANT EXECUTE ON FUNCTION public.claim_listing_verification(UUID, UUID, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.finalize_listing_verification(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_listing_verification(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finalize_listing_verification(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_listing_verification(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB) FROM service_role;
GRANT EXECUTE ON FUNCTION public.finalize_listing_verification(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB) TO service_role;
