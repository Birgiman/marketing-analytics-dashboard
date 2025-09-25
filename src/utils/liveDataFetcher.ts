/**
 * Live Data Fetcher - Função de teste
 * Busca todos os dados relacionados a uma Live em uma única operação
 */

import { supabase } from '@/integrations/supabase/client';
import { MetaInsightsOptions } from '@/types/metaApi';
import { fetchCampaignInsightsById, fetchMetaInsights, MetaCampaign, MetaInsight } from './metaApi';

export interface LiveDataResponse {
  live: {
    id: string;
    name: string;
    user_id: string;
    live_date?: string;
    insights_date_since?: string;
    insights_date_until?: string;
    campaign_search_term?: string;
    ad_budget?: number;
    sales_goal?: number;
    leads_goal?: number;
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
    is_active: boolean;
  } | null;
  metaAdAccount: {
    ad_account_id: string;
    account_name?: string;
    access_token?: string;
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
    insights: {
      totalInsights: number;
      avgCPM: number;
      avgCTR: number;
      avgCPP: number;
      avgCostPerUniqueClick: number;
      avgFrequency: number;
      avgCPL: number;
      totalActions: number;
    };
  };
}

/**
 * Busca todos os dados relacionados a uma Live específica
 * @param liveId ID da Live para buscar os dados
 * @param customStartDate Data de início personalizada (opcional)
 * @param customEndDate Data de fim personalizada (opcional)
 * @returns Objeto completo com todos os dados relacionados
 */
export async function fetchCompleteLiveData(
  liveId: string, 
  customStartDate?: string, 
  customEndDate?: string
): Promise<LiveDataResponse> {
  try {
    // 1. Buscar dados da Live
    const { data: live, error: liveError } = await supabase
      .from('lives')
      .select('*')
      .eq('id', liveId)
      .single();

    if (liveError || !live) {
      throw new Error(`Live não encontrada: ${liveError?.message || 'ID inválido'}`);
    }
    // 2. Buscar dados do usuário (usando dados básicos disponíveis)
    const user = {
      user: {
        id: live.user_id,
        email: null // Email não disponível sem permissões admin
      }
    };
    // 3. Buscar grupos vinculados à Live
    const { data: groups, error: groupsError } = await supabase
      .from('live_groups')
      .select('*')
      .eq('live_id', liveId)
      .order('created_at', { ascending: false });

    if (groupsError) {
    }

    const liveGroups = groups || [];
    // 4. Buscar integração Meta do usuário
    const { data: metaIntegration, error: metaError } = await supabase
      .from('meta_integrations')
      .select('*')
      .eq('user_id', live.user_id)
      .eq('is_active', true)
      .single();

    if (metaError) {
    } else if (metaIntegration) {
    }

    let allUserCampaigns: MetaCampaign[] = [];
    let campaignInsights: Array<{ campaign_id: string; insights: MetaInsight[] }> = [];

    // 4.1. Buscar campanhas vinculadas à Live (para obter account_id selecionado)
    const { data: liveCampaignsList, error: liveCampaignsError } = await supabase
      .from('live_campaigns')
      .select('*')
      .eq('live_id', liveId)
      .order('created_at', { ascending: false });

    if (liveCampaignsError) {
    }

    const liveCampaigns = liveCampaignsList || [];
    // DEBUG: Listar nomes das campanhas no banco
    if (liveCampaigns.length > 0) {
      liveCampaigns.forEach((camp, index) => {
      });
    }

    // 4.2. Obter account_id da Live (a conta selecionada na criação)
    const selectedAccountId = liveCampaigns.length > 0 ? liveCampaigns[0].account_id : null;
    // 4.3. Buscar dados completos da conta Meta selecionada
    let metaAdAccount = null;
    if (selectedAccountId) {
      const { data: adAccountData, error: adAccountError } = await supabase
        .from('meta_ad_accounts')
        .select('ad_account_id, account_name, access_token')
        .eq('ad_account_id', selectedAccountId)
        .eq('is_active', true)
        .single();

      if (adAccountError) {
      } else if (adAccountData) {
        metaAdAccount = adAccountData;
      }
    } else {
    }

    // 5. Se tem conta Meta com dados completos, buscar campanhas usando termo salvo na Live
    const accessToken = metaAdAccount?.access_token || metaIntegration?.access_token;
    if (accessToken && metaAdAccount?.ad_account_id) {
      try {
        // Validar dados obrigatórios - SEM FALLBACKS
        if (!live.insights_date_since || !live.insights_date_until) {
          throw new Error(`[LiveDataFetcher] Datas de insights obrigatórias não encontradas: since=${live.insights_date_since}, until=${live.insights_date_until}`);
        }

        if (!live.campaign_search_term || !live.campaign_search_term.trim()) {
          throw new Error(`[LiveDataFetcher] Termo de busca de campanha obrigatório não encontrado: "${live.campaign_search_term}"`);
        }
        // CORREÇÃO: Usar fetchMetaInsights com a conta e token corretos
        const insights = await fetchMetaInsights(
          metaAdAccount.ad_account_id, // Account ID da conta selecionada para esta Live
          accessToken, // Access Token (preferência: meta_ad_accounts > meta_integrations)
          {
            level: 'campaign',
            fields: [
              'campaign_id', 'campaign_name', 'spend', 'impressions',
              'clicks', 'actions' // CORREÇÃO: actions é onde estão os leads
            ],
            timeRange: {
              since: live.insights_date_since,
              until: live.insights_date_until
            },
            timeIncrement: 1, // CORREÇÃO: Buscar dados diários
            // Filtros dinâmicos
            filtering: [
              {
                field: 'campaign.effective_status',
                operator: 'IN',
                value: ['ACTIVE', 'PAUSED'] // Fixo - não arquivadas
              },
              {
                field: 'campaign.name',
                operator: 'CONTAIN',
                value: live.campaign_search_term // Dinâmico - da live
              }
            ]
          }
        );
        // CORREÇÃO: Agrupar insights por campanha para evitar duplicação
        const insightsByCampaign = new Map();

        insights.forEach(insight => {
          const campaignId = insight.campaign_id;
          if (!insightsByCampaign.has(campaignId)) {
            insightsByCampaign.set(campaignId, {
              id: campaignId,
              name: insight.campaign_name,
              insights: []
            });
          }
          insightsByCampaign.get(campaignId).insights.push(insight);
        });
        // Converter para array de campanhas
        allUserCampaigns = Array.from(insightsByCampaign.values()).map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          status: 'ACTIVE', // Assumir ativa se retornou insights
          objective: 'OUTCOME_LEADS',
          daily_budget: undefined,
          lifetime_budget: undefined,
          created_time: new Date().toISOString(),
          updated_time: new Date().toISOString(),
          insights: campaign.insights // Manter insights agrupados
        }));
        // DEBUG: Listar nomes das campanhas encontradas na Meta API
        if (allUserCampaigns.length > 0) {
          allUserCampaigns.forEach((camp, index) => {
          });

          // DEBUG: Comparar com campanhas do banco
          const bankCampaignIds = new Set(liveCampaigns.map(c => c.campaign_id));
          const metaCampaignIds = new Set(allUserCampaigns.map(c => c.id));

          const missingFromMeta = liveCampaigns.filter(c => !metaCampaignIds.has(c.campaign_id));
          const extraInMeta = allUserCampaigns.filter(c => !bankCampaignIds.has(c.id));

          if (missingFromMeta.length > 0) {
            missingFromMeta.forEach((camp, index) => {
            });
          }

          if (extraInMeta.length > 0) {
            extraInMeta.forEach((camp, index) => {
            });
          }
        }
      } catch (error) {
      }
    } else {
    }

    // 6. NOVO: Usar campanhas encontradas pelo termo ao invés das salvas no banco
    // 7. Buscar insights das campanhas encontradas pelo termo
    if (metaIntegration?.access_token && allUserCampaigns.length > 0) {
      for (const campaign of allUserCampaigns) {
        try {
          // Configurar opções de insights com campos necessários
          const insightsOptions: MetaInsightsOptions = {
            fields: [
              'campaign_id', 'campaign_name', 'ad_name', 'date_start', 'date_stop',
              'spend', 'impressions', 'clicks', 'reach', 'frequency',
              'cpm', 'ctr', 'cpp', 'cost_per_unique_click', 'actions'
            ]
          };

          // Usar datas personalizadas se fornecidas, senão usar dateRange da Live
          if (customStartDate && customEndDate) {
            insightsOptions.dateRange = {
              since: customStartDate,
              until: customEndDate
            };
          } else if (live.insights_date_since && live.insights_date_until) {
            insightsOptions.dateRange = {
              since: live.insights_date_since,
              until: live.insights_date_until
            };
          } else {
            // Fallback para período padrão (Live sem período definido)
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            insightsOptions.dateRange = {
              since: firstDayOfMonth.toISOString().split('T')[0],
              until: now.toISOString().split('T')[0]
            };
          }

          const insights = await fetchCampaignInsightsById(
            campaign.id,
            metaIntegration.access_token,
            insightsOptions
          );

          campaignInsights.push({
            campaign_id: campaign.id,
            insights: insights
          });

        } catch (error) {
        }
      }
    }

    // 8. Calcular resumo
    const totalGroups = liveGroups.length;
    const totalGroupMembers = liveGroups.reduce((sum, group) => sum + group.group_size, 0);

    // Se não conseguiu buscar campanhas do Meta, usar dados das campanhas vinculadas à Live
    const totalCampaigns = allUserCampaigns.length > 0 ? allUserCampaigns.length : liveCampaigns.length;
    const activeCampaigns = allUserCampaigns.length > 0
      ? allUserCampaigns.filter(c => c.status === 'ACTIVE').length
      : liveCampaigns.filter(c => c.status === 'ACTIVE').length;
    // Calcular métricas dos insights
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalReach = 0;
    let totalInsights = 0;

    // Para médias
    let sumCPM = 0;
    let sumCTR = 0;
    let sumCPP = 0;
    let sumCostPerUniqueClick = 0;
    let sumFrequency = 0;
    let totalActions = 0;
    let validCPMCount = 0;
    let validCTRCount = 0;
    let validCPPCount = 0;
    let validCostPerUniqueClickCount = 0;
    let validFrequencyCount = 0;
    campaignInsights.forEach(({ campaign_id, insights }) => {

      insights.forEach((insight, index) => {
        totalSpend += parseFloat(insight.spend || '0');
        totalImpressions += parseInt(insight.impressions || '0');
        totalClicks += parseInt(insight.clicks || '0');
        totalReach += parseInt(insight.reach || '0');
        totalInsights++;

        // CPM - custo por mil impressões
        if (insight.cpm) {
          sumCPM += parseFloat(insight.cpm);
          validCPMCount++;
        }

        // CTR - taxa de cliques
        if (insight.ctr) {
          sumCTR += parseFloat(insight.ctr);
          validCTRCount++;
        }

        // CPP - custo por postagem
        if ((insight as any).cpp) {
          sumCPP += parseFloat((insight as any).cpp);
          validCPPCount++;
        }

        // Custo por clique único
        if ((insight as any).cost_per_unique_click) {
          sumCostPerUniqueClick += parseFloat((insight as any).cost_per_unique_click);
          validCostPerUniqueClickCount++;
        }

        // Frequência
        if (insight.frequency) {
          sumFrequency += parseFloat(insight.frequency);
          validFrequencyCount++;
        }

        // Actions (leads, conversões, etc.)
        if (insight.actions && Array.isArray(insight.actions)) {
          insight.actions.forEach(action => {
            totalActions += parseInt(action.value || '0');
          });
        }

        // Processar insight silenciosamente
      });
    });

    // Calcular médias corretas para múltiplas campanhas
    // Para CPM, CTR e outras métricas, devemos calcular com base nos totais agregados
    const calculatedCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const calculatedCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const calculatedCPL = totalActions > 0 ? totalSpend / totalActions : 0;

    // Usar médias simples como fallback se não conseguirmos calcular baseado em totais
    const avgCPM = calculatedCPM > 0 ? calculatedCPM : (validCPMCount > 0 ? sumCPM / validCPMCount : 0);
    const avgCTR = calculatedCTR > 0 ? calculatedCTR : (validCTRCount > 0 ? sumCTR / validCTRCount : 0);
    const avgCPP = validCPPCount > 0 ? sumCPP / validCPPCount : 0;
    const avgCostPerUniqueClick = validCostPerUniqueClickCount > 0 ? sumCostPerUniqueClick / validCostPerUniqueClickCount : 0;
    const avgFrequency = validFrequencyCount > 0 ? sumFrequency / validFrequencyCount : 0;
    // Log para comparação direta com Meta Dashboard
    const response: LiveDataResponse = {
      live: {
        id: live.id,
        name: live.name,
        user_id: live.user_id,
        live_date: live.live_date,
        insights_date_since: live.insights_date_since,
        insights_date_until: live.insights_date_until,
        campaign_search_term: live.campaign_search_term,
        ad_budget: live.ad_budget,
        sales_goal: live.sales_goal,
        leads_goal: live.leads_goal,
        created_at: live.created_at,
        updated_at: live.updated_at
      },
      user: {
        id: live.user_id,
        email: user?.user?.email || undefined
      },
      groups: liveGroups,
      metaIntegration,
      metaAdAccount,
      allUserCampaigns,
      liveCampaigns: liveCampaigns,
      campaignInsights,
      summary: {
        totalGroups,
        totalGroupMembers,
        totalCampaigns,
        activeCampaigns,
        totalSpend: Math.round(totalSpend * 100) / 100, // Arredondar para 2 casas decimais
        totalImpressions,
        totalClicks,
        totalReach,
        insights: {
          totalInsights,
          avgCPM: Math.round(avgCPM * 10000) / 10000, // 4 casas decimais
          avgCTR: Math.round(avgCTR * 10000) / 10000, // 4 casas decimais
          avgCPP: Math.round(avgCPP * 100) / 100, // 2 casas decimais
          avgCostPerUniqueClick: Math.round(avgCostPerUniqueClick * 100) / 100, // 2 casas decimais
          avgFrequency: Math.round(avgFrequency * 100) / 100, // 2 casas decimais
          avgCPL: Math.round(calculatedCPL * 100) / 100, // Cost per lead calculado
          totalActions
        }
      }
    };
    return response;

  } catch (error) {
    throw error;
  }
}

/**
 * Função de teste para demonstrar o uso
 * Chame essa função no console do navegador para testar
 */
export async function testLiveDataFetcher(liveId: string) {
  try {
    const startTime = Date.now();
    const data = await fetchCompleteLiveData(liveId);
    const endTime = Date.now();
    // Mostrar resumo formatado
    return data;
    
  } catch (error) {
    throw error;
  }
}

// Exportar para uso global no console (para testes)
if (typeof window !== 'undefined') {
  (window as any).testLiveDataFetcher = testLiveDataFetcher;
  (window as any).fetchCompleteLiveData = fetchCompleteLiveData;
}