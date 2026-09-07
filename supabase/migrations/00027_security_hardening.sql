-- Security hardening for browser-facing and administrative RPCs.
-- This migration does not change table grants or RLS policies.

CREATE OR REPLACE FUNCTION public.chat_unread_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  unread_count integer;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*)::integer
  INTO unread_count
  FROM public.messages AS m
  WHERE m.sender_id <> p_user_id
    AND m.conversation_id IN (
      SELECT c.id
      FROM public.conversations AS c
      WHERE c.buyer_id = p_user_id
         OR c.seller_id = p_user_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.message_reads AS mr
      WHERE mr.message_id = m.id
        AND mr.profile_id = p_user_id
    );

  RETURN unread_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.chat_unread_conversation_ids(p_user_id uuid)
RETURNS TABLE(conversation_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT DISTINCT m.conversation_id
  FROM public.messages AS m
  WHERE m.sender_id <> p_user_id
    AND m.conversation_id IN (
      SELECT c.id
      FROM public.conversations AS c
      WHERE c.buyer_id = p_user_id
         OR c.seller_id = p_user_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.message_reads AS mr
      WHERE mr.message_id = m.id
        AND mr.profile_id = p_user_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.promote_to_admin(target_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  profile_id uuid;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT p.id
  INTO profile_id
  FROM public.profiles AS p
  WHERE p.email = target_email;

  IF profile_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email: %', target_email;
  END IF;

  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = profile_id;

  RETURN profile_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.chat_unread_count(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.chat_unread_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.chat_unread_count(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.chat_unread_count(uuid) FROM service_role;
GRANT EXECUTE ON FUNCTION public.chat_unread_count(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.chat_unread_conversation_ids(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.chat_unread_conversation_ids(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.chat_unread_conversation_ids(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.chat_unread_conversation_ids(uuid) FROM service_role;
GRANT EXECUTE ON FUNCTION public.chat_unread_conversation_ids(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.promote_to_admin(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.promote_to_admin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.promote_to_admin(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_to_admin(text) FROM service_role;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(text) TO service_role;
