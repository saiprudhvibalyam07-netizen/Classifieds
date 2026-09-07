-- ValClassifieds: seller edits must not inherit Admin approval.
-- Seller listing updates are limited to content fields. Admin status changes
-- use a role-checked RPC instead of the browser table grant.

REVOKE UPDATE ON TABLE public.listings FROM authenticated;

GRANT UPDATE (
  title,
  description,
  price,
  category_id,
  location,
  latitude,
  longitude,
  address,
  city,
  state,
  condition,
  views_count
)
ON TABLE public.listings
TO authenticated;

-- The RLS policy already expresses the intended owner-only delete rule.
GRANT DELETE ON TABLE public.listing_images TO authenticated;

DROP POLICY IF EXISTS "Users can update own listings" ON public.listings;
CREATE POLICY "Users can update own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.mark_listing_verification_stale(p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.listing_verifications
  SET verification_status = 'ERROR',
      recommendation = 'REVIEW',
      confidence = NULL,
      risk_score = NULL,
      checks = '{}'::jsonb,
      summary = 'Listing content changed; automated verification must be rerun.',
      reasons = jsonb_build_array('Listing content changed after the previous verification.'),
      provider = NULL,
      model = NULL,
      verified_at = NULL,
      error = jsonb_build_object(
        'code', 'STALE_INPUT',
        'message', 'Listing content changed after the previous verification.',
        'retryable', true
      )
  WHERE listing_id = p_listing_id
    AND verification_status <> 'RUNNING';
END;
$function$;

-- This trigger is intentionally conservative for non-admin callers. It also
-- normalizes direct active inserts and protects ownership/system fields.
CREATE OR REPLACE FUNCTION public.enforce_listing_moderation_safety()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  caller_is_admin BOOLEAN;
  material_changed BOOLEAN;
BEGIN
  IF COALESCE(auth.role(), '') <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
  INTO caller_is_admin;

  IF caller_is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status = 'pending';
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  material_changed := NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.price IS DISTINCT FROM OLD.price
    OR NEW.category_id IS DISTINCT FROM OLD.category_id
    OR NEW.condition IS DISTINCT FROM OLD.condition
    OR NEW.location IS DISTINCT FROM OLD.location
    OR NEW.latitude IS DISTINCT FROM OLD.latitude
    OR NEW.longitude IS DISTINCT FROM OLD.longitude
    OR NEW.address IS DISTINCT FROM OLD.address
    OR NEW.city IS DISTINCT FROM OLD.city
    OR NEW.state IS DISTINCT FROM OLD.state;

  IF (NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'active') OR material_changed THEN
    NEW.status = 'pending';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.invalidate_listing_verification_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.price IS DISTINCT FROM OLD.price
    OR NEW.category_id IS DISTINCT FROM OLD.category_id
    OR NEW.condition IS DISTINCT FROM OLD.condition
    OR NEW.location IS DISTINCT FROM OLD.location
    OR NEW.latitude IS DISTINCT FROM OLD.latitude
    OR NEW.longitude IS DISTINCT FROM OLD.longitude
    OR NEW.address IS DISTINCT FROM OLD.address
    OR NEW.city IS DISTINCT FROM OLD.city
    OR NEW.state IS DISTINCT FROM OLD.state
  ) THEN
    PERFORM public.mark_listing_verification_stale(NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS listings_moderation_safety ON public.listings;
CREATE TRIGGER listings_moderation_safety
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_moderation_safety();

DROP TRIGGER IF EXISTS listings_invalidate_verification_on_change ON public.listings;
CREATE TRIGGER listings_invalidate_verification_on_change
  AFTER UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_listing_verification_on_change();

-- Image rows are material listing content. This also invalidates old results
-- for Admin edits while only seller-owned changes force status to pending.
CREATE OR REPLACE FUNCTION public.enforce_listing_image_remoderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  caller_is_admin BOOLEAN;
  target_listing_id UUID;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.mark_listing_verification_stale(OLD.listing_id);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.mark_listing_verification_stale(NEW.listing_id);
  END IF;

  IF COALESCE(auth.role(), '') <> 'authenticated' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
  INTO caller_is_admin;

  IF caller_is_admin THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  target_listing_id := COALESCE(NEW.listing_id, OLD.listing_id);
  UPDATE public.listings
  SET status = 'pending'
  WHERE id = target_listing_id
    AND user_id = auth.uid()
    AND status IS DISTINCT FROM 'pending';

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS listing_images_remoderation ON public.listing_images;
CREATE TRIGGER listing_images_remoderation
  AFTER INSERT OR UPDATE OR DELETE ON public.listing_images
  FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_image_remoderation();

-- Admin moderation remains available to the authenticated Admin role without
-- granting status-column UPDATE to ordinary authenticated users.
CREATE OR REPLACE FUNCTION public.admin_set_listing_status(
  p_listing_id UUID,
  p_status TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  changed_listing_id UUID;
BEGIN
  IF COALESCE(auth.role(), '') <> 'authenticated'
     OR NOT EXISTS (
       SELECT 1
       FROM public.profiles
       WHERE id = auth.uid() AND role = 'admin'
     ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('pending', 'active', 'sold', 'inactive') THEN
    RAISE EXCEPTION 'Invalid listing status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.listings
  SET status = p_status
  WHERE id = p_listing_id
  RETURNING id INTO changed_listing_id;

  IF changed_listing_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN changed_listing_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.mark_listing_verification_stale(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_listing_verification_stale(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_listing_verification_stale(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_listing_verification_stale(UUID) FROM service_role;

REVOKE EXECUTE ON FUNCTION public.admin_set_listing_status(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_listing_status(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_listing_status(UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_listing_status(UUID, TEXT) FROM service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_listing_status(UUID, TEXT) TO authenticated;
