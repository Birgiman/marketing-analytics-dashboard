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
  console.log(`[getLiveData] 🚀 Iniciando busca completa para Live: ${liveId}${force ? ' (FORÇADO)' : ''}`);
  
  // Se não forçar, verificar cache primeiro
  if (!force) {
    const cacheValid = await isCacheValid(liveId);
    if (cacheValid) {
      console.log(`[getLiveData] 📦 Cache válido encontrado, usando dados salvos`);
      const cachedData = await getCachedLiveData(liveId);
      if (cachedData) {
        console.log(`[getLiveData] 🔄 Convertendo dados do cache para formato LiveDataResult...`);
        
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
        
        console.log(`[getLiveData] ✅ Dados convertidos do cache:`, result);
        
        // Salvar dados convertidos no banco para manter consistência
        console.log(`[getLiveData] 💾 Salvando dados convertidos no banco...`);
        await updateLiveCache(liveId, result);
        
        return result;
      }
    }
  }
  
  console.log(`[getLiveData] 🔄 ${force ? 'Forçando' : 'Cache expirado, fazendo'} busca de dados novos`);
  
  // ETAPA 1: Buscar dados da Live no banco
  const { data: live, error: liveError } = await supabase
    .from('lives')
    .select('*')
    .eq('id', liveId)
    .single();
    
  if (liveError || !live) {
    throw new Error(`Live não encontrada: ${liveError?.message}`);
  }
  
  console.log(`[getLiveData] 📋 Live encontrada: ${live.name}`);
  console.log(`[getLiveData] 🔍 Termo de busca: "${live.campaign_search_term}"`);
  console.log(`[getLiveData] 📅 Período: ${live.insights_date_since} até ${live.insights_date_until}`);
  
  // ETAPA 2: Buscar campanhas do Meta
  const campaigns = await fetchCampaignsFromMeta(live);
  console.log('[getLiveData] 📋 Campanhas encontradas: ', campaigns);
  
  // ETAPA 3: Buscar insights agregados
  const aggregatedInsights = await fetchAggregatedInsights(live);
  console.log('[getLiveData] 📋 Insights agregados: ', aggregatedInsights);
  
  // ETAPA 4: Buscar insights diários (para Traffic Analysis)
  const dailyInsights = await fetchDailyInsights(live);
  console.log('[getLiveData] 📋 Insights diários: ', dailyInsights);

  // ETAPA 4.1: Enriquecer insights diários com dados dos grupos
  const enrichedDailyInsights = await enrichDailyInsightsWithGroupData(
    dailyInsights,
    liveId,
    live.user_id,
    live.insights_date_since,
    live.insights_date_until
  );
  console.log('[getLiveData] 📋 Insights diários enriquecidos: ', enrichedDailyInsights);

  // ETAPA 5: Buscar dados dos grupos e calcular métricas
  const groupData = await fetchGroupDataForCalculations(
    liveId,
    live.user_id,
    live.insights_date_since,
    live.insights_date_until
  );

  console.log(`[getLiveData] 🔍 DEBUG - Dados dos grupos para cálculo de métricas:`, {
    totalMembers: groupData.totalMembers,
    entries: groupData.entries,
    exits: groupData.exits,
    activeMembers: groupData.activeMembers
  });

  const metrics = calculateSimpleMetrics(
    aggregatedInsights.totalSpend,
    aggregatedInsights.totalLeads,
    groupData.totalMembers,
    live.ad_budget || 0
  );

  console.log(`[getLiveData] 🔍 DEBUG - Métricas calculadas:`, {
    cplMeta: metrics.cplMeta,
    cplLiquido: metrics.cplLiquido,
    retentionRate: metrics.retentionRate,
    basedOn: {
      totalSpend: aggregatedInsights.totalSpend,
      totalLeads: aggregatedInsights.totalLeads,
      totalMembers: groupData.totalMembers
    }
  });

  const result = {
    campaigns,
    aggregatedInsights,
    dailyInsights: enrichedDailyInsights,
    metrics,
    groupData
  };

  // Sempre salvar no cache quando buscar dados novos
  console.log(`[getLiveData] 💾 Salvando dados no cache...`);
  await updateLiveCache(liveId, result);

  // DEBUG FINAL: Resumo completo dos dados
  console.log(`[getLiveData] 🎯 RESUMO FINAL DOS DADOS:`, {
    campaigns: {
      total: result.campaigns.total,
      list: result.campaigns.list.map(c => c.name)
    },
    aggregatedInsights: {
      totalSpend: result.aggregatedInsights.totalSpend,
      totalLeads: result.aggregatedInsights.totalLeads,
      cplMeta: result.aggregatedInsights.cplMeta
    },
    dailyInsights: {
      totalDays: result.dailyInsights.length,
      withGroupData: result.dailyInsights.filter((d: any) => d.groupJoin > 0).length,
      sampleDay: result.dailyInsights[0] ? {
        date: result.dailyInsights[0].date,
        spend: result.dailyInsights[0].spend,
        leads: result.dailyInsights[0].leads,
        groupJoin: (result.dailyInsights[0] as any).groupJoin,
        groupExit: (result.dailyInsights[0] as any).groupExit
      } : null
    },
    metrics: result.metrics,
    groupData: result.groupData
  });

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
    console.log(`[getLiveData] 👥 Buscando dados dos grupos para cache...`);

    const { data: groups, error } = await supabase
      .from('live_groups')
      .select('id, group_id, group_name, group_size, monitoring, created_at, updated_at')
      .eq('live_id', liveId);

    if (error) {
      console.error(`[getLiveData] ❌ Erro ao buscar grupos:`, error);
      return [];
    }

    console.log(`[getLiveData] 👥 ${groups?.length || 0} grupos encontrados para cache`);
    return groups || [];

  } catch (error) {
    console.error(`[getLiveData] ❌ Erro na função getGroupsData:`, error);
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
    console.log(`[getLiveData] 🔄 Gerando campaignsWithInsights baseado em ${dailyInsights.length} insights diários`);

    if (!dailyInsights || dailyInsights.length === 0 || !campaigns || campaigns.length === 0) {
      console.log(`[getLiveData] ⚠️ Dados insuficientes para gerar campaignsWithInsights`);
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

    console.log(`[getLiveData] ✅ Generated ${result.length} campaigns with insights for cache`);
    return result;

  } catch (error) {
    console.error(`[getLiveData] ❌ Erro na função generateCampaignsWithInsightsFromDailyData:`, error);
    return [];
  }
}

/**
 * Enriquece os insights diários com dados reais dos grupos WhatsApp
 * Implementa cache inteligente: dias anteriores usam cache, dia atual sempre fresh
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
  console.log(`[getLiveData] 🔄 Enriquecendo insights diários com dados dos grupos (cache inteligente)...`);

  try {
    // Verificar se já temos dados em cache para dias anteriores
    const { data: liveData, error: liveCacheError } = await supabase
      .from('lives')
      .select('cached_traffic_data')
      .eq('id', liveId)
      .single();

    const today = new Date().toISOString().split('T')[0];
    console.log(`[getLiveData] 📅 Data atual: ${today}`);
  console.log(`[getLiveData] 🔍 DEBUG - Período da consulta:`, {
    dateFrom,
    dateTo,
    userId: userId.substring(0, 8) + '...',
    liveId,
    totalInsights: dailyInsights.length
  });

    // Separar insights por categoria: dias anteriores vs dia atual
    const previousDays = dailyInsights.filter(insight => insight.date < today);
    const currentDay = dailyInsights.filter(insight => insight.date >= today);

    console.log(`[getLiveData] 📊 Divisão dos insights:`, {
      totalInsights: dailyInsights.length,
      previousDays: previousDays.length,
      currentDay: currentDay.length,
      dates: {
        previous: previousDays.map(d => d.date),
        current: currentDay.map(d => d.date)
      }
    });

    let enrichedInsights = [];

    // ETAPA 1: Tentar usar cache para dias anteriores
    if (previousDays.length > 0 && liveData?.cached_traffic_data?.dailyInsights) {
      const cachedInsights = liveData.cached_traffic_data.dailyInsights;
      const cacheMap = new Map();

      cachedInsights.forEach((cached: any) => {
        if (cached.groupJoin !== undefined && cached.groupExit !== undefined) {
          cacheMap.set(cached.date, cached);
        }
      });

      console.log(`[getLiveData] 📦 Cache encontrado para ${cacheMap.size} dias`);

      // Usar cache para dias anteriores que já têm dados de grupo
      const previousWithCache = previousDays.map(insight => {
        const cached = cacheMap.get(insight.date);
        if (cached && cached.groupJoin !== undefined) {
          console.log(`[getLiveData] ✅ Usando cache para ${insight.date}`);
          return {
            ...insight,
            groupJoin: cached.groupJoin,
            groupExit: cached.groupExit,
            cplLiquido: cached.cplLiquido,
            retention: cached.retention
          };
        } else {
          console.log(`[getLiveData] ⚠️ Cache não encontrado para ${insight.date}, buscando dados frescos`);
          return insight;
        }
      });

      // Separar quais dias ainda precisam de dados frescos
      const needsFreshData = previousWithCache.filter(insight => insight.groupJoin === undefined);
      const fromCache = previousWithCache.filter(insight => insight.groupJoin !== undefined);

      enrichedInsights.push(...fromCache);

      // Buscar dados frescos apenas para dias que não estão em cache + dia atual
      const daysNeedingFresh = [...needsFreshData, ...currentDay];

      if (daysNeedingFresh.length > 0) {
        console.log(`[getLiveData] 🔄 Buscando dados frescos para ${daysNeedingFresh.length} dias:`, daysNeedingFresh.map(d => d.date));
        const freshEnriched = await fetchFreshWhatsappData(daysNeedingFresh, liveId, userId);
        enrichedInsights.push(...freshEnriched);
      }
    } else {
      // ETAPA 2: Sem cache válido, buscar todos os dados frescos
      console.log(`[getLiveData] 🔄 Cache não encontrado, buscando todos os dados frescos`);
      enrichedInsights = await fetchFreshWhatsappData(dailyInsights, liveId, userId);
    }

    // Ordenar por data
    enrichedInsights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`[getLiveData] ✅ Insights finais enriquecidos:`, {
      total: enrichedInsights.length,
      withGroupData: enrichedInsights.filter(i => i.groupJoin > 0).length,
      sampleData: enrichedInsights.slice(0, 2).map(i => ({
        date: i.date,
        groupJoin: i.groupJoin,
        groupExit: i.groupExit,
        retention: i.retention
      }))
    });

    return enrichedInsights;

  } catch (error) {
    console.error(`[getLiveData] ❌ Erro ao enriquecer insights:`, error);
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
 */
async function fetchFreshWhatsappData(
  insights: Array<any>,
  liveId: string,
  userId: string
): Promise<Array<any>> {
  if (insights.length === 0) return [];

  // Buscar IDs dos grupos da Live
  console.log(`[getLiveData] 🔍 DEBUG - Buscando grupos da Live:`, { liveId });
  const { data: groups, error: groupsError } = await supabase
    .from('live_groups')
    .select('group_id, group_name')
    .eq('live_id', liveId);

  console.log(`[getLiveData] 📱 DEBUG - Resultado da consulta de grupos:`, {
    success: !groupsError,
    error: groupsError?.message,
    groupsFound: groups?.length || 0,
    groupDetails: groups?.slice(0, 3).map(g => ({
      group_id: g.group_id?.substring(0, 15) + '...',
      group_name: g.group_name
    }))
  });

  if (groupsError || !groups || groups.length === 0) {
    console.warn(`[getLiveData] ⚠️ Nenhum grupo encontrado:`, groupsError);
    return insights.map(insight => ({
      ...insight,
      groupJoin: 0,
      groupExit: 0,
      cplLiquido: 0,
      retention: 0
    }));
  }

  const groupIds = groups.map(group => group.group_id);

  // Determinar período de busca
  const dates = insights.map(i => i.date).sort();
  const dateFrom = dates[0];
  const dateTo = dates[dates.length - 1];

  console.log(`[getLiveData] 📱 Buscando dados frescos do WhatsApp:`, {
    liveId,
    totalGroups: groups.length,
    dateRange: `${dateFrom} até ${dateTo}`,
    groupIds: groupIds.slice(0, 2) // Primeiros 2 IDs
  });

  // Buscar dados do WhatsApp Groups Log
  const whatsappDailyData = await getWhatsAppGroupsLogByPeriod(
    groupIds,
    dateFrom,
    dateTo,
    userId,
    'day'
  );

  console.log(`[getLiveData] 📱 Dados WhatsApp obtidos:`, {
    records: whatsappDailyData.length,
    totalEntries: whatsappDailyData.reduce((sum, d) => sum + d.entries, 0),
    totalExits: whatsappDailyData.reduce((sum, d) => sum + d.exits, 0),
    dateRange: whatsappDailyData.map(d => d.date)
  });

  // Criar mapa por data
  const whatsappDataMap = new Map();
  whatsappDailyData.forEach(dayData => {
    whatsappDataMap.set(dayData.date, dayData);
  });

  // Enriquecer insights
  return insights.map(insight => {
    const whatsappData = whatsappDataMap.get(insight.date);

    const groupJoin = whatsappData?.entries || 0;
    const groupExit = whatsappData?.exits || 0;
    const activeMembers = Math.max(0, groupJoin - groupExit);
    const cplLiquido = activeMembers > 0 ? insight.spend / activeMembers : 0;
    const retention = insight.leads > 0 ? Math.round((activeMembers / insight.leads) * 100) : 0;

    return {
      ...insight,
      groupJoin,
      groupExit,
      cplLiquido,
      retention
    };
  });
}

async function fetchCampaignsFromMeta(live: Live) {
  console.log(`[getLiveData] 🔍 ETAPA 2: Buscando campanhas do Meta...`);
  
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
      console.log(`[getLiveData] 💾 Salvando ${newCampaigns.length} campanhas novas no banco...`);
      
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
        console.error(`[getLiveData] ❌ Erro ao salvar campanhas novas:`, insertError);
      } else {
        console.log(`[getLiveData] ✅ ${newCampaigns.length} campanhas salvas com sucesso!`);
        newCampaigns.forEach(campaign => {
          console.log(`[getLiveData] ✅ Nova campanha salva: ${campaign.name} (${campaign.id})`);
        });
      }
    }

    // MANTER CAMPANHAS REMOVIDAS NO BANCO (não excluir)
    if (missingCampaigns.length > 0) {
      console.log(`[getLiveData] ⚠️ ${missingCampaigns.length} campanhas removidas do Meta (mantendo no banco):`);
      missingCampaigns.forEach(campaign => {
        console.log(`[getLiveData] ⚠️ Campanha mantida: ${campaign.campaign_name} (${campaign.campaign_id})`);
      });
    }

    return {
      total: campaignsList.length,
      new: newCampaigns.length,
      missing: missingCampaigns.length,
      list: campaignsList
    };

  } catch (error) {
    console.error(`[getLiveData] ❌ Erro na ETAPA 2:`, error);
    return {
      total: 0,
      new: 0,
      missing: 0,
      list: []
    };
  }
}

async function fetchAggregatedInsights(live: Live) {
  console.log(`[getLiveData] 📊 ETAPA 3: Buscando insights agregados...`);
  
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
    console.error(`[getLiveData] ❌ Erro na ETAPA 3:`, error);
    return {
      totalSpend: 0,
      totalLeads: 0,
      cplMeta: 0
    };
  }
}

async function fetchDailyInsights(live: Live) {
  console.log(`[getLiveData] 📅 ETAPA 4: Buscando insights diários...`);
  
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

    console.log(`[getLiveData] 📊 Insights diários encontrados:`, dailyInsightsWithCPL);
    return dailyInsightsWithCPL;

  } catch (error) {
    console.error(`[getLiveData] ❌ Erro na ETAPA 4:`, error);
    return [];
  }
}

async function fetchGroupDataForCalculations(liveId: string, userId: string, dateFrom: string, dateTo: string) {
  console.log(`[getLiveData] 👥 ETAPA 5: Buscando dados dos grupos...`);

  try {
    // Buscar grupos da Live
    const { data: groups, error } = await supabase
      .from('live_groups')
      .select('group_id, group_name, group_size, monitoring')
      .eq('live_id', liveId);

    if (error) {
      console.warn(`[getLiveData] ⚠️ Erro ao buscar grupos:`, error);
      return {
        totalMembers: 0,
        entries: 0,
        exits: 0,
        activeMembers: 0
      };
    }

    const totalMembers = groups?.reduce((sum, group) => sum + (group.group_size || 0), 0) || 0;
    const activeGroups = groups?.filter(group => group.monitoring).length || 0;

    console.log(`[getLiveData] 👥 Grupos encontrados: ${groups?.length || 0}`);
    console.log(`[getLiveData] 👥 Total de membros: ${totalMembers}`);
    console.log(`[getLiveData] 👥 Grupos ativos: ${activeGroups}`);

    // Buscar dados reais do WhatsApp Groups Log
    if (groups && groups.length > 0) {
      try {
        const groupIds = groups.map(group => group.group_id);
        console.log(`[getLiveData] 📱 Buscando dados reais do WhatsApp Groups Log...`);

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

        console.log(`[getLiveData] 📱 Dados reais do WhatsApp:`, {
          totalEntries,
          totalExits,
          realActiveMembers,
          daysWithData: whatsappData.length
        });

        return {
          totalMembers,
          entries: totalEntries,
          exits: totalExits,
          activeMembers: realActiveMembers || totalMembers // Fallback para totalMembers se não tiver dados reais
        };

      } catch (whatsappError) {
        console.warn(`[getLiveData] ⚠️ Erro ao buscar dados do WhatsApp Groups Log:`, whatsappError);
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
    console.error(`[getLiveData] ❌ Erro na ETAPA 5:`, error);
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
  console.log(`[getLiveData] 🧮 Dados de entrada:`, {
    totalSpend,
    totalLeads,
    totalGroupMembers,
    orcamentoGasto
  });

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

  console.log(`[getLiveData] 🧮 Métricas calculadas:`, {
    cplMeta: `R$ ${cplMeta.toFixed(2)}`,
    cplLiquido: `R$ ${cplLiquido.toFixed(2)}`,
    retentionRate: `${retentionRate.toFixed(2)}%`,
    cplLiquidoPlanejamento: `R$ ${cplLiquidoPlanejamento.toFixed(2)}`
  });

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
  console.log(`[getLiveData] 💾 Salvando cache completo da Live: ${liveId}`);
  
  try {
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
        adSetData: [] // TODO: Popular com dados reais quando implementado
      },
      
      // Timestamp da última sincronização
      traffic_last_synced_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Atualizar banco (usando tabela de teste)
    console.log(`[getLiveData] 🎯 SALVANDO NA TABELA: lives`);
    console.log(`[getLiveData] 🎯 LIVE ID: ${liveId}`);
    console.log(`[getLiveData] 🎯 DADOS PARA SALVAR:`, cacheData);
    
    // Fazer UPDATE direto (Live já existe na tabela de teste)
    console.log(`[getLiveData] 🔄 Fazendo UPDATE na tabela lives...`);
    
    const { data: updateResult, error } = await supabase
      .from('lives')
      .update(cacheData)
      .eq('id', liveId)
      .select('cached_metrics, cached_group_data, cached_meta_data, cached_traffic_data, traffic_last_synced_at, last_synced_at, updated_at');

    if (error) {
      console.error(`[getLiveData] ❌ ERRO ao salvar na tabela lives:`, error);
      throw error;
    }

    console.log(`[getLiveData] ✅ SUCESSO! Cache salvo na tabela: lives`);
    console.log(`[getLiveData] ✅ LIVE ID atualizada: ${liveId}`);
    console.log(`[getLiveData] 📋 Resultado do UPDATE:`, updateResult);
    console.log(`[getLiveData] 📊 Dados salvos:`, {
      métricas: cacheData.cached_metrics,
      grupos: cacheData.cached_group_data,
      meta: cacheData.cached_meta_data,
      tráfego: `${cacheData.cached_traffic_data.dailyInsights.length} insights diários`
    });

  } catch (error) {
    console.error(`[getLiveData] ❌ Erro na função de cache:`, error);
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
    console.log(`[getLiveData] ⏰ Verificando validade do cache para Live: ${liveId}`);
    
    const { data, error } = await supabase
      .from('lives')
      .select('traffic_last_synced_at')
      .eq('id', liveId)
      .single();
    
    if (error || !data?.traffic_last_synced_at) {
      console.log(`[getLiveData] ⚠️ Cache não encontrado ou inválido:`, error?.message);
      return false;
    }
    
    const lastSync = new Date(data.traffic_last_synced_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);
    
    console.log(`[getLiveData] ⏰ Última sincronização: ${lastSync.toLocaleString()}`);
    console.log(`[getLiveData] ⏰ Tempo decorrido: ${diffMinutes.toFixed(1)} minutos`);
    
    const isValid = diffMinutes < 30;
    console.log(`[getLiveData] ${isValid ? '✅' : '❌'} Cache ${isValid ? 'válido' : 'expirado'}`);
    
    return isValid;
    
  } catch (error) {
    console.error(`[getLiveData] ❌ Erro ao verificar cache:`, error);
    return false;
  }
}

/**
 * Busca dados do cache (sem fazer requisições ao Meta)
 * @param liveId ID da Live
 * @returns Dados do cache ou null se não encontrado
 */
export async function getCachedLiveData(liveId: string): Promise<CachedData | null> {
  try {
    console.log(`[getLiveData] 📦 Buscando dados do cache para Live: ${liveId}`);
    
    const { data, error } = await supabase
      .from('lives')
      .select('cached_metrics, cached_group_data, cached_meta_data, cached_traffic_data')
      .eq('id', liveId)
      .single();
    
    if (error) {
      console.error(`[getLiveData] ❌ Erro ao buscar cache:`, error);
      return null;
    }
    
    console.log(`[getLiveData] ✅ Dados do cache encontrados:`);
    console.log(`[getLiveData] 📊 CACHE COMPLETO:`, data);
    console.log(`[getLiveData] 📈 Métricas:`, data.cached_metrics);
    console.log(`[getLiveData] 👥 Grupos:`, data.cached_group_data);
    console.log(`[getLiveData] 📊 Meta:`, data.cached_meta_data);
    console.log(`[getLiveData] 🚦 Tráfego:`, data.cached_traffic_data);
    
    return data;
    
  } catch (error) {
    console.error(`[getLiveData] ❌ Erro ao buscar dados do cache:`, error);
    return null;
  }
}

/**
 * Função principal que busca dados E salva no cache
 * @param liveId ID da Live
 * @returns Dados completos da Live
 */
export async function getLiveDataWithCache(liveId: string): Promise<LiveDataResult> {
  console.log(`[getLiveData] 🚀 Buscando dados e salvando cache para Live: ${liveId}`);
  
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
  try {
    console.log(`[getLiveData] 📦 Buscando dados da Live do banco: ${liveId}`);
    
    const { data, error } = await supabase
      .from('lives')
      .select('*')
      .eq('id', liveId)
      .single();
    
    if (error) {
      console.error(`[getLiveData] ❌ Erro ao buscar Live do banco:`, error);
      return null;
    }
    
    console.log(`[getLiveData] ✅ Live encontrada no banco:`, data.name);
    return data;
    
  } catch (error) {
    console.error(`[getLiveData] ❌ Erro na função getLiveDataFromDatabase:`, error);
    return null;
  }
}