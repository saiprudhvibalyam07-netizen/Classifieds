-- ValVerify Step 10B: SQL EXECUTE privilege hygiene (LOW-1).
-- Four trigger functions created by 00006 (set_updated_at) and 00032
-- (enforce_listing_moderation_safety, invalidate_listing_verification_on_change,
-- enforce_listing_image_remoderation) retain the default PUBLIC EXECUTE ACL.
-- They are fired only by database triggers, never called by the browser or the
-- API. This migration is ACL-only: it revokes direct PUBLIC/anonymous/allowed-role
-- EXECUTE while leaving trigger firing intact (triggers run as the table/trigger
-- owner and do not require caller EXECUTE at fire time). Existing RPC ACLs
-- (admin_set_listing_status, mark_listing_verification_stale, claim/finalize
-- verification, valverify_rate_check) are intentionally untouched.

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_listing_moderation_safety() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_listing_moderation_safety() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_listing_moderation_safety() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.invalidate_listing_verification_on_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invalidate_listing_verification_on_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.invalidate_listing_verification_on_change() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_listing_image_remoderation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_listing_image_remoderation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_listing_image_remoderation() FROM authenticated;

COMMENT ON FUNCTION public.set_updated_at() IS
  'BEFORE UPDATE trigger helper; EXECUTE locked to owner only (ACL-only hardening, migration 00035).';

COMMENT ON FUNCTION public.enforce_listing_moderation_safety() IS
  'BEFORE INSERT/UPDATE listing moderation trigger; EXECUTE locked to owner only (ACL-only hardening, migration 00035).';

COMMENT ON FUNCTION public.invalidate_listing_verification_on_change() IS
  'AFTER UPDATE listing-verification invalidation trigger; EXECUTE locked to owner only (ACL-only hardening, migration 00035).';

COMMENT ON FUNCTION public.enforce_listing_image_remoderation() IS
  'AFTER INSERT/UPDATE/DELETE image remoderation trigger; EXECUTE locked to owner only (ACL-only hardening, migration 00035).';