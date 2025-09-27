import Header from "@/components/Header";
import { LiveMetricsCards } from "@/components/LiveMetricsCards";
import { ScreenNavigatorLives } from "@/components/ScreenNavigatorLives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { PublicAudience, PublicAudienceCorrelation } from "@/types/audience";
import { fetchPublicAudiences, generateAudienceCorrelation } from "@/utils/audienceService";
// Removido imports legados: AdSetData, CampaignData, extractAdSetDataFromInsights, extractCampaignData
import { calculateCompleteLiveMetrics } from "@/utils/live-metrics-v2";
import { getLiveDataFromDatabase, isHierarchicalCacheValid, updateHierarchicalCache, getDeepCampaignAnalysis, getDeepCampaignAnalysisIncremented } from '@/utils/LiveData/getLiveData';
import { fetchCompleteLiveData } from "@/utils/liveDataFetcher";
// Removido import legado: fetchAdSetInsights
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Filter, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const TrafficAnalysis = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const liveId = searchParams.get('live');
  
  // CACHE SYSTEM - Estados para sistema de cache
  const [cacheStatus, setCacheStatus] = useState<{
    isLoading: boolean;
    fromCache: boolean;
    needsRefresh: boolean;
    lastSynced?: string;
  }>({
    isLoading: false, // ✅ FORÇADO PARA FALSE
    fromCache: false,
    needsRefresh: false
  });
  
  // Estados para dados V2 (mesmo padrão da Details.tsx)
  const [live, setLive] = useState<{
    id: string;
    name: string;
    ad_budget?: number;
    insights_date_since?: string;
    insights_date_until?: string;
    cached_metrics?: {
      cplLiquido: number;
      cplMeta: number;
      retentionRate: number;
      cplLiquidoPlanejamento: number;
    };
    cached_group_data?: {
      totalGroups: number;
      totalMembers: number;
      entries: number;
      exits: number;
      activeMembers: number;
    };
    cached_traffic_data?: {
      dailyInsights: Array<{
        date: string;
        spend: number;
        leads: number;
        cplMeta: number;
        campaign_name?: string;
      }>;
      campaigns: Array<{
        id: string;
        name: string;
        status: string;
      }>;
      groups: Array<{
        id: string;
        group_id: string;
        group_name: string;
        group_size: number;
        monitoring: boolean;
        created_at: string;
        updated_at: string;
      }>;
      campaignsWithInsights?: Array<{
        campaign_id: string;
        insights: Array<{
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
          actions?: Array<{
            action_type: string;
            value: string;
          }>;
        }>;
      }>;
    };
    cached_traffic_metrics?: {
      cplLiquido: number;
      cplMeta: number;
      retentionRate: number;
      cplLiquidoPlanejamento: number;
    };
    traffic_last_synced_at?: string;
  } | null>(null);
  const [groups, setGroups] = useState<Array<{
    id: string;
    group_id: string;
    group_name: string;
    group_size: number;
    monitoring: boolean;
    created_at: string;
    updated_at: string;
  }>>([]);
  const [campaigns, setCampaigns] = useState<Array<{
    campaign_id: string;
    campaign_name: string;
  }>>([]);
  const [campaignsWithInsights, setCampaignsWithInsights] = useState<Array<{
    campaign_id: string;
    campaign_name?: string;
    insights: Array<{
      date_start: string;
      spend: string;
      impressions: string;
      clicks: string;
      reach: string;
      actions?: Array<{
        action_type: string;
        value: string;
      }>;
    }>;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isButtonRefreshing, setIsButtonRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para métricas V2
  const [metricsV2, setMetricsV2] = useState<{
    cplLiquido: number;
    cplMeta: number;
    retentionRate: number;
  } | null>(null);
  const [extractedDataV2, setExtractedDataV2] = useState<{
    metaData: {
      totalSpend: number;
      totalResults: number;
      totalImpressions: number;
      totalClicks: number;
      totalReach: number;
      campaignCount: number;
      insightsCount: number;
    };
    groupData: {
      totalMembers: number;
      totalGroups: number;
      entries: number;
      exits: number;
      activeMembers: number;
    };
    liveInfo: {
      id: string;
      name: string;
      orcamentoGasto?: number;
      orcamentoTotal?: number;
    };
  } | null>(null);
  
  // Estados para dados hierárquicos de campanhas
  const [campaignsHierarchy, setCampaignsHierarchy] = useState<{
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
  }>({ campaigns: [] });
  
  // Estados para públicos e correlações
  const [publicAudiences, setPublicAudiences] = useState<PublicAudience[]>([]);
  const [audienceCorrelations, setAudienceCorrelations] = useState<PublicAudienceCorrelation[]>([]);
  
  // Estados para filtros (baseado no exemplo)
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  
  // Estados para filtro de públicos
  const [selectedPublico, setSelectedPublico] = useState<string[]>(['todos']);
  const [showPublicoDropdown, setShowPublicoDropdown] = useState(false);
  
  // Estados para filtro de níveis hierárquicos
  const [levelFilters, setLevelFilters] = useState({
    campaigns: true,
    adSets: true,
    insights: true
  });
  
  // Estados para expansão hierárquica
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Estados para cache independente da tabela hierárquica
  const [isHierarchicalRefreshing, setIsHierarchicalRefreshing] = useState(false);
  const [hierarchicalCacheValid, setHierarchicalCacheValid] = useState(false);

  // Estados para teste das funções de análise
  const [isTestingAnalysis, setIsTestingAnalysis] = useState(false);
  
  // Opções de público (dados reais dos públicos da Live) - memoizado para evitar re-renders
  const publicoOptions = useMemo(() => [
    { value: 'todos', label: 'Todos os Públicos' },
    ...publicAudiences.map(audience => ({
      value: audience.id,
      label: `${audience.emoji} ${audience.title}`
    }))
  ], [publicAudiences]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPublicoDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.publico-dropdown-container')) {
          setShowPublicoDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPublicoDropdown]);

  // Função para carregar públicos da Live
  const fetchPublicAudiencesData = useCallback(async () => {
    if (!liveId) return;
    
    try {
      const audiences = await fetchPublicAudiences(liveId);
      setPublicAudiences(audiences);
      
      // Gerar correlações se temos integração Meta
      if (audiences.length > 0) {
        // Buscar integração Meta
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: metaIntegration } = await supabase
            .from('meta_integrations')
            .select('access_token')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .single();

          if (metaIntegration?.access_token) {
            // Buscar account_id das campanhas da Live
            const { data: liveCampaigns } = await supabase
              .from('live_campaigns')
              .select('account_id')
              .eq('live_id', liveId)
              .limit(1);

            if (liveCampaigns && liveCampaigns.length > 0) {
              // Buscar dados da live para obter as datas
              const { data: liveData } = await supabase
                .from('lives')
                .select('insights_date_since, insights_date_until')
                .eq('id', liveId)
                .single();

              if (liveData?.insights_date_since && liveData?.insights_date_until) {
                const correlations = await Promise.all(
                  audiences.map(audience => 
                    generateAudienceCorrelation(audience, liveCampaigns[0].account_id || '', metaIntegration.access_token, {
                      since: liveData.insights_date_since,
                      until: liveData.insights_date_until
                    })
                  )
                );
                setAudienceCorrelations(correlations);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar públicos:', error);
    }
  }, [liveId]);

  // Função para carregar dados do banco (mesmo padrão das outras telas)
  const loadDataFromDatabase = useCallback(async (isFromButton = false) => {
    if (!liveId) return;
    
    
    try {
      const liveData = await getLiveDataFromDatabase(liveId);
      
      if (liveData) {
        // Atualizar dados básicos da Live
        setLive({
          id: liveData.id,
          name: liveData.name,
          ad_budget: parseFloat(liveData.ad_budget),
          insights_date_since: liveData.insights_date_since,
          insights_date_until: liveData.insights_date_until,
          cached_metrics: liveData.cached_metrics || undefined,
          cached_group_data: liveData.cached_group_data || undefined,
          cached_traffic_data: liveData.cached_traffic_data || undefined,
          cached_traffic_metrics: liveData.cached_traffic_metrics as any || undefined,
          traffic_last_synced_at: liveData.traffic_last_synced_at
        });
        
        // Carregar dados específicos de tráfego do cache
        if (liveData.cached_traffic_data) {
          // DEBUG: Verificar se campaignsWithInsights existe e tem dados
          if ((liveData.cached_traffic_data as any).campaignsWithInsights) {
          } else {
          }
          
          // Carregar grupos
          if (liveData.cached_traffic_data.groups) {
            setGroups(liveData.cached_traffic_data.groups);
          }
          
          // Carregar campanhas
          if (liveData.cached_traffic_data.campaigns) {
            setCampaigns(liveData.cached_traffic_data.campaigns.map(campaign => ({
              campaign_id: campaign.id,
              campaign_name: campaign.name
            })));
          }
          
          // Carregar campanhas com insights (dados para tabela)
          if ((liveData.cached_traffic_data as any).campaignsWithInsights) {
            // Formatar dados do cache para corresponder ao formato esperado pela calculateDailyData
            const formattedCampaignsWithInsights = (liveData.cached_traffic_data as any).campaignsWithInsights.map((campaign: any) => ({
              campaign_id: campaign.campaign_id,
              campaign_name: campaign.campaign_name || '',
              insights: campaign.insights.map((insight: any) => ({
                campaign_name: insight.campaign_name || '',
                ad_name: insight.ad_name || '',
                date_start: insight.date_start || '',
                date_stop: insight.date_stop || insight.date_start || '',
                spend: insight.spend || '0',
                impressions: insight.impressions || '0',
                clicks: insight.clicks || '0',
                reach: insight.reach || '0',
                frequency: insight.frequency || '0',
                cpm: insight.cpm || '0',
                ctr: insight.ctr || '0',
                cpp: insight.cpp || '0',
                cost_per_unique_click: insight.cost_per_unique_click || '0',
                actions: insight.actions || []
              }))
            }));

            setCampaignsWithInsights(formattedCampaignsWithInsights);
          } else {
          }
          
          // Carregar dados hierárquicos de campanhas
          if ((liveData.cached_traffic_data as any).campaignsHierarchy) {
            setCampaignsHierarchy((liveData.cached_traffic_data as any).campaignsHierarchy);
          }
        } else {
        }
        
        // Carregar públicos após carregar dados básicos
        try {
          const audiences = await fetchPublicAudiences(liveId);
          setPublicAudiences(audiences);
        } catch (error) {
          console.error('Erro ao carregar públicos:', error);
        }
        
        // Atualizar dados hierárquicos se chamado pelo botão principal (isFromButton = true)
        if (isFromButton) {
          try {
            console.log('🔄 [Global Refresh] Atualizando dados hierárquicos junto com cache global...');
            setIsHierarchicalRefreshing(true);

            // Usar nova função getDeepCampaignAnalysis
            const deepAnalysis = await getDeepCampaignAnalysis({
              id: liveData.id,
              name: liveData.name,
              user_id: liveData.user_id,
              campaign_search_term: liveData.campaign_search_term,
              insights_date_since: liveData.insights_date_since,
              insights_date_until: liveData.insights_date_until,
              ad_budget: parseFloat(liveData.ad_budget)
            });

            // Converter para formato esperado pela tabela hierárquica
            const formattedHierarchy = {
              campaigns: deepAnalysis.campaigns.map(campaign => ({
                id: campaign.id,
                name: campaign.name,
                totalSpend: campaign.insights.spend,
                totalLeads: campaign.insights.leads,
                cpl: campaign.insights.leads > 0 ? campaign.insights.spend / campaign.insights.leads : 0,
                adSets: campaign.adSets.map(adSet => ({
                  id: adSet.id,
                  name: adSet.name,
                  totalSpend: adSet.insights.spend,
                  totalLeads: adSet.insights.leads,
                  cpl: adSet.insights.leads > 0 ? adSet.insights.spend / adSet.insights.leads : 0,
                  insights: adSet.ads.map(ad => ({
                    id: ad.id,
                    name: ad.name,
                    spend: ad.insights.spend,
                    leads: ad.insights.leads,
                    cpl: ad.insights.leads > 0 ? ad.insights.spend / ad.insights.leads : 0,
                    creativeUrl: ad.creative.permalink_url
                  }))
                }))
              }))
            };

            // Atualizar cache no banco
            await updateHierarchicalCache(liveId, formattedHierarchy);

            // Atualizar estado local
            setCampaignsHierarchy(formattedHierarchy);
            setHierarchicalCacheValid(true);

            console.log(`✅ [Global Refresh] Dados hierárquicos atualizados:`, {
              tempo: `${deepAnalysis.requestTime}ms`,
              payload: `${(deepAnalysis.payloadSize / 1024).toFixed(2)} KB`,
              campanhas: deepAnalysis.campaignCount,
              adSets: deepAnalysis.adSetCount,
              ads: deepAnalysis.adCount
            });

          } catch (error) {
            console.error('❌ [Global Refresh] Erro ao atualizar dados hierárquicos:', error);
            setHierarchicalCacheValid(false);
          } finally {
            setIsHierarchicalRefreshing(false);
          }
        } else {
          // Se não é refresh do botão, apenas verificar cache
          try {
            const isCacheValid = await isHierarchicalCacheValid(liveId);
            setHierarchicalCacheValid(isCacheValid);
          } catch (error) {
            console.error('Erro ao verificar cache hierárquico:', error);
            setHierarchicalCacheValid(false);
          }
        }
        
        setIsLoading(false);
        
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
    } finally {
      // Só controla isButtonRefreshing se foi chamado pelo botão
      if (isFromButton) {
        setIsButtonRefreshing(false);
      }
    }
  }, [liveId]);

  // Função para testar ambas as análises de campanh
  const handleTestAnalysis = useCallback(async () => {
    if (!liveId) return;

    setIsTestingAnalysis(true);

    try {
      // Buscar dados da Live
      const liveData = await getLiveDataFromDatabase(liveId);
      if (!liveData) {
        throw new Error('Live não encontrada');
      }

      console.log('🧪 [TEST] ===== INICIANDO TESTE COMPARATIVO =====');
      console.log('🧪 [TEST] Live:', liveData.name);
      console.log('🧪 [TEST] Período:', `${liveData.insights_date_since} até ${liveData.insights_date_until}`);
      console.log('🧪 [TEST] Termo de busca:', liveData.campaign_search_term);

      // Preparar dados da Live para as funções
      const liveForAnalysis = {
        id: liveData.id,
        name: liveData.name,
        user_id: liveData.user_id,
        campaign_search_term: liveData.campaign_search_term,
        insights_date_since: liveData.insights_date_since,
        insights_date_until: liveData.insights_date_until,
        ad_budget: parseFloat(liveData.ad_budget)
      };

      console.log('🧪 [TEST] ===== 1. TESTANDO ANÁLISE NORMAL (sem time_increment) =====');
      const normalAnalysis = await getDeepCampaignAnalysis(liveForAnalysis);

      console.log('💾 [TEST] OBJETO COMPLETO DA ANÁLISE NORMAL:');
      console.log(JSON.stringify(normalAnalysis, null, 2));

      console.log('🧪 [TEST] ===== 2. TESTANDO ANÁLISE INCREMENTADA (com time_increment=1) =====');
      const incrementedAnalysis = await getDeepCampaignAnalysisIncremented(liveForAnalysis);

      console.log('🧪 [TEST] ===== COMPARAÇÃO DOS RESULTADOS =====');
      console.log('📊 [TEST] Análise Normal:', {
        campanhas: normalAnalysis.campaignCount,
        adSets: normalAnalysis.adSetCount,
        ads: normalAnalysis.adCount,
        tempo: `${normalAnalysis.requestTime}ms`,
        payload: `${(normalAnalysis.payloadSize / 1024).toFixed(2)} KB`
      });

      console.log('📊 [TEST] Análise Incrementada:', {
        diasProcessados: incrementedAnalysis.totalDays,
        datasEncontradas: Object.keys(incrementedAnalysis.campaignsByDate).length,
        tempo: `${incrementedAnalysis.requestTime}ms`,
        payload: `${(incrementedAnalysis.payloadSize / 1024).toFixed(2)} KB`,
        periodo: incrementedAnalysis.dateRange
      });

      console.log('🧪 [TEST] ===== ESTRUTURA DA ANÁLISE INCREMENTADA =====');
      console.log('📅 [TEST] Datas processadas:', Object.keys(incrementedAnalysis.campaignsByDate).sort());
      Object.keys(incrementedAnalysis.campaignsByDate).forEach(date => {
        const campaigns = incrementedAnalysis.campaignsByDate[date];
        console.log(`📅 [TEST] ${date}: ${campaigns.length} campanhas`);
        campaigns.forEach(campaign => {
          console.log(`   📈 ${campaign.name}: R$ ${campaign.spend.toFixed(2)} | ${campaign.leads} leads | CPL R$ ${campaign.cpl.toFixed(2)}`);
        });
      });

      console.log('🧪 [TEST] ===== OBJETO COMPLETO PARA SALVAMENTO NO BANCO =====');
      console.log('💾 [TEST] Objeto que será salvo em cached_traffic_data_incremented:');
      console.log(JSON.stringify(incrementedAnalysis, null, 2));

      console.log('🧪 [TEST] ===== TAMANHO E VALIDAÇÃO DO OBJETO =====');
      const jsonString = JSON.stringify(incrementedAnalysis);
      const jsonSize = new Blob([jsonString]).size;
      console.log(`📏 [TEST] Tamanho do JSON: ${(jsonSize / 1024).toFixed(2)} KB`);
      console.log(`📊 [TEST] Caracteres: ${jsonString.length}`);
      console.log(`📊 [TEST] Estrutura do objeto:`, {
        temCampaignsByDate: !!incrementedAnalysis.campaignsByDate,
        quantidadeDatas: Object.keys(incrementedAnalysis.campaignsByDate).length,
        requestTime: incrementedAnalysis.requestTime,
        payloadSize: incrementedAnalysis.payloadSize,
        dateRange: incrementedAnalysis.dateRange,
        totalDays: incrementedAnalysis.totalDays
      });

      console.log('🧪 [TEST] ===== DADOS PARA REDUÇÃO (OPCIONAL) =====');
      // Simular uma versão reduzida só com dados essenciais
      const reducedVersion = {
        campaignsByDate: Object.keys(incrementedAnalysis.campaignsByDate).reduce((acc, date) => {
          acc[date] = incrementedAnalysis.campaignsByDate[date].map(campaign => ({
            id: campaign.id,
            name: campaign.name,
            spend: campaign.spend,
            leads: campaign.leads,
            cpl: campaign.cpl,
            adSets: campaign.adSets.map(adSet => ({
              id: adSet.id,
              name: adSet.name,
              spend: adSet.spend,
              leads: adSet.leads,
              cpl: adSet.cpl,
              ads: adSet.ads.map(ad => ({
                id: ad.id,
                name: ad.name,
                spend: ad.spend,
                leads: ad.leads,
                cpl: ad.cpl,
                creativeUrl: ad.creativeUrl
              }))
            }))
          }));
          return acc;
        }, {} as any),
        metadata: {
          requestTime: incrementedAnalysis.requestTime,
          totalDays: incrementedAnalysis.totalDays,
          dateRange: incrementedAnalysis.dateRange,
          generatedAt: new Date().toISOString()
        }
      };

      const reducedJsonString = JSON.stringify(reducedVersion);
      const reducedJsonSize = new Blob([reducedJsonString]).size;
      console.log(`💾 [TEST] Versão reduzida (só dados essenciais):`, reducedVersion);
      console.log(`📏 [TEST] Tamanho reduzido: ${(reducedJsonSize / 1024).toFixed(2)} KB (economia: ${((jsonSize - reducedJsonSize) / 1024).toFixed(2)} KB)`);

      console.log('🧪 [TEST] ===== TESTE CONCLUÍDO =====');

    } catch (error) {
      console.error('❌ [TEST] Erro no teste comparativo:', error);
    } finally {
      setIsTestingAnalysis(false);
    }
  }, [liveId]);

  // CACHE SYSTEM - Funções de cache
  const fetchTrafficDataWithCache = useCallback(async () => {
    if (!liveId) return;
    setCacheStatus(prev => ({ ...prev, isLoading: true }));
    setIsLoading(true);
    
    try {
      // Verificar cache primeiro
      const { data: live, error } = await supabase
        .from('lives')
        .select('*, cached_traffic_data, cached_traffic_metrics, traffic_last_synced_at')
        .eq('id', liveId)
        .single();

      if (error) {
        throw error;
      }

      if (!live) {
        throw new Error('Live não encontrada');
      }

      const now = new Date();
      const lastSynced = live.traffic_last_synced_at ? new Date(live.traffic_last_synced_at) : null;
      const CACHE_DURATION_MINUTES = 30;
      const isCacheValid = lastSynced && (now.getTime() - lastSynced.getTime()) < CACHE_DURATION_MINUTES * 60 * 1000;
      setCacheStatus({
        isLoading: false,
        fromCache: !!(isCacheValid && live.cached_traffic_data),
        needsRefresh: !isCacheValid || !live.cached_traffic_data,
        lastSynced: live.traffic_last_synced_at
      });

      // Se tem cache válido, usar dados do cache
      if (isCacheValid && live.cached_traffic_data) {
        // Carregar dados básicos da live
        setLive(live);
        
        // Usar dados do cache
        if (live.cached_traffic_data) {
          setGroups(live.cached_traffic_data.groups || []);
          setCampaigns(live.cached_traffic_data.campaigns || []);
          setCampaignsWithInsights(live.cached_traffic_data.campaignsWithInsights || []);
          
        }
        
        // Preencher campos de data automaticamente baseado nos dados disponíveis
        if (live.cached_traffic_data?.dailyInsights && live.cached_traffic_data.dailyInsights.length > 0) {
          const insights = live.cached_traffic_data.dailyInsights;
          const dates = insights.map((insight: any) => insight.date).sort();
          const minDate = dates[0];
          const maxDate = dates[dates.length - 1];
          setTempStartDate(minDate);
          setTempEndDate(maxDate);
          setStartDate(minDate);
          setEndDate(maxDate);
        } else if (live.insights_date_since && live.insights_date_until) {
          setTempStartDate(live.insights_date_since);
          setTempEndDate(live.insights_date_until);
          setStartDate(live.insights_date_since);
          setEndDate(live.insights_date_until);
        }
        
        setIsLoading(false);
        return;
      }

      // Cache vencido ou inexistente - buscar dados frescos
      const completeData = await fetchCompleteLiveData(liveId);
      // Atualizar estados com dados frescos
      setLive(completeData.live);
      setGroups((completeData.groups || []).map(group => ({
        ...group,
        updated_at: (group as { updated_at?: string }).updated_at || group.created_at
      })));
      setCampaigns(completeData.liveCampaigns || []);
      setCampaignsWithInsights(completeData.campaignInsights || []);
      
      // Preencher campos de data com valores padrão da Live
      if (completeData.live?.insights_date_since && completeData.live?.insights_date_until) {
        setTempStartDate(completeData.live.insights_date_since);
        setTempEndDate(completeData.live.insights_date_until);
        setStartDate(completeData.live.insights_date_since);
        setEndDate(completeData.live.insights_date_until);
      }
      // Salvar dados no cache
      await updateTrafficCache(liveId, completeData);
      
      // Atualizar status do cache após salvar
      setCacheStatus({
        isLoading: false,
        fromCache: false,
        needsRefresh: false,
        lastSynced: new Date().toISOString()
      });
      
    } catch (error) {
    } finally {
      setCacheStatus(prev => ({ ...prev, isLoading: false }));
      setIsLoading(false);
    }
  }, [liveId]); // Dependência apenas do liveId

  // Função para atualizar cache de tráfego
  const updateTrafficCache = async (
    liveId: string, 
    completeData: {
      live: {
        id: string;
        name: string;
        user_id: string;
        insights_date_since?: string;
        insights_date_until?: string;
        campaign_search_term?: string;
      };
      groups: Array<{
        id: string;
        group_id: string;
        group_name: string;
        group_size: number;
        monitoring: boolean;
        created_at: string;
      }>;
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
        insights: Array<{
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
          actions?: Array<{
            action_type: string;
            value: string;
          }>;
        }>;
      }>;
    }, 
  ) => {
    try {
      const trafficData = {
        groups: completeData.groups || [],
        campaigns: completeData.liveCampaigns || [],
        campaignsWithInsights: completeData.campaignInsights || [],
      };

      const { error } = await supabase
        .from('lives')
        .update({
          traffic_last_synced_at: new Date().toISOString(),
          cached_traffic_data: trafficData
        })
        .eq('id', liveId);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  };

  // Função para iniciar o refresh (chamada pelo botão)
  const handleRefreshStart = () => {
    setIsButtonRefreshing(true);
  };

  // Função para forçar refresh do cache
  const handleForceRefresh = async () => {
    if (!liveId) return;
    
    setCacheStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Limpar cache atual
      const { error } = await supabase
        .from('lives')
        .update({
          traffic_last_synced_at: null,
          cached_traffic_data: null,
          cached_traffic_metrics: null
        })
        .eq('id', liveId);

      if (error) {
        throw error;
      }
      
      // Buscar dados frescos
      await fetchTrafficDataWithCache();
    } catch (error) {
    } finally {
      setCacheStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Buscar dados com sistema de cache
  useEffect(() => {
    if (liveId) {
      loadDataFromDatabase(false); // Carregamento inicial, não do botão
    }
  }, [liveId]); // Removido loadDataFromDatabase das dependências para evitar loop
  
  
  // Usar métricas do cache ou calcular se necessário
  const cplLiquido = live?.cached_metrics?.cplLiquido || metricsV2?.cplLiquido || 0;
  const cplMeta = live?.cached_metrics?.cplMeta || metricsV2?.cplMeta || 0;
  const retentionRate = live?.cached_metrics?.retentionRate || metricsV2?.retentionRate || 0;

  // Calcular dados dos grupos (usar cache se disponível)
  const groupData = {
    entrou: live?.cached_group_data?.entries || groups?.reduce((sum, group) => sum + (group.group_size || 0), 0) || 0,
    saiu: live?.cached_group_data?.exits || 0,
    ativos: live?.cached_group_data?.activeMembers || groups?.reduce((sum, group) => sum + (group.group_size || 0), 0) || 0
  };

  // Debug: Log dos dados que serão exibidos nos cards
  // Debug: Log do timezone do servidor
  // Calcular dados diários usando dailyInsights do cache - memoizado para evitar re-renders
  const calculateDailyData = useMemo(() => {
    // Verificar se temos dailyInsights do cache
    const dailyInsights = live?.cached_traffic_data?.dailyInsights;

    if (!dailyInsights || dailyInsights.length === 0) {
      return [];
    }

    let filteredInsights = dailyInsights;

    // Se não é "todos", filtrar por público selecionado
    if (!selectedPublico.includes('todos')) {
      const selectedAudience = publicAudiences.find(a => selectedPublico.includes(a.id));
      
      if (selectedAudience) {
        // Buscar grupos que correspondem ao emoji do público
        const audienceGroups = groups.filter(group => 
          group.group_name.includes(selectedAudience.emoji)
        );
        
        if (audienceGroups.length > 0) {
          // Filtrar insights que correspondem aos grupos do público
          // Como os insights são agregados por data, vamos manter todos os insights
          // mas ajustar os dados dos grupos para refletir apenas os grupos do público
          filteredInsights = dailyInsights.map(insight => {
            // Calcular proporção dos grupos do público em relação ao total
            const totalGroupSize = groups.reduce((sum, group) => sum + group.group_size, 0);
            const audienceGroupSize = audienceGroups.reduce((sum, group) => sum + group.group_size, 0);
            const proportion = totalGroupSize > 0 ? audienceGroupSize / totalGroupSize : 0;
            
            return {
              ...insight,
              // Ajustar dados dos grupos proporcionalmente
              groupJoin: Math.round(((insight as any).groupJoin || 0) * proportion),
              groupExit: Math.round(((insight as any).groupExit || 0) * proportion),
              cplLiquido: audienceGroupSize > 0 ? insight.spend / audienceGroupSize : 0,
              retention: insight.leads > 0 ? Math.round((audienceGroupSize / insight.leads) * 100) : 0
            };
          });
        } else {
          // Se não há grupos correspondentes, retornar insights zerados
          filteredInsights = dailyInsights.map(insight => ({
            ...insight,
            groupJoin: 0,
            groupExit: 0,
            cplLiquido: 0,
            retention: 0
          }));
        }
      }
    }

    // Converter dailyInsights para formato esperado pela tabela
    const result = filteredInsights.map(insight => ({
      date: insight.date,
      investment: insight.spend,
      cadastros: insight.leads,
      group: (insight as any).groupJoin || 0,
      groupExit: (insight as any).groupExit || 0,
      cplMeta: insight.cplMeta,
      cplLiquido: (insight as any).cplLiquido || 0,
      retention: (insight as any).retention || 0
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return result;
  }, [live?.cached_traffic_data?.dailyInsights, selectedPublico, publicAudiences, groups]);
  
  // Calcular totais e médias para os cabeçalhos das colunas - memoizado para evitar re-renders
  const calculateTotals = useMemo(() => {
    const dailyData = calculateDailyData;
    
    // CORRIGIDO: Calcular totais baseados nos dados da tabela (não dados externos)
    const totalInvestment = dailyData.reduce((sum, day) => sum + day.investment, 0);
    const totalLeads = dailyData.reduce((sum, day) => sum + day.cadastros, 0);
    const totalGroup = dailyData.reduce((sum, day) => sum + day.group, 0);
    const totalGroupExit = dailyData.reduce((sum, day) => sum + day.groupExit, 0);
    
    // TESTE: TABELA 1 - DADOS DIÁRIOS: TEMPORARIAMENTE USANDO MÉDIA PONDERADA
    // Invertido para validação - antes era média simples
    const totalInvestmentDaily = dailyData.reduce((sum, day) => sum + day.investment, 0);
    const totalLeadsDaily = dailyData.reduce((sum, day) => sum + day.cadastros, 0);

    const averageCplMeta = totalLeadsDaily > 0 ? totalInvestmentDaily / totalLeadsDaily : 0;

    // Manter outros cálculos inalterados
    const cplMetaValues = dailyData.map(day => day.cplMeta).filter(val => val > 0);
    const cplLiquidoValues = dailyData.map(day => day.cplLiquido).filter(val => val > 0);
    const retentionValues = dailyData.map(day => day.retention).filter(val => val > 0);
    const averageCplLiquido = cplLiquidoValues.length > 0 ? cplLiquidoValues.reduce((sum, val) => sum + val, 0) / cplLiquidoValues.length : 0;
    const averageRetention = retentionValues.length > 0 ? retentionValues.reduce((sum, val) => sum + val, 0) / retentionValues.length : 0;
    
    return {
      totalInvestment,
      totalLeads,
      totalGroup,
      totalGroupExit,
      averageCplMeta,
      averageCplLiquido,
      averageRetention
    };
  }, [calculateDailyData]);
  
  const tableData = calculateDailyData;
  const totals = calculateTotals;
  
  // Debug: Testar conversão de data
  if (tableData.length > 0) {
    const firstDate = tableData[0].date;
  }
  
  // Debug: Verificar cálculos dos totais
  // Calcular totais para a tabela hierárquica de campanhas
  const campaignTotals = useMemo(() => {
    const totals = campaignsHierarchy.campaigns.reduce((acc, campaign) => {
      acc.totalLeads += campaign.totalLeads;
      acc.totalInvestment += campaign.totalSpend;
      return acc;
    }, { totalLeads: 0, totalInvestment: 0 });
    
    const averageCPL = totals.totalLeads > 0 ? totals.totalInvestment / totals.totalLeads : 0;
    
    return {
      ...totals,
      averageCPL
    };
  }, [campaignsHierarchy]);
  

  // Filtrar dados por data - memoizado para evitar re-renders
  const filteredTableData = useMemo(() => {
    if (!startDate || !endDate) return tableData;
    
    return tableData.filter(day => {
      if (!day.date) return false;
      return day.date >= startDate && day.date <= endDate;
    });
  }, [tableData, startDate, endDate]);

  // Funções de ordenação (baseado no exemplo)
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };
  
  const sortedData = useMemo(() => {
    return [...filteredTableData].sort((a, b) => {
      if (!sortField) return 0;
      const aValue = a[sortField as keyof typeof a];
      const bValue = b[sortField as keyof typeof b];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTableData, sortField, sortDirection]);
  
  // Funções para filtro de públicos
  const handlePublicoSelect = (value: string) => {
    if (value === 'todos') {
      setSelectedPublico(['todos']);
    } else {
      const newSelection = selectedPublico.includes('todos') 
        ? [value] 
        : selectedPublico.includes(value)
          ? selectedPublico.filter(p => p !== value)
          : [...selectedPublico, value];
      
      // Se nenhum público estiver selecionado, voltar para "todos"
      setSelectedPublico(newSelection.length === 0 ? ['todos'] : newSelection);
    }
    
    // Fechar dropdown após seleção
    setShowPublicoDropdown(false);
  };

  const getPublicoDisplayText = () => {
    if (selectedPublico.includes('todos')) {
      return 'Todos os Públicos';
    }
    if (selectedPublico.length === 1) {
      const option = publicoOptions.find(opt => opt.value === selectedPublico[0]);
      return option?.label || 'Todos os Públicos';
    }
    return `${selectedPublico.length} públicos selecionados`;
  };

  // Funções para expansão hierárquica
  const toggleExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const isExpanded = (itemId: string) => expandedItems.has(itemId);

  // Função para renderizar linha hierárquica
  const renderHierarchicalRow = (item: any, level: number, type: 'campaign' | 'adSet' | 'insight') => {
    const isItemExpanded = isExpanded(item.id);
    const hasChildren = type === 'campaign' ? item.adSets.length > 0 : type === 'adSet' ? item.insights.length > 0 : false;
    
    return (
      <TableRow key={item.id} className="hover:bg-muted/50">
        <TableCell>
          <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
            {hasChildren && (
              <button
                onClick={() => toggleExpansion(item.id)}
                className="mr-2 p-1 hover:bg-muted rounded"
              >
                {isItemExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}
            <div>
              <div className={`font-semibold ${level === 0 ? 'text-base' : level === 1 ? 'text-sm' : 'text-xs'}`}>
                {item.name}
              </div>
              {type === 'adSet' && (
                <div className="text-xs text-muted-foreground">
                  {item.campaignName}
                </div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-center font-medium">
          {type === 'campaign' ? Number(item.totalLeads || 0).toLocaleString('pt-BR') : 
           type === 'adSet' ? Number(item.totalLeads || 0).toLocaleString('pt-BR') : 
           Number(item.leads || 0).toLocaleString('pt-BR')}
        </TableCell>
        <TableCell className="text-center font-medium">
          R$ {type === 'campaign' ? Number(item.totalSpend || 0).toFixed(2).replace('.', ',') : 
              type === 'adSet' ? Number(item.totalSpend || 0).toFixed(2).replace('.', ',') : 
              Number(item.spend || 0).toFixed(2).replace('.', ',')}
        </TableCell>
        <TableCell className="text-center font-medium">
          R$ {type === 'campaign' ? Number(item.cpl || 0).toFixed(2).replace('.', ',') : 
              type === 'adSet' ? Number(item.cpl || 0).toFixed(2).replace('.', ',') : 
              Number(item.cpl || 0).toFixed(2).replace('.', ',')}
        </TableCell>
        <TableCell className="text-center">
          {type === 'insight' && item.creativeUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={item.creativeUrl} target="_blank" rel="noopener noreferrer">
                Ver Criativo
              </a>
            </Button>
          ) : type === 'insight' ? (
            <span className="text-xs text-muted-foreground">Sem link</span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  // Função para renderizar dados hierárquicos
  const renderHierarchicalData = () => {
    const rows: JSX.Element[] = [];

    campaignsHierarchy.campaigns.forEach(campaign => {
      // Renderizar campanha
      if (levelFilters.campaigns) {
        rows.push(renderHierarchicalRow(campaign, 0, 'campaign'));
      }

      // Renderizar ad sets se campanha estiver expandida
      if (isExpanded(campaign.id) && levelFilters.adSets) {
        campaign.adSets.forEach(adSet => {
          const adSetWithCampaign = { ...adSet, campaignName: campaign.name };
          rows.push(renderHierarchicalRow(adSetWithCampaign, 1, 'adSet'));

          // Renderizar insights se ad set estiver expandido
          if (isExpanded(adSet.id) && levelFilters.insights) {
            adSet.insights.forEach(insight => {
              rows.push(renderHierarchicalRow(insight, 2, 'insight'));
            });
          }
        });
      }
    });

    return rows;
  };

  const handleApplyFilters = async () => {
    if (!tempStartDate || !tempEndDate) return;
    
    try {
      setIsLoading(true);
      // Atualizar as datas ativas
      setStartDate(tempStartDate);
      setEndDate(tempEndDate);
      
      // Fazer nova requisição com o período filtrado
      if (liveId) {
        const completeData = await fetchCompleteLiveData(liveId, tempStartDate, tempEndDate);
        // Atualizar dados com o novo período
        setGroups((completeData.groups || []).map(group => ({
          ...group,
          updated_at: (group as { updated_at?: string }).updated_at || group.created_at
        })));
        setCampaigns(completeData.liveCampaigns || []);
        setCampaignsWithInsights(completeData.campaignInsights || []);
        
        // Recalcular métricas V2
        const campaignInsights = (completeData.campaignInsights || []).map((campaign) => ({
          ...campaign,
          insights: campaign.insights || []
        }));
        
        const liveDataForCalculations = {
          live: completeData.live,
          groups: completeData.groups || [],
          campaignInsights: campaignInsights
        };
        
        // Validar parâmetros obrigatórios para cálculos
        if (!completeData.live?.insights_date_since || !completeData.live?.insights_date_until || !completeData.live?.user_id) {
          throw new Error(`Parâmetros obrigatórios ausentes: insights_date_since=${completeData.live?.insights_date_since}, insights_date_until=${completeData.live?.insights_date_until}, user_id=${completeData.live?.user_id}`);
        }

        const result = await calculateCompleteLiveMetrics(liveDataForCalculations, {
          enableLogging: true,
          enableValidation: true,
          orcamentoGasto: completeData.live.ad_budget,
          dateFrom: completeData.live.insights_date_since,
          dateTo: completeData.live.insights_date_until,
          userId: completeData.live.user_id
        });
        setMetricsV2(result.metrics);
        setExtractedDataV2(result.extractedData);
        
        // TODO: Implementar recálculo de dados hierárquicos de campanhas
        
        // TODO: Implementar busca de dados hierárquicos de campanhas
        // Por enquanto, usar dados hierárquicos do cache se disponível
        setCampaignsHierarchy({ campaigns: [] });
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aplicar filtros');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl">Carregando análise de tráfego...</div>
            <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin border-2 border-blue-600 border-t-transparent rounded-full"></div>
            Buscando dados do Meta Ads...
            </div>
            </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl text-red-600">❌ Erro: {error}</div>
          <div className="text-sm text-gray-600">
            Verifique se a live existe e se você tem permissão para acessá-la.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      {/* Navegação interna */}
      <ScreenNavigatorLives 
        liveId={liveId} 
        onRefresh={() => {}}
        isRefreshing={false}
        onRefreshStart={handleRefreshStart}
        onDataUpdated={() => loadDataFromDatabase(true)}
        showRefreshButton={true}
      />
      
      {/* Botão flutuante para teste das análises */}
      <div className="fixed top-20 right-4 z-50">
        <Button
          onClick={handleTestAnalysis}
          disabled={isTestingAnalysis}
          variant="secondary"
          size="sm"
          className="shadow-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isTestingAnalysis ? 'animate-spin' : ''}`} />
          {isTestingAnalysis ? 'Testando...' : 'Testar Análises'}
        </Button>
      </div>

      <div className="container mx-auto p-6 space-y-8 relative">
        {/* Overlay de loading quando está atualizando */}
        {(cacheStatus.isLoading || isButtonRefreshing) && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-xl font-semibold">Carregando dados...</div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin border-2 border-blue-600 border-t-transparent rounded-full"></div>
                Buscando dados do Meta Ads...
              </div>
            </div>
          </div>
        )}
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">Erro ao carregar dados</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

      {/* Métricas Principais */}
      <LiveMetricsCards
        cplLiquido={cplLiquido}
        cplMeta={cplMeta}
        retentionRate={retentionRate}
        groupMembers={groupData.entrou}
        groupExits={groupData.saiu}
        activeLeads={groupData.ativos}
          isLoading={isLoading}
        />

      {/* Tabela de Dados Diários */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>📅 Dados Diários de Captação</CardTitle>
              <CardDescription>Performance detalhada dos últimos dias por campanha</CardDescription>
            </div>
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Data início:</label>
                <Input type="date" className="w-auto" value={tempStartDate} onChange={e => setTempStartDate(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Data fim:</label>
                <Input type="date" className="w-auto" value={tempEndDate} onChange={e => setTempEndDate(e.target.value)} />
              </div>
                <div className="relative publico-dropdown-container">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPublicoDropdown(!showPublicoDropdown)}
                    className="flex items-center gap-2 min-w-[180px] justify-between"
                  >
                    <span className="text-sm">{getPublicoDisplayText()}</span>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  {showPublicoDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10">
                      {publicoOptions.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePublicoSelect(option.value);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPublico.includes(option.value)}
                            onChange={() => {}}
                            className="mr-2 pointer-events-none"
                          />
                          <span className="text-sm">{option.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
              <Button onClick={handleApplyFilters} className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtrar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('date')} className="h-auto p-0 font-medium flex items-center gap-1">
                      Data
                      {getSortIcon('date')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('investment')} className="h-auto p-0 font-medium flex flex-col items-center gap-1 w-full">
                        <div className="text-center w-full">
                        <div>Investimento</div>
                          <div className="text-xs text-muted-foreground font-normal">Total: R$ {totals.totalInvestment.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}</div>
                      </div>
                      {getSortIcon('investment')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('cadastros')} className="h-auto p-0 font-medium flex flex-col items-center gap-1 w-full">
                        <div className="text-center w-full">
                        <div>Cadastros Meta</div>
                        <div className="text-xs text-muted-foreground font-normal">Total: {totals.totalLeads.toLocaleString('pt-BR')}</div>
                      </div>
                      {getSortIcon('cadastros')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('group')} className="h-auto p-0 font-medium flex flex-col items-center gap-1 w-full">
                        <div className="text-center w-full">
                        <div>Entrou no Grupo</div>
                        <div className="text-xs text-muted-foreground font-normal">Total: {totals.totalGroup.toLocaleString('pt-BR')}</div>
                      </div>
                      {getSortIcon('group')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('groupExit')} className="h-auto p-0 font-medium flex flex-col items-center gap-1 w-full">
                        <div className="text-center w-full">
                        <div>Saiu do Grupo</div>
                        <div className="text-xs text-muted-foreground font-normal">Total: {totals.totalGroupExit.toLocaleString('pt-BR')}</div>
                      </div>
                      {getSortIcon('groupExit')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('cplMeta')} className="h-auto p-0 font-medium flex flex-col items-center gap-1 w-full">
                        <div className="text-center w-full">
                          <div>CPL Meta</div>
                          <div className="text-xs text-muted-foreground font-normal">Média: R$ {totals.averageCplMeta.toFixed(2).replace('.', ',')}</div>
                        </div>
                      {getSortIcon('cplMeta')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('cplLiquido')} className="h-auto p-0 font-medium flex flex-col items-center gap-1 w-full">
                        <div className="text-center w-full">
                          <div>CPL Líquido</div>
                          <div className="text-xs text-muted-foreground font-normal">Média: R$ {totals.averageCplLiquido.toFixed(2).replace('.', ',')}</div>
                        </div>
                      {getSortIcon('cplLiquido')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('retention')} className="h-auto p-0 font-medium flex flex-col items-center gap-1 w-full">
                        <div className="text-center w-full">
                          <div>Taxa Retenção</div>
                          <div className="text-xs text-muted-foreground font-normal">Média: {Math.round(totals.averageRetention)}%</div>
                        </div>
                      {getSortIcon('retention')}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((day, index) => (
                  <TableRow key={index}>
                      <TableCell className="font-medium">
                        {day.date.split('-').reverse().join('/').substring(0, 5)}
                      </TableCell>
                      <TableCell className="text-center font-medium">R$ {day.investment.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</TableCell>
                    <TableCell className="text-center font-medium">{day.cadastros.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-center font-medium">{day.group.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-center font-medium">{day.groupExit.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-center font-semibold">
                      R$ {day.cplMeta.toFixed(2).replace('.', ',')}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      R$ {day.cplLiquido.toFixed(2).replace('.', ',')}
                    </TableCell>
                    <TableCell className="text-center">
                      {day.retention}%
                    </TableCell>
                  </TableRow>
                ))}
                {sortedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                        {isLoading ? 'Carregando dados...' : 'Nenhum dado encontrado para o período selecionado'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

        {/* Gráfico de Evolução do CPL */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Evolução do CPL</CardTitle>
            <CardDescription>Comparação entre CPL Meta e CPL Líquido ao longo dos dias</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ChartContainer config={{
                cplMeta: {
                  label: "CPL Meta",
                  color: "hsl(var(--chart-1))"
                },
                cplLiquido: {
                  label: "CPL Líquido",
                  color: "hsl(var(--chart-2))"
                }
            }} className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...sortedData].reverse().map(day => ({
                  dia: day.date.split('-').reverse().join('/').substring(0, 5),
                  cplMeta: day.cplMeta,
                  cplLiquido: day.cplLiquido
                }))} margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5
                }}>
                <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={value => `R$ ${value.toFixed(2)}`} />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={(value, name) => [`R$ ${Number(value).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                  })}`, name === 'cplLiquido' ? 'CPL Líquido' : 'CPL Meta']} />
                  <Line type="monotone" dataKey="cplLiquido" stroke="hsl(var(--destructive))" strokeWidth={4} dot={false} activeDot={{
                    r: 6,
                    fill: "hsl(var(--destructive))"
                  }} />
                  <Line type="monotone" dataKey="cplMeta" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="8 4" dot={false} activeDot={{
                    r: 4,
                    fill: "hsl(var(--primary))"
                  }} />
              </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Análise Profunda de Conjuntos de Anúncios */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>🏆 Análise Profunda de Campanhas</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                Cache independente • Atualização a cada 60 minutos
                {hierarchicalCacheValid && (
                  <span className="text-green-600 ml-2">✓ Cache válido</span>
                )}
              </div>
            </div>
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Data início:</label>
                  <Input type="date" className="w-auto" value={tempStartDate} onChange={e => setTempStartDate(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Data fim:</label>
                  <Input type="date" className="w-auto" value={tempEndDate} onChange={e => setTempEndDate(e.target.value)} />
              </div>
                <Button onClick={handleApplyFilters} className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtrar
              </Button>
            </div>
          </div>
          
          {/* Filtro de Níveis Hierárquicos */}
          <div className="flex items-center space-x-4 pt-4 border-t">
            <span className="text-sm font-medium">Exibir níveis:</span>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={levelFilters.campaigns}
                  onChange={(e) => setLevelFilters(prev => ({ ...prev, campaigns: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Campanhas</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={levelFilters.adSets}
                  onChange={(e) => setLevelFilters(prev => ({ ...prev, adSets: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Conjuntos de Anúncios</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={levelFilters.insights}
                  onChange={(e) => setLevelFilters(prev => ({ ...prev, insights: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Insights</span>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('name')} className="h-auto p-0 font-medium flex items-center gap-1">
                    Nome
                      {getSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                    <Button variant="ghost" onClick={() => handleSort('total_leads')} className="h-auto p-0 font-medium flex flex-col items-center gap-1 w-full">
                      <div className="text-center w-full">
                      <div>Leads</div>
                        <div className="text-xs text-muted-foreground font-normal">Total: {campaignTotals.totalLeads.toLocaleString('pt-BR')}</div>
                    </div>
                      {getSortIcon('total_leads')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                    <Button variant="ghost" onClick={() => handleSort('total_spent')} className="h-auto p-0 font-medium flex flex-col items-center gap-1 w-full">
                      <div className="text-center w-full">
                      <div>Investido</div>
                        <div className="text-xs text-muted-foreground font-normal">Total: R$ {campaignTotals.totalInvestment.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}</div>
                      </div>
                      {getSortIcon('total_spent')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                    <Button variant="ghost" onClick={() => handleSort('cpl')} className="h-auto p-0 font-medium flex flex-col items-center gap-1 w-full">
                      <div className="text-center w-full">
                      <div>CPL Meta</div>
                        <div className="text-xs text-muted-foreground font-normal">Média: R$ {campaignTotals.averageCPL.toFixed(2).replace('.', ',')}</div>
                    </div>
                      {getSortIcon('cpl')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">Criativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {campaignsHierarchy.campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {isLoading ? 'Carregando dados...' : 'Nenhuma campanha encontrada'}
                  </TableCell>
                </TableRow>
              ) : (
                renderHierarchicalData()
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default TrafficAnalysis;