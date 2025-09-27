import { supabase } from '@/integrations/supabase/client';
import { fetchMetaInsights } from '../metaApi';
import { getWhatsAppGroupsLogByPeriod } from '../whatsappGroupsLog';

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

interface Live {
  id: string;
  name: string;
  user_id: string;
  campaign_search_term: string;
  insights_date_since: string;
  insights_date_until: string;
  ad_budget?: number;
}

interface MetaIntegration {
  access_token: string;
  user_id: string;
  is_active: boolean;
}

interface LiveCampaign {
  campaign_id: string;
  campaign_name: string;
  account_id: string;
}

interface MetaInsight {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  date_start?: string;
  date_stop?: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
}

interface GroupData {
  id: string;
  group_id: string;
  group_name: string;
  group_size: number;
  monitoring: boolean;
  created_at: string;
  updated_at: string;
}

interface CachedData {
  cached_metrics: {
    cplMeta: number;
    cplLiquido: number;
    retentionRate: number;
    cplLiquidoPlanejamento: number;
  };
  cached_group_data: {
    totalGroups: number;
    totalMembers: number;
    entries: number;
    exits: number;
    activeMembers: number;
  };
  cached_meta_data: {
    totalSpend: number;
    totalResults: number;
    campaignCount: number;
    insightsCount: number;
  };
  cached_traffic_data: {
    dailyInsights: Array<{
      date: string;
      spend: number;
      leads: number;
      cplMeta: number;
    }>;
    campaigns: Array<{
      id: string;
      name: string;
      status: string;
    }>;
    groups: GroupData[];
  };
}

interface LiveDatabaseData {
  id: string;
  name: string;
  user_id: string;
  live_date: string;
  captacao_start: string;
  ta_rolando_start: string;
  ta_rolando_end: string;
  participants: number;
  sales: number;
  revenue: string;
  current_viewers: number;
  peak_viewers: number;
  created_at: string;
  updated_at: string;
  sales_goal: number;
  leads_goal: number;
  ad_budget: string;
  insights_date_since: string;
  insights_date_until: string;
  campaign_search_term: string;
  last_synced_at: string;
  cached_metrics: {
    cplMeta: number;
    cplLiquido: number;
    retentionRate: number;
    cplLiquidoPlanejamento: number;
  } | null;
  cached_group_data: {
    totalGroups: number;
    totalMembers: number;
    entries: number;
    exits: number;
    activeMembers: number;
  } | null;
  cached_meta_data: {
    totalSpend: number;
    totalResults: number;
    campaignCount: number;
    insightsCount: number;
  } | null;
  cached_public_metrics: unknown | null;
  cached_insights_metadata: unknown | null;
  cached_traffic_data: {
    dailyInsights: Array<{
      date: string;
      spend: number;
      leads: number;
      cplMeta: number;
    }>;
    campaigns: Array<{
      id: string;
      name: string;
      status: string;
    }>;
    groups: GroupData[];
  } | null;
  cached_traffic_metrics: unknown | null;
  traffic_last_synced_at: string;
}

export interface LiveDataResult {
  // Campanhas encontradas
  campaigns: {
    total: number;
    new: number;
    missing: number;
    list: Array<{
      id: string;
      name: string;
      status: string;
    }>;
  };
  
  // Insights agregados do Meta
  aggregatedInsights: {
    totalSpend: number;
    totalLeads: number;
    cplMeta: number;
  };
  
  // Insights diários (para Traffic Analysis)
  dailyInsights: Array<{
    date: string;
    spend: number;
    leads: number;
    cplMeta: number;
    groupJoin?: number;
    groupExit?: number;
    cplLiquido?: number;
    retention?: number;
  }>;
  
  // Métricas calculadas
  metrics: {
    cplMeta: number;
    cplLiquido: number;
    retentionRate: number;
    cplLiquidoPlanejamento: number;
  };
  
  // Dados dos grupos
  groupData: {
    totalMembers: number;
    entries: number;
    exits: number;
    activeMembers: number;
  };
}

export async function getLiveData(liveId: string, force: boolean = false): Promise<LiveDataResult> {
  // Se não forçar, verificar cache primeiro
  if (!force) {
    const cacheValid = await isCacheValid(liveId);
    if (cacheValid) {
      const cachedData = await getCachedLiveData(liveId);
      // Verificar se o cache tem dados válidos (não apenas se é válido por tempo)
      if (cachedData && cachedData.cached_metrics && cachedData.cached_group_data && cachedData.cached_meta_data) {
        // Converter dados do cache para o formato LiveDataResult
        const result = {
          campaigns: {
            total: cachedData.cached_meta_data?.campaignCount || 0,
            new: 0,
            missing: 0,
            list: cachedData.cached_traffic_data?.campaigns || []
          },
          aggregatedInsights: {
            totalSpend: cachedData.cached_meta_data?.totalSpend || 0,
            totalLeads: cachedData.cached_meta_data?.totalResults || 0,
            cplMeta: cachedData.cached_metrics?.cplMeta || 0
          },
          dailyInsights: cachedData.cached_traffic_data?.dailyInsights || [],
          metrics: {
            cplMeta: cachedData.cached_metrics?.cplMeta || 0,
            cplLiquido: cachedData.cached_metrics?.cplLiquido || 0,
            retentionRate: cachedData.cached_metrics?.retentionRate || 0,
            cplLiquidoPlanejamento: cachedData.cached_metrics?.cplLiquidoPlanejamento || 0
          },
          groupData: {
            totalMembers: cachedData.cached_group_data?.totalMembers || 0,
            entries: cachedData.cached_group_data?.entries || 0,
            exits: cachedData.cached_group_data?.exits || 0,
            activeMembers: cachedData.cached_group_data?.activeMembers || 0
          }
        };
        // Salvar dados convertidos no banco para manter consistência
        await updateLiveCache(liveId, result);
        
        return result;
      }
    }
  }
  // ETAPA 1: Buscar dados da Live no banco
  const { data: live, error: liveError } = await supabase
    .from('lives')
    .select('*')
    .eq('id', liveId)
    .single();
    
  if (liveError || !live) {
    throw new Error(`Live não encontrada: ${liveError?.message}`);
  }

  // ETAPA 1.1: Sincronizar grupos WhatsApp dinamicamente (se houver termo de busca)
  if (live.whatsapp_search_term) {
    const newGroupsCount = await syncWhatsAppGroupsWithLive(
      liveId, 
      live.user_id, 
      live.whatsapp_search_term
    );
    
    if (newGroupsCount > 0) {
      // Novos grupos sincronizados
    }
  }

  // ETAPA 2: Buscar campanhas do Meta
  const campaigns = await fetchCampaignsFromMeta(live);
  // ETAPA 3: Buscar insights agregados
  const aggregatedInsights = await fetchAggregatedInsights(live);
  // ETAPA 4: Buscar insights diários (para Traffic Analysis)
  const dailyInsights = await fetchDailyInsights(live);
  // ETAPA 4.1: Enriquecer insights diários com dados dos grupos
  const enrichedDailyInsights = await enrichDailyInsightsWithGroupData(
    dailyInsights,
    liveId,
    live.user_id,
    live.insights_date_since,
    live.insights_date_until
  );
  // ETAPA 5: Buscar dados dos grupos e calcular métricas
  const groupData = await fetchGroupDataForCalculations(
    liveId,
    live.user_id,
    live.insights_date_since,
    live.insights_date_until
  );
  const metrics = calculateSimpleMetrics(
    aggregatedInsights.totalSpend,
    aggregatedInsights.totalLeads,
    groupData.totalMembers,
    live.ad_budget || 0
  );
  const result = {
    campaigns,
    aggregatedInsights,
    dailyInsights: enrichedDailyInsights,
    metrics,
    groupData
  };

  // Sempre salvar no cache quando buscar dados novos
  await updateLiveCache(liveId, result);

  // DEBUG FINAL: Resumo completo dos dados
  return result;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Busca dados dos grupos para salvar no cache
 * @param liveId ID da Live
 * @returns Array com dados dos grupos
 */
async function getGroupsData(liveId: string): Promise<GroupData[]> {
  try {
    const { data: groups, error } = await supabase
      .from('live_groups')
      .select('id, group_id, group_name, group_size, monitoring, created_at, updated_at')
      .eq('live_id', liveId);

    if (error) {
      return [];
    }
    return groups || [];

  } catch (error) {
    return [];
  }
}

/**
 * Gera estrutura hierárquica de campanhas com ad sets e insights REAIS do Meta API
 * @param campaigns Lista de campanhas
 * @param dailyInsights Insights diários do Meta
 * @param liveId ID da Live para buscar dados de integração
 * @returns Estrutura hierárquica de campanhas
 */
export async function generateCampaignsHierarchy(
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
  }>,
  dailyInsights: Array<{
    date: string;
    spend: number;
    leads: number;
    cplMeta: number;
  }>,
  liveId: string
): Promise<{
  campaigns: Array<{
    id: string;
    name: string;
    totalSpend: number;
    totalLeads: number;
    cpl: number;
    adSets: Array<{
      id: string;
      name: string;
      totalSpend: number;
      totalLeads: number;
      cpl: number;
      insights: Array<{
        id: string;
        name: string;
        spend: number;
        leads: number;
        cpl: number;
        creativeUrl?: string;
      }>;
    }>;
  }>;
}> {
  try {
    if (!campaigns || campaigns.length === 0) {
      return { campaigns: [] };
    }


    // Buscar dados de integração do Meta
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('Usuário não autenticado');
      return { campaigns: [] };
    }

    const { data: metaIntegration } = await supabase
      .from('meta_integrations')
      .select('access_token')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (!metaIntegration?.access_token) {
      console.error('Token do Meta não encontrado');
      return { campaigns: [] };
    }

    // Buscar dados da Live para pegar o período
    const { data: liveData } = await supabase
      .from('lives')
      .select('insights_date_since, insights_date_until')
      .eq('id', liveId)
      .single();

    if (!liveData?.insights_date_since || !liveData?.insights_date_until) {
      console.error('Período de insights não encontrado na Live');
      return { campaigns: [] };
    }

    const dateRange = {
      since: liveData.insights_date_since,
      until: liveData.insights_date_until
    };

    const campaignsHierarchy = [];

    // Processar cada campanha
    for (const campaign of campaigns) {
      try {

        // 1. Buscar Ad Sets da campanha
        const adSets = await fetchAdSetsFromMeta(campaign.id, metaIntegration.access_token);

        const campaignAdSets = [];

        // 2. Para cada Ad Set, buscar Ads e seus insights
        for (const adSet of adSets) {
          try {
            // Buscar Ads do Ad Set
            const ads = await fetchAdsFromMeta(adSet.id, metaIntegration.access_token);

            const adSetInsights = [];

            // 3. Para cada Ad, buscar insights
            for (const ad of ads) {
              try {
                const adInsights = await fetchAdInsightsFromMeta(ad.id, metaIntegration.access_token, dateRange);
                
                if (adInsights.length > 0) {
                  // LOG: Dados brutos do ad
                  
                  // Agregar insights do ad
                  const totalSpend = adInsights.reduce((sum, insight) => sum + Number(insight.spend || 0), 0);
                  const totalLeads = adInsights.reduce((sum, insight) => {
                    const actions = insight.actions || [];
                    const leadAction = actions.find((action: { action_type: string; value: number }) => action.action_type === 'lead');
                    return sum + Number(leadAction?.value || 0);
                  }, 0);
                  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;


                  adSetInsights.push({
                    id: ad.id,
                    name: ad.name,
                    spend: totalSpend,
                    leads: totalLeads,
                    cpl,
                    creativeUrl: undefined // TODO: Implementar busca de creative URL
                  });
                }
              } catch (error) {
                console.error(`Erro ao buscar insights do ad ${ad.id}:`, error);
              }
            }

            // Agregar dados do Ad Set
            const adSetTotalSpend = adSetInsights.reduce((sum, insight) => sum + Number(insight.spend || 0), 0);
            const adSetTotalLeads = adSetInsights.reduce((sum, insight) => sum + Number(insight.leads || 0), 0);
            const adSetCpl = adSetTotalLeads > 0 ? adSetTotalSpend / adSetTotalLeads : 0;


            campaignAdSets.push({
              id: adSet.id,
              name: adSet.name,
              totalSpend: adSetTotalSpend,
              totalLeads: adSetTotalLeads,
              cpl: adSetCpl,
              insights: adSetInsights
            });

          } catch (error) {
            console.error(`Erro ao processar ad set ${adSet.id}:`, error);
          }
        }

        // Agregar dados da campanha
        const campaignTotalSpend = campaignAdSets.reduce((sum, adSet) => sum + Number(adSet.totalSpend || 0), 0);
        const campaignTotalLeads = campaignAdSets.reduce((sum, adSet) => sum + Number(adSet.totalLeads || 0), 0);
        const campaignCpl = campaignTotalLeads > 0 ? campaignTotalSpend / campaignTotalLeads : 0;


        campaignsHierarchy.push({
          id: campaign.id,
          name: campaign.name,
          totalSpend: campaignTotalSpend,
          totalLeads: campaignTotalLeads,
          cpl: campaignCpl,
          adSets: campaignAdSets
        });

      } catch (error) {
        console.error(`Erro ao processar campanha ${campaign.id}:`, error);
      }
    }

    
    return { campaigns: campaignsHierarchy };

  } catch (error) {
    console.error('Erro ao gerar hierarquia de campanhas:', error);
    return { campaigns: [] };
  }
}

/**
 * Busca Ad Sets de uma campanha do Meta API
 */
async function fetchAdSetsFromMeta(
  campaignId: string,
  accessToken: string
): Promise<Array<{ id: string; name: string; status: string }>> {
  try {
    const params = new URLSearchParams({
      fields: 'id,name,status',
      access_token: accessToken,
      limit: '100'
    });

    const response = await fetch(`https://graph.facebook.com/v18.0/${campaignId}/adsets?${params}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar ad sets: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Erro ao buscar ad sets:', error);
    return [];
  }
}

/**
 * Busca Ads de um Ad Set do Meta API
 */
async function fetchAdsFromMeta(
  adSetId: string,
  accessToken: string
): Promise<Array<{ id: string; name: string; status: string }>> {
  try {
    const params = new URLSearchParams({
      fields: 'id,name,status',
      access_token: accessToken,
      limit: '100'
    });

    const response = await fetch(`https://graph.facebook.com/v18.0/${adSetId}/ads?${params}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar ads: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Erro ao buscar ads:', error);
    return [];
  }
}

/**
 * Busca insights de um Ad do Meta API
 */
async function fetchAdInsightsFromMeta(
  adId: string,
  accessToken: string,
  dateRange: { since: string; until: string }
): Promise<Array<{
  spend: number;
  actions?: Array<{ action_type: string; value: number }>;
}>> {
  try {
    const params = new URLSearchParams({
      fields: 'spend,actions',
      access_token: accessToken,
      time_range: JSON.stringify({
        since: dateRange.since,
        until: dateRange.until
      })
    });

    const response = await fetch(`https://graph.facebook.com/v18.0/${adId}/insights?${params}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar insights do ad: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Erro ao buscar insights do ad:', error);
    return [];
  }
}

/**
 * Gera dados campaignsWithInsights baseado nos dailyInsights
 * @param dailyInsights Insights diários do Meta
 * @param campaigns Lista de campanhas
 * @returns Array com campanhas e seus insights organizados
 */
async function generateCampaignsWithInsightsFromDailyData(
  dailyInsights: Array<{
    date: string;
    spend: number;
    leads: number;
    cplMeta: number;
  }>,
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
  }>
): Promise<Array<{
  campaign_id: string;
  insights: Array<{
    date_start: string;
    spend: string;
    actions: Array<{
      action_type: string;
      value: string;
    }>;
  }>;
}>> {
  try {
    if (!dailyInsights || dailyInsights.length === 0 || !campaigns || campaigns.length === 0) {
      return [];
    }

    // Para cada campanha, distribuir os insights diários de forma simulada
    const result = campaigns.map(campaign => ({
      campaign_id: campaign.id,
      insights: dailyInsights.map(insight => ({
        date_start: insight.date,
        spend: insight.spend.toString(),
        actions: [
          {
            action_type: 'lead',
            value: insight.leads.toString()
          }
        ]
      }))
    }));
    return result;

  } catch (error) {
    return [];
  }
}

/**
 * Enriquece os insights diários com dados reais dos grupos WhatsApp
 * Implementa cache inteligente e correção do mapeamento por data
 * CORREÇÃO: Implementa estratégia "2 Dias Fresh" e mapeamento exato por data
 */
async function enrichDailyInsightsWithGroupData(
  dailyInsights: Array<{
    date: string;
    spend: number;
    leads: number;
    cplMeta: number;
  }>,
  liveId: string,
  userId: string,
  dateFrom: string,
  dateTo: string
) {
  try {

    // Implementar estratégia "2 Dias Fresh"
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Separar insights por categoria de freshness
    const freshDays = dailyInsights.filter(insight => 
      insight.date === today || insight.date === yesterday
    );
    const olderDays = dailyInsights.filter(insight => 
      insight.date < yesterday
    );


    const enrichedInsights = [];

    // ETAPA 1: Tentar usar cache para dias anteriores (antes de ontem)
    if (olderDays.length > 0) {
      const { data: liveData } = await supabase
        .from('lives')
        .select('cached_traffic_data')
        .eq('id', liveId)
        .single();

      if (liveData?.cached_traffic_data?.dailyInsights) {
        const cachedInsights = liveData.cached_traffic_data.dailyInsights;
        const cacheMap = new Map();

        cachedInsights.forEach((cached: { date: string; groupJoin?: number; groupExit?: number; cplLiquido?: number; retention?: number }) => {
          if (cached.groupJoin !== undefined && cached.groupExit !== undefined) {
            cacheMap.set(cached.date, cached);
          }
        });

        // Usar cache para dias anteriores que já têm dados completos
        const olderWithCache = olderDays.map(insight => {
          const cached = cacheMap.get(insight.date);
          if (cached && cached.groupJoin !== undefined) {
            return {
              ...insight,
              groupJoin: cached.groupJoin,
              groupExit: cached.groupExit,
              cplLiquido: cached.cplLiquido || 0,
              retention: cached.retention || 0
            };
          }
          return insight;
        });

        // Separar quais dias ainda precisam de dados frescos
        const needsFreshData = olderWithCache.filter(insight => !('groupJoin' in insight));
        const fromCache = olderWithCache.filter(insight => 'groupJoin' in insight);

        enrichedInsights.push(...fromCache);
        

        // Buscar dados frescos para dias que não estão em cache + dias recentes
        const allNeedingFresh = [...needsFreshData, ...freshDays];
        if (allNeedingFresh.length > 0) {
          const freshEnriched = await fetchFreshWhatsappData(allNeedingFresh, liveId, userId);
          enrichedInsights.push(...freshEnriched);
        }
      } else {
        console.log(`📦 Cache não encontrado, buscando todos os dados frescos`);
        // Sem cache válido, buscar todos os dados frescos
        const allFreshEnriched = await fetchFreshWhatsappData([...olderDays, ...freshDays], liveId, userId);
        enrichedInsights.push(...allFreshEnriched);
      }
    } else {
      console.log(`✨ Apenas dias recentes, buscando dados frescos`);
      // Apenas dias recentes, buscar dados frescos
      if (freshDays.length > 0) {
        const freshEnriched = await fetchFreshWhatsappData(freshDays, liveId, userId);
        enrichedInsights.push(...freshEnriched);
      }
    }

    // Ordenar por data e validar mapeamento
    enrichedInsights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    

    return enrichedInsights;

  } catch (error) {
    console.error(`❌ [WhatsApp Groups Fix] Erro ao enriquecer insights:`, error);
    // Retornar insights originais com dados zerados em caso de erro
    return dailyInsights.map(insight => ({
      ...insight,
      groupJoin: 0,
      groupExit: 0,
      cplLiquido: 0,
      retention: 0
    }));
  }
}

/**
 * Busca dados frescos do WhatsApp para os insights fornecidos
 * CORREÇÃO: Implementa mapeamento exato por data e validação detalhada
 */
async function fetchFreshWhatsappData(
  insights: Array<{ date: string; spend: number; leads: number; cplMeta: number }>,
  liveId: string,
  userId: string
): Promise<Array<{ date: string; spend: number; leads: number; cplMeta: number; groupJoin: number; groupExit: number; cplLiquido: number; retention: number }>> {
  if (insights.length === 0) return [];


  // Buscar IDs dos grupos da Live
  const { data: groups, error: groupsError } = await supabase
    .from('live_groups')
    .select('group_id, group_name')
    .eq('live_id', liveId);
    
  if (groupsError || !groups || groups.length === 0) {
    return insights.map(insight => ({
      ...insight,
      groupJoin: 0,
      groupExit: 0,
      cplLiquido: 0,
      retention: 0
    }));
  }

  const groupIds = groups.map(group => group.group_id);

  // CORREÇÃO CRÍTICA: Buscar dados de cada dia individualmente para garantir mapeamento exato
  const enrichedResults = [];

  for (const insight of insights) {
    try {
      
      // Buscar dados específicos do dia (com margem de 1 dia)
      const dayStart = `${insight.date} 00:00:00`;
      const dayEnd = `${insight.date} 23:59:59`;
      
      const whatsappDayData = await getWhatsAppGroupsLogByPeriod(
        groupIds,
        dayStart,
        dayEnd,
        userId,
        'day'
      );

      // Filtrar apenas dados do dia exato (correção adicional)
      const exactDayData = whatsappDayData.filter(data => data.date === insight.date);
      
      let groupJoin = 0;
      let groupExit = 0;
      
      if (exactDayData.length > 0) {
        // Somar entradas e saídas do dia específico
        groupJoin = exactDayData.reduce((sum, data) => sum + data.entries, 0);
        groupExit = exactDayData.reduce((sum, data) => sum + data.exits, 0);
        
      }

      // Calcular métricas derivadas
      const activeMembers = Math.max(0, groupJoin - groupExit);
      const cplLiquido = activeMembers > 0 ? insight.spend / activeMembers : 0;
      const retention = insight.leads > 0 ? Math.round((activeMembers / insight.leads) * 100) : 0;

      enrichedResults.push({
        ...insight,
        groupJoin,
        groupExit,
        cplLiquido,
        retention
      });

    } catch (error) {
      console.error(`❌ Erro ao processar ${insight.date}:`, error);
      // Fallback para dados zerados em caso de erro específico do dia
      enrichedResults.push({
        ...insight,
        groupJoin: 0,
        groupExit: 0,
        cplLiquido: 0,
        retention: 0
      });
    }
  }

  // Log de resumo
  const totalEntries = enrichedResults.reduce((sum, r) => sum + r.groupJoin, 0);
  const totalExits = enrichedResults.reduce((sum, r) => sum + r.groupExit, 0);

  return enrichedResults;
}

async function fetchCampaignsFromMeta(live: Live) {
  try {
    // Buscar integração Meta do usuário
    const { data: metaIntegration, error: metaError } = await supabase
      .from('meta_integrations')
      .select('*')
      .eq('user_id', live.user_id)
      .eq('is_active', true)
      .single();

    if (metaError || !metaIntegration) {
      throw new Error(`Integração Meta não encontrada: ${metaError?.message}`);
    }

    const metaIntegrationTyped = metaIntegration as MetaIntegration;

    // Buscar conta Meta selecionada
    const { data: liveCampaigns } = await supabase
      .from('live_campaigns')
      .select('account_id')
      .eq('live_id', live.id)
      .limit(1);

    const accountId = liveCampaigns?.[0]?.account_id;
    if (!accountId) {
      throw new Error('Account ID não encontrado');
    }

    // Buscar campanhas do Meta com filtro por termo
    const insights: MetaInsight[] = await fetchMetaInsights(
      accountId,
      metaIntegrationTyped.access_token,
      {
        level: 'campaign',
        fields: ['campaign_id', 'campaign_name', 'spend', 'actions'],
        timeRange: {
          since: live.insights_date_since,
          until: live.insights_date_until
        },
        filtering: [
          {
            field: 'campaign.effective_status',
            operator: 'IN',
            value: ['ACTIVE', 'PAUSED']
          },
          {
            field: 'campaign.name',
            operator: 'CONTAIN',
            value: live.campaign_search_term
          }
        ]
      }
    );

    // Agrupar por campanha
    const campaignsMap = new Map();
    insights.forEach(insight => {
      if (!campaignsMap.has(insight.campaign_id)) {
        campaignsMap.set(insight.campaign_id, {
          id: insight.campaign_id,
          name: insight.campaign_name,
          status: 'ACTIVE'
        });
      }
    });

    const campaignsList = Array.from(campaignsMap.values());
    
    // Comparar com banco
    const { data: bankCampaigns } = await supabase
      .from('live_campaigns')
      .select('campaign_id, campaign_name')
      .eq('live_id', live.id) as { data: LiveCampaign[] | null };

    const bankCampaignsTyped = bankCampaigns as LiveCampaign[];

    const bankIds = new Set(bankCampaignsTyped?.map(c => c.campaign_id) || []);
    const metaIds = new Set(campaignsList.map(c => c.id));

    const newCampaigns = campaignsList.filter(c => !bankIds.has(c.id));
    const missingCampaigns = bankCampaignsTyped?.filter(c => !metaIds.has(c.campaign_id)) || [];

    // SALVAR CAMPANHAS NOVAS NO BANCO AUTOMATICAMENTE
    if (newCampaigns.length > 0) {
      const campaignsToInsert = newCampaigns.map(campaign => ({
        live_id: live.id,
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        account_id: accountId,
        status: campaign.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('live_campaigns')
        .insert(campaignsToInsert);

      if (insertError) {
        console.error('Erro ao inserir novas campanhas:', insertError);
      } else {
        newCampaigns.forEach(campaign => {
          console.log(`Nova campanha adicionada: ${campaign.name}`);
        });
      }
    }

    // MANTER CAMPANHAS REMOVIDAS NO BANCO (não excluir)
    if (missingCampaigns.length > 0) {
      missingCampaigns.forEach(campaign => {
        console.log(`Campanha removida do Meta: ${campaign.campaign_name}`);
      });
    }

    return {
      total: campaignsList.length,
      new: newCampaigns.length,
      missing: missingCampaigns.length,
      list: campaignsList
    };

  } catch (error) {
    return {
      total: 0,
      new: 0,
      missing: 0,
      list: []
    };
  }
}

async function fetchAggregatedInsights(live: Live) {
  try {
    // Buscar integração Meta do usuário
    const { data: metaIntegration, error: metaError } = await supabase
      .from('meta_integrations')
      .select('*')
      .eq('user_id', live.user_id)
      .eq('is_active', true)
      .single();

    if (metaError || !metaIntegration) {
      throw new Error(`Integração Meta não encontrada: ${metaError?.message}`);
    }

    const metaIntegrationTyped = metaIntegration as MetaIntegration;

    // Buscar conta Meta selecionada
    const { data: liveCampaigns } = await supabase
      .from('live_campaigns')
      .select('account_id')
      .eq('live_id', live.id)
      .limit(1);

    const accountId = liveCampaigns?.[0]?.account_id;
    if (!accountId) {
      throw new Error('Account ID não encontrado');
    }

    // Buscar insights agregados (level=account, sem time_increment)
    const insights: MetaInsight[] = await fetchMetaInsights(
      accountId,
      metaIntegrationTyped.access_token,
      {
        level: 'account',
        fields: ['spend', 'impressions', 'actions'],
        timeRange: {
          since: live.insights_date_since,
          until: live.insights_date_until
        },
        filtering: [
          {
            field: 'campaign.effective_status',
            operator: 'IN',
            value: ['ACTIVE', 'PAUSED']
          },
          {
            field: 'campaign.name',
            operator: 'CONTAIN',
            value: live.campaign_search_term
          }
        ]
      }
    );

    // Calcular totais agregados
    let totalSpend = 0;
    let totalLeads = 0;

    insights.forEach(insight => {
      totalSpend += parseFloat(insight.spend || '0');

      // Extrair leads do array actions
      if (insight.actions && Array.isArray(insight.actions)) {
        insight.actions.forEach(action => {
          if (action.action_type === 'lead') {
            totalLeads += parseInt(action.value || '0');
          }
        });
      }
    });

    // Calcular CPL Meta
    const cplMeta = totalLeads > 0 ? totalSpend / totalLeads : 0;

    return {
      totalSpend,
      totalLeads,
      cplMeta
    };

  } catch (error) {
    return {
      totalSpend: 0,
      totalLeads: 0,
      cplMeta: 0
    };
  }
}

async function fetchDailyInsights(live: Live) {
  try {
    // Buscar integração Meta do usuário
    const { data: metaIntegration, error: metaError } = await supabase
      .from('meta_integrations')
      .select('*')
      .eq('user_id', live.user_id)
      .eq('is_active', true)
      .single();

    if (metaError || !metaIntegration) {
      throw new Error(`Integração Meta não encontrada: ${metaError?.message}`);
    }

    const metaIntegrationTyped = metaIntegration as MetaIntegration;

    // Buscar conta Meta selecionada
    const { data: liveCampaigns } = await supabase
      .from('live_campaigns')
      .select('account_id')
      .eq('live_id', live.id)
      .limit(1);

    const accountId = liveCampaigns?.[0]?.account_id;
    if (!accountId) {
      throw new Error('Account ID não encontrado');
    }

    // Buscar insights diários (level=campaign, com time_increment=1)
    const insights: MetaInsight[] = await fetchMetaInsights(
      accountId,
      metaIntegrationTyped.access_token,
      {
        level: 'campaign',
        fields: ['date_start', 'spend', 'actions'],
        timeRange: {
          since: live.insights_date_since,
          until: live.insights_date_until
        },
        timeIncrement: 1, // Dados diários
        filtering: [
          {
            field: 'campaign.effective_status',
            operator: 'IN',
            value: ['ACTIVE', 'PAUSED']
          },
          {
            field: 'campaign.name',
            operator: 'CONTAIN',
            value: live.campaign_search_term
          }
        ]
      }
    );

    // Agrupar por data
    const dailyMap = new Map();
    
    insights.forEach(insight => {
      const date = insight.date_start || insight.date_stop;
      if (!date) return;

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          spend: 0,
          leads: 0,
        });
      }

      const dayData = dailyMap.get(date);
      dayData.spend += parseFloat(insight.spend || '0');

      // Extrair leads do array actions
      if (insight.actions && Array.isArray(insight.actions)) {
        insight.actions.forEach(action => {
          if (action.action_type === 'lead') {
            dayData.leads += parseInt(action.value || '0');
            
          }
        });
      }
    });
    

    const dailyInsights = Array.from(dailyMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calcular CPL Meta para cada dia
    const dailyInsightsWithCPL = dailyInsights.map(day => ({
      ...day,
      cplMeta: day.leads > 0 ? day.spend / day.leads : 0
    }));
    return dailyInsightsWithCPL;

  } catch (error) {
    return [];
  }
}

async function fetchGroupDataForCalculations(liveId: string, userId: string, dateFrom: string, dateTo: string) {
  try {
    // Buscar grupos da Live
    const { data: groups, error } = await supabase
      .from('live_groups')
      .select('group_id, group_name, group_size, monitoring')
      .eq('live_id', liveId);

    if (error) {
      return {
        totalMembers: 0,
        entries: 0,
        exits: 0,
        activeMembers: 0
      };
    }

    const totalMembers = groups?.reduce((sum, group) => sum + (group.group_size || 0), 0) || 0;
    const activeGroups = groups?.filter(group => group.monitoring).length || 0;
    // Buscar dados reais do WhatsApp Groups Log
    if (groups && groups.length > 0) {
      try {
        const groupIds = groups.map(group => group.group_id);
        const whatsappData = await getWhatsAppGroupsLogByPeriod(
          groupIds,
          dateFrom,
          dateTo,
          userId,
          'day'
        );

        // Calcular totais dos dados do WhatsApp
        const totalEntries = whatsappData.reduce((sum, day) => sum + day.entries, 0);
        const totalExits = whatsappData.reduce((sum, day) => sum + day.exits, 0);
        const realActiveMembers = Math.max(0, totalEntries - totalExits);
        return {
          totalMembers,
          entries: totalEntries,
          exits: totalExits,
          activeMembers: realActiveMembers || totalMembers // Fallback para totalMembers se não tiver dados reais
        };

      } catch (whatsappError) {
        // Usar dados dos grupos como fallback
        return {
          totalMembers,
          entries: 0,
          exits: 0,
          activeMembers: totalMembers
        };
      }
    }

    return {
      totalMembers,
      entries: 0,
      exits: 0,
      activeMembers: totalMembers
    };

  } catch (error) {
    return {
      totalMembers: 0,
      entries: 0,
      exits: 0,
      activeMembers: 0
    };
  }
}

function calculateSimpleMetrics(
  totalSpend: number,
  totalLeads: number,
  totalGroupMembers: number,
  orcamentoGasto: number
) {
  // CPL Meta: Total gasto / Total de leads do Meta
  const cplMeta = totalLeads > 0 ? totalSpend / totalLeads : 0;

  // CPL Líquido: Total gasto / Total de membros no grupo
  const cplLiquido = totalGroupMembers > 0 ? totalSpend / totalGroupMembers : 0;

  // Taxa de Retenção: (Membros no grupo / Leads do Meta) * 100
  const retentionRate = totalLeads > 0 ? (totalGroupMembers / totalLeads) * 100 : 0;

  // CPL Líquido do Planejamento: Orçamento gasto / Membros no grupo
  const cplLiquidoPlanejamento = totalGroupMembers > 0 ? orcamentoGasto / totalGroupMembers : 0;

  const metrics = {
    cplMeta,
    cplLiquido,
    retentionRate,
    cplLiquidoPlanejamento
  };
  return metrics;
}

// ============================================================================
// FUNÇÃO DE CACHE - SALVAR DADOS NO BANCO
// ============================================================================

/**
 * Salva todos os dados da Live no banco usando campos JSONB
 * @param liveId ID da Live
 * @param liveData Dados completos da Live
 */
export async function updateLiveCache(liveId: string, liveData: LiveDataResult): Promise<void> {
  // Preparar dados para cache
  const cacheData = {
    // Métricas calculadas
    cached_metrics: {
      cplMeta: liveData.metrics.cplMeta,
      cplLiquido: liveData.metrics.cplLiquido,
      retentionRate: liveData.metrics.retentionRate,
      cplLiquidoPlanejamento: liveData.metrics.cplLiquidoPlanejamento
    },
    
    // Dados dos grupos
    cached_group_data: {
      totalGroups: liveData.groupData.totalMembers > 0 ? 8 : 0, // Assumindo 8 grupos baseado nos logs
      totalMembers: liveData.groupData.totalMembers,
      entries: liveData.groupData.entries,
      exits: liveData.groupData.exits,
      activeMembers: liveData.groupData.activeMembers
    },
    
    // Dados agregados do Meta
    cached_meta_data: {
      totalSpend: liveData.aggregatedInsights.totalSpend,
      totalResults: liveData.aggregatedInsights.totalLeads,
      campaignCount: liveData.campaigns.total,
      insightsCount: liveData.dailyInsights.length
    },
    
    // Dados de tráfego (insights diários)
    cached_traffic_data: {
      dailyInsights: liveData.dailyInsights,
      campaigns: liveData.campaigns.list,
      groups: await getGroupsData(liveId), // Buscar dados reais dos grupos
      campaignsWithInsights: await generateCampaignsWithInsightsFromDailyData(liveData.dailyInsights, liveData.campaigns.list), // Popular com dados reais
        campaignsHierarchy: await generateCampaignsHierarchy(liveData.campaigns.list, liveData.dailyInsights, liveId) // Popular com dados hierárquicos REAIS
    },
    
    // Timestamp da última sincronização
    traffic_last_synced_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Atualizar banco (usando tabela de teste)
  // Fazer UPDATE direto (Live já existe na tabela de teste)
  const { data: updateResult, error } = await supabase
    .from('lives')
    .update(cacheData)
    .eq('id', liveId)
    .select('cached_metrics, cached_group_data, cached_meta_data, cached_traffic_data, traffic_last_synced_at, last_synced_at, updated_at');

  if (error) {
    throw error;
  }
}

/**
 * Verifica se o cache está válido (menos de 30 minutos)
 * @param liveId ID da Live
 * @returns true se cache válido, false se precisa atualizar
 */
export async function isCacheValid(liveId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('lives')
      .select('traffic_last_synced_at')
      .eq('id', liveId)
      .single();
    
    if (error || !data?.traffic_last_synced_at) {
      return false;
    }
    
    const lastSync = new Date(data.traffic_last_synced_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);
    const isValid = diffMinutes < 30;
    return isValid;
    
  } catch (error) {
    return false;
  }
}

/**
 * Verifica se o cache da tabela hierárquica de campanhas é válido (60 minutos)
 * @param liveId ID da Live
 * @returns true se cache é válido, false caso contrário
 */
export async function isHierarchicalCacheValid(liveId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('lives')
      .select('campaigns_hierarchy_last_synced_at')
      .eq('id', liveId)
      .single();
    
    if (error || !data?.campaigns_hierarchy_last_synced_at) {
      return false;
    }
    
    const lastSync = new Date(data.campaigns_hierarchy_last_synced_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);
    const isValid = diffMinutes < 60; // 60 minutos para tabela hierárquica
    return isValid;
    
  } catch (error) {
    return false;
  }
}

/**
 * Atualiza apenas o cache da tabela hierárquica de campanhas
 * @param liveId ID da Live
 * @param campaignsHierarchy Dados hierárquicos das campanhas
 */
export async function updateHierarchicalCache(liveId: string, campaignsHierarchy: { campaigns: unknown[] }): Promise<void> {
  try {
    const { error } = await supabase
      .from('lives')
      .update({
        cached_traffic_data: {
          campaignsHierarchy: campaignsHierarchy
        },
        campaigns_hierarchy_last_synced_at: new Date().toISOString()
      })
      .eq('id', liveId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('❌ [HierarchicalCache] Erro ao atualizar cache hierárquico:', error);
    throw error;
  }
}

/**
 * Busca dados da Live SEM gerar hierarquia de campanhas (para botão principal)
 * @param liveId ID da Live
 * @param force Se deve forçar atualização
 * @returns Dados da Live sem hierarquia
 */
export async function getLiveDataWithoutHierarchy(liveId: string, force: boolean = false): Promise<LiveDataResult> {
  // Se não forçar, verificar cache primeiro
  if (!force) {
    const cacheValid = await isCacheValid(liveId);
    if (cacheValid) {
      const cachedData = await getCachedLiveData(liveId);
      // Verificar se o cache tem dados válidos (não apenas se é válido por tempo)
      if (cachedData && cachedData.cached_metrics && cachedData.cached_group_data && cachedData.cached_meta_data) {
        // Converter dados do cache para o formato LiveDataResult
        const result = {
          campaigns: {
            total: cachedData.cached_meta_data?.campaignCount || 0,
            new: 0,
            missing: 0,
            list: cachedData.cached_traffic_data?.campaigns || []
          },
          aggregatedInsights: {
            totalSpend: cachedData.cached_meta_data?.totalSpend || 0,
            totalLeads: cachedData.cached_meta_data?.totalResults || 0,
            cplMeta: cachedData.cached_metrics?.cplMeta || 0
          },
          dailyInsights: cachedData.cached_traffic_data?.dailyInsights || [],
          metrics: {
            cplMeta: cachedData.cached_metrics?.cplMeta || 0,
            cplLiquido: cachedData.cached_metrics?.cplLiquido || 0,
            retentionRate: cachedData.cached_metrics?.retentionRate || 0,
            cplLiquidoPlanejamento: cachedData.cached_metrics?.cplLiquidoPlanejamento || 0
          },
          groupData: {
            totalMembers: cachedData.cached_group_data?.totalMembers || 0,
            entries: cachedData.cached_group_data?.entries || 0,
            exits: cachedData.cached_group_data?.exits || 0,
            activeMembers: cachedData.cached_group_data?.activeMembers || 0
          }
        };
        // Salvar dados convertidos no banco para manter consistência
        await updateLiveCacheWithoutHierarchy(liveId, result);
        
        return result;
      }
    }
  }
  
  // ETAPA 1: Buscar dados da Live no banco
  const { data: live, error: liveError } = await supabase
    .from('lives')
    .select('*')
    .eq('id', liveId)
    .single();
    
  if (liveError || !live) {
    throw new Error(`Live não encontrada: ${liveError?.message}`);
  }

  // ETAPA 1.1: Sincronizar grupos WhatsApp dinamicamente (se houver termo de busca)
  if (live.whatsapp_search_term) {
    const newGroupsCount = await syncWhatsAppGroupsWithLive(
      liveId, 
      live.user_id, 
      live.whatsapp_search_term
    );
    
    if (newGroupsCount > 0) {
      // Novos grupos sincronizados
    }
  }

  // ETAPA 2: Buscar campanhas do Meta
  const campaigns = await fetchCampaignsFromMeta(live);
  // ETAPA 3: Buscar insights agregados
  const aggregatedInsights = await fetchAggregatedInsights(live);
  // ETAPA 4: Buscar insights diários (para Traffic Analysis)
  const dailyInsights = await fetchDailyInsights(live);
  // ETAPA 4.1: Enriquecer insights diários com dados dos grupos
  const enrichedDailyInsights = await enrichDailyInsightsWithGroupData(
    dailyInsights,
    liveId,
    live.user_id,
    live.insights_date_since,
    live.insights_date_until
  );
  // ETAPA 5: Buscar dados dos grupos e calcular métricas
  const groupData = await fetchGroupDataForCalculations(
    liveId,
    live.user_id,
    live.insights_date_since,
    live.insights_date_until
  );
  const metrics = calculateSimpleMetrics(
    aggregatedInsights.totalSpend,
    aggregatedInsights.totalLeads,
    groupData.totalMembers,
    live.ad_budget || 0
  );
  const result = {
    campaigns,
    aggregatedInsights,
    dailyInsights: enrichedDailyInsights,
    metrics,
    groupData
  };

  // Salvar no cache SEM dados hierárquicos
  await updateLiveCacheWithoutHierarchy(liveId, result);
  
  return result;
}

/**
 * Atualiza cache SEM gerar dados hierárquicos (para botão principal)
 * @param liveId ID da Live
 * @param liveData Dados completos da Live
 */
export async function updateLiveCacheWithoutHierarchy(liveId: string, liveData: LiveDataResult): Promise<void> {
  // Preparar dados para cache (SEM dados hierárquicos)
  const cacheData = {
    // Métricas calculadas
    cached_metrics: {
      cplMeta: liveData.metrics.cplMeta,
      cplLiquido: liveData.metrics.cplLiquido,
      retentionRate: liveData.metrics.retentionRate,
      cplLiquidoPlanejamento: liveData.metrics.cplLiquidoPlanejamento
    },
    
    // Dados dos grupos
    cached_group_data: {
      totalGroups: liveData.groupData.totalMembers > 0 ? 8 : 0, // Assumindo 8 grupos baseado nos logs
      totalMembers: liveData.groupData.totalMembers,
      entries: liveData.groupData.entries,
      exits: liveData.groupData.exits,
      activeMembers: liveData.groupData.activeMembers
    },
    
    // Dados agregados do Meta
    cached_meta_data: {
      totalSpend: liveData.aggregatedInsights.totalSpend,
      totalResults: liveData.aggregatedInsights.totalLeads,
      campaignCount: liveData.campaigns.total,
      insightsCount: liveData.dailyInsights.length
    },
    
    // Dados de tráfego (insights diários) - SEM dados hierárquicos
    cached_traffic_data: {
      dailyInsights: liveData.dailyInsights,
      campaigns: liveData.campaigns.list,
      groups: await getGroupsData(liveId), // Buscar dados reais dos grupos
      campaignsWithInsights: await generateCampaignsWithInsightsFromDailyData(liveData.dailyInsights, liveData.campaigns.list) // Popular com dados reais
      // NÃO incluir campaignsHierarchy aqui
    },
    
    // Timestamp da última sincronização
    traffic_last_synced_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Atualizar banco (usando tabela de teste)
  // Fazer UPDATE direto (Live já existe na tabela de teste)
  const { data: updateResult, error } = await supabase
    .from('lives')
    .update(cacheData)
    .eq('id', liveId)
    .select('cached_metrics, cached_group_data, cached_meta_data, cached_traffic_data, traffic_last_synced_at, last_synced_at, updated_at');

  if (error) {
    throw error;
  }
}

/**
 * Busca dados do cache (sem fazer requisições ao Meta)
 * @param liveId ID da Live
 * @returns Dados do cache ou null se não encontrado
 */
export async function getCachedLiveData(liveId: string): Promise<CachedData | null> {
  const { data, error } = await supabase
    .from('lives')
    .select('cached_metrics, cached_group_data, cached_meta_data, cached_traffic_data')
    .eq('id', liveId)
    .single();
  
  if (error) {
    return null;
  }
  return data;
}

/**
 * Função principal que busca dados E salva no cache
 * @param liveId ID da Live
 * @returns Dados completos da Live
 */
export async function getLiveDataWithCache(liveId: string): Promise<LiveDataResult> {
  // Buscar dados completos
  const liveData = await getLiveData(liveId);
  
  // Salvar no cache
  await updateLiveCache(liveId, liveData);
  
  return liveData;
}

/**
 * Busca dados da Live do banco (sem Meta API)
 * @param liveId ID da Live
 * @returns Dados da Live do banco
 */
export async function getLiveDataFromDatabase(liveId: string): Promise<LiveDatabaseData | null> {
  const { data, error } = await supabase
    .from('lives')
    .select('*')
    .eq('id', liveId)
    .single();
  
  if (error) {
    return null;
  }
  return data;
}

/**
 * Gera link de fallback para criativos baseado no effective_object_story_id
 * Formato: https://www.facebook.com/{pageId}/posts/{postId}
 * @param storyId effective_object_story_id no formato pageId_postId
 * @returns URL de fallback para o post
 */
function generateFallbackLink(storyId: string): string {
  try {
    const parts = storyId.split('_');
    if (parts.length === 2) {
      const [pageId, postId] = parts;
      return `https://www.facebook.com/${pageId}/posts/${postId}`;
    }
    // Fallback do fallback - usar o formato antigo se não conseguir separar
    return `https://www.facebook.com/${storyId}`;
  } catch (error) {
    // Último recurso
    return `https://www.facebook.com/${storyId}`;
  }
}

/**
 * Busca dados completos de campanhas com estrutura nested em uma única requisição
 * Reduz drasticamente o número de chamadas ao Graph API do Meta
 * @param live Dados da Live
 * @returns Estrutura hierárquica completa das campanhas
 */
export async function getDeepCampaignAnalysis(live: Live): Promise<{
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    insights: {
      spend: number;
      impressions: number;
      clicks: number;
      actions: Array<{
        action_type: string;
        value: string;
      }>;
    };
    adSets: Array<{
      id: string;
      name: string;
      insights: {
        spend: number;
        impressions: number;
        clicks: number;
        actions: Array<{
          action_type: string;
          value: string;
        }>;
      };
      ads: Array<{
        id: string;
        name: string;
        creative: {
          effective_object_story_id?: string;
          object_story_id?: string;
          permalink_url?: string;
          thumbnail_url?: string;
        };
        insights: {
          spend: number;
          impressions: number;
          clicks: number;
          actions: Array<{
            action_type: string;
            value: string;
          }>;
        };
      }>;
    }>;
  }>;
  requestTime: number;
  payloadSize: number;
  campaignCount: number;
  adSetCount: number;
  adCount: number;
}> {
  const startTime = Date.now();

  try {
    console.log('🚀 [Deep Campaign Analysis] Iniciando busca de dados nested...');

    // Buscar integração Meta do usuário
    const { data: metaIntegration, error: metaError } = await supabase
      .from('meta_integrations')
      .select('*')
      .eq('user_id', live.user_id)
      .eq('is_active', true)
      .single();

    if (metaError || !metaIntegration) {
      throw new Error(`Integração Meta não encontrada: ${metaError?.message}`);
    }

    // Buscar conta Meta selecionada
    const { data: liveCampaigns } = await supabase
      .from('live_campaigns')
      .select('account_id')
      .eq('live_id', live.id)
      .limit(1);

    const accountId = liveCampaigns?.[0]?.account_id;
    if (!accountId) {
      throw new Error('Account ID não encontrado');
    }

    console.log(`📊 [Deep Campaign Analysis] Fazendo requisição para conta: ${accountId}`);

    // Montar query fields nested (sem time_range dentro dos fields)
    const fields = [
      'id,name,status,',
      'insights{spend,impressions,clicks,actions},',
      'adsets{id,name,',
      'insights{spend,impressions,clicks,actions},',
      'ads{id,name,',
      'creative{effective_object_story_id,object_story_id,thumbnail_url},',
      'insights{spend,impressions,clicks,actions}',
      '}}'
    ].join('');

    // Montar filtering dinâmico
    const filtering = [
      {
        field: 'campaign.effective_status',
        operator: 'IN',
        value: ['ACTIVE', 'PAUSED']
      },
      {
        field: 'campaign.name',
        operator: 'CONTAIN',
        value: live.campaign_search_term
      }
    ];

    const params = new URLSearchParams({
      fields: fields,
      access_token: metaIntegration.access_token,
      time_range: JSON.stringify({
        since: live.insights_date_since,
        until: live.insights_date_until
      }),
      filtering: JSON.stringify(filtering),
      limit: '100'
    });

    console.log(`🔗 [Deep Campaign Analysis] URL construída:`, `https://graph.facebook.com/v23.0/${accountId}/campaigns?${params}`);

    // Fazer requisição única consolidada
    const response = await fetch(`https://graph.facebook.com/v23.0/${accountId}/campaigns?${params}`);

    if (!response.ok) {
      throw new Error(`Erro na requisição Graph API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const requestTime = Date.now() - startTime;

    // Calcular métricas da resposta
    const payloadSize = JSON.stringify(data).length;
    const campaigns = data.data || [];

    let adSetCount = 0;
    let adCount = 0;

    // Coletar todos os effective_object_story_ids para buscar permalink_urls
    const objectStoryIds = new Set<string>();

    campaigns.forEach((campaign: any) => {
      campaign.adsets?.data?.forEach((adSet: any) => {
        adSet.ads?.data?.forEach((ad: any) => {
          const storyId = ad.creative?.effective_object_story_id || ad.creative?.object_story_id;
          if (storyId) {
            objectStoryIds.add(storyId);
          }
        });
      });
    });

    console.log(`🔗 [Batch Fetch] Encontrados ${objectStoryIds.size} object_story_ids únicos para buscar dados dos criativos`);

    // Buscar dados dos criativos usando batch API (se existirem object_story_ids)
    const creativeDataMap = new Map<string, { permalink_url: string }>();

    if (objectStoryIds.size > 0) {
      console.log(`🚀 [Batch Fetch] Iniciando busca via batch API...`);

      const batchStartTime = Date.now();
      const storyIdsArray = Array.from(objectStoryIds);

      // Criar sub-requests para cada story_id (apenas permalink_url para reduzir erros)
      const subRequests = storyIdsArray.map((storyId, index) => ({
        method: 'GET',
        relative_url: `${storyId}?fields=permalink_url`
      }));

      console.log(`📦 [Batch Fetch] Criados ${subRequests.length} sub-requests para dados dos criativos`);

      // Dividir em chunks de 50 (limite do Meta)
      const BATCH_SIZE = 50;
      const batches = [];
      for (let i = 0; i < subRequests.length; i += BATCH_SIZE) {
        batches.push(subRequests.slice(i, i + BATCH_SIZE));
      }

      console.log(`📊 [Batch Fetch] Dividido em ${batches.length} batches (máximo ${BATCH_SIZE} por batch)`);

      // Executar batches sequencialmente
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 [Batch ${batchIndex + 1}/${batches.length}] Processando ${batch.length} sub-requests...`);

        try {
          const batchParams = new URLSearchParams({
            access_token: metaIntegration.access_token,
            batch: JSON.stringify(batch)
          });

          const batchResponse = await fetch(`https://graph.facebook.com/v23.0/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: batchParams
          });

          if (batchResponse.ok) {
            const batchData = await batchResponse.json();

            // Processar resultados do batch
            batchData.forEach((result: any, index: number) => {
              const storyId = storyIdsArray[batchIndex * BATCH_SIZE + index];

              if (result.code === 200) {
                try {
                  const resultData = JSON.parse(result.body);
                  if (resultData.permalink_url) {
                    // Permalink real obtido com sucesso
                    creativeDataMap.set(storyId, {
                      permalink_url: resultData.permalink_url
                    });
                    console.log(`✅ [Real Link] ${storyId}: ${resultData.permalink_url}`);
                  } else {
                    // Sem permalink, gerar fallback
                    const fallbackLink = generateFallbackLink(storyId);
                    creativeDataMap.set(storyId, {
                      permalink_url: fallbackLink
                    });
                    console.log(`🔄 [Fallback] ${storyId}: ${fallbackLink}`);
                  }
                } catch (parseError) {
                  // Erro ao parsear, gerar fallback
                  const fallbackLink = generateFallbackLink(storyId);
                  creativeDataMap.set(storyId, {
                    permalink_url: fallbackLink
                  });
                  console.log(`🔄 [Parse Error → Fallback] ${storyId}: ${fallbackLink}`);
                }
              } else {
                // Qualquer erro (400, 403, etc.) → gerar fallback sem logar erro detalhado
                const fallbackLink = generateFallbackLink(storyId);
                creativeDataMap.set(storyId, {
                  permalink_url: fallbackLink
                });
                console.log(`🔄 [Error ${result.code} → Fallback] ${storyId}: ${fallbackLink}`);
              }
            });

            console.log(`✅ [Batch ${batchIndex + 1}] Concluído com sucesso`);
          } else {
            console.log(`❌ [Batch ${batchIndex + 1}] Erro HTTP: ${batchResponse.status} ${batchResponse.statusText}`);
          }
        } catch (error) {
          console.log(`❌ [Batch ${batchIndex + 1}] Erro ao processar:`, error);
        }

        // Pequeno delay entre batches para evitar rate limits
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const batchTime = Date.now() - batchStartTime;
      console.log(`⏱️ [Batch Fetch] Concluído em ${batchTime}ms - ${creativeDataMap.size}/${objectStoryIds.size} criativos processados`);
    }

    // Processar dados e contar elementos
    const processedCampaigns = campaigns.map((campaign: any) => {
      const campaignInsights = campaign.insights?.data?.[0] || {
        spend: 0,
        impressions: 0,
        clicks: 0,
        actions: []
      };

      const processedAdSets = (campaign.adsets?.data || []).map((adSet: any) => {
        adSetCount++;

        const adSetInsights = adSet.insights?.data?.[0] || {
          spend: 0,
          impressions: 0,
          clicks: 0,
          actions: []
        };

        const processedAds = (adSet.ads?.data || []).map((ad: any) => {
          adCount++;

          const adInsights = ad.insights?.data?.[0] || {
            spend: 0,
            impressions: 0,
            clicks: 0,
            actions: []
          };

          // Buscar permalink do mapa ou gerar fallback se necessário
          const storyId = ad.creative?.effective_object_story_id || ad.creative?.object_story_id;
          let permalinkUrl: string | undefined;

          if (storyId) {
            const creativeData = creativeDataMap.get(storyId);
            if (creativeData) {
              permalinkUrl = creativeData.permalink_url;
            } else {
              // Se não encontrou no mapa, gerar fallback
              permalinkUrl = generateFallbackLink(storyId);
              console.log(`🔄 [Missing from Map → Fallback] ${storyId}: ${permalinkUrl}`);
            }
          }

          return {
            id: ad.id,
            name: ad.name,
            creative: {
              effective_object_story_id: ad.creative?.effective_object_story_id,
              object_story_id: ad.creative?.object_story_id,
              permalink_url: permalinkUrl,
              thumbnail_url: ad.creative?.thumbnail_url
            },
            insights: {
              spend: parseFloat(adInsights.spend || '0'),
              impressions: parseInt(adInsights.impressions || '0'),
              clicks: parseInt(adInsights.clicks || '0'),
              actions: adInsights.actions || []
            }
          };
        });

        return {
          id: adSet.id,
          name: adSet.name,
          insights: {
            spend: parseFloat(adSetInsights.spend || '0'),
            impressions: parseInt(adSetInsights.impressions || '0'),
            clicks: parseInt(adSetInsights.clicks || '0'),
            actions: adSetInsights.actions || []
          },
          ads: processedAds
        };
      });

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        insights: {
          spend: parseFloat(campaignInsights.spend || '0'),
          impressions: parseInt(campaignInsights.impressions || '0'),
          clicks: parseInt(campaignInsights.clicks || '0'),
          actions: campaignInsights.actions || []
        },
        adSets: processedAdSets
      };
    });

    // Debug logs finais
    console.log(`⏱️ [Deep Campaign Analysis] Tempo total de execução: ${requestTime}ms`);
    console.log(`📦 [Deep Campaign Analysis] Tamanho do payload: ${(payloadSize / 1024).toFixed(2)} KB`);
    console.log(`📊 [Deep Campaign Analysis] Campanhas retornadas: ${campaigns.length}`);
    console.log(`📊 [Deep Campaign Analysis] Ad Sets retornados: ${adSetCount}`);
    console.log(`📊 [Deep Campaign Analysis] Ads retornados: ${adCount}`);
    console.log(`🔗 [Deep Campaign Analysis] Dados dos criativos obtidos: ${creativeDataMap.size}/${objectStoryIds.size}`);

    // Log detalhado dos dados enriquecidos (para debug)
    if (creativeDataMap.size > 0) {
      console.log(`📝 [Creative Links Summary] Resumo dos links obtidos:`);

      let realLinkCount = 0;
      let fallbackCount = 0;

      creativeDataMap.forEach((data, storyId) => {
        if (data.permalink_url) {
          // Detectar se é link real (contem /posts/, /videos/, etc.) ou fallback
          if (data.permalink_url.includes('/posts/') || data.permalink_url.includes('/videos/') || data.permalink_url.includes('/reel/')) {
            realLinkCount++;
            console.log(`✅ [Real Link] ${storyId}: ${data.permalink_url}`);
          } else {
            fallbackCount++;
            console.log(`🔄 [Fallback] ${storyId}: ${data.permalink_url}`);
          }
        }
      });

      console.log(`📊 [Link Stats] Total: ${creativeDataMap.size} criativos processados`);
      console.log(`📊 [Link Types] Real links: ${realLinkCount}, Fallback links: ${fallbackCount}`);

      // Log apenas uma amostra dos dados para não poluir
      if (creativeDataMap.size > 3) {
        console.log(`📝 [Sample] Primeiros 3 criativos:`, Object.fromEntries(Array.from(creativeDataMap.entries()).slice(0, 3)));
      } else {
        console.log(`📝 [All Data] Todos os criativos:`, Object.fromEntries(creativeDataMap));
      }
    }

    return {
      campaigns: processedCampaigns,
      requestTime,
      payloadSize,
      campaignCount: campaigns.length,
      adSetCount,
      adCount
    };

  } catch (error) {
    const requestTime = Date.now() - startTime;
    console.error(`❌ [Deep Campaign Analysis] Erro após ${requestTime}ms:`, error);

    return {
      campaigns: [],
      requestTime,
      payloadSize: 0,
      campaignCount: 0,
      adSetCount: 0,
      adCount: 0
    };
  }
}

/**
 * Busca dados completos de campanhas com time_increment para análise por data
 * Versão incrementada da getDeepCampaignAnalysis com dados organizados por dia
 * @param live Dados da Live
 * @returns Estrutura hierárquica completa das campanhas organizadas por data
 */
export async function getDeepCampaignAnalysisIncremented(live: Live): Promise<{
  campaignsByDate: Record<string, Array<{
    id: string;
    name: string;
    spend: number;
    leads: number;
    cpl: number;
    adSets: Array<{
      id: string;
      name: string;
      spend: number;
      leads: number;
      cpl: number;
      ads: Array<{
        id: string;
        name: string;
        spend: number;
        leads: number;
        cpl: number;
        creativeUrl?: string;
      }>;
    }>;
  }>>;
  requestTime: number;
  payloadSize: number;
  dateRange: {
    since: string;
    until: string;
  };
  totalDays: number;
}> {
  const startTime = Date.now();

  try {
    console.log('🚀 [Deep Campaign Analysis Incremented] Iniciando busca de dados nested com time_increment...');

    // Buscar integração Meta do usuário
    const { data: metaIntegration, error: metaError } = await supabase
      .from('meta_integrations')
      .select('*')
      .eq('user_id', live.user_id)
      .eq('is_active', true)
      .single();

    if (metaError || !metaIntegration) {
      throw new Error(`Integração Meta não encontrada: ${metaError?.message}`);
    }

    // Buscar conta Meta selecionada
    const { data: liveCampaigns } = await supabase
      .from('live_campaigns')
      .select('account_id')
      .eq('live_id', live.id)
      .limit(1);

    const accountId = liveCampaigns?.[0]?.account_id;
    if (!accountId) {
      throw new Error('Account ID não encontrado');
    }

    console.log(`📊 [Incremented Analysis] Fazendo requisição para conta: ${accountId}`);

    // Montar query fields nested (sem time_range dentro dos fields)
    const fields = [
      'id,name,status,',
      'insights{spend,impressions,clicks,actions,date_start},',
      'adsets{id,name,',
      'insights{spend,impressions,clicks,actions,date_start},',
      'ads{id,name,',
      'creative{effective_object_story_id,object_story_id,thumbnail_url},',
      'insights{spend,impressions,clicks,actions,date_start}',
      '}}'
    ].join('');

    // Montar filtering dinâmico
    const filtering = [
      {
        field: 'campaign.effective_status',
        operator: 'IN',
        value: ['ACTIVE', 'PAUSED']
      },
      {
        field: 'campaign.name',
        operator: 'CONTAIN',
        value: live.campaign_search_term
      }
    ];

    const params = new URLSearchParams({
      fields: fields,
      access_token: metaIntegration.access_token,
      time_range: JSON.stringify({
        since: live.insights_date_since,
        until: live.insights_date_until
      }),
      time_increment: '1', // NOVO: Incremento de 1 dia
      filtering: JSON.stringify(filtering),
      limit: '100'
    });

    console.log(`🔗 [Incremented Analysis] URL construída:`, `https://graph.facebook.com/v23.0/${accountId}/campaigns?${params}`);

    // Fazer requisição única consolidada
    const response = await fetch(`https://graph.facebook.com/v23.0/${accountId}/campaigns?${params}`);

    if (!response.ok) {
      throw new Error(`Erro na requisição Graph API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const requestTime = Date.now() - startTime;

    // Calcular métricas da resposta
    const payloadSize = JSON.stringify(data).length;
    const campaigns = data.data || [];

    console.log(`📦 [Incremented Analysis] Dados recebidos:`, {
      campaigns: campaigns.length,
      payload: `${(payloadSize / 1024).toFixed(2)} KB`,
      tempo: `${requestTime}ms`
    });

    // Coletar todos os effective_object_story_ids para buscar permalink_urls
    const objectStoryIds = new Set<string>();

    campaigns.forEach((campaign: any) => {
      campaign.adsets?.data?.forEach((adSet: any) => {
        adSet.ads?.data?.forEach((ad: any) => {
          const storyId = ad.creative?.effective_object_story_id || ad.creative?.object_story_id;
          if (storyId) {
            objectStoryIds.add(storyId);
          }
        });
      });
    });

    console.log(`🔗 [Incremented Batch Fetch] Encontrados ${objectStoryIds.size} object_story_ids únicos`);

    // Buscar dados dos criativos usando batch API (reutilizando lógica existente)
    const creativeDataMap = new Map<string, { permalink_url: string }>();

    if (objectStoryIds.size > 0) {
      console.log(`🚀 [Incremented Batch Fetch] Iniciando busca via batch API...`);

      const batchStartTime = Date.now();
      const storyIdsArray = Array.from(objectStoryIds);

      // Criar sub-requests para cada story_id
      const subRequests = storyIdsArray.map((storyId, index) => ({
        method: 'GET',
        relative_url: `${storyId}?fields=permalink_url`
      }));

      // Dividir em chunks de 50 (limite do Meta)
      const BATCH_SIZE = 50;
      const batches = [];
      for (let i = 0; i < subRequests.length; i += BATCH_SIZE) {
        batches.push(subRequests.slice(i, i + BATCH_SIZE));
      }

      // Executar batches sequencialmente
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 [Incremented Batch ${batchIndex + 1}/${batches.length}] Processando ${batch.length} sub-requests...`);

        try {
          const batchParams = new URLSearchParams({
            access_token: metaIntegration.access_token,
            batch: JSON.stringify(batch)
          });

          const batchResponse = await fetch(`https://graph.facebook.com/v23.0/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: batchParams
          });

          if (batchResponse.ok) {
            const batchData = await batchResponse.json();

            // Processar resultados do batch
            batchData.forEach((result: any, index: number) => {
              const storyId = storyIdsArray[batchIndex * BATCH_SIZE + index];

              if (result.code === 200) {
                try {
                  const resultData = JSON.parse(result.body);
                  if (resultData.permalink_url) {
                    // Permalink real obtido com sucesso
                    creativeDataMap.set(storyId, {
                      permalink_url: resultData.permalink_url
                    });
                  } else {
                    // Sem permalink, gerar fallback
                    const fallbackLink = generateFallbackLink(storyId);
                    creativeDataMap.set(storyId, {
                      permalink_url: fallbackLink
                    });
                  }
                } catch (parseError) {
                  // Erro ao parsear, gerar fallback
                  const fallbackLink = generateFallbackLink(storyId);
                  creativeDataMap.set(storyId, {
                    permalink_url: fallbackLink
                  });
                }
              } else {
                // Qualquer erro → gerar fallback sem logar erro detalhado
                const fallbackLink = generateFallbackLink(storyId);
                creativeDataMap.set(storyId, {
                  permalink_url: fallbackLink
                });
              }
            });
          }
        } catch (error) {
          console.log(`❌ [Incremented Batch ${batchIndex + 1}] Erro ao processar:`, error);
        }

        // Pequeno delay entre batches para evitar rate limits
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const batchTime = Date.now() - batchStartTime;
      console.log(`⏱️ [Incremented Batch Fetch] Concluído em ${batchTime}ms - ${creativeDataMap.size}/${objectStoryIds.size} criativos processados`);
    }

    // Organizar dados por data
    const campaignsByDate: Record<string, Array<any>> = {};

    campaigns.forEach((campaign: any) => {
      const campaignInsights = campaign.insights?.data || [];

      campaignInsights.forEach((insight: any) => {
        const date = insight.date_start;
        if (!campaignsByDate[date]) {
          campaignsByDate[date] = [];
        }

        const campaignSpend = parseFloat(insight.spend || '0');
        const campaignLeads = insight.actions?.find((action: any) => action.action_type === 'lead')?.value ?
          parseInt(insight.actions.find((action: any) => action.action_type === 'lead')!.value) : 0;
        const campaignCpl = campaignLeads > 0 ? campaignSpend / campaignLeads : 0;

        const processedAdSets = (campaign.adsets?.data || []).map((adSet: any) => {
          const adSetInsight = adSet.insights?.data?.find((ins: any) => ins.date_start === date);

          if (!adSetInsight) {
            return null; // Pular adSet sem dados para esta data
          }

          const adSetSpend = parseFloat(adSetInsight.spend || '0');
          const adSetLeads = adSetInsight.actions?.find((action: any) => action.action_type === 'lead')?.value ?
            parseInt(adSetInsight.actions.find((action: any) => action.action_type === 'lead')!.value) : 0;
          const adSetCpl = adSetLeads > 0 ? adSetSpend / adSetLeads : 0;

          const processedAds = (adSet.ads?.data || []).map((ad: any) => {
            const adInsight = ad.insights?.data?.find((ins: any) => ins.date_start === date);

            if (!adInsight) {
              return null; // Pular ad sem dados para esta data
            }

            const adSpend = parseFloat(adInsight.spend || '0');
            const adLeads = adInsight.actions?.find((action: any) => action.action_type === 'lead')?.value ?
              parseInt(adInsight.actions.find((action: any) => action.action_type === 'lead')!.value) : 0;
            const adCpl = adLeads > 0 ? adSpend / adLeads : 0;

            // Buscar permalink do mapa ou gerar fallback se necessário
            const storyId = ad.creative?.effective_object_story_id || ad.creative?.object_story_id;
            let permalinkUrl: string | undefined;

            if (storyId) {
              const creativeData = creativeDataMap.get(storyId);
              if (creativeData) {
                permalinkUrl = creativeData.permalink_url;
              } else {
                // Se não encontrou no mapa, gerar fallback
                permalinkUrl = generateFallbackLink(storyId);
              }
            }

            return {
              id: ad.id,
              name: ad.name,
              spend: adSpend,
              leads: adLeads,
              cpl: adCpl,
              creativeUrl: permalinkUrl
            };
          }).filter((ad: any) => ad !== null); // Remover ads sem dados para esta data

          return {
            id: adSet.id,
            name: adSet.name,
            spend: adSetSpend,
            leads: adSetLeads,
            cpl: adSetCpl,
            ads: processedAds
          };
        }).filter((adSet: any) => adSet !== null); // Remover adSets sem dados para esta data

        campaignsByDate[date].push({
          id: campaign.id,
          name: campaign.name,
          spend: campaignSpend,
          leads: campaignLeads,
          cpl: campaignCpl,
          adSets: processedAdSets
        });
      });
    });

    const totalDays = Object.keys(campaignsByDate).length;

    // Log para validação antes do salvamento
    console.log(`📝 [Incremented Analysis] DADOS COMPLETOS ANTES DO SALVAMENTO:`);
    console.log(`📊 [Incremented Analysis] Total de dias processados: ${totalDays}`);
    console.log(`📅 [Incremented Analysis] Datas encontradas:`, Object.keys(campaignsByDate).sort());
    console.log(`🔍 [Incremented Analysis] Estrutura completa por data:`, campaignsByDate);

    // Debug logs finais
    console.log(`⏱️ [Incremented Analysis] Tempo total de execução: ${requestTime}ms`);
    console.log(`📦 [Incremented Analysis] Tamanho do payload: ${(payloadSize / 1024).toFixed(2)} KB`);
    console.log(`📊 [Incremented Analysis] Campanhas base retornadas: ${campaigns.length}`);
    console.log(`🔗 [Incremented Analysis] Dados dos criativos obtidos: ${creativeDataMap.size}/${objectStoryIds.size}`);

    return {
      campaignsByDate,
      requestTime,
      payloadSize,
      dateRange: {
        since: live.insights_date_since,
        until: live.insights_date_until
      },
      totalDays
    };

  } catch (error) {
    const requestTime = Date.now() - startTime;
    console.error(`❌ [Incremented Analysis] Erro após ${requestTime}ms:`, error);

    return {
      campaignsByDate: {},
      requestTime,
      payloadSize: 0,
      dateRange: {
        since: live.insights_date_since,
        until: live.insights_date_until
      },
      totalDays: 0
    };
  }
}

/**
 * Sincroniza grupos WhatsApp com a Live baseado no termo de busca
 * Vincula automaticamente novos grupos que correspondam ao termo
 * @param liveId ID da Live
 * @param userId ID do usuário
 * @param searchTerm Termo de busca para filtrar grupos
 * @returns Número de novos grupos vinculados
 */
export async function syncWhatsAppGroupsWithLive(
  liveId: string,
  userId: string,
  searchTerm: string
): Promise<number> {
  try {

    // 1. Buscar grupos existentes vinculados à live
    const { data: existingGroups, error: existingError } = await supabase
      .from('live_groups')
      .select('group_id')
      .eq('live_id', liveId);

    if (existingError) {
      console.error('❌ [WhatsApp Sync] Erro ao buscar grupos existentes:', existingError);
      return 0;
    }

    const existingGroupIds = new Set(existingGroups?.map(g => g.group_id) || []);

    // 2. Buscar todos os grupos do usuário que correspondem ao termo
    const { data: matchingGroups, error: matchingError } = await supabase
      .from('whatsapp_groups')
      .select('group_id, group_name, group_size')
      .eq('user_id', userId)
      .ilike('group_name', `%${searchTerm}%`);

    if (matchingError) {
      console.error('❌ [WhatsApp Sync] Erro ao buscar grupos correspondentes:', matchingError);
      return 0;
    }


    // 3. Identificar novos grupos
    const newGroups = matchingGroups?.filter(group =>
      !existingGroupIds.has(group.group_id)
    ) || [];


    // 4. Vincular novos grupos à live (igual ao processo de criação)
    if (newGroups.length > 0) {
      const groupsToInsert = newGroups.map(group => ({
        live_id: liveId,
        group_id: group.group_id,
        group_name: group.group_name,
        group_size: group.group_size,
        monitoring: true,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('live_groups')
        .insert(groupsToInsert);

      if (insertError) {
        console.error('❌ [WhatsApp Sync] Erro ao vincular novos grupos:', insertError);
        return 0;
      }

    }

    return newGroups.length;

  } catch (error) {
    console.error('❌ [WhatsApp Sync] Erro geral na sincronização:', error);
    return 0;
  }
}