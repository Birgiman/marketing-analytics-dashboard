/**
 * Live Data Fetcher - Função de teste
 * Busca todos os dados relacionados a uma Live em uma única operação
 */

import { supabase } from '@/integrations/supabase/client';
import { fetchCampaigns, fetchCampaignInsightsById, MetaCampaign, MetaInsight } from './metaApi';

export interface LiveDataResponse {
  live: {
    id: string;
    name: string;
    user_id: string;
    live_date?: string;
    created_at: string;
    updated_at: string;
  };
  user: {
    id: string;
    email?: string;
  };
  groups: Array<{
    id: string;
    group_id: string;
    group_name: string;
    group_size: number;
    monitoring: boolean;
    created_at: string;
  }>;
  metaIntegration: {
    user_id: string;
    access_token: string;
    account_id: string;
    account_name?: string;
    is_active: boolean;
  } | null;
  allUserCampaigns: MetaCampaign[];
  liveCampaigns: Array<{
    id: string;
    campaign_id: string;
    campaign_name: string;
    account_id?: string;
    account_name?: string;
    objective?: string;
    status: string;
    daily_budget?: number;
    lifetime_budget?: number;
  }>;
  campaignInsights: Array<{
    campaign_id: string;
    insights: MetaInsight[];
  }>;
  summary: {
    totalGroups: number;
    totalGroupMembers: number;
    totalCampaigns: number;
    activeCampaigns: number;
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    totalReach: number;
  };
}

/**
 * Busca todos os dados relacionados a uma Live específica
 * @param liveId ID da Live para buscar os dados
 * @returns Objeto completo com todos os dados relacionados
 */
export async function fetchCompleteLiveData(liveId: string): Promise<LiveDataResponse> {
  console.log(`[LiveDataFetcher] Iniciando busca completa para Live: ${liveId}`);
  
  try {
    // 1. Buscar dados da Live
    console.log('[LiveDataFetcher] 1. Buscando dados da Live...');
    const { data: live, error: liveError } = await supabase
      .from('lives')
      .select('*')
      .eq('id', liveId)
      .single();

    if (liveError || !live) {
      throw new Error(`Live não encontrada: ${liveError?.message || 'ID inválido'}`);
    }

    console.log(`[LiveDataFetcher] Live encontrada: ${live.name} (User: ${live.user_id})`);

    // 2. Buscar dados do usuário
    console.log('[LiveDataFetcher] 2. Buscando dados do usuário...');
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(live.user_id);
    
    if (userError) {
      console.warn('[LiveDataFetcher] Erro ao buscar usuário:', userError);
    }

    // 3. Buscar grupos vinculados à Live
    console.log('[LiveDataFetcher] 3. Buscando grupos vinculados à Live...');
    const { data: groups, error: groupsError } = await supabase
      .from('live_groups')
      .select('*')
      .eq('live_id', liveId)
      .order('created_at', { ascending: false });

    if (groupsError) {
      console.warn('[LiveDataFetcher] Erro ao buscar grupos:', groupsError);
    }

    const liveGroups = groups || [];
    console.log(`[LiveDataFetcher] ${liveGroups.length} grupos encontrados`);

    // 4. Buscar integração Meta do usuário
    console.log('[LiveDataFetcher] 4. Buscando integração Meta...');
    const { data: metaIntegration, error: metaError } = await supabase
      .from('meta_integrations')
      .select('*')
      .eq('user_id', live.user_id)
      .eq('is_active', true)
      .single();

    if (metaError) {
      console.warn('[LiveDataFetcher] Integração Meta não encontrada:', metaError.message);
    }

    let allUserCampaigns: MetaCampaign[] = [];
    let campaignInsights: Array<{ campaign_id: string; insights: MetaInsight[] }> = [];

    // 5. Se tem integração Meta, buscar campanhas do usuário
    if (metaIntegration?.access_token && metaIntegration?.account_id) {
      console.log('[LiveDataFetcher] 5. Buscando todas as campanhas do usuário no Meta...');
      
      try {
        allUserCampaigns = await fetchCampaigns(
          metaIntegration.account_id,
          metaIntegration.access_token,
          {
            limit: 100, // Buscar mais campanhas
            status: ['ACTIVE', 'PAUSED'], // Incluir ativas e pausadas
            fields: [
              'id', 'name', 'status', 'objective', 'effective_status',
              'daily_budget', 'lifetime_budget', 'start_time', 'stop_time',
              'created_time', 'updated_time', 'buying_type', 'bid_strategy'
            ]
          }
        );
        
        console.log(`[LiveDataFetcher] ${allUserCampaigns.length} campanhas encontradas no Meta`);
      } catch (error) {
        console.warn('[LiveDataFetcher] Erro ao buscar campanhas do Meta:', error);
      }
    }

    // 6. Buscar campanhas vinculadas à Live
    console.log('[LiveDataFetcher] 6. Buscando campanhas vinculadas à Live...');
    const { data: liveCampaigns, error: liveCampaignsError } = await supabase
      .from('live_campaigns')
      .select('*')
      .eq('live_id', liveId)
      .order('created_at', { ascending: false });

    if (liveCampaignsError) {
      console.warn('[LiveDataFetcher] Erro ao buscar campanhas da Live:', liveCampaignsError);
    }

    const liveCampaignsList = liveCampaigns || [];
    console.log(`[LiveDataFetcher] ${liveCampaignsList.length} campanhas vinculadas à Live`);

    // 7. Buscar insights das campanhas ativas da Live
    if (metaIntegration?.access_token && liveCampaignsList.length > 0) {
      console.log('[LiveDataFetcher] 7. Buscando insights das campanhas da Live...');
      
      for (const liveCampaign of liveCampaignsList) {
        try {
          console.log(`[LiveDataFetcher] Buscando insights para campanha: ${liveCampaign.campaign_name} (${liveCampaign.campaign_id})`);
          
          const insights = await fetchCampaignInsightsById(
            liveCampaign.campaign_id,
            metaIntegration.access_token,
            {
              datePreset: 'last_30d',
              fields: [
                'campaign_id', 'campaign_name', 'ad_name', 'date_start', 'date_stop',
                'spend', 'impressions', 'clicks', 'reach', 'frequency',
                'cpm', 'ctr', 'cpp', 'cost_per_unique_click', 'actions'
              ]
            }
          );

          campaignInsights.push({
            campaign_id: liveCampaign.campaign_id,
            insights: insights
          });

          console.log(`[LiveDataFetcher] ${insights.length} insights encontrados para ${liveCampaign.campaign_name}`);
        } catch (error) {
          console.warn(`[LiveDataFetcher] Erro ao buscar insights da campanha ${liveCampaign.campaign_id}:`, error);
        }
      }
    }

    // 8. Calcular resumo
    console.log('[LiveDataFetcher] 8. Calculando resumo...');
    const totalGroups = liveGroups.length;
    const totalGroupMembers = liveGroups.reduce((sum, group) => sum + group.group_size, 0);
    const totalCampaigns = allUserCampaigns.length;
    const activeCampaigns = allUserCampaigns.filter(c => c.status === 'ACTIVE').length;

    // Calcular métricas dos insights
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalReach = 0;

    campaignInsights.forEach(({ insights }) => {
      insights.forEach(insight => {
        totalSpend += parseFloat(insight.spend || '0');
        totalImpressions += parseInt(insight.impressions || '0');
        totalClicks += parseInt(insight.clicks || '0');
        totalReach += parseInt(insight.reach || '0');
      });
    });

    const response: LiveDataResponse = {
      live: {
        id: live.id,
        name: live.name,
        user_id: live.user_id,
        live_date: live.live_date,
        created_at: live.created_at,
        updated_at: live.updated_at
      },
      user: {
        id: live.user_id,
        email: user?.user?.email
      },
      groups: liveGroups,
      metaIntegration,
      allUserCampaigns,
      liveCampaigns: liveCampaignsList,
      campaignInsights,
      summary: {
        totalGroups,
        totalGroupMembers,
        totalCampaigns,
        activeCampaigns,
        totalSpend: Math.round(totalSpend * 100) / 100, // Arredondar para 2 casas decimais
        totalImpressions,
        totalClicks,
        totalReach
      }
    };

    console.log('[LiveDataFetcher] ✅ Busca completa finalizada com sucesso!');
    console.log('[LiveDataFetcher] Resumo:', {
      live: live.name,
      grupos: totalGroups,
      membros: totalGroupMembers,
      campanhas: totalCampaigns,
      campanha_ativas: activeCampaigns,
      gasto_total: `$${totalSpend}`,
      impressões: totalImpressions
    });

    return response;

  } catch (error) {
    console.error('[LiveDataFetcher] ❌ Erro na busca completa:', error);
    throw error;
  }
}

/**
 * Função de teste para demonstrar o uso
 * Chame essa função no console do navegador para testar
 */
export async function testLiveDataFetcher(liveId: string) {
  console.log('🧪 [TESTE] Iniciando teste do LiveDataFetcher...');
  
  try {
    const startTime = Date.now();
    const data = await fetchCompleteLiveData(liveId);
    const endTime = Date.now();
    
    console.log(`🧪 [TESTE] ✅ Teste concluído em ${endTime - startTime}ms`);
    console.log('🧪 [TESTE] Dados retornados:', data);
    
    // Mostrar resumo formatado
    console.log('\n📊 [RESUMO DO TESTE]');
    console.log('==================');
    console.log(`Live: ${data.live.name}`);
    console.log(`Usuário: ${data.user.email || data.user.id}`);
    console.log(`Grupos: ${data.summary.totalGroups} (${data.summary.totalGroupMembers} membros)`);
    console.log(`Meta Integration: ${data.metaIntegration ? '✅ Ativa' : '❌ Não encontrada'}`);
    console.log(`Campanhas do usuário: ${data.summary.totalCampaigns} (${data.summary.activeCampaigns} ativas)`);
    console.log(`Campanhas vinculadas à Live: ${data.liveCampaigns.length}`);
    console.log(`Insights coletados: ${data.campaignInsights.length} campanhas`);
    console.log(`Métricas: $${data.summary.totalSpend} gasto, ${data.summary.totalImpressions.toLocaleString()} impressões`);
    
    return data;
    
  } catch (error) {
    console.error('🧪 [TESTE] ❌ Erro no teste:', error);
    throw error;
  }
}

// Exportar para uso global no console (para testes)
if (typeof window !== 'undefined') {
  (window as any).testLiveDataFetcher = testLiveDataFetcher;
  (window as any).fetchCompleteLiveData = fetchCompleteLiveData;
}