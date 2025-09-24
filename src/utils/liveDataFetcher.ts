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

    // 2. Buscar dados do usuário (usando dados básicos disponíveis)
    console.log('[LiveDataFetcher] 2. Preparando dados do usuário...');
    const user = {
      user: {
        id: live.user_id,
        email: null // Email não disponível sem permissões admin
      }
    };
    console.log(`[LiveDataFetcher] Usuário ID: ${live.user_id}`);

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
    } else if (metaIntegration) {
      console.log('[LiveDataFetcher] Integração Meta encontrada:', {
        user_id: metaIntegration.user_id,
        account_id: metaIntegration.account_id,
        account_name: metaIntegration.account_name,
        is_active: metaIntegration.is_active,
        has_access_token: !!metaIntegration.access_token
      });
    }

    let allUserCampaigns: MetaCampaign[] = [];
    let campaignInsights: Array<{ campaign_id: string; insights: MetaInsight[] }> = [];

    // 5a. Buscar campanhas vinculadas à Live (dados salvos no banco)
    console.log('[LiveDataFetcher] 5a. Buscando campanhas vinculadas à Live (banco de dados)...');
    const { data: liveCampaignsList, error: liveCampaignsError } = await supabase
      .from('live_campaigns')
      .select('*')
      .eq('live_id', liveId)
      .order('created_at', { ascending: false });

    if (liveCampaignsError) {
      console.warn('[LiveDataFetcher] Erro ao buscar campanhas vinculadas:', liveCampaignsError);
    }

    const liveCampaigns = liveCampaignsList || [];
    console.log(`[LiveDataFetcher] ${liveCampaigns.length} campanhas vinculadas encontradas no banco`);

    // 5. Se tem integração Meta, buscar campanhas usando termo salvo na Live
    // Como meta_integrations não tem account_id, usar account_id da primeira campanha como fallback
    const fallbackAccountId = liveCampaigns.length > 0 ? liveCampaigns[0].account_id : null;
    const accountId = metaIntegration?.account_id || fallbackAccountId;

    if (metaIntegration?.access_token && accountId) {
      console.log('[LiveDataFetcher] 5. Buscando campanhas usando termo salvo na Live...');
      console.log(`[LiveDataFetcher] Account ID usado: ${accountId} (Meta: ${metaIntegration.account_id || 'undefined'}, Fallback: ${fallbackAccountId || 'undefined'})`);
      console.log(`[LiveDataFetcher] Access Token presente: ${!!metaIntegration.access_token}`);
      console.log(`[LiveDataFetcher] Termo de busca: "${live.campaign_search_term || 'Não definido'}"`);

      try {
        // CORREÇÃO: Usar fetchCampaignInsights com filtros dinâmicos
        // Validar dados obrigatórios - SEM FALLBACKS
        if (!live.insights_date_since || !live.insights_date_until) {
          throw new Error(`[LiveDataFetcher] Datas de insights obrigatórias não encontradas: since=${live.insights_date_since}, until=${live.insights_date_until}`);
        }

        if (!live.campaign_search_term || !live.campaign_search_term.trim()) {
          throw new Error(`[LiveDataFetcher] Termo de busca de campanha obrigatório não encontrado: "${live.campaign_search_term}"`);
        }

        console.log(`[LiveDataFetcher] 🔍 Buscando insights com termo: "${live.campaign_search_term}"`);
        console.log(`[LiveDataFetcher] 📅 Período: ${live.insights_date_since} até ${live.insights_date_until}`);

        // CORREÇÃO: Usar fetchMetaInsights corrigido para buscar de /insights
        const insights = await fetchMetaInsights(
          accountId, // Account ID para buscar insights
          metaIntegration.access_token,
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

        console.log(`[LiveDataFetcher] ✅ ${insights.length} insights encontrados com termo "${live.campaign_search_term}"`);

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

        console.log(`[LiveDataFetcher] 📊 ${insightsByCampaign.size} campanhas únicas encontradas (${insights.length} insights total)`);

        // Converter para array de campanhas
        allUserCampaigns = Array.from(insightsByCampaign.values()).map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          status: 'ACTIVE', // Assumir ativa se retornou insights
          objective: 'OUTCOME_LEADS',
          daily_budget: null,
          lifetime_budget: null,
          created_time: new Date().toISOString(),
          updated_time: new Date().toISOString(),
          insights: campaign.insights // Manter insights agrupados
        }));

        console.log(`[LiveDataFetcher] ${allUserCampaigns.length} campanhas encontradas no Meta${live.campaign_search_term ? ` com termo "${live.campaign_search_term}"` : ' (todas)'}`);

        if (allUserCampaigns.length > 0) {
          console.log('[LiveDataFetcher] Primeiras campanhas encontradas:', allUserCampaigns.slice(0, 3).map(c => ({ id: c.id, name: c.name, status: c.status })));
        }
      } catch (error) {
        console.warn('[LiveDataFetcher] Erro ao buscar campanhas do Meta:', error);
        console.warn('[LiveDataFetcher] Erro detalhado:', (error as Error).message);
      }
    } else {
      console.log('[LiveDataFetcher] 5. Pular busca de campanhas - Integração Meta não disponível');
      console.log(`[LiveDataFetcher] Meta integration: ${!!metaIntegration}, Access token: ${!!metaIntegration?.access_token}, Account ID: ${accountId || 'undefined'} (Meta: ${metaIntegration?.account_id || 'undefined'}, Fallback: ${fallbackAccountId || 'undefined'})`);
    }

    // 6. NOVO: Usar campanhas encontradas pelo termo ao invés das salvas no banco
    console.log('[LiveDataFetcher] 6. Usando campanhas encontradas pelo termo de busca...');
    console.log(`[LiveDataFetcher] ${allUserCampaigns.length} campanhas para buscar insights`);

    // 7. Buscar insights das campanhas encontradas pelo termo
    if (metaIntegration?.access_token && allUserCampaigns.length > 0) {
      console.log('[LiveDataFetcher] 7. Buscando insights das campanhas encontradas...');

      for (const campaign of allUserCampaigns) {
        try {
          console.log(`[LiveDataFetcher] Buscando insights para campanha: ${campaign.name} (${campaign.id})`);
          
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
            console.log(`[LiveDataFetcher] Usando dateRange personalizado: ${customStartDate} até ${customEndDate}`);
          } else if (live.insights_date_since && live.insights_date_until) {
            insightsOptions.dateRange = {
              since: live.insights_date_since,
              until: live.insights_date_until
            };
            console.log(`[LiveDataFetcher] Usando dateRange da Live: ${live.insights_date_since} até ${live.insights_date_until}`);
          } else {
            // Fallback para período padrão (Live sem período definido)
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            insightsOptions.dateRange = {
              since: firstDayOfMonth.toISOString().split('T')[0],
              until: now.toISOString().split('T')[0]
            };
            console.log('[LiveDataFetcher] Usando dateRange padrão (Live sem período definido)');
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

          console.log(`[LiveDataFetcher] ${insights.length} insights encontrados para ${campaign.name}`);
        } catch (error) {
          console.warn(`[LiveDataFetcher] Erro ao buscar insights da campanha ${campaign.id}:`, error);
        }
      }
    }

    // 8. Calcular resumo
    console.log('[LiveDataFetcher] 8. Calculando resumo...');
    const totalGroups = liveGroups.length;
    const totalGroupMembers = liveGroups.reduce((sum, group) => sum + group.group_size, 0);

    // Se não conseguiu buscar campanhas do Meta, usar dados das campanhas vinculadas à Live
    const totalCampaigns = allUserCampaigns.length > 0 ? allUserCampaigns.length : liveCampaigns.length;
    const activeCampaigns = allUserCampaigns.length > 0
      ? allUserCampaigns.filter(c => c.status === 'ACTIVE').length
      : liveCampaigns.filter(c => c.status === 'ACTIVE').length;

    console.log(`[LiveDataFetcher] Campanhas para resumo: Meta API (${allUserCampaigns.length}) | Live vinculadas (${liveCampaigns.length})`);
    console.log(`[LiveDataFetcher] Usando dados: ${allUserCampaigns.length > 0 ? 'Meta API' : 'Live vinculadas'}`);
    console.log(`[LiveDataFetcher] Total campanhas: ${totalCampaigns}, Ativas: ${activeCampaigns}`);

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

    console.log(`[LiveDataFetcher] Processando ${campaignInsights.length} campanhas de insights...`);

    campaignInsights.forEach(({ campaign_id, insights }) => {
      console.log(`[LiveDataFetcher] Campanha ${campaign_id}: ${insights.length} insights`);

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

        // Log dos primeiros insights para debug
        if (index < 3) {
          console.log(`[LiveDataFetcher] Insight ${index}:`, {
            date: `${insight.date_start} - ${insight.date_stop}`,
            spend: insight.spend,
            impressions: insight.impressions,
            clicks: insight.clicks,
            cpm: insight.cpm,
            ctr: insight.ctr,
            frequency: insight.frequency,
            actions: insight.actions?.length || 0
          });
        }

        // Log do último insight para ver o range completo
        if (index === insights.length - 1) {
          console.log(`[LiveDataFetcher] Último Insight (${index}):`, {
            date: `${insight.date_start} - ${insight.date_stop}`,
            spend: insight.spend,
            impressions: insight.impressions,
            clicks: insight.clicks
          });
        }
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

    console.log('[LiveDataFetcher] Métricas calculadas:', {
      totalSpend: totalSpend.toFixed(2),
      totalImpressions,
      totalClicks,
      totalActions,
      totalInsights,
      calculatedCPM: calculatedCPM.toFixed(4),
      calculatedCTR: calculatedCTR.toFixed(4),
      calculatedCPL: calculatedCPL.toFixed(4),
      finalCPM: avgCPM.toFixed(4),
      finalCTR: avgCTR.toFixed(4)
    });

    // Log para comparação direta com Meta Dashboard
    console.log('\n📊 [COMPARAÇÃO COM META DASHBOARD]');
    console.log('==========================================');
    console.log(`Período analisado: 1 set - 14 set 2025`);
    console.log(`Campanha principal: ${liveCampaigns[0]?.campaign_name || 'N/A'}`);
    console.log('');
    console.log('💰 GASTOS:');
    console.log(`  Nossa API: $${totalSpend.toFixed(2)} USD / R$${(totalSpend * 5.5).toFixed(2)} BRL (aprox.)`);
    console.log(`  Meta Dashboard: R$ 74,38 (conforme informado)`);
    console.log('');
    console.log('👀 IMPRESSÕES:');
    console.log(`  Nossa API: ${totalImpressions.toLocaleString()}`);
    console.log(`  Meta Dashboard: 5.325 (conforme informado)`);
    console.log('');
    console.log('👆 CLIQUES:');
    console.log(`  Nossa API: ${totalClicks.toLocaleString()}`);
    console.log(`  Meta Dashboard: [verificar na planilha]`);
    console.log('');
    console.log('📈 MÉTRICAS CALCULADAS:');
    console.log(`  CPM Médio: $${avgCPM.toFixed(2)} (${avgCPM.toFixed(4)} exato)`);
    console.log(`  CTR Médio: ${avgCTR.toFixed(2)}% (${avgCTR.toFixed(4)}% exato)`);
    console.log(`  Custo/Clique: $${avgCostPerUniqueClick.toFixed(2)}`);
    console.log(`  Frequência: ${avgFrequency.toFixed(2)}`);
    console.log('');
    console.log('🎯 AÇÕES/RESULTADOS:');
    console.log(`  Total de Ações: ${totalActions}`);
    console.log(`  Meta Dashboard: 272 resultados (conforme informado)`);
    console.log('');
    console.log('⚠️  POSSÍVEIS DIFERENÇAS:');
    console.log('  - Período: API pode estar usando 30 dias vs. 1-14 setembro');
    console.log('  - Agregação: API soma todos os dias vs. totais do dashboard');
    console.log('  - Moeda: API em USD vs. Dashboard em BRL');
    console.log('  - Timezone: Possível diferença de fuso horário');
    console.log('==========================================\n');

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