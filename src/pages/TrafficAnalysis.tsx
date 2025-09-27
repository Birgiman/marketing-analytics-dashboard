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
// Funções antigas removidas - agora usando Edge Function syncLiveMetaData
// Removido import legado: fetchAdSetInsights
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Filter } from "lucide-react";
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
    cached_traffic_data_incremented?: {
      campaignsByDate: Record<string, any[]>;
      lastUpdated: string;
      requestTime: number;
      totalDays: number;
      dateRange: { since: string; until: string };
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
      // Buscar dados básicos da Live diretamente do Supabase
      const { data: liveData, error } = await supabase
        .from('lives')
        .select('*')
        .eq('id', liveId)
        .single();

      if (error || !liveData) {
        console.error('[TrafficAnalysis] Erro ao buscar Live:', error);
        return;
      }
      
      if (liveData) {
        console.log('🔍 [DEBUG] liveData do banco:', {
          id: liveData.id,
          cached_traffic_data_incremented: liveData.cached_traffic_data_incremented ? 'existe' : 'não existe',
          cached_traffic_data: liveData.cached_traffic_data ? 'existe' : 'não existe',
          traffic_last_synced_at: liveData.traffic_last_synced_at
        });

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
          cached_traffic_data_incremented: liveData.cached_traffic_data_incremented || undefined,
          traffic_last_synced_at: liveData.traffic_last_synced_at
        });
        
        // Carregar dados específicos de tráfego do cache
        if (liveData.cached_traffic_data) {
          // DEBUG: Verificar se campaign (dados hierárquicos) existe e tem dados
          if ((liveData.cached_traffic_data as any).campaign) {
            console.log('✅ [TrafficAnalysis] campaign (dados hierárquicos) encontrado no cache');
          } else {
            console.log('⚠️ [TrafficAnalysis] campaign (dados hierárquicos) não encontrado no cache');
          }
          
          // Carregar grupos
          if (liveData.cached_traffic_data.groups) {
            setGroups(liveData.cached_traffic_data.groups);
          }
          
          // Carregar campanhas (extrair da estrutura hierárquica)
          if ((liveData.cached_traffic_data as any).campaign) {
            const campaigns = (liveData.cached_traffic_data as any).campaign.map((campaign: any) => ({
              campaign_id: campaign.id,
              campaign_name: campaign.name
            }));
            setCampaigns(campaigns);
          }

          // Carregar campanhas com insights (usar dados incrementais para tabela diária)
          if (liveData.cached_traffic_data_incremented?.campaignsByDate) {
            // Converter dados incrementais para formato de insights
            const campaignsWithInsights: any[] = [];
            const campaignsByDate = liveData.cached_traffic_data_incremented.campaignsByDate;
            
            // Agrupar por campanha
            const campaignMap = new Map();
            Object.keys(campaignsByDate).forEach(date => {
              campaignsByDate[date].forEach((campaign: any) => {
                if (!campaignMap.has(campaign.id)) {
                  campaignMap.set(campaign.id, {
                    campaign_id: campaign.id,
                    campaign_name: campaign.name,
                    insights: []
                  });
                }
                
                // Adicionar insight diário
                campaignMap.get(campaign.id).insights.push({
                  campaign_name: campaign.name,
                  date_start: date,
                  date_stop: date,
                  spend: campaign.spend.toString(),
                  impressions: '0', // Não disponível nos dados incrementais
                  clicks: '0', // Não disponível nos dados incrementais
                  reach: '0', // Não disponível nos dados incrementais
                  frequency: '0', // Não disponível nos dados incrementais
                  cpm: '0', // Não disponível nos dados incrementais
                  ctr: '0', // Não disponível nos dados incrementais
                  cpp: '0', // Não disponível nos dados incrementais
                  cost_per_unique_click: '0', // Não disponível nos dados incrementais
                  actions: [{ action_type: 'lead', value: campaign.leads.toString() }]
                });
              });
            });
            
            setCampaignsWithInsights(Array.from(campaignMap.values()));
            console.log('✅ [TrafficAnalysis] campaignsWithInsights gerado a partir dos dados incrementais');
          } else {
            console.log('⚠️ [TrafficAnalysis] Dados incrementais não disponíveis no cache');
          }

          // Carregar dados hierárquicos de campanhas (usar estrutura da Edge Function)
          if ((liveData.cached_traffic_data as any).campaign) {
            const formattedHierarchy = {
              campaigns: (liveData.cached_traffic_data as any).campaign.map((campaign: any) => ({
                id: campaign.id,
                name: campaign.name,
                totalSpend: campaign.spend,
                totalLeads: campaign.leads,
                cpl: campaign.cpl_meta,
                adSets: campaign.adsets.map((adSet: any) => ({
                  id: adSet.id,
                  name: adSet.name,
                  totalSpend: adSet.spend,
                  totalLeads: adSet.leads,
                  cpl: adSet.cpl_meta,
                  insights: adSet.ads.map((ad: any) => ({
                    id: ad.id,
                    name: ad.name,
                    spend: ad.spend,
                    leads: ad.leads,
                    cpl: ad.cpl_meta,
                    creativeUrl: ad.creative_url
                  }))
                }))
              }))
            };
            setCampaignsHierarchy(formattedHierarchy);
            console.log('✅ [TrafficAnalysis] Dados hierárquicos carregados da Edge Function');
          }
        } else {
          console.log('⚠️ [TrafficAnalysis] cached_traffic_data não disponível');
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

            // Edge Function já foi chamada automaticamente
            // Usar dados do cache atualizado
            console.log('🔄 [Global Refresh] Dados hierárquicos serão carregados do cache da Edge Function');

            // Dados hierárquicos já estão no cache da Edge Function
            // Carregar do cache atualizado
            if (liveData.cached_traffic_data?.campaign) {
            const formattedHierarchy = {
                campaigns: liveData.cached_traffic_data.campaign.map((campaign: any) => ({
                id: campaign.id,
                name: campaign.name,
                  totalSpend: campaign.spend,
                  totalLeads: campaign.leads,
                  cpl: campaign.cpl_meta,
                  adSets: campaign.adsets.map((adSet: any) => ({
                  id: adSet.id,
                  name: adSet.name,
                    totalSpend: adSet.spend,
                    totalLeads: adSet.leads,
                    cpl: adSet.cpl_meta,
                    insights: adSet.ads.map((ad: any) => ({
                    id: ad.id,
                    name: ad.name,
                      spend: ad.spend,
                      leads: ad.leads,
                      cpl: ad.cpl_meta,
                      creativeUrl: ad.creative_url
                  }))
                }))
              }))
            };

            setCampaignsHierarchy(formattedHierarchy);
            setHierarchicalCacheValid(true);

              console.log(`✅ [Global Refresh] Dados hierárquicos carregados do cache:`, {
                campanhas: formattedHierarchy.campaigns.length,
                adSets: formattedHierarchy.campaigns.reduce((sum: number, c: any) => sum + c.adSets.length, 0),
                ads: formattedHierarchy.campaigns.reduce((sum: number, c: any) => 
                  sum + c.adSets.reduce((adSum: number, adSet: any) => adSum + adSet.insights.length, 0), 0
                )
              });
            }

          } catch (error) {
            console.error('❌ [Global Refresh] Erro ao atualizar dados hierárquicos:', error);
            setHierarchicalCacheValid(false);
          } finally {
            setIsHierarchicalRefreshing(false);
          }
        } else {
          // Se não é refresh do botão, apenas verificar cache
          try {
            // Verificar se há dados hierárquicos no cache
            const hasHierarchicalData = !!(liveData.cached_traffic_data?.campaign);
            setHierarchicalCacheValid(hasHierarchicalData);
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

      // Cache vencido ou inexistente - chamar Edge Function para buscar dados frescos
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user) {
          throw new Error('Usuário não autenticado');
        }
        
        const response = await supabase.functions.invoke('sync-live-meta-data', {
          body: { liveId }
        });
        
        if (response.error) {
          throw new Error(`Erro na Edge Function: ${response.error.message}`);
        }
        
        console.log(`✅ [TrafficAnalysis] Edge Function executada com sucesso:`, response.data);
        
        // Recarregar dados do cache atualizado
        const { data: updatedLive, error: reloadError } = await supabase
          .from('lives')
          .select('*')
          .eq('id', liveId)
          .single();
          
        if (reloadError || !updatedLive) {
          throw new Error('Erro ao recarregar dados após Edge Function');
        }
        
        const completeData = { live: updatedLive };


        // Atualizar estados com dados frescos
        setLive(completeData.live);
        
        // Carregar dados do cache atualizado
        if (completeData.live.cached_traffic_data) {
          setGroups(completeData.live.cached_traffic_data.groups || []);
          
          // Extrair campanhas da estrutura hierárquica
          if (completeData.live.cached_traffic_data.campaign) {
            const campaigns = completeData.live.cached_traffic_data.campaign.map((campaign: any) => ({
        campaign_id: campaign.id,
        campaign_name: campaign.name
            }));
            setCampaigns(campaigns);
          }
          
          // Gerar campaignsWithInsights a partir dos dados incrementais
          if (completeData.live.cached_traffic_data_incremented?.campaignsByDate) {
            const campaignsWithInsights: any[] = [];
            const campaignsByDate = completeData.live.cached_traffic_data_incremented.campaignsByDate;
            
            const campaignMap = new Map();
            Object.keys(campaignsByDate).forEach(date => {
              campaignsByDate[date].forEach((campaign: any) => {
                if (!campaignMap.has(campaign.id)) {
                  campaignMap.set(campaign.id, {
                    campaign_id: campaign.id,
                    campaign_name: campaign.name,
                    insights: []
                  });
                }
                
                campaignMap.get(campaign.id).insights.push({
                  campaign_name: campaign.name,
                  date_start: date,
                  date_stop: date,
                  spend: campaign.spend.toString(),
                  impressions: '0',
                  clicks: '0',
                  reach: '0',
                  frequency: '0',
                  cpm: '0',
                  ctr: '0',
                  cpp: '0',
                  cost_per_unique_click: '0',
                  actions: [{ action_type: 'lead', value: campaign.leads.toString() }]
                });
              });
            });
            
            setCampaignsWithInsights(Array.from(campaignMap.values()));
          }
        }























      
      // Preencher campos de data com valores padrão da Live
        if (completeData.live?.insights_date_since && completeData.live?.insights_date_until) {
          setTempStartDate(completeData.live.insights_date_since);
          setTempEndDate(completeData.live.insights_date_until);
          setStartDate(completeData.live.insights_date_since);
          setEndDate(completeData.live.insights_date_until);
        }
        
      } catch (error) {
        console.error('❌ [TrafficAnalysis] Erro ao chamar Edge Function:', error);
        throw error;
      }
      
      // Atualizar status do cache após salvar
      setCacheStatus({
        isLoading: false,
        fromCache: false,
        needsRefresh: false,
        lastSynced: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ [TrafficAnalysis] Erro ao carregar dados:', error);
    } finally {
      setCacheStatus(prev => ({ ...prev, isLoading: false }));
      setIsLoading(false);
    }
  }, [liveId]); // Dependência apenas do liveId

  // Função removida - agora usando Edge Function para atualizar cache
  // updateTrafficCache foi removida pois a Edge Function syncLiveMetaData já faz isso

  // Função para iniciar o refresh (chamada pelo botão)
  const handleRefreshStart = async () => {
    setIsButtonRefreshing(true);
    try {
      // Chamar Edge Function para forçar sincronização (ignorar cache)
      try {
        await syncLiveMetaData(liveId!, true); // true = forçar refresh
        console.log(`✅ [TrafficAnalysis] Edge Function executada no refresh`);
      } catch (edgeError) {
        console.warn(`⚠️ [TrafficAnalysis] Edge Function falhou no refresh, continuando:`, edgeError);
        // Não interromper o fluxo se a Edge Function falhar
      }

      // Recarregar dados do cache atualizado
      await loadDataFromDatabase(true);
    } catch (error) {
      console.error('❌ [TrafficAnalysis] Erro ao atualizar dados:', error);
      setError(`Erro ao atualizar dados: ${error}`);
    } finally {
      setIsButtonRefreshing(false);
    }
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
      console.error('❌ [TrafficAnalysis] Erro ao forçar refresh:', error);
    } finally {
      setCacheStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Estados para controle de inicialização
  const [isInitialized, setIsInitialized] = useState(false);

  // Função para verificar se o cache ainda é válido (30 minutos)
  const isCacheValid = useCallback(async (liveId: string): Promise<boolean> => {
    try {
      const { data: liveData, error } = await supabase
        .from('lives')
        .select('traffic_last_synced_at')
        .eq('id', liveId)
        .single();

      if (error || !liveData?.traffic_last_synced_at) {
        console.log(`📅 [TrafficAnalysis] Sem cache válido para Live: ${liveId}`);
        return false;
      }

      const lastSynced = new Date(liveData.traffic_last_synced_at);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSynced.getTime()) / (1000 * 60));
      const CACHE_DURATION_MINUTES = 30;

      const isValid = diffMinutes < CACHE_DURATION_MINUTES;
      console.log(`📅 [TrafficAnalysis] Cache ${isValid ? 'VÁLIDO' : 'EXPIRADO'} - Última sincronização: ${diffMinutes} min atrás`);

      return isValid;
    } catch (error) {
      console.error(`❌ [TrafficAnalysis] Erro ao verificar cache:`, error);
      return false;
    }
  }, []);

  // Função para chamar a Edge Function syncLiveMetaData com verificação de cache
  const syncLiveMetaData = useCallback(async (liveId: string, forceRefresh = false) => {
    try {
      // Verificar cache apenas se não for refresh forçado
      if (!forceRefresh) {
        const cacheIsValid = await isCacheValid(liveId);
        if (cacheIsValid) {
          console.log(`✅ [TrafficAnalysis] Cache válido - pulando Edge Function para Live: ${liveId}`);
          return { status: 'cache_valid' };
        }
      }

      console.log(`🚀 [TrafficAnalysis] Chamando Edge Function syncLiveMetaData para Live: ${liveId}`);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('Usuário não autenticado');
      }

      const response = await supabase.functions.invoke('sync-live-meta-data', {
        body: { liveId }
      });

      if (response.error) {
        throw new Error(`Erro na Edge Function: ${response.error.message}`);
      }

      console.log(`✅ [TrafficAnalysis] Edge Function executada com sucesso:`, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [TrafficAnalysis] Erro ao chamar Edge Function:', error);
      throw error;
    }
  }, [isCacheValid]);

  // Carregar dados na inicialização (igual ao Details.tsx)
  useEffect(() => {
    if (!liveId || isInitialized) return;
    
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Chamar Edge Function para sincronizar dados do Meta (com verificação de cache)
        try {
          await syncLiveMetaData(liveId, false); // false = não forçar refresh
          console.log(`✅ [TrafficAnalysis] Sincronização concluída`);
        } catch (edgeError) {
          console.warn(`⚠️ [TrafficAnalysis] Edge Function falhou, continuando com dados do cache:`, edgeError);
          // Não interromper o fluxo se a Edge Function falhar
        }

        // Carregar dados do cache atualizado
        await loadDataFromDatabase(false);
        
        setIsInitialized(true);
        
      } catch (error) {
        console.error('❌ [TrafficAnalysis] Erro ao inicializar dados:', error);
        setError(`Erro ao inicializar dados: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [liveId, isInitialized, syncLiveMetaData, loadDataFromDatabase]);
  
  
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
  // Calcular dados diários usando dados incrementais do cache - memoizado para evitar re-renders
  const calculateDailyData = useMemo(() => {
    // Verificar se temos dados incrementais do cache
    const campaignsByDate = live?.cached_traffic_data_incremented?.campaignsByDate;

    if (!campaignsByDate || Object.keys(campaignsByDate).length === 0) {
      return [];
    }

    // Converter campaignsByDate para formato dailyInsights (apenas nível 1 - campanhas)
    const dailyInsights: any[] = [];
    Object.keys(campaignsByDate).forEach(date => {
      const dayCampaigns = campaignsByDate[date];

      if (!Array.isArray(dayCampaigns) || dayCampaigns.length === 0) {
        return;
      }

      // Agregar dados do dia (apenas campanhas, nível 1)
      const dayTotal = dayCampaigns.reduce((acc: { spend: number; leads: number }, campaign: any) => {
        acc.spend += campaign.spend || 0;
        acc.leads += campaign.leads || 0;
        return acc;
      }, { spend: 0, leads: 0 });

      // Calcular CPL Meta
      const cplMeta = dayTotal.leads > 0 ? dayTotal.spend / dayTotal.leads : 0;


      // Dados de WhatsApp vindos da Edge Function
      const dayGroupJoin = dayCampaigns[0]?.whatsapp_joins || 0;
      const dayGroupExit = dayCampaigns[0]?.whatsapp_exits || 0;

      // CPL Líquido baseado nos dados reais do dia
      const dayCplLiquido = dayGroupJoin > 0 ? dayTotal.spend / dayGroupJoin : (live?.cached_metrics?.cplLiquido || 0);

      // Taxa de retenção do dia
      const dayRetention = dayTotal.leads > 0 ? Math.round((dayGroupJoin / dayTotal.leads) * 100) : 0;

      dailyInsights.push({
        date,
        spend: dayTotal.spend,
        leads: dayTotal.leads,
        cplMeta,
        groupJoin: dayGroupJoin,
        groupExit: dayGroupExit,
        cplLiquido: dayCplLiquido,
        retention: dayRetention
      });
    });

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
      group: insight.groupJoin,
      groupExit: insight.groupExit,
      cplMeta: insight.cplMeta,
      cplLiquido: insight.cplLiquido,
      retention: insight.retention
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return result;
  }, [live?.cached_traffic_data_incremented?.campaignsByDate, selectedPublico, publicAudiences, groups]);
  
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
        // Chamar Edge Function para atualizar dados com novo período
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user) {
          throw new Error('Usuário não autenticado');
        }
        
        const response = await supabase.functions.invoke('sync-live-meta-data', {
          body: { liveId }
        });
        
        if (response.error) {
          throw new Error(`Erro na Edge Function: ${response.error.message}`);
        }
        
        // Recarregar dados do cache atualizado
        const { data: updatedLive, error: reloadError } = await supabase
          .from('lives')
          .select('*')
          .eq('id', liveId)
          .single();
          
        if (reloadError || !updatedLive) {
          throw new Error('Erro ao recarregar dados após Edge Function');
        }
        
        const completeData = { live: updatedLive };
        // Atualizar dados com o novo período
        setLive(completeData.live);
        
        if (completeData.live.cached_traffic_data) {
          setGroups(completeData.live.cached_traffic_data.groups || []);
          
          // Extrair campanhas da estrutura hierárquica
          if (completeData.live.cached_traffic_data.campaign) {
            const campaigns = completeData.live.cached_traffic_data.campaign.map((campaign: any) => ({
              campaign_id: campaign.id,
              campaign_name: campaign.name
            }));
            setCampaigns(campaigns);
          }
          
          // Gerar campaignsWithInsights a partir dos dados incrementais
          if (completeData.live.cached_traffic_data_incremented?.campaignsByDate) {
            const campaignsWithInsights: any[] = [];
            const campaignsByDate = completeData.live.cached_traffic_data_incremented.campaignsByDate;
            
            const campaignMap = new Map();
            Object.keys(campaignsByDate).forEach(date => {
              campaignsByDate[date].forEach((campaign: any) => {
                if (!campaignMap.has(campaign.id)) {
                  campaignMap.set(campaign.id, {
                    campaign_id: campaign.id,
                    campaign_name: campaign.name,
                    insights: []
                  });
                }
                
                campaignMap.get(campaign.id).insights.push({
                  campaign_name: campaign.name,
                  date_start: date,
                  date_stop: date,
                  spend: campaign.spend.toString(),
                  impressions: '0',
                  clicks: '0',
                  reach: '0',
                  frequency: '0',
                  cpm: '0',
                  ctr: '0',
                  cpp: '0',
                  cost_per_unique_click: '0',
                  actions: [{ action_type: 'lead', value: campaign.leads.toString() }]
                });
              });
            });
            
            setCampaignsWithInsights(Array.from(campaignMap.values()));
          }
        }


        
        // Recalcular métricas V2 usando dados do cache
        // Gerar campaignInsights a partir dos dados incrementais
        let campaignInsights: any[] = [];
        if (completeData.live.cached_traffic_data_incremented?.campaignsByDate) {
          const campaignsByDate = completeData.live.cached_traffic_data_incremented.campaignsByDate;
          const campaignMap = new Map();
          
          Object.keys(campaignsByDate).forEach(date => {
            campaignsByDate[date].forEach((campaign: any) => {
              if (!campaignMap.has(campaign.id)) {
                campaignMap.set(campaign.id, {
                  campaign_id: campaign.id,
                  campaign_name: campaign.name,
                  insights: []
                });
              }
              
              campaignMap.get(campaign.id).insights.push({
                campaign_name: campaign.name,
                date_start: date,
                date_stop: date,
                spend: campaign.spend.toString(),
                impressions: '0',
                clicks: '0',
                reach: '0',
                frequency: '0',
                cpm: '0',
                ctr: '0',
                cpp: '0',
                cost_per_unique_click: '0',
                actions: [{ action_type: 'lead', value: campaign.leads.toString() }]
              });
            });
          });
          
          campaignInsights = Array.from(campaignMap.values());
        }







        const liveDataForCalculations = {
          live: completeData.live,
          groups: completeData.live.cached_traffic_data?.groups || [],
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
