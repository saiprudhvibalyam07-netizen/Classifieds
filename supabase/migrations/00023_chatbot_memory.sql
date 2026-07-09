-- Phase 3: Memory & Personalization
-- Adds session/persistent memory, user profiles, preference learning, and conversation summaries

-- Memory entries table (session + persistent)
CREATE TABLE chatbot_memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('session', 'persistent', 'preference', 'interest', 'interaction', 'conversation')),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  confidence NUMERIC(4, 3) DEFAULT 0.5,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles table
CREATE TABLE chatbot_user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}'::jsonb,
  recent_topics TEXT[] DEFAULT '{}',
  viewed_listings UUID[] DEFAULT '{}',
  session_count INTEGER DEFAULT 1,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Conversation summaries
CREATE TABLE chatbot_conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  summary TEXT NOT NULL,
  topics TEXT[] DEFAULT '{}',
  key_mentions TEXT[] DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- Privacy settings
CREATE TABLE chatbot_privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_enabled BOOLEAN DEFAULT true,
  preference_learning BOOLEAN DEFAULT true,
  conversation_summarization BOOLEAN DEFAULT true,
  data_retention_days INTEGER DEFAULT 30,
  allow_personalization BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Privacy audit log
CREATE TABLE chatbot_privacy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_memory_user_id ON chatbot_memory_entries(user_id);
CREATE INDEX idx_memory_session_id ON chatbot_memory_entries(session_id);
CREATE INDEX idx_memory_scope ON chatbot_memory_entries(scope);
CREATE INDEX idx_memory_key ON chatbot_memory_entries(key);
CREATE INDEX idx_memory_expires ON chatbot_memory_entries(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_memory_user_scope ON chatbot_memory_entries(user_id, scope);
CREATE INDEX idx_conversation_summaries_user ON chatbot_conversation_summaries(user_id);
CREATE INDEX idx_conversation_summaries_conversation ON chatbot_conversation_summaries(conversation_id);
CREATE INDEX idx_privacy_audit_user ON chatbot_privacy_audit_log(user_id);

-- RLS policies
ALTER TABLE chatbot_memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_privacy_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own memory entries
CREATE POLICY memory_select_own ON chatbot_memory_entries
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own memory entries
CREATE POLICY memory_insert_own ON chatbot_memory_entries
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own memory entries
CREATE POLICY memory_update_own ON chatbot_memory_entries
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own memory entries
CREATE POLICY memory_delete_own ON chatbot_memory_entries
  FOR DELETE USING (user_id = auth.uid());

-- User profiles: read/write own
CREATE POLICY profiles_select_own ON chatbot_user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY profiles_insert_own ON chatbot_user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY profiles_update_own ON chatbot_user_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Conversation summaries: read own
CREATE POLICY summaries_select_own ON chatbot_conversation_summaries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY summaries_insert_own ON chatbot_conversation_summaries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY summaries_update_own ON chatbot_conversation_summaries
  FOR UPDATE USING (user_id = auth.uid());

-- Privacy settings: read/write own
CREATE POLICY privacy_select_own ON chatbot_privacy_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY privacy_insert_own ON chatbot_privacy_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY privacy_update_own ON chatbot_privacy_settings
  FOR UPDATE USING (user_id = auth.uid());

-- Audit log: read own
CREATE POLICY audit_select_own ON chatbot_privacy_audit_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY audit_insert_own ON chatbot_privacy_audit_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin full access policies
CREATE POLICY memory_admin_all ON chatbot_memory_entries
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY profiles_admin_all ON chatbot_user_profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY summaries_admin_all ON chatbot_conversation_summaries
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY privacy_admin_all ON chatbot_privacy_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY audit_admin_all ON chatbot_privacy_audit_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Allow service role (server-side) full access
CREATE POLICY memory_service_all ON chatbot_memory_entries
  FOR ALL USING (auth.uid() IS NULL);

CREATE POLICY profiles_service_all ON chatbot_user_profiles
  FOR ALL USING (auth.uid() IS NULL);

CREATE POLICY summaries_service_all ON chatbot_conversation_summaries
  FOR ALL USING (auth.uid() IS NULL);

CREATE POLICY privacy_service_all ON chatbot_privacy_settings
  FOR ALL USING (auth.uid() IS NULL);

CREATE POLICY audit_service_all ON chatbot_privacy_audit_log
  FOR ALL USING (auth.uid() IS NULL);

-- Update triggers for updated_at
CREATE TRIGGER update_memory_entries_updated_at
  BEFORE UPDATE ON chatbot_memory_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON chatbot_user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_settings_updated_at
  BEFORE UPDATE ON chatbot_privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
