/**
 * 🔍 Função para buscar dados da Live no banco de dados
 * 
 * Esta função faz JOIN entre as tabelas lives e live_campaigns
 * para obter todos os dados necessários para a requisição ao Meta API
 * 
 * @author LiveShop Analytics
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface LiveMetaData {
  liveId: string;
  campaignSearchTerm: string | null;
  insightsDateSince: string | null;
  insightsDateUntil: string | null;
  accountId: string | null;
  accountName: string | null;
  campaignCount: number;
  campaigns: Array<{
    campaignId: string;
    campaignName: string;
    status: string;
    objective: string | null;
  }>;
}

export interface LiveMetaDataResponse {
  success: boolean;
  data?: LiveMetaData;
  error?: string;
}

// ============================================================================
// FUNÇÃO PRINCIPAL - getLiveMetaData
// ============================================================================

/**
 * 🚀 Busca dados da Live no banco de dados
 * 
 * @param liveId - ID da live
 * @returns Promise com dados da live e campanhas
 */
export async function getLiveMetaData(liveId: string): Promise<LiveMetaDataResponse> {
  try {
    console.log(`🔍 [LIVE-META-DATA] Buscando dados da live: ${liveId}`);
    
    // 1. Buscar dados da live
    const { data: liveData, error: liveError } = await supabase
      .from('lives')
      .select(`
        id,
        campaign_search_term,
        insights_date_since,
        insights_date_until
      `)
      .eq('id', liveId)
      .single();

    if (liveError) {
      throw new Error(`Erro ao buscar live: ${liveError.message}`);
    }

    if (!liveData) {
      throw new Error('Live não encontrada');
    }

    console.log(`✅ [LIVE-META-DATA] Live encontrada: ${liveData.id}`);

    // 2. Buscar campanhas da live
    const { data: campaignsData, error: campaignsError } = await supabase
      .from('live_campaigns')
      .select(`
        campaign_id,
        campaign_name,
        account_id,
        account_name,
        status,
        objective
      `)
      .eq('live_id', liveId);

    if (campaignsError) {
      throw new Error(`Erro ao buscar campanhas: ${campaignsError.message}`);
    }

    console.log(`✅ [LIVE-META-DATA] Campanhas encontradas: ${campaignsData?.length || 0}`);

    // 3. Processar dados
    const processedData: LiveMetaData = {
      liveId: liveData.id,
      campaignSearchTerm: liveData.campaign_search_term,
      insightsDateSince: liveData.insights_date_since,
      insightsDateUntil: liveData.insights_date_until,
      accountId: campaignsData?.[0]?.account_id || null,
      accountName: campaignsData?.[0]?.account_name || null,
      campaignCount: campaignsData?.length || 0,
      campaigns: campaignsData?.map(campaign => ({
        campaignId: campaign.campaign_id,
        campaignName: campaign.campaign_name,
        status: campaign.status,
        objective: campaign.objective
      })) || []
    };

    console.log(`📊 [LIVE-META-DATA] Dados processados:`, {
      termo: processedData.campaignSearchTerm,
      accountId: processedData.accountId,
      campanhas: processedData.campaignCount
    });

    return {
      success: true,
      data: processedData
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`❌ [LIVE-META-DATA] Erro: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

// ============================================================================
// FUNÇÃO AUXILIAR - getLiveMetaDataWithFallback
// ============================================================================

/**
 * 🔧 Busca dados da Live com fallbacks para valores padrão
 * 
 * @param liveId - ID da live
 * @returns Promise com dados da live e valores padrão quando necessário
 */
export async function getLiveMetaDataWithFallback(liveId: string): Promise<LiveMetaDataResponse> {
  const result = await getLiveMetaData(liveId);
  
  if (result.success && result.data) {
    return {
      success: true,
      data: result.data
    };
  }
  
  return result;
}
