import Header from "@/components/Header";
import { LiveMetricsCards } from "@/components/LiveMetricsCards";
import PerformanceAnalysis from "@/components/PerformanceAnalysis";
import { ScreenNavigatorLives } from "@/components/ScreenNavigatorLives";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { DEMO_MODE } from '@/lib/demo-mode';
import { MOCK_LIVE } from '@/mocks/data';
// Funções antigas removidas - agora usando Edge Function syncLiveMetaData
import { AlertCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
const Details = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const liveId = searchParams.get('live');

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
    cached_metrics?: {
      cplLiquido: number;
      cplMeta: number;
      retentionRate: number;
      cplLiquidoPlanejamento: number;
      totalSpend: number;
      totalLeads: number;
      totalEntries: number;
      totalExits: number;
      totalActiveLeads: number;
    };
    cached_traffic_data?: any;
    cached_traffic_data_incremented?: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isButtonRefreshing, setIsButtonRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Estados para métricas
  const [metrics, setMetrics] = useState<{
    cplLiquido: number;
    cplMeta: number;
    retentionRate: number;
    cplLiquidoPlanejamento: number;
  } | null>(null);
  const [extractedData, setExtractedData] = useState<{
    groupData: {
      totalGroups: number;
      totalMembers: number;
      entries: number;
      exits: number;
      activeMembers: number;
    };
    metaData: {
      campaignCount: number;
      totalSpend: number;
      totalResults: number;
    };
  } | null>(null);

  // Função para verificar se o cache ainda é válido (30 minutos)
  const isCacheValid = useCallback(async (liveId: string): Promise<boolean> => {
    try {
      const { data: liveData, error } = await supabase
        .from('captações')
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
      throw error;
    }
  }, [isCacheValid]);

  // Função para carregar dados do banco
  const loadDataFromDatabase = useCallback(async () => {
    if (!liveId) return;
    try {
      // Se estiver em modo demo, carregar dados mocados
      if (DEMO_MODE && liveId === 'live-1') {
        const liveData = MOCK_LIVE;
        
        // Atualizar dados básicos da Live
        setLive({
          id: liveData.id,
          name: liveData.name,
          user_id: liveData.user_id,
          live_date: liveData.live_date,
          insights_date_since: liveData.insights_date_since,
          insights_date_until: liveData.insights_date_until,
          campaign_search_term: liveData.campaign_search_term,
          ad_budget: liveData.ad_budget,
          sales_goal: liveData.sales_goal,
          leads_goal: liveData.leads_goal,
          created_at: liveData.created_at,
          updated_at: liveData.updated_at,
          cached_metrics: liveData.cached_metrics,
          cached_traffic_data: liveData.cached_meta_data,
          cached_traffic_data_incremented: liveData.cached_traffic_data_incremented
        });

        // Extrair métricas do cache
        if (liveData.cached_metrics) {
          setMetrics({
            cplMeta: liveData.cached_metrics.cplMeta || 0,
            cplLiquido: liveData.cached_metrics.cplLiquido || 0,
            retentionRate: liveData.cached_metrics.retentionRate || 0,
            cplLiquidoPlanejamento: liveData.cached_metrics.cplLiquidoPlanejamento || 0
          });
        }

        // Extrair dados de grupos e meta
        if (liveData.cached_group_data && liveData.cached_meta_data) {
          setExtractedData({
            metaData: {
              totalSpend: liveData.cached_meta_data.totalSpend || 0,
              totalResults: liveData.cached_meta_data.totalLeads || 0,
              campaignCount: liveData.cached_meta_data.campaignCount || 0
            },
            groupData: {
              totalGroups: liveData.cached_group_data.totalGroups || 0,
              totalMembers: liveData.cached_group_data.totalMembers || 0,
              entries: liveData.cached_group_data.entries || 0,
              exits: liveData.cached_group_data.exits || 0,
              activeMembers: liveData.cached_group_data.activeMembers || 0
            }
          });
        }

        setIsLoading(false);
        setIsButtonRefreshing(false);
        return;
      }

      // Primeiro, buscar dados básicos da Live
      // Buscar dados básicos da Live diretamente do Supabase
      const { data: liveData, error } = await supabase
        .from('captações')
        .select('*')
        .eq('id', liveId)
        .single();

      if (error || !liveData) {
        return;
      }
      if (liveData) {
        // Atualizar dados básicos da Live incluindo cached_metrics
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
          cached_metrics: liveData.cached_metrics,
          cached_traffic_data: liveData.cached_traffic_data,
          cached_traffic_data_incremented: liveData.cached_traffic_data_incremented
        });

        // Extrair dados do cache JSONB se existirem
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
      }

      // Dados carregados com sucesso do cache
      
      setIsLoading(false);
    } catch (error) {
      setError(`Erro ao carregar dados: ${error}`);
      setIsLoading(false);
    } finally {
      setIsButtonRefreshing(false);
    }
  }, [liveId, syncLiveMetaData]);

  // Navegar para /dashboard se não há liveId
  useEffect(() => {
    if (!liveId) {
      navigate('/dashboard');
      return;
    }
  }, [liveId, navigate]);

  // Carregar dados do banco quando a página carrega
  // Carregar dados na inicialização
  useEffect(() => {
    if (!liveId || isInitialized) return;
    
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // No modo demo, não chamar Edge Function
        if (!DEMO_MODE) {
          // Chamar Edge Function para sincronizar dados do Meta (com verificação de cache)
          try {
            await syncLiveMetaData(liveId, false); // false = não forçar refresh
        } catch (edgeError) {
          // Não interromper o fluxo se a Edge Function falhar
        }
        }

        // Carregar dados do cache atualizado (ou dados mocados se DEMO_MODE)
        await loadDataFromDatabase();
        
        setIsInitialized(true);
        
      } catch (error) {
        setError(`Erro ao inicializar dados: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [liveId, isInitialized]); // Apenas liveId e isInitialized como dependências

  // Função para iniciar o refresh (chamada pelo botão)
  const handleRefreshStart = async () => {
    setIsButtonRefreshing(true);
    try {
      // No modo demo, não chamar Edge Function
      if (!DEMO_MODE) {
        // Chamar Edge Function para forçar sincronização (ignorar cache)
        try {
          await syncLiveMetaData(liveId!, true); // true = forçar refresh
        } catch (edgeError) {
          // Não interromper o fluxo se a Edge Function falhar
        }
      }

      // Recarregar dados do cache atualizado (ou dados mocados se DEMO_MODE)
      await loadDataFromDatabase();
    } catch (error) {
      setError(`Erro ao atualizar dados: ${error}`);
    } finally {
      setIsButtonRefreshing(false);
    }
  };

  // Função removida - agora usando Edge Function syncLiveMetaData
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl">Carregando detalhes da live...</div>
          <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin border-2 border-blue-600 border-t-transparent rounded-full"></div>
            Buscando dados do Meta Ads...
          </div>
        </div>
      </div>;
  }
  if (!live) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Live não encontrada</div>
      </div>;
  }

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



  // Dados para exibição - usar APENAS fallback (dados corretos) até cached_metrics ser atualizado
  const cplLiquido = fallbackData.cplLiquido;
  const cplMeta = fallbackData.cplMeta;
  const retentionRate = fallbackData.retentionRate;
  const totalSpend = fallbackData.totalSpend;
  const totalEntries = fallbackData.totalEntries;
  const totalExits = fallbackData.totalExits;
  const totalActiveLeads = totalEntries - totalExits;

  // Debug: Log dos dados que serão exibidos nos cards
  return <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      {/* Navegação interna */}
      <ScreenNavigatorLives liveId={liveId} onRefresh={() => {}} // Função vazia - não usamos mais
    isRefreshing={false} // Sempre false - não usamos mais
    showRefreshButton={true} onDataUpdated={loadDataFromDatabase} onRefreshStart={handleRefreshStart} />
      
      <div className="container mx-auto p-6 space-y-8 relative">
        {/* Overlay de loading quando está atualizando */}
        {isButtonRefreshing && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-xl font-semibold">Atualizando dados...</div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin border-2 border-blue-600 border-t-transparent rounded-full"></div>
                Buscando dados do Meta Ads...
              </div>
            </div>
          </div>}
        {/* Header removido */}

        {/* Error Alert */}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">Erro ao carregar dados</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <Button variant="ghost" size="sm" onClick={() => setError(null)} className="mt-2 text-red-600 hover:text-red-700">
                  Fechar
                </Button>
              </div>
            </div>
          </div>}

        {/* Métricas Principais */}
        <LiveMetricsCards cplLiquido={cplLiquido} cplMeta={cplMeta} retentionRate={retentionRate} groupMembers={totalEntries} groupExits={totalExits} activeLeads={totalActiveLeads} isLoading={isLoading} />

        {/* Análise de Performance */}
        <PerformanceAnalysis live={live} totalSpend={totalSpend} totalGroupMembers={totalEntries} cplLiquido={cplLiquido} cplMeta={cplMeta} />
      </div>

      {/* BOTÃO DE TESTE - TEMPORÁRIO */}
      
    </div>;
};
export default Details;