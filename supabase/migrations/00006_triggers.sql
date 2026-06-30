-- ============================================================================
-- Phase 1: Chat Architecture v2 — Database Triggers
-- ============================================================================

-- ============================================================================
-- 14. TRIGGERS — updated_at
-- ============================================================================
-- Ensures updated_at is set to now() on every row update.
-- Each ALTER TABLE is idempotent (IF NOT EXISTS).
-- Each CREATE TRIGGER is idempotent (DROP TRIGGER IF EXISTS precedes).

-- Verify all tables have updated_at before attaching triggers
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_listings_updated_at ON listings;
CREATE TRIGGER set_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_conversations_updated_at ON conversations;
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_messages_updated_at ON messages;
CREATE TRIGGER set_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_offers_updated_at ON offers;
CREATE TRIGGER set_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_user_presence_updated_at ON user_presence;
CREATE TRIGGER set_user_presence_updated_at
  BEFORE UPDATE ON user_presence
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 15. TRIGGERS — auto-update conversations on message changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE conversations
    SET last_message = LEFT(COALESCE(NEW.content, NEW.message), 500),
        last_message_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.conversation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE conversations
    SET last_message = (
      SELECT COALESCE(content, message)
      FROM messages
      WHERE conversation_id = OLD.conversation_id AND is_deleted = false
      ORDER BY created_at DESC
      LIMIT 1
    ),
    last_message_at = (
      SELECT created_at
      FROM messages
      WHERE conversation_id = OLD.conversation_id AND is_deleted = false
      ORDER BY created_at DESC
      LIMIT 1
    ),
    updated_at = now()
    WHERE id = OLD.conversation_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_message_insert ON messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ============================================================================
-- 16. TRIGGERS — auto-create notifications
-- ============================================================================
-- SECURITY DEFINER is required so the trigger can insert into
-- notification_events regardless of the table's INSERT policy
-- (which requires service_role for direct client inserts).

CREATE OR REPLACE FUNCTION create_notification_on_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notification_events (user_id, type, title, body, data)
  SELECT cp.profile_id, 'new_message',
    'New message',
    LEFT(COALESCE(NEW.content, NEW.message), 200),
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id,
      'sender_id', NEW.sender_id
    )
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.profile_id != NEW.sender_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_message_notification ON messages;
CREATE TRIGGER on_message_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_message();

CREATE OR REPLACE FUNCTION create_notification_on_offer()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_type TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_notification_type := 'offer_received';
    v_title := 'Offer received';
    v_body := 'An offer of $' || NEW.amount || ' has been received.';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
      v_notification_type := 'offer_accepted';
      v_title := 'Offer accepted';
      v_body := 'Your offer of $' || NEW.amount || ' was accepted.';
    ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
      v_notification_type := 'offer_rejected';
      v_title := 'Offer rejected';
      v_body := 'Your offer of $' || NEW.amount || ' was rejected.';
    ELSIF NEW.status = 'countered' AND OLD.status != 'countered' THEN
      v_notification_type := 'offer_countered';
      v_title := 'Offer countered';
      v_body := 'A counter-offer of $' || NEW.amount || ' has been received.';
    ELSE
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO notification_events (user_id, type, title, body, data)
  SELECT cp.profile_id, v_notification_type, v_title, v_body,
    jsonb_build_object(
      'offer_id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'listing_id', NEW.listing_id,
      'amount', NEW.amount,
      'status', NEW.status
    )
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.profile_id != NEW.sender_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_offer_insert_notification ON offers;
CREATE TRIGGER on_offer_insert_notification
  AFTER INSERT ON offers
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_offer();

DROP TRIGGER IF EXISTS on_offer_update_notification ON offers;
CREATE TRIGGER on_offer_update_notification
  AFTER UPDATE OF status ON offers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION create_notification_on_offer();
