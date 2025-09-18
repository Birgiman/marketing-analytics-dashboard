import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchCampaignById, fetchMetaInsights } from '@/utils/metaApi';
import {
  Live,
  LiveGroup,
  LiveCampaign,
  LiveCampaignWithInsights,
  LiveMetrics,
  LiveCacheData,
  MetaInsightsOptions,
  MetaAction
} from '@/types/live';

// Interface já importada de @/types/live

interface UseLiveLocalStorageCacheOptions {
  liveId: string;
  cacheTimeout?: number; // em milissegundos, padrão 30 minutos
}

const CACHE_KEY_PREFIX = 'live_cache_';
const META_FETCH_COOLDOWN = 30 * 60 * 1000; // 30 minutos entre requisições ao Meta

export function useLiveLocalStorageCache({
  liveId,
  cacheTimeout = 30 * 60 * 1000 // 30 minutos
}: UseLiveLocalStorageCacheOptions) {
  const [cache, setCache] = useState<LiveCacheData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMetaLoading, setIsMetaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  const cacheKey = `${CACHE_KEY_PREFIX}${liveId}`;

  // Verificar se o cache é válido
  const isCacheValid = useCallback((cacheData: LiveCacheData): boolean => {
    const now = Date.now();
    return (now - cacheData.lastUpdated) < cacheTimeout;
  }, [cacheTimeout]);

  // Verificar se pode fazer nova requisição ao Meta
  const canFetchMeta = useCallback((cacheData: LiveCacheData | null): boolean => {
    if (!cacheData) return true;
    const now = Date.now();
    return (now - cacheData.lastMetaFetch) > META_FETCH_COOLDOWN;
  }, []);

  // Carregar cache do localStorage
  const loadCacheFromStorage = useCallback((): LiveCacheData | null => {
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📦 [useLiveLocalStorageCache] Cache encontrado no localStorage:', parsed);
        return parsed;
      }
    } catch (error) {
      console.warn('⚠️ [useLiveLocalStorageCache] Erro ao ler cache do localStorage:', error);
    }
    return null;
  }, [cacheKey]);

  // Salvar cache no localStorage
  const saveCacheToStorage = useCallback((cacheData: LiveCacheData) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('💾 [useLiveLocalStorageCache] Cache salvo no localStorage');
    } catch (error) {
      console.warn('⚠️ [useLiveLocalStorageCache] Erro ao salvar cache no localStorage:', error);
    }
  }, [cacheKey]);

  // Calcular métricas baseado nos dados
  const calculateMetrics = useCallback((live: Live, groups: LiveGroup[], campaignsWithInsights: LiveCampaignWithInsights[]): LiveMetrics => {
    // CPL Líquido = Total Gasto / Total de Membros dos Grupos
    const totalSpent = campaignsWithInsights.reduce((sum, campaign) => {
      const spend = parseFloat(campaign.insights?.spend || '0');
      return sum + spend;
    }, 0);

    const totalGroupMembers = groups.reduce((sum, group) => sum + (group.group_size || 0), 0);
    const cplLiquido = totalGroupMembers > 0 ? totalSpent / totalGroupMembers : 0;

    // CPL Meta = Total Gasto / Total de Leads do Meta
    const totalLeads = campaignsWithInsights.reduce((sum, campaign) => {
      const actions = campaign.insights?.actions || [];

      // Log apenas se não encontrar leads (para debug futuro)
      if (actions.length === 0) {
        console.log('⚠️ [calculateMetrics] Nenhuma action encontrada para campanha:', campaign.campaign_name);
      }

      // PRIORIDADE 1: Leads específicos (conversões reais)
      const trueLead = actions.find((action: MetaAction) =>
        action.action_type === 'lead' ||
        action.action_type === 'submit_application' ||
        action.action_type === 'complete_registration' ||
        action.action_type === 'offsite_conversion.fb_pixel_lead' ||
        action.action_type === 'omni_complete_registration' ||
        action.action_type === 'offsite_conversion' ||
        action.action_type === 'offsite_conversion.custom'
      );

      // PRIORIDADE 2: Se não houver leads reais, usar engajamento como proxy
      const engagementAction = !trueLead ? actions.find((action: MetaAction) =>
        action.action_type === 'landing_page_view' ||
        action.action_type === 'link_click'
      ) : null;

      // PRIORIDADE 3: Último recurso - engajamento social (com peso menor)
      const socialAction = !trueLead && !engagementAction ? actions.find((action: MetaAction) =>
        action.action_type === 'post_engagement' ||
        action.action_type === 'comment' ||
        action.action_type === 'like' ||
        action.action_type === 'page_engagement'
      ) : null;

      // Escolher a melhor action disponível com peso apropriado
      let finalAction = trueLead;
      let weight = 1; // Peso normal para leads reais

      if (!finalAction && engagementAction) {
        finalAction = engagementAction;
        weight = 0.3; // Peso menor para engajamento (30% de conversão estimada)
      }

      if (!finalAction && socialAction) {
        finalAction = socialAction;
        weight = 0.05; // Peso muito menor para social (5% de conversão estimada)
      }

      const rawValue = finalAction ? parseInt(finalAction.value) || 0 : 0;
      const leadValue = Math.round(rawValue * weight);

      // Log para debug do cálculo
      if (leadValue > 0) {
        console.log(`📊 [calculateMetrics] ${campaign.campaign_name}:`, {
          actionType: finalAction?.action_type,
          rawValue,
          weight,
          leadValue,
          fonte: trueLead ? 'LEAD_REAL' : engagementAction ? 'ENGAJAMENTO' : 'SOCIAL'
        });
      }

      return sum + leadValue;
    }, 0);

    const cplMeta = totalLeads > 0 ? totalSpent / totalLeads : 0;

    // Taxa de Retenção = (Membros dos Grupos / Leads do Meta) * 100
    const retentionRate = totalLeads > 0 ? Math.round(totalGroupMembers / totalLeads * 100) : 0;

    // Log sucesso do cálculo
    console.log('✅ [calculateMetrics] Métricas calculadas:', {
      cplLiquido: `R$ ${cplLiquido.toFixed(2)}`,
      cplMeta: `R$ ${cplMeta.toFixed(2)}`,
      retentionRate: `${retentionRate}%`,
      totalSpent: `R$ ${totalSpent.toFixed(2)}`,
      totalLeads,
      totalGroupMembers,
      calculoCPL: totalLeads > 0 ? `R$ ${totalSpent.toFixed(2)} / ${totalLeads} leads = R$ ${cplMeta.toFixed(2)}` : 'Sem leads'
    });

    return {
      cplLiquido,
      cplMeta,
      retentionRate,
      totalSpent,
      totalLeads,
      totalGroupMembers
    };
  }, []);

  // Buscar dados básicos (Live, Grupos, Campanhas)
  const fetchBasicData = useCallback(async () => {
    if (!liveId) return null;

    console.log('🔄 [useLiveLocalStorageCache] Buscando dados básicos da Live:', liveId);

    // Buscar dados da Live
    const { data: live, error: liveError } = await supabase
      .from('lives')
      .select('*')
      .eq('id', liveId)
      .single();

    if (liveError) throw liveError;

    // Buscar grupos vinculados
    const { data: groups, error: groupsError } = await supabase
      .from('live_groups')
      .select('*')
      .eq('live_id', liveId);

    if (groupsError) throw groupsError;

    // Buscar campanhas vinculadas
    const { data: campaigns, error: campaignsError } = await supabase
      .from('live_campaigns')
      .select('*')
      .eq('live_id', liveId);

    if (campaignsError) throw campaignsError;

    return {
      live,
      groups: groups || [],
      campaigns: campaigns || []
    };
  }, [liveId]);

  // Buscar dados do Meta Ads
  const fetchMetaData = useCallback(async (live: Live, campaigns: LiveCampaign[]): Promise<LiveCampaignWithInsights[]> => {
    if (!campaigns || campaigns.length === 0) return [];

    console.log('📡 [useLiveLocalStorageCache] Buscando dados do Meta para', campaigns.length, 'campanhas');
    setIsMetaLoading(true);

    try {
      // Buscar access token do Meta
      const { data: metaIntegration, error: metaError } = await supabase
        .from('meta_integrations')
        .select('access_token')
        .eq('user_id', live.user_id)
        .eq('is_active', true)
        .single();

      if (metaError || !metaIntegration?.access_token) {
        console.log('⚠️ [useLiveLocalStorageCache] Sem integração Meta ativa');
        return campaigns;
      }

      // Buscar dados detalhados e insights de cada campanha no Meta
      const campaignsWithInsights = await Promise.all(
        campaigns.map(async (campaign) => {
          try {
            // Buscar dados básicos da campanha
            const metaData = await fetchCampaignById(
              campaign.campaign_id,
              metaIntegration.access_token
            );

            // Buscar insights
            const options: MetaInsightsOptions = {
              level: 'campaign',
              fields: ['campaign_name', 'impressions', 'spend', 'clicks', 'reach', 'frequency', 'cpm', 'ctr', 'cpp', 'cost_per_unique_click', 'actions', 'ad_name', 'date_start', 'date_stop']
            };

            // Usar dateRange da Live se disponível
            if (live.insights_date_since && live.insights_date_until) {
              options.timeRange = {
                since: live.insights_date_since,
                until: live.insights_date_until
              };
            }

            const insightsData = await fetchMetaInsights(
              campaign.campaign_id,
              metaIntegration.access_token,
              options
            );

            const latestInsight = insightsData[0] || {};

            // Salvar insights no banco para cache persistente
            if (latestInsight && Object.keys(latestInsight).length > 0) {
              try {
                await supabase
                  .from('campaign_insights')
                  .upsert({
                    campaign_id: campaign.campaign_id,
                    user_id: live.user_id,
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
                console.warn('Erro ao salvar insights no banco:', saveError);
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
            console.warn(`Erro ao buscar dados Meta para campanha ${campaign.campaign_id}:`, err);
            return campaign;
          }
        })
      );

      return campaignsWithInsights;
    } finally {
      setIsMetaLoading(false);
    }
  }, []);

  // Função principal para carregar/atualizar dados
  const loadData = useCallback(async (forceMetaFetch = false) => {
    if (!liveId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Verificar cache local primeiro
      const cachedData = loadCacheFromStorage();

      if (cachedData && isCacheValid(cachedData) && !forceMetaFetch) {
        console.log('📦 [useLiveLocalStorageCache] Usando cache válido');
        setCache(cachedData);
        setIsLoading(false);
        return;
      }

      // Buscar dados básicos sempre
      const basicData = await fetchBasicData();
      if (!basicData) throw new Error('Falha ao carregar dados básicos');

      let campaignsWithInsights = basicData.campaigns;
      let lastMetaFetch = cachedData?.lastMetaFetch || 0;

      // Buscar dados do Meta apenas se necessário
      if (forceMetaFetch || !cachedData || canFetchMeta(cachedData)) {
        campaignsWithInsights = await fetchMetaData(basicData.live, basicData.campaigns);
        lastMetaFetch = Date.now();
        console.log('📡 [useLiveLocalStorageCache] Dados do Meta atualizados');
      } else {
        // Usar dados do Meta do cache se disponível
        if (cachedData && cachedData.campaignsWithInsights) {
          campaignsWithInsights = cachedData.campaignsWithInsights;
          console.log('📦 [useLiveLocalStorageCache] Usando dados do Meta do cache');
        }
      }

      // Calcular métricas
      const metrics = calculateMetrics(basicData.live, basicData.groups, campaignsWithInsights);

      // Criar novo cache
      const newCache: LiveCacheData = {
        liveId,
        live: basicData.live,
        groups: basicData.groups,
        campaigns: basicData.campaigns,
        campaignsWithInsights,
        metrics,
        lastUpdated: Date.now(),
        lastMetaFetch
      };

      // Salvar no localStorage e state
      saveCacheToStorage(newCache);
      setCache(newCache);
      setForceUpdate(prev => prev + 1); // Forçar re-render

      console.log('✅ [useLiveLocalStorageCache] Dados carregados e cacheados');

    } catch (err: unknown) {
      console.error('❌ [useLiveLocalStorageCache] Erro:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados da Live';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [liveId, loadCacheFromStorage, isCacheValid, canFetchMeta, fetchBasicData, fetchMetaData, calculateMetrics, saveCacheToStorage]);

  // Função para forçar atualização (incluindo Meta)
  const refreshData = useCallback(async () => {
    console.log('🔄 [useLiveLocalStorageCache] Forçando atualização completa');
    await loadData(true);
  }, [loadData]);

  // Função para limpar cache
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(cacheKey);
      setCache(null);
      console.log('🗑️ [useLiveLocalStorageCache] Cache limpo');
    } catch (error) {
      console.warn('⚠️ [useLiveLocalStorageCache] Erro ao limpar cache:', error);
    }
  }, [cacheKey]);


  // Carregar dados na inicialização
  useEffect(() => {
    if (liveId) {
      loadData();
    }
  }, [liveId, loadData]);

  return {
    // Dados
    live: cache?.live || null,
    groups: cache?.groups || [],
    campaigns: cache?.campaigns || [],
    campaignsWithInsights: cache?.campaignsWithInsights || [],
    metrics: cache?.metrics || null,

    // Estado
    isLoading,
    isMetaLoading,
    error,
    isFromCache: cache ? isCacheValid(cache) : false,
    canFetchMetaAgain: cache ? canFetchMeta(cache) : true,

    // Ações
    refreshData,
    clearCache,
    clearError: () => setError(null)
  };
}