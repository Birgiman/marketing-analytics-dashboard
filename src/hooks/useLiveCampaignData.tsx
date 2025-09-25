import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchCampaignById, fetchMetaInsights } from '@/utils/metaApi';

interface LiveCampaign {
  id: string;
  live_id: string;
  campaign_id: string;
  campaign_name: string;
  account_id: string;
  account_name: string;
  objective: string;
  status: string;
  daily_budget: number;
  lifetime_budget: number;
}

interface CampaignWithMetaData extends LiveCampaign {
  meta_data?: {
    effective_status?: string;
    buying_type?: string;
    bid_strategy?: string;
    start_time?: string;
    stop_time?: string;
    created_time?: string;
    updated_time?: string;
  };
  insights?: {
    campaign_name?: string;
    ad_name?: string;
    date_start?: string;
    date_stop?: string;
    spend?: string;
    impressions?: string;
    clicks?: string;
    reach?: string;
    frequency?: string;
    cpm?: string;
    ctr?: string;
    cpp?: string;
    cost_per_unique_click?: string;
    actions?: any[];
  };
}

interface UseLiveCampaignDataReturn {
  campaigns: CampaignWithMetaData[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

export function useLiveCampaignData(liveId: string): UseLiveCampaignDataReturn {
  const [campaigns, setCampaigns] = useState<CampaignWithMetaData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!liveId) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Buscar dados da Live para obter dateRange
      const { data: liveData, error: liveError } = await supabase
        .from('lives')
        .select('insights_date_since, insights_date_until, user_id')
        .eq('id', liveId)
        .single();

      if (liveError) {
        throw new Error(`Erro ao buscar dados da Live: ${liveError.message}`);
      }

      // 2. Buscar campanhas vinculadas à Live no Supabase
      const { data: liveCampaigns, error: supabaseError } = await supabase
        .from('live_campaigns')
        .select('*')
        .eq('live_id', liveId);

      if (supabaseError) {
        throw new Error(`Erro ao buscar campanhas da Live: ${supabaseError.message}`);
      }

      if (!liveCampaigns || liveCampaigns.length === 0) {
        setCampaigns([]);
        return;
      }

      // 3. Buscar access token do Meta
      const userId = liveData.user_id;
      if (!userId) {
        setCampaigns(liveCampaigns as CampaignWithMetaData[]);
        return;
      }

      const { data: metaIntegration, error: metaError } = await supabase
        .from('meta_integrations')
        .select('access_token')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (metaError || !metaIntegration?.access_token) {
        // Se não tem integração Meta, retorna só os dados do Supabase
        setCampaigns(liveCampaigns as CampaignWithMetaData[]);
        return;
      }

      // 4. Buscar dados detalhados e insights de cada campanha no Meta
      const campaignsWithMetaData = await Promise.all(
        liveCampaigns.map(async (campaign) => {
          try {
            // Buscar dados básicos da campanha
            const metaData = await fetchCampaignById(
              campaign.campaign_id,
              metaIntegration.access_token
            );

            // REFATORADO: Usar função centralizada fetchMetaInsights
            const options: any = {
              level: 'campaign',
              fields: ['campaign_name', 'impressions', 'spend', 'clicks', 'reach', 'frequency', 'cpm', 'ctr', 'cpp', 'cost_per_unique_click', 'actions', 'ad_name', 'date_start', 'date_stop']
            };

            // Usar dateRange da Live se disponível
            if (liveData.insights_date_since && liveData.insights_date_until) {
              options.timeRange = {
                since: liveData.insights_date_since,
                until: liveData.insights_date_until
              };
            }

            const insightsData = await fetchMetaInsights(
              campaign.campaign_id,
              metaIntegration.access_token,
              options
            );

            // Pegar o primeiro insight (mais recente)
            const latestInsight = insightsData[0] || {};

            // Salvar insights no banco de dados para cache
            if (latestInsight && Object.keys(latestInsight).length > 0) {
              try {
                await supabase
                  .from('campaign_insights')
                  .upsert({
                    campaign_id: campaign.campaign_id,
                    user_id: userId,
                    date_start: latestInsight.date_start,
                    date_stop: latestInsight.date_stop,
                    spend: parseFloat(latestInsight.spend || '0'),
                    impressions: parseInt(latestInsight.impressions || '0'),
                    clicks: parseInt(latestInsight.clicks || '0'),
                    reach: parseInt(latestInsight.reach || '0'),
                    frequency: parseFloat(latestInsight.frequency || '0'),
                    cpm: parseFloat(latestInsight.cpm || '0'),
                    ctr: parseFloat(latestInsight.ctr || '0'),
                    cpp: parseFloat(latestInsight.cpp || '0'),
                    cost_per_unique_click: parseFloat(latestInsight.cost_per_unique_click || '0'),
                    actions: latestInsight.actions || [],
                    campaign_name: latestInsight.campaign_name,
                    ad_name: latestInsight.ad_name,
                  }, { 
                    onConflict: 'campaign_id,date_start,date_stop' 
                  });
              } catch (saveError) {

              }
            }

            return {
              ...campaign,
              meta_data: {
                effective_status: metaData.effective_status,
                buying_type: metaData.buying_type,
                bid_strategy: metaData.bid_strategy,
                start_time: metaData.start_time,
                stop_time: metaData.stop_time,
                created_time: metaData.created_time,
                updated_time: metaData.updated_time,
              },
              insights: {
                campaign_name: latestInsight.campaign_name,
                ad_name: latestInsight.ad_name,
                date_start: latestInsight.date_start,
                date_stop: latestInsight.date_stop,
                spend: latestInsight.spend,
                impressions: latestInsight.impressions,
                clicks: latestInsight.clicks,
                reach: latestInsight.reach,
                frequency: latestInsight.frequency,
                cpm: latestInsight.cpm,
                ctr: latestInsight.ctr,
                cpp: latestInsight.cpp,
                cost_per_unique_click: latestInsight.cost_per_unique_click,
                actions: latestInsight.actions,
              }
            };
          } catch (err) {

            // Retorna sem dados Meta se der erro
            return campaign;
          }
        })
      );

      setCampaigns(campaignsWithMetaData as CampaignWithMetaData[]);

    } catch (err: unknown) {

      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados das campanhas';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [liveId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    campaigns,
    isLoading,
    error,
    refreshData,
    clearError
  };
}