-- Least-privilege PostgREST grants for the active browser application.
-- RLS remains the row-level authorization layer.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public marketplace reads.
GRANT SELECT ON TABLE
  public.categories,
  public.listings,
  public.listing_images,
  public.profiles
TO anon, authenticated;

-- Authenticated marketplace operations.
GRANT INSERT, UPDATE, DELETE ON TABLE public.listings TO authenticated;
GRANT UPDATE ON TABLE public.profiles TO authenticated;
GRANT INSERT ON TABLE public.listing_images TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.favorites TO authenticated;

-- Authenticated chat operations used by the browser.
GRANT SELECT, INSERT, UPDATE ON TABLE public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.messages TO authenticated;
GRANT SELECT, INSERT ON TABLE public.message_attachments TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.message_reactions TO authenticated;
GRANT SELECT, INSERT ON TABLE public.message_reads TO authenticated;
