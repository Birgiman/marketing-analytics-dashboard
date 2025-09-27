import Header from "@/components/Header";
import { LiveMetricsCards } from "@/components/LiveMetricsCards";
import PerformanceAnalysis from "@/components/PerformanceAnalysis";
import { ScreenNavigatorLives } from "@/components/ScreenNavigatorLives";
import { Button } from "@/components/ui/button";
import { getLiveData, getLiveDataFromDatabase } from '@/utils/LiveData/getLiveData';
import { supabase } from '@/integrations/supabase/client';
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
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isButtonRefreshing, setIsButtonRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Função para chamar a Edge Function syncLiveMetaData
  const syncLiveMetaData = useCallback(async (liveId: string) => {
    try {
      console.log(`🚀 [Details] Chamando Edge Function syncLiveMetaData para Live: ${liveId}`);
      
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

      console.log(`✅ [Details] Edge Function executada com sucesso:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ [Details] Erro ao chamar Edge Function:`, error);
      throw error;
    }
  }, []);

  // Função para carregar dados do banco
  const loadDataFromDatabase = useCallback(async () => {
    if (!liveId) return;
    try {
      // Primeiro, buscar dados básicos da Live
      const liveData = await getLiveDataFromDatabase(liveId);
      if (liveData) {
        // Atualizar dados básicos da Live
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
          updated_at: liveData.updated_at
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

      // Chamar Edge Function para sincronizar dados do Meta
      try {
        await syncLiveMetaData(liveId);
        console.log(`✅ [Details] Edge Function executada com sucesso`);
      } catch (edgeError) {
        console.warn(`⚠️ [Details] Edge Function falhou, continuando com dados do cache:`, edgeError);
        // Não interromper o fluxo se a Edge Function falhar
      }

      // Agora, usar getLiveData para validar cache e buscar dados frescos se necessário
      const liveDataResult = await getLiveData(liveId, false); // false = verificar cache primeiro
      
      // Atualizar dados com os resultados mais recentes
      if (liveDataResult) {
        setMetrics({
          cplMeta: liveDataResult.metrics.cplMeta,
          cplLiquido: liveDataResult.metrics.cplLiquido,
          retentionRate: liveDataResult.metrics.retentionRate,
          cplLiquidoPlanejamento: liveDataResult.metrics.cplLiquidoPlanejamento
        });
        
        setExtractedData({
          metaData: {
            totalSpend: liveDataResult.aggregatedInsights.totalSpend,
            totalResults: liveDataResult.aggregatedInsights.totalLeads,
            campaignCount: liveDataResult.campaigns.total
          },
          groupData: {
            totalGroups: 0, // Será calculado baseado nos dados
            totalMembers: liveDataResult.groupData.totalMembers,
            entries: liveDataResult.groupData.entries,
            exits: liveDataResult.groupData.exits,
            activeMembers: liveDataResult.groupData.activeMembers
          }
        });
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('❌ [Details] Erro ao carregar dados:', error);
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
  useEffect(() => {
    if (liveId) {
      loadDataFromDatabase();
    }
  }, [liveId, loadDataFromDatabase]);

  // Função para iniciar o refresh (chamada pelo botão)
  const handleRefreshStart = async () => {
    setIsButtonRefreshing(true);
    try {
      // Chamar Edge Function para forçar sincronização
      try {
        await syncLiveMetaData(liveId!);
        console.log(`✅ [Details] Edge Function executada no refresh`);
      } catch (edgeError) {
        console.warn(`⚠️ [Details] Edge Function falhou no refresh, continuando:`, edgeError);
        // Não interromper o fluxo se a Edge Function falhar
      }

      const liveDataResult = await getLiveData(liveId!, true); // true = force refresh
      
      // Atualizar dados com os resultados mais recentes
      if (liveDataResult) {
        setMetrics({
          cplMeta: liveDataResult.metrics.cplMeta,
          cplLiquido: liveDataResult.metrics.cplLiquido,
          retentionRate: liveDataResult.metrics.retentionRate,
          cplLiquidoPlanejamento: liveDataResult.metrics.cplLiquidoPlanejamento
        });
        
        setExtractedData({
          metaData: {
            totalSpend: liveDataResult.aggregatedInsights.totalSpend,
            totalResults: liveDataResult.aggregatedInsights.totalLeads,
            campaignCount: liveDataResult.campaigns.total
          },
          groupData: {
            totalGroups: 0, // Será calculado baseado nos dados
            totalMembers: liveDataResult.groupData.totalMembers,
            entries: liveDataResult.groupData.entries,
            exits: liveDataResult.groupData.exits,
            activeMembers: liveDataResult.groupData.activeMembers
          }
        });
      }
    } catch (error) {
      console.error('❌ [Details] Erro ao atualizar dados:', error);
      setError(`Erro ao atualizar dados: ${error}`);
    } finally {
      setIsButtonRefreshing(false);
    }
  };

  // Função para testar getLiveData
  const handleTestGetLiveData = async () => {
    if (!liveId) {
      return;
    }
    try {
      const result = await getLiveData(liveId); // Sem force = verifica cache primeiro
    } catch (error) {}
  };
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

  // Dados para exibição
  const cplLiquido = metrics?.cplLiquido || 0;
  const cplMeta = metrics?.cplMeta || 0;
  const retentionRate = metrics?.retentionRate || 0;
  const totalSpend = extractedData?.metaData?.totalSpend || 0;

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
        <LiveMetricsCards cplLiquido={cplLiquido} cplMeta={cplMeta} retentionRate={retentionRate} groupMembers={extractedData?.groupData?.totalMembers || 0} groupExits={extractedData?.groupData?.exits || 0} activeLeads={extractedData?.groupData?.activeMembers || 0} isLoading={isLoading} />

        {/* Análise de Performance */}
        <PerformanceAnalysis live={live} totalSpend={totalSpend} totalGroupMembers={extractedData?.groupData?.totalMembers || 0} cplLiquido={cplLiquido} cplMeta={cplMeta} />
      </div>

      {/* BOTÃO DE TESTE - TEMPORÁRIO */}
      
    </div>;
};
export default Details;