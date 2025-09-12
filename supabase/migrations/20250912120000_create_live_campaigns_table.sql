-- Create live_campaigns table to link Meta campaigns to lives
-- This allows tracking specific campaigns performance within a Live context

CREATE TABLE IF NOT EXISTS public.live_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL, -- Meta campaign ID
  campaign_name TEXT NOT NULL,
  account_id TEXT, -- Meta ad account ID (optional, for reference)
  account_name TEXT, -- Meta ad account name (optional, for display)
  objective TEXT, -- Campaign objective (e.g., LEAD_GENERATION, CONVERSIONS)
  status TEXT, -- Campaign status (ACTIVE, PAUSED, etc.)
  daily_budget NUMERIC, -- Daily budget in cents
  lifetime_budget NUMERIC, -- Lifetime budget in cents
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate campaigns per live
  UNIQUE(live_id, campaign_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_campaigns_live_id ON public.live_campaigns(live_id);
CREATE INDEX IF NOT EXISTS idx_live_campaigns_campaign_id ON public.live_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_live_campaigns_status ON public.live_campaigns(status);

-- RLS Policies
ALTER TABLE public.live_campaigns ENABLE ROW LEVEL SECURITY;

-- Users can only access campaign links for their own lives
CREATE POLICY "Users can view campaign links for own lives" ON public.live_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lives l 
      WHERE l.id = live_campaigns.live_id 
      AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert campaign links for own lives" ON public.live_campaigns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lives l 
      WHERE l.id = live_campaigns.live_id 
      AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update campaign links for own lives" ON public.live_campaigns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.lives l 
      WHERE l.id = live_campaigns.live_id 
      AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete campaign links for own lives" ON public.live_campaigns
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.lives l 
      WHERE l.id = live_campaigns.live_id 
      AND l.user_id = auth.uid()
    )
  );

-- Update timestamp trigger
CREATE TRIGGER update_live_campaigns_updated_at
  BEFORE UPDATE ON public.live_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.live_campaigns IS 'Links between Lives and Meta Ads campaigns for performance tracking';
COMMENT ON COLUMN public.live_campaigns.campaign_id IS 'Meta campaign ID from Facebook Marketing API';
COMMENT ON COLUMN public.live_campaigns.daily_budget IS 'Campaign daily budget in cents (compatible with Meta API)';
COMMENT ON COLUMN public.live_campaigns.lifetime_budget IS 'Campaign lifetime budget in cents (compatible with Meta API)';