import Header from "@/components/Header";
import { LiveMetricsCards } from "@/components/LiveMetricsCards";
import { ScreenNavigatorLives } from "@/components/ScreenNavigatorLives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { PublicAudience, PublicAudienceCorrelation } from "@/types/audience";
import { fetchPublicAudiences, generateAudienceCorrelation } from "@/utils/audienceService";
// Removido imports legados: AdSetData, CampaignData, extractAdSetDataFromInsights, extractCampaignData
// REMOVIDO: import { calculateCompleteLiveMetrics } from "@/utils/live-metrics-v2"; // Não usado mais no filtro
// Funções antigas removidas - agora usando Edge Function syncLiveMetaData
// Removido import legado: fetchAdSetInsights
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Filter, Settings, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const TrafficAnalysis = () => {
  console.log('🔄 [TrafficAnalysis] Componente re-renderizado:', new Date().toISOString());
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
  
  // Filtros de data para a tabela de dados diários
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  
  // Filtros de data para a análise profunda de campanhas (independentes)
  const [campaignStartDate, setCampaignStartDate] = useState<string>('');
  const [campaignEndDate, setCampaignEndDate] = useState<string>('');
  const [tempCampaignStartDate, setTempCampaignStartDate] = useState<string>('');
  const [tempCampaignEndDate, setTempCampaignEndDate] = useState<string>('');
  
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

  // Estados para modal de filtros avançados
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    startDate: '',
    endDate: '',
    selectedCampaigns: new Set<string>(),
    selectedAdSets: new Set<string>(),
    selectedCreatives: new Set<string>()
  });
  
  // Estados temporários para o modal (não causam re-render da tabela)
  const [tempAdvancedFilters, setTempAdvancedFilters] = useState({
    startDate: '',
    endDate: '',
    selectedCampaigns: new Set<string>(),
    selectedAdSets: new Set<string>(),
    selectedCreatives: new Set<string>()
  });

  // Extrair itens únicos dos dados incrementais para filtros avançados
  const availableItems = useMemo(() => {
    const campaignsByDate = live?.cached_traffic_data_incremented?.campaignsByDate;
    
    if (!campaignsByDate) {
      return { campaigns: [], adSets: [], creatives: [] };
    }

    const campaignsMap = new Map();
    const adSetsMap = new Map();
    const creativesMap = new Map();

    Object.values(campaignsByDate).forEach((dayCampaigns: any) => {
      if (Array.isArray(dayCampaigns)) {
        dayCampaigns.forEach((campaign: any) => {
          // Adicionar campanha
          if (!campaignsMap.has(campaign.id)) {
            campaignsMap.set(campaign.id, {
              id: campaign.id,
              name: campaign.name,
              leads: 0,
              spend: 0
            });
          }
          
          // Atualizar totais da campanha
          const campaignData = campaignsMap.get(campaign.id);
          campaignData.leads += campaign.leads || 0;
          campaignData.spend += campaign.spend || 0;

          // Processar adsets
          if (campaign.adsets && Array.isArray(campaign.adsets)) {
            campaign.adsets.forEach((adset: any) => {
              // Adicionar adset
              if (!adSetsMap.has(adset.id)) {
                adSetsMap.set(adset.id, {
                  id: adset.id,
                  name: adset.name,
                  campaignId: campaign.id,
                  campaignName: campaign.name,
                  leads: 0,
                  spend: 0
                });
              }
              
              // Atualizar totais do adset
              const adsetData = adSetsMap.get(adset.id);
              adsetData.leads += adset.leads || 0;
              adsetData.spend += adset.spend || 0;

              // Processar ads (criativos)
              if (adset.ads && Array.isArray(adset.ads)) {
                adset.ads.forEach((ad: any) => {
                  if (!creativesMap.has(ad.id)) {
                    creativesMap.set(ad.id, {
                      id: ad.id,
                      name: ad.name,
                      adsetId: adset.id,
                      adsetName: adset.name,
                      campaignId: campaign.id,
                      campaignName: campaign.name,
                      leads: 0,
                      spend: 0,
                      creative_url: ad.creative_url
                    });
                  }
                  
                  // Atualizar totais do criativo
                  const creativeData = creativesMap.get(ad.id);
                  creativeData.leads += ad.leads || 0;
                  creativeData.spend += ad.spend || 0;
                });
              }
            });
          }
        });
      }
    });

    return {
      campaigns: Array.from(campaignsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      adSets: Array.from(adSetsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      creatives: Array.from(creativesMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [live?.cached_traffic_data_incremented?.campaignsByDate]);

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

  // Inicializar datas do modal de filtros avançados quando os dados são carregados
  useEffect(() => {
    console.log('🟠 [Modal] useEffect inicialização datas EXECUTADO:', { 
      hasLive: !!live, 
      since: live?.insights_date_since, 
      until: live?.insights_date_until, 
      currentStartDate: advancedFilters.startDate,
      timestamp: new Date().toISOString()
    });
    if (live?.insights_date_since && live?.insights_date_until && advancedFilters.startDate === '') {
      console.log('🟠 [Modal] Inicializando datas do modal');
      const initialDates = {
        startDate: live.insights_date_since || '',
        endDate: live.insights_date_until || ''
      };
      setAdvancedFilters(prev => ({ ...prev, ...initialDates }));
      setTempAdvancedFilters(prev => ({ ...prev, ...initialDates }));
    }
  }, [live?.insights_date_since, live?.insights_date_until, advancedFilters.startDate]);

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
            // Dados hierárquicos disponíveis no cache
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
          }
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
            setIsHierarchicalRefreshing(true);

            // Edge Function já foi chamada automaticamente
            // Usar dados do cache atualizado

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
      }
    } catch (error) {
      console.error('❌ [TrafficAnalysis] Erro ao carregar dados:', error);
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
          // Inicializar também as datas das campanhas
          setTempCampaignStartDate(minDate);
          setTempCampaignEndDate(maxDate);
          setCampaignStartDate(minDate);
          setCampaignEndDate(maxDate);
        } else if (live.insights_date_since && live.insights_date_until) {
          setTempStartDate(live.insights_date_since);
          setTempEndDate(live.insights_date_until);
          setStartDate(live.insights_date_since);
          setEndDate(live.insights_date_until);
          // Inicializar também as datas das campanhas
          setTempCampaignStartDate(live.insights_date_since);
          setTempCampaignEndDate(live.insights_date_until);
          setCampaignStartDate(live.insights_date_since);
          setCampaignEndDate(live.insights_date_until);
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
          // Inicializar também as datas das campanhas
          setTempCampaignStartDate(completeData.live.insights_date_since);
          setTempCampaignEndDate(completeData.live.insights_date_until);
          setCampaignStartDate(completeData.live.insights_date_since);
          setCampaignEndDate(completeData.live.insights_date_until);
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
      } catch (edgeError) {
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
  const [hierarchicalCacheValid, setHierarchicalCacheValid] = useState(false);
  const [isHierarchicalRefreshing, setIsHierarchicalRefreshing] = useState(false);

  // Função para verificar se o cache ainda é válido (30 minutos)
  const isCacheValid = useCallback(async (liveId: string): Promise<boolean> => {
    try {
      const { data: liveData, error } = await supabase
        .from('lives')
        .select('traffic_last_synced_at')
        .eq('id', liveId)
        .single();

      if (error || !liveData?.traffic_last_synced_at) {
        return false;
      }

      const lastSynced = new Date(liveData.traffic_last_synced_at);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSynced.getTime()) / (1000 * 60));
      const CACHE_DURATION_MINUTES = 30;

      const isValid = diffMinutes < CACHE_DURATION_MINUTES;

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
          return { status: 'cache_valid' };
        }
      }

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
        } catch (edgeError) {
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

      // CPL Líquido baseado nas pessoas que entraram no grupo
      const dayCplLiquido = dayGroupJoin > 0 ? dayTotal.spend / dayGroupJoin : 0;

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
    if (!selectedPublico?.includes('todos')) {
      const selectedAudience = publicAudiences?.find(a => selectedPublico?.includes(a.id));
      
      if (selectedAudience) {
        // Buscar grupos que correspondem ao emoji do público
        const audienceGroups = groups.filter(group => 
          group?.group_name?.includes(selectedAudience?.emoji || '')
        );
        
        if (audienceGroups.length > 0) {
          // Filtrar insights que correspondem aos grupos do público
          // Como os insights são agregados por data, vamos manter todos os insights
          // mas ajustar os dados dos grupos para refletir apenas os grupos do público
          filteredInsights = dailyInsights.map(insight => {
            // Calcular proporção dos grupos do público em relação ao total
            const totalGroupSize = groups.reduce((sum, group) => sum + (group?.group_size || 0), 0);
            const audienceGroupSize = audienceGroups.reduce((sum, group) => sum + (group?.group_size || 0), 0);
            const proportion = totalGroupSize > 0 ? audienceGroupSize / totalGroupSize : 0;

            // Calcular entradas e saídas proporcionais para o público
            const audienceGroupJoin = Math.round(((insight as any).groupJoin || 0) * proportion);
            const audienceGroupExit = Math.round(((insight as any).groupExit || 0) * proportion);
            
            return {
              ...insight,
              // Ajustar dados dos grupos proporcionalmente
              groupJoin: audienceGroupJoin,
              groupExit: audienceGroupExit,
              cplLiquido: audienceGroupJoin > 0 ? insight.spend / audienceGroupJoin : 0,
              retention: insight.leads > 0 ? Math.round((audienceGroupJoin / insight.leads) * 100) : 0
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
      } else {
        // Se não encontrou o público selecionado, retornar insights zerados
        filteredInsights = dailyInsights.map(insight => ({
          ...insight,
          groupJoin: 0,
          groupExit: 0,
          cplLiquido: 0,
          retention: 0
        }));
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

    // Calcular CPL Líquido correto baseado em pessoas que entraram no grupo
    const averageCplLiquido = totalGroup > 0 ? totalInvestment / totalGroup : 0;

    // Manter outros cálculos como média simples (corretos para seus contextos)
    const cplMetaValues = dailyData.map(day => day.cplMeta).filter(val => val > 0);
    const retentionValues = dailyData.map(day => day.retention).filter(val => val > 0);
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

  // Calcular dados GLOBAIS para os cards (independente de filtros de público e data)
  const globalCardData = useMemo(() => {
    const campaignsByDate = live?.cached_traffic_data_incremented?.campaignsByDate;

    if (!campaignsByDate || Object.keys(campaignsByDate).length === 0) {
      return {
        totalSpend: 0,
        totalLeads: 0,
        totalEntries: 0,
        totalExits: 0,
        cplMeta: 0,
        cplLiquido: 0,
        retentionRate: 0
      };
    }

    let totalSpend = 0;
    let totalLeads = 0;
    let totalEntries = 0;
    let totalExits = 0;
    const dailyRetentions: number[] = [];

    // Processar TODOS os dados diários (SEM filtro de público e SEM filtro de data)
    Object.values(campaignsByDate).forEach((dayCampaigns: any) => {
      if (Array.isArray(dayCampaigns) && dayCampaigns.length > 0) {
        const dayTotal = dayCampaigns.reduce((acc: { spend: number; leads: number }, campaign: any) => {
          acc.spend += campaign.spend || 0;
          acc.leads += campaign.leads || 0;
          return acc;
        }, { spend: 0, leads: 0 });

        totalSpend += dayTotal.spend;
        totalLeads += dayTotal.leads;

        const dayGroupJoin = dayCampaigns[0]?.whatsapp_joins || 0;
        const dayGroupExit = dayCampaigns[0]?.whatsapp_exits || 0;

        totalEntries += dayGroupJoin;
        totalExits += dayGroupExit;

        const dayRetention = dayTotal.leads > 0 ? Math.round((dayGroupJoin / dayTotal.leads) * 100) : 0;
        if (dayRetention > 0) {
          dailyRetentions.push(dayRetention);
        }
      }
    });

    const cplMeta = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const cplLiquido = totalEntries > 0 ? totalSpend / totalEntries : 0;
    const retentionRate = dailyRetentions.length > 0 ?
      dailyRetentions.reduce((sum, val) => sum + val, 0) / dailyRetentions.length : 0;

    return {
      totalSpend,
      totalLeads,
      totalEntries,
      totalExits,
      cplMeta,
      cplLiquido,
      retentionRate
    };
  }, [live?.cached_traffic_data_incremented?.campaignsByDate]);

  // Dados dos grupos para os cards (independente de filtros)
  const groupData = {
    entrou: globalCardData.totalEntries,
    saiu: globalCardData.totalExits,
    ativos: globalCardData.totalEntries - globalCardData.totalExits
  };

  // Usar métricas globais para os cards (independente de filtros)
  const cplLiquido = globalCardData.cplLiquido;
  const cplMeta = globalCardData.cplMeta;
  const retentionRate = globalCardData.retentionRate;
  
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

  // Função para renderizar dados hierárquicos com filtros avançados
  const renderHierarchicalData = () => {
    const rows: JSX.Element[] = [];

    // Verificar se há filtros avançados aplicados
    const hasAdvancedFilters = advancedFilters.selectedCampaigns.size > 0 || 
                              advancedFilters.selectedAdSets.size > 0 || 
                              advancedFilters.selectedCreatives.size > 0;

    campaignsHierarchy.campaigns.forEach(campaign => {
      // Aplicar filtro de campanhas se houver seleção específica
      const shouldShowCampaign = !hasAdvancedFilters || 
                                advancedFilters.selectedCampaigns.size === 0 || 
                                advancedFilters.selectedCampaigns.has(campaign.id);

      if (!shouldShowCampaign) return;

      // Renderizar campanha
      if (levelFilters.campaigns) {
        rows.push(renderHierarchicalRow(campaign, 0, 'campaign'));
      }

      // Renderizar ad sets se campanha estiver expandida
      if (isExpanded(campaign.id) && levelFilters.adSets) {
        campaign.adSets.forEach(adSet => {
          // Aplicar filtro de adsets se houver seleção específica
          const shouldShowAdSet = !hasAdvancedFilters || 
                                 advancedFilters.selectedAdSets.size === 0 || 
                                 advancedFilters.selectedAdSets.has(adSet.id);

          if (!shouldShowAdSet) return;

          const adSetWithCampaign = { ...adSet, campaignName: campaign.name };
          rows.push(renderHierarchicalRow(adSetWithCampaign, 1, 'adSet'));

          // Renderizar insights se ad set estiver expandido
          if (isExpanded(adSet.id) && levelFilters.insights) {
            adSet.insights.forEach(insight => {
              // Aplicar filtro de criativos se houver seleção específica
              const shouldShowCreative = !hasAdvancedFilters || 
                                        advancedFilters.selectedCreatives.size === 0 || 
                                        advancedFilters.selectedCreatives.has(insight.id);

              if (!shouldShowCreative) return;

              rows.push(renderHierarchicalRow(insight, 2, 'insight'));
            });
          }
        });
      }
    });

    return rows;
  };

  // Função para aplicar filtros da tabela de dados diários
  const handleApplyFilters = () => {
    if (!tempStartDate || !tempEndDate) return;
    
    // Simplesmente atualizar as datas para filtrar a visualização
    // Os dados já estão carregados no cache incremental
      setStartDate(tempStartDate);
      setEndDate(tempEndDate);
  };

  // Função para aplicar filtros da análise profunda de campanhas
  const handleApplyCampaignFilters = () => {
    if (!tempCampaignStartDate || !tempCampaignEndDate) return;
    
    // Simplesmente atualizar as datas para filtrar a visualização
    // Os dados já estão carregados no cache incremental
    setCampaignStartDate(tempCampaignStartDate);
    setCampaignEndDate(tempCampaignEndDate);
  };

  // Funções para gerenciar filtros avançados
  const handleAdvancedFilterToggle = useCallback((type: 'campaigns' | 'adSets' | 'creatives', id: string) => {
    console.log('🟣 [Modal] handleAdvancedFilterToggle chamado:', { type, id });
    setTempAdvancedFilters(prev => {
      const newFilters = { ...prev };
      const selectedSet = new Set(prev[type === 'campaigns' ? 'selectedCampaigns' : type === 'adSets' ? 'selectedAdSets' : 'selectedCreatives']);
      
      if (selectedSet.has(id)) {
        selectedSet.delete(id);
      } else {
        selectedSet.add(id);
      }
      
      if (type === 'campaigns') {
        newFilters.selectedCampaigns = selectedSet;
      } else if (type === 'adSets') {
        newFilters.selectedAdSets = selectedSet;
      } else {
        newFilters.selectedCreatives = selectedSet;
      }
      
      return newFilters;
    });
  }, []);

  const handleApplyAdvancedFilters = useCallback(() => {
    console.log('🟢 [Modal] Aplicando filtros avançados');
    // Aplicar filtros temporários para os filtros reais
    setAdvancedFilters(tempAdvancedFilters);
    
    // Fechar modal
    setIsAdvancedFiltersOpen(false);
    
    // Atualizar datas das campanhas com as datas do modal
    setCampaignStartDate(tempAdvancedFilters.startDate);
    setCampaignEndDate(tempAdvancedFilters.endDate);
  }, [tempAdvancedFilters]);

  const clearAdvancedFilters = useCallback(() => {
    console.log('🟢 [Modal] Limpando filtros avançados');
    const emptyFilters = {
      startDate: '',
      endDate: '',
      selectedCampaigns: new Set(),
      selectedAdSets: new Set(),
      selectedCreatives: new Set()
    };
    setAdvancedFilters(emptyFilters);
    setTempAdvancedFilters(emptyFilters);
  }, []);

  // Componente do Modal de Filtros Avançados
  const AdvancedFiltersModal = () => (
    <>
      <Button 
        onClick={() => {
          console.log('🔵 [Modal] Botão clicado - abrindo modal');
          // Sincronizar estado temporário com o estado atual
          setTempAdvancedFilters(advancedFilters);
          setIsAdvancedFiltersOpen(true);
        }}
        className="flex items-center gap-2"
      >
        <Settings className="h-4 w-4" />
        Filtros Avançados
      </Button>
      
      <Dialog open={isAdvancedFiltersOpen} onOpenChange={setIsAdvancedFiltersOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>🎯 Filtros Avançados de Campanhas</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Filtros de Data */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Data início:</label>
              <Input 
                type="date" 
                className="w-auto" 
                value={tempAdvancedFilters.startDate}
                onChange={e => {
                  console.log('🟢 [Modal] Data início alterada:', e.target.value);
                  e.stopPropagation();
                  setTempAdvancedFilters(prev => ({ ...prev, startDate: e.target.value }));
                }}
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Data fim:</label>
              <Input 
                type="date" 
                className="w-auto" 
                value={tempAdvancedFilters.endDate}
                onChange={e => {
                  console.log('🟢 [Modal] Data fim alterada:', e.target.value);
                  e.stopPropagation();
                  setTempAdvancedFilters(prev => ({ ...prev, endDate: e.target.value }));
                }}
              />
            </div>
          </div>

          {/* Três Colunas de Filtros */}
          <div className="grid grid-cols-3 gap-6">
            {/* Coluna 1: Campanhas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">📊 Campanhas</h3>
                <span className="text-sm text-gray-500">
                  {tempAdvancedFilters.selectedCampaigns.size} / {availableItems.campaigns.length}
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto border rounded p-3 space-y-2">
                {availableItems.campaigns.map(campaign => (
                  <label key={campaign.id} className="flex items-start space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={tempAdvancedFilters.selectedCampaigns.has(campaign.id)}
                      onChange={(e) => {
                        console.log('🟢 [Modal] Checkbox campanha clicado:', campaign.name);
                        e.stopPropagation();
                        handleAdvancedFilterToggle('campaigns', campaign.id);
                      }}
                      className="mt-1 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" title={campaign.name}>
                        {campaign.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {campaign.leads} leads • R$ {campaign.spend.toFixed(2)}
                      </div>
                    </div>
                  </label>
                ))}
                {availableItems.campaigns.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-4">
                    Nenhuma campanha encontrada
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 2: Conjuntos de Anúncios */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">🎯 Conjuntos de Anúncios</h3>
                <span className="text-sm text-gray-500">
                  {tempAdvancedFilters.selectedAdSets.size} / {availableItems.adSets.length}
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto border rounded p-3 space-y-2">
                {availableItems.adSets.map(adSet => (
                  <label key={adSet.id} className="flex items-start space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={tempAdvancedFilters.selectedAdSets.has(adSet.id)}
                      onChange={(e) => {
                        console.log('🟢 [Modal] Checkbox adset clicado:', adSet.name);
                        e.stopPropagation();
                        handleAdvancedFilterToggle('adSets', adSet.id);
                      }}
                      className="mt-1 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" title={adSet.name}>
                        {adSet.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate" title={adSet.campaignName}>
                        {adSet.campaignName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {adSet.leads} leads • R$ {adSet.spend.toFixed(2)}
                      </div>
                    </div>
                  </label>
                ))}
                {availableItems.adSets.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-4">
                    Nenhum conjunto encontrado
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 3: Criativos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">🎨 Criativos</h3>
                <span className="text-sm text-gray-500">
                  {tempAdvancedFilters.selectedCreatives.size} / {availableItems.creatives.length}
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto border rounded p-3 space-y-2">
                {availableItems.creatives.map(creative => (
                  <label key={creative.id} className="flex items-start space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={tempAdvancedFilters.selectedCreatives.has(creative.id)}
                      onChange={(e) => {
                        console.log('🟢 [Modal] Checkbox criativo clicado:', creative.name);
                        e.stopPropagation();
                        handleAdvancedFilterToggle('creatives', creative.id);
                      }}
                      className="mt-1 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" title={creative.name}>
                        {creative.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate" title={creative.adsetName}>
                        {creative.adsetName}
                      </div>
                      <div className="text-xs text-gray-500 truncate" title={creative.campaignName}>
                        {creative.campaignName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {creative.leads} leads • R$ {creative.spend.toFixed(2)}
                      </div>
                    </div>
                  </label>
                ))}
                {availableItems.creatives.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-4">
                    Nenhum criativo encontrado
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={clearAdvancedFilters} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Limpar Filtros
            </Button>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => setIsAdvancedFiltersOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleApplyAdvancedFilters} className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </div>
        </DialogContent>
      </Dialog>
    </>
  );
  
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

        {/* Análise Profunda de Campanhas */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>🏆 Análise Profunda de Campanhas</CardTitle>
              <CardDescription>
                Análise detalhada com filtros granulares por campanhas, adsets e criativos
              </CardDescription>
            </div>
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              {/* Filtros de Status dos Filtros Avançados */}
              {(advancedFilters.selectedCampaigns.size > 0 || advancedFilters.selectedAdSets.size > 0 || advancedFilters.selectedCreatives.size > 0) && (
                <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  Filtros ativos: {[
                    advancedFilters.selectedCampaigns.size > 0 && `${advancedFilters.selectedCampaigns.size} campanhas`,
                    advancedFilters.selectedAdSets.size > 0 && `${advancedFilters.selectedAdSets.size} adsets`,
                    advancedFilters.selectedCreatives.size > 0 && `${advancedFilters.selectedCreatives.size} criativos`
                  ].filter(Boolean).join(', ')}
              </div>
              )}
              
              {/* Modal de Filtros Avançados */}
              <AdvancedFiltersModal />
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
