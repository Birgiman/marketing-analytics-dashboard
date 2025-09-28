import Header from "@/components/Header";
import { MetricCard } from "@/components/MetricCard";
import { ScreenNavigatorLives } from "@/components/ScreenNavigatorLives";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { PublicAudience, PublicAudienceCorrelation } from "@/types/audience";
import { LiveGroup as LiveGroupType } from "@/types/live";
import {
  createPublicAudience,
  deletePublicAudience,
  fetchPublicAudiences,
  generateAudienceCorrelation
} from "@/utils/audienceService";
// Funções antigas removidas - agora usando Edge Function syncLiveMetaData
import { MetaCampaign } from '@/utils/metaApi';
import { fetchMetaCampaignsForLive } from '@/utils/metaCampaignsService';
// Public cache removed - functionality integrated into other services
import { getWhatsAppGroupsLogData } from "@/utils/whatsappGroupsLog";
import EmojiPicker from 'emoji-picker-react';
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, Database, Plus, Search, ShoppingCart, Target, Trash2, Upload, UserMinus, UserPlus, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

// These interfaces are no longer used as we now use LiveGroup from types

interface SalesData {
  id: number;
  dataHora: string;
  telefone: string;
  nome: string;
  valor: number;
}

const SalesByGroup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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

  // Estados para dados da Live
  const [live, setLive] = useState<{
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
    last_synced_at?: string;
    cached_traffic_data_incremented?: any;
  } | null>(null);
  const [groups, setGroups] = useState<LiveGroupType[]>([]);
  const [campaigns, setCampaigns] = useState<{
    id: string;
    campaign_id: string;
    campaign_name: string;
    account_id?: string;
    account_name?: string;
    objective?: string;
    status: string;
    daily_budget?: number;
    lifetime_budget?: number;
  }[]>([]);
  const [metrics, setMetrics] = useState<{
    cplLiquido: number;
    cplMeta: number;
    retentionRate: number;
    cplLiquidoPlanejamento: number;
  } | null>(null);

  const [extractedData, setExtractedData] = useState<{
    metaData: {
      totalSpend: number;
      totalResults: number;
      campaignCount: number;
    };
    groupData: {
      totalGroups: number;
      totalMembers: number;
      entries: number;
      exits: number;
      activeMembers: number;
    };
  } | null>(null);

  // Estado para integração Meta
  const [metaIntegration, setMetaIntegration] = useState<{
    account_id: string;
    access_token: string;
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [publicoFilter, setPublicoFilter] = useState("all");
  const [sortField, setSortField] = useState<string | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [isButtonRefreshing, setIsButtonRefreshing] = useState(false);

  // Monitorar mudanças no estado cacheStatus.isLoading
  useEffect(() => {
  }, [cacheStatus.isLoading]);

  // Monitorar mudanças no estado isLoading
  useEffect(() => {
  }, [isLoading]);

  // Monitorar mudanças no estado isButtonRefreshing

  // Data states for Live-specific groups
  const [liveGroups, setLiveGroups] = useState<LiveGroupType[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Loading state for correlations
  const [isLoadingCorrelations, setIsLoadingCorrelations] = useState(false);
  
  // Sales data upload
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Public Audiences state
  const [publicAudiences, setPublicAudiences] = useState<PublicAudience[]>([]);
  const [audienceCorrelations, setAudienceCorrelations] = useState<PublicAudienceCorrelation[]>([]);
  const [newAudience, setNewAudience] = useState({
    title: "",
    campaign_term: "",
    emoji: ""
  });
  const [isCreatingAudience, setIsCreatingAudience] = useState(false);

  // Meta campaigns for dropdown
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

  // WhatsApp groups for dropdown
  const [whatsappGroups, setWhatsappGroups] = useState<LiveGroupType[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // Processed groups data state
  const [processedGroups, setProcessedGroups] = useState<{
    id: number;
    name: string;
    campaign: string;
    entered: number;
    left: number;
    active: number;
    sales: number;
    revenue: number;
    averageTicket: number;
  }[]>([]);

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearchTerm, setEmojiSearchTerm] = useState("");

  // Função para carregar dados do banco
  const loadDataFromDatabase = useCallback(async (isFromButton = false) => {
    if (!liveId) return;
    try {
      // Obter userId da sessão se não estiver definido
      if (!userId) {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
        } else {
          navigate('/auth/signin');
          return;
        }
      }
      // Buscar dados básicos da Live diretamente do Supabase
      const { data: liveData, error } = await supabase
        .from('lives')
        .select('*')
        .eq('id', liveId)
        .single();

      if (error || !liveData) {
        console.error('[SalesByGroup] Erro ao buscar Live:', error);
        return;
      }
      
      if (liveData) {
        // Atualizar dados básicos da Live incluindo cached_traffic_data_incremented
        setLive({
          id: liveData.id,
          name: liveData.name,
          user_id: liveData.user_id,
          live_date: liveData.live_date,
          insights_date_since: liveData.insights_date_since,
          insights_date_until: liveData.insights_date_until,
          campaign_search_term: liveData.campaign_search_term,
          ad_budget: parseFloat(liveData.ad_budget),
          sales_goal: liveData.sales_goal,
          leads_goal: liveData.leads_goal,
          created_at: liveData.created_at,
          updated_at: liveData.updated_at,
          last_synced_at: liveData.last_synced_at,
          cached_traffic_data_incremented: liveData.cached_traffic_data_incremented
        });
        
        // Extrair dados do cache JSONB
        if (liveData.cached_metrics) {
          const cachedMetrics = liveData.cached_metrics;
          setMetrics({
            cplMeta: cachedMetrics.cplMeta || 0,
            cplLiquido: cachedMetrics.cplLiquido || 0,
            retentionRate: cachedMetrics.retentionRate || 0,
            cplLiquidoPlanejamento: cachedMetrics.cplLiquidoPlanejamento || 0
          });
        }
        
        if (liveData.cached_group_data) {
          const cachedGroupData = liveData.cached_group_data;
          if (liveData.cached_meta_data) {
            const cachedMetaData = liveData.cached_meta_data;
            setExtractedData({
              metaData: {
                totalSpend: cachedMetaData.totalSpend || 0,
                totalResults: cachedMetaData.totalResults || 0,
                campaignCount: cachedMetaData.campaignCount || 0
              },
              groupData: {
                totalGroups: cachedGroupData.totalGroups || 0,
                totalMembers: cachedGroupData.totalMembers || 0,
                entries: cachedGroupData.entries || 0,
                exits: cachedGroupData.exits || 0,
                activeMembers: cachedGroupData.activeMembers || 0
              }
            });
          }
        }
        // Carregar dados complementares após carregar dados básicos
        await fetchMetaIntegration();
        await fetchMetaCampaignsData();
        await fetchWhatsappGroupsData();
        await fetchPublicAudiencesData();
        // NÃO definir setIsLoading(false) aqui - será definido pela tabela de correlações
        
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
  }, [liveId, userId]);


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
      console.error(`❌ [SalesByGroup] Erro ao verificar cache:`, error);
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
      console.error(`❌ [SalesByGroup] Erro ao chamar Edge Function:`, error);
      throw error;
    }
  }, [isCacheValid]);

  // Função para iniciar o refresh (chamada pelo botão)
  const handleRefreshStart = async () => {
    setIsButtonRefreshing(true);
    try {
      // Chamar Edge Function para forçar sincronização (ignorar cache)
      try {
        await syncLiveMetaData(liveId!, true); // true = forçar refresh
      } catch (edgeError) {
        console.warn(`⚠️ [SalesByGroup] Edge Function falhou no refresh, continuando:`, edgeError);
        // Não interromper o fluxo se a Edge Function falhar
      }

      // Recarregar dados do cache atualizado
      await loadDataFromDatabase(true);
    } catch (error) {
      console.error('❌ [SalesByGroup] Erro ao atualizar dados:', error);
    } finally {
      setIsButtonRefreshing(false);
    }
  };

  // Buscar integração Meta
  const fetchMetaIntegration = async () => {
    if (!userId) {
      return;
    }

    try {
      const { data: metaIntegrationData, error } = await supabase
        .from('meta_integrations')
        .select('access_token')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !metaIntegrationData?.access_token) {
        return;
      }
      // Buscar account_id das campanhas da Live
      const { data: liveCampaigns } = await supabase
        .from('live_campaigns')
        .select('account_id')
        .eq('live_id', liveId)
        .limit(1);

      if (liveCampaigns && liveCampaigns.length > 0) {
        const integration = {
          account_id: liveCampaigns[0].account_id || '',
          access_token: metaIntegrationData.access_token
        };
        setMetaIntegration(integration);
      } else {
      }
    } catch (error) {
    }
  };

  // Buscar públicos da Live
  const fetchPublicAudiencesData = async () => {
    if (!liveId) {
      return;
    }

    try {
      const audiences = await fetchPublicAudiences(liveId);
      setPublicAudiences(audiences);
      
      // Gerar correlações para cada público
      if (audiences.length > 0 && metaIntegration) {
        await generateAllCorrelations(audiences);
      } else {
      }
    } catch (error) {
    }
  };

  // Gerar correlações para todos os públicos
  const generateAllCorrelations = useCallback(async (audiences: PublicAudience[]) => {
    if (!metaIntegration?.account_id || !metaIntegration?.access_token) {
      return;
    }

    try {
      const correlations = await Promise.all(
        audiences.map(audience => 
          generateAudienceCorrelation(
            audience,
            metaIntegration!.account_id,
            metaIntegration!.access_token,
            {
              since: live?.insights_date_since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              until: live?.insights_date_until || new Date().toISOString().split('T')[0]
            }
          )
        )
      );
      setAudienceCorrelations(correlations);
    } catch (error) {
    } finally {
      setIsLoadingCorrelations(false);
      // Definir isLoading como false quando as correlações terminarem
      setIsLoading(false);
    }
  }, [metaIntegration, live]);

  // Buscar campanhas do Meta para dropdown
  const fetchMetaCampaignsData = async () => {
    if (!liveId || !userId) {
      return;
    }
    setIsLoadingCampaigns(true);
    
    try {
      // Primeiro, tentar buscar campanhas já vinculadas à Live
      const { data: liveCampaigns, error: liveCampaignsError } = await supabase
        .from('live_campaigns')
        .select('campaign_id, campaign_name')
        .eq('live_id', liveId);
      if (liveCampaignsError) {
      }

      if (liveCampaigns && liveCampaigns.length > 0) {
        // Usar campanhas já vinculadas
        const campaigns = liveCampaigns.map(campaign => ({
          id: campaign.campaign_id,
          name: campaign.campaign_name,
          status: 'ACTIVE', // Valor padrão
          objective: 'LEAD_GENERATION', // Valor padrão
          created_time: new Date().toISOString(),
          updated_time: new Date().toISOString()
        }));
        setMetaCampaigns(campaigns);
      } else {
        // Se não há campanhas vinculadas, buscar do Meta usando o termo de busca
        try {
          const campaigns = await fetchMetaCampaignsForLive(liveId, userId);
          setMetaCampaigns(campaigns.map(campaign => ({
            id: campaign.id,
            name: campaign.name,
            status: 'ACTIVE', // Valor padrão
            objective: 'LEAD_GENERATION', // Valor padrão
            created_time: new Date().toISOString(),
            updated_time: new Date().toISOString()
          })));
        } catch (metaError) {
          setMetaCampaigns([]);
        }
      }
    } catch (error) {
      setMetaCampaigns([]);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  // Buscar grupos do WhatsApp para dropdown
  const fetchWhatsappGroupsData = async () => {
    if (!liveId) return;

    setIsLoadingGroups(true);
    try {
      // Buscar grupos diretamente do Supabase
      const { data: groupsResult, error: groupsError } = await supabase
        .from('live_groups')
        .select('*')
        .eq('live_id', liveId)
        .order('created_at', { ascending: false });

      if (groupsError) {
        setWhatsappGroups([]);
        setLiveGroups([]);
      } else {
        const groups = groupsResult || [];
        // Atualizar ambos os estados
        setWhatsappGroups(groups);
        setLiveGroups(groups);
      }
    } catch (error) {
      setWhatsappGroups([]);
      setLiveGroups([]);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // Estado para controlar se já foi inicializado
  const [isInitialized, setIsInitialized] = useState(false);

  // Carregar dados na inicialização
  useEffect(() => {
    if (!liveId || isInitialized) return;

    const initializeData = async () => {
      try {
        setIsLoading(true);

        // Chamar Edge Function para sincronizar dados do Meta (com verificação de cache)
        try {
          await syncLiveMetaData(liveId, false); // false = não forçar refresh
        } catch (edgeError) {
          console.warn(`⚠️ [SalesByGroup] Edge Function falhou, continuando com dados do cache:`, edgeError);
          // Não interromper o fluxo se a Edge Function falhar
        }

        // Carregar dados do cache atualizado
        await loadDataFromDatabase(false);

        setIsInitialized(true);

      } catch (error) {
        console.error('❌ [SalesByGroup] Erro ao inicializar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [liveId, isInitialized, syncLiveMetaData, loadDataFromDatabase]);

  // Função para atualizar dados dos grupos com informações reais do WhatsApp Groups Log
  const updateGroupsWithRealData = useCallback(async () => {
    if (!live?.insights_date_since || !live?.insights_date_until || !userId) {
      return;
    }

    try {
      const groupIds = liveGroups.map(group => group.group_id);
      const groupLogData = await getWhatsAppGroupsLogData(
        groupIds,
        live.insights_date_since,
        live.insights_date_until,
        userId
      );
      // Atualizar dados dos grupos com informações reais
      setProcessedGroups(prevGroups => 
        prevGroups.map((group) => {
          const realData = groupLogData.groupsData.find(g => g.id_grupo === liveGroups[group.id - 1]?.group_id);
          
          // Encontrar a correlação de público para este grupo
          const groupCorrelation = audienceCorrelations.find(correlation => 
            correlation.groups.some(g => g.name === liveGroups[group.id - 1]?.group_name)
          );
          
          if (realData) {
            return {
              ...group,
              campaign: groupCorrelation?.title || "N/A", // Atualizar com nome do público
              entered: realData.entries,
              left: realData.exits,
              active: realData.activeMembers
            };
          }
          
          // Mesmo sem dados reais, atualizar a correlação
          return {
            ...group,
            campaign: groupCorrelation?.title || "N/A"
          };
        })
      );

    } catch (error) {
    }
  }, [live, userId, liveGroups, audienceCorrelations]);

  // Atualizar grupos quando cache mudar
  // useEffect(() => {
  //   if (groups && groups.length > 0) {
  //     setLiveGroups(groups);
  //   }
  // }, [groups]);

  // Update groups with real data when liveData is available
  // useEffect(() => {
  //   if (live && liveGroups.length > 0) {
  //     updateGroupsWithRealData();
  //   }
  // }, [live, liveGroups, updateGroupsWithRealData]);

  // Update groups data when correlations change
  // useEffect(() => {
  //   if (audienceCorrelations.length > 0 && liveGroups.length > 0) {
  //     updateGroupsWithRealData();
  //   }
  // }, [audienceCorrelations, liveGroups.length, updateGroupsWithRealData]);

  // Função para detectar e processar emoji colado
  const handleEmojiPaste = useCallback((event: ClipboardEvent) => {
    const pastedText = event.clipboardData?.getData('text');
    if (pastedText && isEmoji(pastedText)) {
      event.preventDefault();
      setNewAudience(prev => ({ ...prev, emoji: pastedText }));
      setShowEmojiPicker(false);
    }
  }, []);

  // Função para verificar se o texto é um emoji
  const isEmoji = (text: string): boolean => {
    // Verificação simples: se o texto tem apenas 1-2 caracteres e não é alfanumérico
    if (text.length <= 2 && text.length > 0) {
      // Verificar se contém caracteres Unicode de emoji
      const codePoint = text.codePointAt(0);
      if (codePoint) {
        // Ranges comuns de emojis
        return (
          (codePoint >= 0x1F600 && codePoint <= 0x1F64F) || // Emoticons
          (codePoint >= 0x1F300 && codePoint <= 0x1F5FF) || // Misc Symbols
          (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) || // Transport
          (codePoint >= 0x1F1E0 && codePoint <= 0x1F1FF) || // Regional indicators
          (codePoint >= 0x2600 && codePoint <= 0x26FF) ||   // Misc symbols
          (codePoint >= 0x2700 && codePoint <= 0x27BF)      // Dingbats
        );
      }
    }
    return false;
  };

  // Fechar emoji picker ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker) {
        const target = event.target as HTMLElement;
        if (!target.closest('.emoji-picker-container')) {
          setShowEmojiPicker(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // Adicionar listener para paste quando emoji picker estiver aberto
  useEffect(() => {
    if (showEmojiPicker) {
      document.addEventListener('paste', handleEmojiPaste);
      return () => document.removeEventListener('paste', handleEmojiPaste);
    }
  }, [showEmojiPicker, handleEmojiPaste]);

  // Gerar correlações quando metaIntegration estiver disponível
  useEffect(() => {
    // Gerar correlações se temos integração Meta e públicos, mas não temos correlações
    if (metaIntegration && publicAudiences.length > 0 && audienceCorrelations.length === 0) {
      setIsLoadingCorrelations(true);
      generateAllCorrelations(publicAudiences);
    } else if (metaIntegration && publicAudiences.length === 0) {
      // Se não há públicos para gerar correlações, definir loading como false
      setIsLoading(false);
    }
  }, [metaIntegration, publicAudiences, audienceCorrelations.length, generateAllCorrelations]);

  // Calcular dados como fallback usando lógica do TrafficAnalysis
  const calculateFallbackData = () => {
    if (!live?.cached_traffic_data_incremented?.campaignsByDate) {
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

    const campaignsByDate = live.cached_traffic_data_incremented.campaignsByDate;
    let totalSpend = 0;
    let totalLeads = 0;
    let totalEntries = 0;
    let totalExits = 0;
    const dailyRetentions: number[] = [];

    // Processar todos os dados diários (mesma lógica do TrafficAnalysis)
    Object.values(campaignsByDate).forEach((dayCampaigns: any) => {
      if (Array.isArray(dayCampaigns) && dayCampaigns.length > 0) {
        // Agregar dados do dia para evitar duplicação
        const dayTotal = dayCampaigns.reduce((acc: { spend: number; leads: number }, campaign: any) => {
          acc.spend += campaign.spend || 0;
          acc.leads += campaign.leads || 0;
          return acc;
        }, { spend: 0, leads: 0 });

        totalSpend += dayTotal.spend;
        totalLeads += dayTotal.leads;

        // Dados do WhatsApp (no primeiro campaign do dia)
        const dayGroupJoin = dayCampaigns[0]?.whatsapp_joins || 0;
        const dayGroupExit = dayCampaigns[0]?.whatsapp_exits || 0;

        totalEntries += dayGroupJoin;
        totalExits += dayGroupExit;

        // Calcular taxa de retenção do dia (mesma fórmula do TrafficAnalysis)
        const dayRetention = dayTotal.leads > 0 ? Math.round((dayGroupJoin / dayTotal.leads) * 100) : 0;
        if (dayRetention > 0) {
          dailyRetentions.push(dayRetention);
        }
      }
    });

    const cplMeta = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const cplLiquido = totalEntries > 0 ? totalSpend / totalEntries : 0;
    // Taxa de retenção como média das retenções diárias (igual TrafficAnalysis)
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
  };

  const fallbackData = calculateFallbackData();

  // Calculate statistics from Live groups
  const totalGroupMembers = liveGroups.reduce((sum, group) => sum + group.group_size, 0);
  const totalGroups = liveGroups.length;

  // Convert Live groups to table display format

  const processedGroupsData = liveGroups.map((group, index) => {
    // Encontrar a correlação de público para este grupo
    const groupCorrelation = audienceCorrelations.find(correlation => 
      correlation.groups.some(g => g.name === group.group_name)
    );
    
    return {
      id: index + 1,
      name: group.group_name,
      campaign: groupCorrelation?.title || "N/A", // Usar o nome do público da correlação
      entered: group.group_size,
      left: 0, // Será atualizado com dados reais se disponível
      active: group.group_size,
      sales: 0, // TODO: Implement sales tracking per group
      revenue: 0, // TODO: Implement revenue tracking per group
      averageTicket: 0 // Will be calculated when sales data is available
    };
  });

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

  const filteredAndSortedData = processedGroupsData.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPublico = publicoFilter === "all" || audienceCorrelations.some(correlation => correlation.title.toLowerCase() === publicoFilter.toLowerCase() && correlation.groups.some(g => g.name === group.name));
    return matchesSearch && matchesPublico;
  }).sort((a, b) => {
    if (!sortField) return 0;
    let aValue = a[sortField as keyof typeof a];
    let bValue = b[sortField as keyof typeof b];
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Functions for audience management
  const addAudience = async () => {
    if (!newAudience.title || !newAudience.campaign_term || !newAudience.emoji || !liveId) {
      return;
    }

    setIsCreatingAudience(true);
    try {
      const createdAudience = await createPublicAudience(liveId, {
        title: newAudience.title,
        campaign_term: newAudience.campaign_term.replace(/\s+/g, ''),
        emoji: newAudience.emoji
      });

      setPublicAudiences(prev => [createdAudience, ...prev]);
      setNewAudience({ title: "", campaign_term: "", emoji: "" });

      // Gerar correlação para o novo público
      if (metaIntegration) {
        const correlation = await generateAudienceCorrelation(
          createdAudience,
          metaIntegration.account_id,
          metaIntegration.access_token,
          {
            since: live?.insights_date_since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            until: live?.insights_date_until || new Date().toISOString().split('T')[0]
          }
        );
        setAudienceCorrelations(prev => [correlation, ...prev]);
      }
    } catch (error) {
    } finally {
      setIsCreatingAudience(false);
    }
  };

  const removeAudience = async (audienceId: string) => {
    try {
      await deletePublicAudience(audienceId);
      setPublicAudiences(prev => prev.filter(a => a.id !== audienceId));
      setAudienceCorrelations(prev => prev.filter(c => c.id !== audienceId));
    } catch (error) {
    }
  };

  // Generate correlation data from audience correlations
  const correlationData = audienceCorrelations.map(correlation => {
    // Extrair apenas a parte específica do termo de campanha
    const searchTerm = live?.campaign_search_term || '';
    const campaignTermDisplay = correlation.campaign_term.replace(searchTerm, '').replace(/^_+/, '') || correlation.campaign_term;
    
    return {
      id: correlation.id,
      audienceName: correlation.title,
      campaignTerm: correlation.campaign_term,
      campaignTermDisplay,
      groupEmoji: correlation.emoji,
      trafficLeads: extractedData?.metaData?.totalResults || 0,
      trafficInvestment: extractedData?.metaData?.totalSpend || 0,
      trafficCPL: metrics?.cplMeta || 0,
      trafficCPLLiquido: metrics?.cplLiquido || 0,
      groupEntradas: extractedData?.groupData?.entries || 0,
      groupSaidas: extractedData?.groupData?.exits || 0,
      groupAtivos: extractedData?.groupData?.activeMembers || 0
    };
  });

  // Sales upload functionality
  const handleSalesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus("Processando arquivo...");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          setUploadStatus("Erro: Arquivo deve ter pelo menos 2 linhas (header + dados)");
          return;
        }

        const [header, ...dataLines] = lines;
        const expectedColumns = ['DATA_HORA', 'TELEFONE', 'NOME', 'VALOR'];
        const headerColumns = header.split(',').map(col => col.trim().toUpperCase());

        const missingColumns = expectedColumns.filter(col => !headerColumns.includes(col));
        if (missingColumns.length > 0) {
          setUploadStatus(`Erro: Colunas obrigatórias ausentes: ${missingColumns.join(', ')}`);
          return;
        }

        const processedData = dataLines.map((line, index) => {
          const values = line.split(',').map(val => val.trim());
          if (values.length !== headerColumns.length) {
            throw new Error(`Linha ${index + 2}: número de colunas não confere`);
          }

          const dataIndex = headerColumns.indexOf('DATA_HORA');
          const phoneIndex = headerColumns.indexOf('TELEFONE');
          const nameIndex = headerColumns.indexOf('NOME');
          const valueIndex = headerColumns.indexOf('VALOR');

          return {
            id: index + 1,
            dataHora: values[dataIndex],
            telefone: values[phoneIndex],
            nome: values[nameIndex],
            valor: parseFloat(values[valueIndex].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
          };
        });

        setSalesData(processedData);
        setUploadStatus(`✅ ${processedData.length} vendas importadas com sucesso!`);
        setTimeout(() => setUploadStatus(""), 3000);
      } catch (error) {
        setUploadStatus(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    };
    reader.readAsText(file);
  };

  const clearSalesData = () => {
    setSalesData([]);
    setUploadStatus("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Calculate subtotals
  const subtotals = filteredAndSortedData.reduce((acc, group) => {
    acc.entered += group.entered;
    acc.left += group.left;
    acc.active += group.active;
    acc.sales += group.sales;
    acc.revenue += group.revenue;
    return acc;
  }, {
    entered: 0,
    left: 0,
    active: 0,
    sales: 0,
    revenue: 0
  });

  const averageTicketTotal = subtotals.sales > 0 ? subtotals.revenue / subtotals.sales : 0;

  if (isLoading || cacheStatus.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl">Carregando públicos da live...</div>
          <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin border-2 border-blue-600 border-t-transparent rounded-full"></div>
            Buscando dados do Meta Ads...
          </div>
        </div>
      </div>
    );
  }

  // Debug info
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
        {(cacheStatus.isLoading || isButtonRefreshing || isLoading) && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-xl font-semibold">
                {isLoadingCorrelations ? 'Carregando correlações de públicos...' : 'Carregando dados...'}
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin border-2 border-blue-600 border-t-transparent rounded-full"></div>
                {isLoadingCorrelations ? 'Gerando correlações...' : 'Buscando dados do Meta Ads...'}
              </div>
            </div>
          </div>
        )}

        {/* Overview Geral */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <MetricCard
            title="Entrou no Grupo"
            value={fallbackData.totalEntries}
            icon={UserPlus}
            type="integer"
            isLoading={isLoading || cacheStatus.isLoading}
          />

          <MetricCard
            title="Saiu do Grupo"
            value={fallbackData.totalExits}
            icon={UserMinus}
            type="integer"
            isLoading={isLoading || cacheStatus.isLoading}
          />

          <MetricCard
            title="Leads Ativos"
            value={fallbackData.totalEntries - fallbackData.totalExits}
            icon={Users}
            type="integer"
            isLoading={isLoading || cacheStatus.isLoading}
          />

          <MetricCard
            title="Vendas"
            value={salesData.length || subtotals.sales}
            icon={ShoppingCart}
            type="integer"
            isLoading={isLoading || cacheStatus.isLoading}
          />

          <MetricCard
            title="Ticket Médio"
            value={salesData.length > 0 
              ? Math.round(salesData.reduce((acc, sale) => acc + sale.valor, 0) / salesData.length)
              : Math.round(averageTicketTotal)
            }
            icon={Target}
            type="currency"
            isLoading={isLoading || cacheStatus.isLoading}
          />
        </div>

        {/* Tabela Unificada de Públicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Correlação de Públicos
            </CardTitle>
            <CardDescription>
              Configure públicos e visualize a correlação entre campanhas de tráfego e grupos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Público</th>
                    <th className="text-left p-3 font-medium">Termo Campanha</th>
                    <th className="text-center p-3 font-medium">Emoji Grupo</th>
                    <th className="text-center p-3 font-medium">Leads Tráfego</th>
                    <th className="text-center p-3 font-medium">Investimento</th>
                    <th className="text-center p-3 font-medium">CPL Meta</th>
                    <th className="text-center p-3 font-medium">CPL Líquido</th>
                    <th className="text-center p-3 font-medium">Entrou Grupo</th>
                    <th className="text-center p-3 font-medium">Saiu Grupo</th>
                    <th className="text-center p-3 font-medium">Ativos Grupo</th>
                    <th className="text-center p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {correlationData.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <Badge variant="secondary">{row.audienceName}</Badge>
                      </td>
                      <td className="p-3 text-sm">
                        <code className="bg-muted px-2 py-1 rounded block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap" title={row.campaignTerm}>
                          {row.campaignTermDisplay}
                        </code>
                      </td>
                      <td className="p-3 text-center text-lg">
                        {row.groupEmoji}
                      </td>
                      <td className="p-3 text-center font-medium">
                        {row.trafficLeads.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-medium">
                        R$ {row.trafficInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center font-medium">
                        R$ {(Math.floor(row.trafficCPL * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center font-medium">
                        R$ {(Math.floor(row.trafficCPLLiquido * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center font-medium text-green-600">
                        {row.groupEntradas.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-medium text-red-600">
                        {row.groupSaidas.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-medium text-blue-600">
                        {row.groupAtivos.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar o público <strong>"{row.audienceName}"</strong>?
                                <br />
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeAudience(row.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                  {/* Add new audience row */}
                  <tr className="border-b bg-muted/30">
                    <td className={`p-3 ${showEmojiPicker ? 'align-top' : 'align-middle'}`}>
                      <Input
                        placeholder="Nome do público"
                        value={newAudience.title}
                        onChange={(e) => setNewAudience({ ...newAudience, title: e.target.value })}
                        className="h-8"
                        disabled={isCreatingAudience}
                      />
                    </td>
                    <td className={`p-3 ${showEmojiPicker ? 'align-top' : 'align-middle'}`}>
                      <Select
                        value={newAudience.campaign_term}
                        onValueChange={(value) => setNewAudience({ ...newAudience, campaign_term: value })}
                        disabled={isCreatingAudience || isLoadingCampaigns}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder={isLoadingCampaigns ? "Carregando..." : "Selecionar campanha"} />
                        </SelectTrigger>
                        <SelectContent>
                          {metaCampaigns.map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.name}>
                              {campaign.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className={`p-3 ${showEmojiPicker ? 'align-top' : 'align-middle'}`}>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={`h-8 flex-1 ${newAudience.emoji ? 'justify-center' : 'justify-start'}`}
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            disabled={isCreatingAudience}
                          >
                            {newAudience.emoji ? (
                              <span className="text-lg">{newAudience.emoji}</span>
                            ) : (
                              <span className="text-muted-foreground">Selecionar emoji</span>
                            )}
                          </Button>
                          {newAudience.emoji && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setNewAudience({ ...newAudience, emoji: "" })}
                              disabled={isCreatingAudience}
                              title="Limpar emoji"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          {!newAudience.emoji && (
                            <Input
                              placeholder="Colar"
                              value={emojiSearchTerm}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEmojiSearchTerm(value);
                                // Se o valor for um emoji, usar diretamente
                                if (isEmoji(value)) {
                                  setNewAudience({ ...newAudience, emoji: value });
                                  setEmojiSearchTerm("");
                                }
                              }}
                              className="h-8 w-16 text-center text-sm text-muted-foreground"
                              disabled={isCreatingAudience}
                              title="Cole um emoji do WhatsApp Web aqui"
                            />
                          )}
                        </div>
                        {showEmojiPicker && (
                          <div className="emoji-picker-container animate-slide-in-top">
                            <EmojiPicker
                              onEmojiClick={(emojiData) => {
                                setNewAudience({ ...newAudience, emoji: emojiData.emoji });
                                setShowEmojiPicker(false);
                              }}
                              searchDisabled={false}
                              skinTonesDisabled={false}
                              width={300}
                              height={400}
                              searchPlaceholder="Pesquisar emojis..."
                              previewConfig={{
                                showPreview: false
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`p-3 text-center text-muted-foreground ${showEmojiPicker ? 'align-top' : 'align-middle'}`}>-</td>
                    <td className={`p-3 text-center text-muted-foreground ${showEmojiPicker ? 'align-top' : 'align-middle'}`}>-</td>
                    <td className={`p-3 text-center text-muted-foreground ${showEmojiPicker ? 'align-top' : 'align-middle'}`}>-</td>
                    <td className={`p-3 text-center text-muted-foreground ${showEmojiPicker ? 'align-top' : 'align-middle'}`}>-</td>
                    <td className={`p-3 text-center text-muted-foreground ${showEmojiPicker ? 'align-top' : 'align-middle'}`}>-</td>
                    <td className={`p-3 text-center text-muted-foreground ${showEmojiPicker ? 'align-top' : 'align-middle'}`}>-</td>
                    <td className={`p-3 text-center text-muted-foreground ${showEmojiPicker ? 'align-top' : 'align-middle'}`}>-</td>
                    <td className={`p-3 text-center ${showEmojiPicker ? 'align-top' : 'align-middle'}`}>
                      <Button 
                        onClick={addAudience} 
                        size="sm" 
                        className="h-8"
                        disabled={isCreatingAudience || !newAudience.title || !newAudience.campaign_term || !newAudience.emoji}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>


        {/* Tabela Principal de Grupos */}
        <Card>
          <CardHeader>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {live ? `Grupos da Live: ${live.name}` : 'Dados por Público'}
                </CardTitle>
                <CardDescription>
                  {live ? `Grupos vinculados à Live "${live.name}"` : 'Visualize e filtre os dados de todos os grupos e campanhas'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros de Busca */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do grupo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={publicoFilter} onValueChange={setPublicoFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por público" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os públicos</SelectItem>
                  {publicAudiences.map(audience => (
                    <SelectItem key={audience.id} value={audience.title}>
                      {audience.emoji} {audience.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('name')}
                        className="h-auto p-0 font-medium flex items-center gap-1"
                      >
                        <div>Grupo</div>
                        {getSortIcon('name')}
                      </Button>
                    </th>
                    <th className="text-left p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('campaign')}
                        className="h-auto p-0 font-medium flex items-center gap-1"
                      >
                        <div>Público</div>
                        {getSortIcon('campaign')}
                      </Button>
                    </th>
                    <th className="text-center p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('entered')}
                        className="h-auto p-0 font-medium flex flex-col items-center gap-1"
                      >
                        <div className="text-center">
                          <div>Entrou no Grupo</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            Total: {subtotals.entered.toLocaleString()}
                          </div>
                        </div>
                        {getSortIcon('entered')}
                      </Button>
                    </th>
                    <th className="text-center p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('left')}
                        className="h-auto p-0 font-medium flex flex-col items-center gap-1"
                      >
                        <div className="text-center">
                          <div>Saiu do Grupo</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            Total: {subtotals.left.toLocaleString()}
                          </div>
                        </div>
                        {getSortIcon('left')}
                      </Button>
                    </th>
                    <th className="text-center p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('active')}
                        className="h-auto p-0 font-medium flex flex-col items-center gap-1"
                      >
                        <div className="text-center">
                          <div>Leads Ativos</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            Total: {subtotals.active.toLocaleString()}
                          </div>
                        </div>
                        {getSortIcon('active')}
                      </Button>
                    </th>
                    <th className="text-center p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('sales')}
                        className="h-auto p-0 font-medium flex flex-col items-center gap-1"
                      >
                        <div className="text-center">
                          <div>Vendas por Grupo</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            Total: {subtotals.sales}
                          </div>
                        </div>
                        {getSortIcon('sales')}
                      </Button>
                    </th>
                    <th className="text-center p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('revenue')}
                        className="h-auto p-0 font-medium flex flex-col items-center gap-1"
                      >
                        <div className="text-center">
                          <div>Faturamento</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            Total: R$ {subtotals.revenue.toLocaleString()}
                          </div>
                        </div>
                        {getSortIcon('revenue')}
                      </Button>
                    </th>
                    <th className="text-center p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('averageTicket')}
                        className="h-auto p-0 font-medium flex flex-col items-center gap-1"
                      >
                        <div className="text-center">
                          <div>Ticket Médio</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            Média: R$ {Math.round(averageTicketTotal)}
                          </div>
                        </div>
                        {getSortIcon('averageTicket')}
                      </Button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedData.map((group) => (
                    <tr key={group.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">
                        <div className="max-w-[300px] overflow-hidden group relative">
                          <div className="whitespace-nowrap overflow-hidden cursor-pointer group-name-tooltip text-right" 
                               title={group.name}
                               style={{ direction: 'rtl', textAlign: 'right' }}>
                            <span className="inline-block" style={{ direction: 'ltr', textAlign: 'right' }}>{group.name}</span>
                          </div>
                          {/* Indicador visual de conteúdo escondido - agora na esquerda */}
                          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{group.campaign || 'N/A'}</Badge>
                      </td>
                      <td className="text-center p-3">{group.entered}</td>
                      <td className="text-center p-3">{group.left}</td>
                      <td className="text-center p-3">{group.active}</td>
                      <td className="text-center p-3">
                        <Badge variant="default">{group.sales} vendas</Badge>
                      </td>
                      <td className="text-center p-3 font-medium">
                        R$ {group.revenue.toLocaleString()}
                      </td>
                      <td className="text-center p-3 font-medium">
                        R$ {group.averageTicket}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredAndSortedData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum grupo encontrado com os filtros aplicados.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção de Upload de Dados de Vendas */}
        <div className="border rounded-lg p-4 bg-muted/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Dados de Vendas</span>
              {salesData.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {salesData.length} vendas
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs flex items-center gap-1"
              >
                <Upload className="h-3 w-3" />
                Importar CSV
              </Button>
              {salesData.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSalesData}
                  className="text-xs"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleSalesUpload}
            className="hidden"
          />

          {uploadStatus && (
            <div
              className={`text-xs mb-2 ${
                uploadStatus.includes('✅')
                  ? 'text-green-600'
                  : uploadStatus.includes('Erro')
                  ? 'text-red-600'
                  : 'text-blue-600'
              }`}
            >
              {uploadStatus}
            </div>
          )}

          {salesData.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Importe um arquivo CSV (DATA_HORA, TELEFONE, NOME, VALOR) para cruzar com os dados dos leads
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Vendas:</span>
                <span className="ml-1 font-medium">{salesData.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="ml-1 font-medium">
                  R$ {salesData.reduce((acc, sale) => acc + sale.valor, 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Ticket Médio:</span>
                <span className="ml-1 font-medium">
                  R$ {(salesData.reduce((acc, sale) => acc + sale.valor, 0) / salesData.length).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesByGroup;