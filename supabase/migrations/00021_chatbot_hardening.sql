-- ValBot Chatbot — Phase 1A.1 Hardening
-- Adds helper function for session-based RLS
-- Removes dependency on undocumented increment RPC

-- ── Session Context Function ──────────────────────────────────────
-- Sets the app.session_id used by RLS policies for anonymous users

CREATE OR REPLACE FUNCTION public.set_chatbot_session(session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.session_id', session_id, true);
END;
$$;
