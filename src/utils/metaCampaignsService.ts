import { supabase } from "@/integrations/supabase/client";

export interface MetaCampaign {
  id: string;
  name: string;
}

export interface MetaCampaignsResponse {
  data: MetaCampaign[];
  paging?: {
    next?: string;
    previous?: string;
  };
}

/**
 * Busca campanhas do Meta baseado no termo de busca da Live
 */
export async function fetchMetaCampaigns(
  accountId: string,
  accessToken: string,
  searchTerm: string
): Promise<MetaCampaign[]> {
  try {
    const url = `https://graph.facebook.com/v23.0/${accountId}/campaigns`;
    const params = new URLSearchParams({
      fields: 'id,name',
      access_token: accessToken,
      filtering: JSON.stringify([
        {
          field: 'name',
          operator: 'CONTAIN',
          value: searchTerm
        },
        {
          field: 'effective_status',
          operator: 'IN',
          value: ['ACTIVE', 'PAUSED']
        }
      ])
    });

    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Meta API error: ${response.status} ${response.statusText}`);
    }

    const data: MetaCampaignsResponse = await response.json();
    return data.data || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Busca campanhas do Meta usando dados da Live
 */
export async function fetchMetaCampaignsForLive(
  liveId: string,
  userId: string
): Promise<MetaCampaign[]> {
  try {
    // Buscar integração Meta
    const { data: metaIntegrationData, error: metaError } = await supabase
      .from('meta_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (metaError || !metaIntegrationData?.access_token) {
      throw new Error('Meta integration não encontrada');
    }

    // Buscar dados da Live
    const { data: liveData, error: liveError } = await supabase
      .from('lives')
      .select('campaign_search_term')
      .eq('id', liveId)
      .single();

    if (liveError || !liveData?.campaign_search_term) {
      throw new Error('Termo de busca da Live não encontrado');
    }

    // Buscar account_id das campanhas da Live
    const { data: liveCampaigns } = await supabase
      .from('live_campaigns')
      .select('account_id')
      .eq('live_id', liveId)
      .limit(1);

    if (!liveCampaigns || liveCampaigns.length === 0) {
      throw new Error('Account ID não encontrado para esta Live');
    }

    const accountId = liveCampaigns[0].account_id;
    if (!accountId) {
      throw new Error('Account ID inválido');
    }

    // Buscar campanhas do Meta
    return await fetchMetaCampaigns(
      accountId,
      metaIntegrationData.access_token,
      liveData.campaign_search_term
    );
  } catch (error) {
    throw error;
  }
}
