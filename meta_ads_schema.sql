-- Meta Ads Integration - Database Schema
-- Substitui a tabela 'criativos' por um sistema mais estruturado

-- 1. Tabela para armazenar tokens de acesso do Meta
CREATE TABLE IF NOT EXISTS public.meta_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL, -- Meta Ad Account ID (e.g., act_123456789)
  access_token TEXT NOT NULL, -- Meta Access Token (encrypted)
  account_name TEXT,
  currency TEXT,
  timezone_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(user_id, ad_account_id)
);

-- 2. Tabela de Campanhas (Campaigns)
CREATE TABLE IF NOT EXISTS public.meta_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id UUID NOT NULL REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  
  -- Dados da API do Meta
  campaign_id TEXT NOT NULL, -- Meta Campaign ID
  name TEXT NOT NULL,
  status TEXT, -- ACTIVE, PAUSED, DELETED, etc.
  objective TEXT, -- REACH, TRAFFIC, CONVERSIONS, etc.
  
  -- Datas
  start_time TIMESTAMP WITH TIME ZONE,
  stop_time TIMESTAMP WITH TIME ZONE,
  created_time TIMESTAMP WITH TIME ZONE,
  updated_time TIMESTAMP WITH TIME ZONE,
  
  -- Budget (pode ser no campaign ou ad set level)
  daily_budget INTEGER, -- em centavos
  lifetime_budget INTEGER, -- em centavos
  budget_remaining INTEGER,
  
  -- Controle interno
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, campaign_id)
);

-- 3. Tabela de Ad Sets
CREATE TABLE IF NOT EXISTS public.meta_ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  
  -- Dados da API do Meta
  adset_id TEXT NOT NULL, -- Meta Ad Set ID
  name TEXT NOT NULL,
  status TEXT,
  
  -- Budget e bidding
  daily_budget INTEGER, -- em centavos
  lifetime_budget INTEGER,
  bid_amount INTEGER,
  bid_strategy TEXT,
  
  -- Targeting
  targeting_location TEXT[], -- Array de locais
  targeting_age_min INTEGER,
  targeting_age_max INTEGER,
  targeting_gender TEXT[],
  targeting_interests TEXT[],
  
  -- Datas
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  created_time TIMESTAMP WITH TIME ZONE,
  updated_time TIMESTAMP WITH TIME ZONE,
  
  -- Controle interno
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, adset_id)
);

-- 4. Tabela de Ads (Anúncios individuais)
CREATE TABLE IF NOT EXISTS public.meta_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  adset_id UUID NOT NULL REFERENCES public.meta_ad_sets(id) ON DELETE CASCADE,
  
  -- Dados da API do Meta
  ad_id TEXT NOT NULL, -- Meta Ad ID
  name TEXT NOT NULL,
  status TEXT,
  
  -- Creative info
  creative_id TEXT,
  creative_name TEXT,
  creative_object_story_spec JSONB, -- Dados completos do creative
  creative_asset_feed_spec JSONB,
  
  -- Links e tracking
  creative_link_url TEXT,
  tracking_parameters JSONB,
  
  -- Datas
  created_time TIMESTAMP WITH TIME ZONE,
  updated_time TIMESTAMP WITH TIME ZONE,
  
  -- Controle interno
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, ad_id)
);

-- 5. Tabela de Insights (Métricas/Resultados)
CREATE TABLE IF NOT EXISTS public.meta_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pode ser linked a campaign, adset ou ad
  campaign_id UUID REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  adset_id UUID REFERENCES public.meta_ad_sets(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES public.meta_ads(id) ON DELETE CASCADE,
  
  -- Período dos dados
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  
  -- Métricas principais
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend INTEGER DEFAULT 0, -- em centavos
  reach INTEGER DEFAULT 0,
  frequency DECIMAL(10,2) DEFAULT 0,
  
  -- Conversions e leads
  leads INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cost_per_lead INTEGER DEFAULT 0, -- em centavos
  cost_per_click INTEGER DEFAULT 0, -- em centavos
  cpm INTEGER DEFAULT 0, -- custo por mil impressões
  ctr DECIMAL(5,2) DEFAULT 0, -- click-through rate
  
  -- Métricas avançadas
  video_views INTEGER DEFAULT 0,
  video_completion_rate DECIMAL(5,2) DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Dados raw da API (para flexibilidade futura)
  raw_data JSONB,
  
  -- Controle interno
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Evitar duplicatas por período
  UNIQUE(user_id, campaign_id, adset_id, ad_id, date_start, date_stop)
);

-- 6. Tabela de logs de sincronização
CREATE TABLE IF NOT EXISTS public.meta_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id UUID REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  
  sync_type TEXT NOT NULL, -- 'campaigns', 'adsets', 'ads', 'insights'
  status TEXT NOT NULL, -- 'success', 'error', 'partial'
  
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  
  error_message TEXT,
  error_details JSONB,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_user_id ON public.meta_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_status ON public.meta_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_created_time ON public.meta_campaigns(created_time);

CREATE INDEX IF NOT EXISTS idx_meta_ad_sets_user_id ON public.meta_ad_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_sets_campaign_id ON public.meta_ad_sets(campaign_id);

CREATE INDEX IF NOT EXISTS idx_meta_ads_user_id ON public.meta_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_adset_id ON public.meta_ads(adset_id);

CREATE INDEX IF NOT EXISTS idx_meta_insights_user_id ON public.meta_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_insights_date_range ON public.meta_insights(date_start, date_stop);
CREATE INDEX IF NOT EXISTS idx_meta_insights_campaign_id ON public.meta_insights(campaign_id);

-- RLS Policies (Row Level Security)
ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies para que usuários só vejam seus próprios dados
CREATE POLICY "Users can view own meta ad accounts" ON public.meta_ad_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own meta campaigns" ON public.meta_campaigns
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own meta ad sets" ON public.meta_ad_sets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own meta ads" ON public.meta_ads
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own meta insights" ON public.meta_insights
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own meta sync logs" ON public.meta_sync_logs
  FOR ALL USING (auth.uid() = user_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meta_ad_accounts_updated_at BEFORE UPDATE ON public.meta_ad_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_campaigns_updated_at BEFORE UPDATE ON public.meta_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_ad_sets_updated_at BEFORE UPDATE ON public.meta_ad_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_ads_updated_at BEFORE UPDATE ON public.meta_ads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_insights_updated_at BEFORE UPDATE ON public.meta_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários de documentação
COMMENT ON TABLE public.meta_ad_accounts IS 'Contas de anúncios do Meta (Facebook/Instagram) dos usuários';
COMMENT ON TABLE public.meta_campaigns IS 'Campanhas publicitárias do Meta Ads';
COMMENT ON TABLE public.meta_ad_sets IS 'Ad Sets (conjuntos de anúncios) do Meta Ads';
COMMENT ON TABLE public.meta_ads IS 'Anúncios individuais do Meta Ads';
COMMENT ON TABLE public.meta_insights IS 'Métricas e resultados dos anúncios (insights)';
COMMENT ON TABLE public.meta_sync_logs IS 'Logs de sincronização com a API do Meta';