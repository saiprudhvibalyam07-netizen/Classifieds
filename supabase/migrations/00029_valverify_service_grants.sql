-- Least-privilege grants for the server-side ValVerify worker.
-- RLS remains the browser-facing authorization layer.

GRANT SELECT ON TABLE
  public.categories,
  public.listings,
  public.listing_images
TO service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.listing_verifications TO service_role;

-- RLS restricts this browser grant to Admin profiles.
GRANT SELECT ON TABLE public.listing_verifications TO authenticated;
