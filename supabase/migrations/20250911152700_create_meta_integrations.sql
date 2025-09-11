-- Create simplified meta_integrations table
-- This replaces the complex meta_ad_accounts approach
-- Only stores token + basic metadata for connection management

CREATE TABLE IF NOT EXISTS meta_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  account_count INTEGER DEFAULT 0,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_integrations_user_id ON meta_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_integrations_active ON meta_integrations(user_id, is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE meta_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only access their own integrations
CREATE POLICY "Users can view own meta integrations" ON meta_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meta integrations" ON meta_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meta integrations" ON meta_integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meta integrations" ON meta_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meta_integrations_updated_at
  BEFORE UPDATE ON meta_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE meta_integrations IS 'Simple Meta Ads integration tracking - stores only tokens and connection status';
COMMENT ON COLUMN meta_integrations.access_token IS 'Meta access token - should be encrypted in production';
COMMENT ON COLUMN meta_integrations.account_count IS 'Number of ad accounts this token can access';
COMMENT ON COLUMN meta_integrations.last_validated_at IS 'Last time the token was validated against Meta API';