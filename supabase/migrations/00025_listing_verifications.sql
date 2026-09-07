-- ValVerify V1: current verification result per listing

CREATE TABLE listing_verifications (
  listing_id UUID PRIMARY KEY
    REFERENCES listings(id) ON DELETE CASCADE,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('RUNNING', 'COMPLETED', 'ERROR')),
  recommendation TEXT
    CHECK (recommendation IS NULL OR recommendation IN ('APPROVE', 'REVIEW', 'REJECT')),
  confidence SMALLINT
    CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
  risk_score SMALLINT
    CHECK (risk_score IS NULL OR risk_score BETWEEN 0 AND 100),
  checks JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(checks) = 'object'),
  summary TEXT,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(reasons) = 'array'),
  provider TEXT
    CHECK (provider IS NULL OR provider = 'gemini'),
  model TEXT,
  content_hash TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  error JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT listing_verifications_error_state_check
    CHECK (
      verification_status <> 'ERROR'
      OR (
        recommendation IS NOT NULL
        AND recommendation = 'REVIEW'
        AND error IS NOT NULL
      )
    ),
  CONSTRAINT listing_verifications_completed_state_check
    CHECK (
      verification_status <> 'COMPLETED'
      OR error IS NULL
    ),
  CONSTRAINT listing_verifications_running_state_check
    CHECK (
      verification_status <> 'RUNNING'
      OR (
        recommendation IS NULL
        AND confidence IS NULL
        AND risk_score IS NULL
        AND verified_at IS NULL
        AND error IS NULL
      )
    )
);

CREATE INDEX listing_verifications_status_idx
  ON listing_verifications (verification_status);

CREATE INDEX listing_verifications_updated_at_idx
  ON listing_verifications (updated_at DESC);

ALTER TABLE listing_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view listing verifications"
  ON listing_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP TRIGGER IF EXISTS set_listing_verifications_updated_at ON listing_verifications;
CREATE TRIGGER set_listing_verifications_updated_at
  BEFORE UPDATE ON listing_verifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
