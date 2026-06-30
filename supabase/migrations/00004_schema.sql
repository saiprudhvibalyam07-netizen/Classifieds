-- ============================================================================
-- Phase 1: Chat Architecture v2 — Schema
-- New tables, columns, indexes, backfill
-- Zero-downtime: old columns kept for backward compatibility during parallel run
-- ============================================================================

-- ============================================================================
-- 1. ADD NEW COLUMNS TO EXISTING TABLES
-- ============================================================================

-- conversations: add new columns (keep buyer_id, seller_id for backward compat)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS conversations_updated_at_idx ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS conversations_listing_idx ON conversations(listing_id);

-- messages: add new columns (keep message, is_read, attachments for backward compat)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text'
  CHECK (type IN ('text', 'image', 'file', 'system', 'offer', 'listing_share', 'call_start', 'call_end', 'call_missed'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS call_duration INTEGER;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN (metadata);

-- Backfill existing messages: set content = message, type = 'text'
UPDATE messages SET content = message, type = 'text', is_deleted = false
WHERE content IS NULL AND message IS NOT NULL;

-- ============================================================================
-- 2. CREATE NEW TABLES
-- ============================================================================

-- conversation_participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'seller', 'buyer')),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE(conversation_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cp_profile ON conversation_participants(profile_id);

-- message_attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'file', 'voice')),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  thumbnail_url TEXT,
  thumbnail_width INTEGER,
  thumbnail_height INTEGER,
  blur_hash TEXT,
  file_hash TEXT,
  virus_scan_status TEXT DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ma_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_ma_type ON message_attachments(type);
CREATE INDEX IF NOT EXISTS idx_ma_hash ON message_attachments(file_hash);

-- message_reads
CREATE TABLE IF NOT EXISTS message_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_mr_message ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_mr_profile ON message_reads(profile_id);

-- message_reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, profile_id, emoji)
);

-- offers
CREATE TABLE IF NOT EXISTS offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'countered', 'rejected', 'expired', 'withdrawn')),
  message TEXT,
  counter_to_offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_conversation ON offers(conversation_id);
CREATE INDEX IF NOT EXISTS idx_offers_listing ON offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- notification_events
CREATE TABLE IF NOT EXISTS notification_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'new_message', 'offer_received', 'offer_accepted', 'offer_rejected',
    'offer_countered', 'listing_shared', 'mention', 'reaction',
    'conversation_added', 'message_edited', 'message_deleted'
  )),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ne_user ON notification_events(user_id, is_read, created_at DESC);

-- user_presence
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- call_logs (future voice call support)
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  caller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  callee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'missed' CHECK (status IN ('ringing', 'ongoing', 'ended', 'missed', 'rejected')),
  duration INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  call_type TEXT DEFAULT 'audio' CHECK (call_type IN ('audio', 'video'))
);

-- ============================================================================
-- 3. BACKFILL FROM OLD conversations DATA
-- ============================================================================

INSERT INTO conversation_participants (conversation_id, profile_id, role)
SELECT id, buyer_id, 'buyer' FROM conversations c
WHERE buyer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.profile_id = c.buyer_id
  );

INSERT INTO conversation_participants (conversation_id, profile_id, role)
SELECT id, seller_id, 'seller' FROM conversations c
WHERE seller_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.profile_id = c.seller_id
  );

-- Backfill message_reads from old is_read column
INSERT INTO message_reads (message_id, profile_id, read_at)
SELECT m.id, cp.profile_id, m.created_at
FROM messages m
JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
WHERE m.is_read = true AND m.sender_id != cp.profile_id
  AND NOT EXISTS (
    SELECT 1 FROM message_reads mr
    WHERE mr.message_id = m.id AND mr.profile_id = cp.profile_id
  );
