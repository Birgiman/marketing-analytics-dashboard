-- Create campaign_insights table to store Meta Ads insights data
CREATE TABLE IF NOT EXISTS campaign_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  spend DECIMAL(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  frequency DECIMAL(5,2) DEFAULT 0,
  cpm DECIMAL(10,2) DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0,
  cpp DECIMAL(10,2) DEFAULT 0,
  cost_per_unique_click DECIMAL(10,2) DEFAULT 0,
  actions JSONB DEFAULT '[]'::jsonb,
  campaign_name TEXT,
  ad_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate insights for same campaign/date range
  UNIQUE(campaign_id, date_start, date_stop)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_insights_campaign_id ON campaign_insights(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_insights_user_id ON campaign_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_insights_date_range ON campaign_insights(date_start, date_stop);
CREATE INDEX IF NOT EXISTS idx_campaign_insights_created_at ON campaign_insights(created_at);

-- Enable RLS
ALTER TABLE campaign_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own campaign insights" 
  ON campaign_insights FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaign insights" 
  ON campaign_insights FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaign insights" 
  ON campaign_insights FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign insights" 
  ON campaign_insights FOR DELETE 
  USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE campaign_insights IS 'Store Meta Ads campaign insights data for performance and caching';
COMMENT ON COLUMN campaign_insights.campaign_id IS 'Meta Ads campaign ID';
COMMENT ON COLUMN campaign_insights.actions IS 'JSON array of Meta Ads actions (leads, conversions, etc.)';