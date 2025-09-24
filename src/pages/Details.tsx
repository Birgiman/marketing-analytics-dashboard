import Header from "@/components/Header";
import { LiveMetricsCards } from "@/components/LiveMetricsCards";
import PerformanceAnalysis from "@/components/PerformanceAnalysis";
import { ScreenNavigatorLives } from "@/components/ScreenNavigatorLives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchCompleteLiveData } from "@/utils/liveDataFetcher";
import { Link, useLocation } from "react-router-dom";
// V2 IMPORTS - Novos cálculos
import { calculateCompleteLiveMetrics } from "@/utils/live-metrics-v2";
// META API DIRECT - Requisições diretas ao Meta Marketing API
// CACHE SYSTEM - Sistema de cache para otimização
import { Live } from "@/types/live";
import { clearLiveCache, fetchLiveWithCache, updateLiveCache } from "@/utils/live-cache";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const Details = () => {
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
    isLoading: true,
    fromCache: false,
    needsRefresh: false
  });

  // ============================================================================
  // VERSÃO V2 - Novos cálculos (SEM CACHE)
  // ============================================================================
  
  // Estados para dados frescos (sem cache)
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
  const [groups, setGroups] = useState<Array<{
    id: string;
    group_id: string;
    group_name: string;
    group_size: number;
    monitoring: boolean;
    created_at: string;
  }>>([]);
  const [campaigns, setCampaigns] = useState<Array<{
    id: string;
    campaign_id: string;
    campaign_name: string;
    account_id?: string;
    account_name?: string;
    objective?: string;
    status: string;
    daily_budget?: number;
    lifetime_budget?: number;
  }>>([]);
  const [campaignsWithInsights, setCampaignsWithInsights] = useState<Array<{
    campaign_id: string;
    insights: Array<{
      date_start: string;
      date_stop: string;
      spend: string;
      impressions: string;
      clicks: string;
      reach?: string;
      frequency?: string;
      cpm?: string;
      ctr?: string;
      cpp?: string;
      cost_per_unique_click?: string;
      actions?: Array<{ action_type: string; value: string }>;
    }>;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMetaLoading, setIsMetaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para métricas V2
  const [metricsV2, setMetricsV2] = useState<{
    cplLiquido: number;
    cplMeta: number;
    retentionRate: number;
    cplLiquidoPlanejamento: number;
  } | null>(null);
  const [extractedDataV2, setExtractedDataV2] = useState<{
    groupData: { 
      totalGroups: number; 
      totalMembers: number;
      entries: number;
      exits: number;
      activeMembers: number;
    };
    metaData: { campaignCount: number; totalSpend: number; totalResults: number };
  } | null>(null);
  const [validationV2, setValidationV2] = useState<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } | null>(null);
  const [summaryV2, setSummaryV2] = useState<{
    cplLiquidoFormatted: string;
    cplMetaFormatted: string;
    retentionRateFormatted: string;
    cplLiquidoPlanejamentoFormatted: string;
  } | null>(null);


  // Navegar para /dashboard se não há liveId
  useEffect(() => {
    if (!liveId) {
      navigate('/dashboard');
    }
  }, [liveId, navigate]);

  // Buscar dados com sistema de cache
  useEffect(() => {
    if (!liveId) return;

    const fetchDataWithCache = async () => {
      setCacheStatus(prev => ({ ...prev, isLoading: true }));
      setError(null);
      
      try {
        console.log('🔄 [Details Cache] Verificando cache para Live:', liveId);
        
        // Verificar cache primeiro
        const cacheResult = await fetchLiveWithCache(liveId);
        
        if (!cacheResult.data) {
          throw new Error('Live não encontrada');
        }

        setCacheStatus({
          isLoading: false,
          fromCache: cacheResult.fromCache,
          needsRefresh: cacheResult.needsRefresh,
          lastSynced: cacheResult.data.last_synced_at
        });

        // Se tem cache válido, usar dados em cache
        if (cacheResult.fromCache && cacheResult.data.cached_metrics) {
          console.log('✅ [Details Cache] Usando dados do cache');
          
          // Carregar dados básicos da live
          setLive(cacheResult.data);
          
          // Usar métricas do cache
          setMetricsV2(cacheResult.data.cached_metrics);
          setExtractedDataV2({
            groupData: cacheResult.data.cached_group_data || {
              totalGroups: 0,
              totalMembers: 0,
              entries: 0,
              exits: 0,
              activeMembers: 0
            },
            metaData: cacheResult.data.cached_meta_data || {
              campaignCount: 0,
              totalSpend: 0,
              totalResults: 0
            }
          });
          
          // Buscar dados complementares (grupos, campanhas) sem fazer cálculos pesados
          const completeData = await fetchCompleteLiveData(liveId);
          setGroups(completeData.groups);
          setCampaigns(completeData.liveCampaigns);
          setCampaignsWithInsights(completeData.campaignInsights);
          
          setIsLoading(false); // ✅ Corrigir estado principal quando usa cache
          return;
        }

        // Cache vencido ou inexistente - buscar dados frescos
        console.log('🔄 [Details Cache] Cache vencido, buscando dados frescos');
        
        const completeData = await fetchCompleteLiveData(liveId);
        
        // Atualizar estados com dados frescos
        setLive(completeData.live);
        setGroups(completeData.groups);
        setCampaigns(completeData.liveCampaigns);
        setCampaignsWithInsights(completeData.campaignInsights);
        
        console.log('✅ [Details Cache] Dados frescos carregados, calculando métricas...');
        
        // Calcular métricas e atualizar cache
        await calculateAndCacheMetrics(completeData);
        
      } catch (error) {
        console.error('❌ [Details Cache] Erro ao buscar dados:', error);
        setError(`Erro ao carregar dados: ${error}`);
      } finally {
        setCacheStatus(prev => ({ ...prev, isLoading: false }));
        setIsLoading(false); // ✅ Corrigir estado principal de loading
      }
    };

    fetchDataWithCache();
  }, [liveId]);

  // Função para calcular métricas e atualizar cache
  const calculateAndCacheMetrics = async (completeData: {
    live: Live;
    groups: unknown[];
    campaignInsights: { campaign_id: string; insights: unknown[] }[];
  }) => {
    try {
      const liveData = {
        live: completeData.live,
        groups: completeData.groups,
        campaignInsights: completeData.campaignInsights.map((campaign) => ({
          campaign_id: campaign.campaign_id,
          insights: campaign.insights || []
        }))
      };

      // Validar parâmetros obrigatórios para cálculos
      if (!completeData.live?.insights_date_since || !completeData.live?.insights_date_until || !completeData.live?.user_id) {
        throw new Error(`Parâmetros obrigatórios ausentes: insights_date_since=${completeData.live?.insights_date_since}, insights_date_until=${completeData.live?.insights_date_until}, user_id=${completeData.live?.user_id}`);
      }

      // Calcular métricas usando a nova função
      const result = await calculateCompleteLiveMetrics(liveData, {
        enableLogging: true,
        enableValidation: true,
        orcamentoGasto: completeData.live?.ad_budget,
        dateFrom: completeData.live.insights_date_since,
        dateTo: completeData.live.insights_date_until,
        userId: completeData.live.user_id
      });

      // Atualizar estados com métricas calculadas
      setMetricsV2(result.metrics);
      setExtractedDataV2(result.extractedData);
      setValidationV2(result.validation);
      setSummaryV2(result.summary);

      // Log dos valores antes de atualizar cache
      console.log('📊 [Details Cache] Valores ANTES da atualização:', {
        cplLiquido: result.metrics.cplLiquido,
        cplMeta: result.metrics.cplMeta,
        retentionRate: result.metrics.retentionRate,
        totalSpend: result.extractedData.metaData.totalSpend,
        totalResults: result.extractedData.metaData.totalResults
      });

      // Atualizar cache no banco
      await updateLiveCache(
        completeData.live.id,
        result.metrics,
        result.extractedData.groupData,
        result.extractedData.metaData
      );

      // Atualizar status do cache após salvar
      setCacheStatus(prev => ({
        ...prev,
        fromCache: false,
        needsRefresh: false,
        lastSynced: new Date().toISOString()
      }));

      // Log dos valores DEPOIS da atualização
      console.log('📊 [Details Cache] Valores DEPOIS da atualização:', {
        cplLiquido: result.metrics.cplLiquido,
        cplMeta: result.metrics.cplMeta,
        retentionRate: result.metrics.retentionRate,
        totalSpend: result.extractedData.metaData.totalSpend,
        totalResults: result.extractedData.metaData.totalResults
      });

      console.log('✅ [Details Cache] Métricas calculadas e cache atualizado');

    } catch (error) {
      console.error('❌ [Details Cache] Erro ao calcular métricas:', error);
      throw error;
    }
  };

  // Função para forçar refresh do cache
  const handleForceRefresh = async () => {
    if (!liveId) return;
    
    setCacheStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      console.log('🔄 [Details Cache] Forçando refresh do cache');
      
      // Log dos valores atuais antes do refresh
      console.log('📊 [Details Cache] Valores ANTES do refresh forçado:', {
        cplLiquido: metricsV2?.cplLiquido,
        cplMeta: metricsV2?.cplMeta,
        retentionRate: metricsV2?.retentionRate,
        lastSynced: cacheStatus.lastSynced
      });
      
      // Limpar cache atual
      await clearLiveCache(liveId);
      
      // Buscar dados frescos
      const completeData = await fetchCompleteLiveData(liveId);
      
      // Atualizar estados
      setLive(completeData.live);
      setGroups(completeData.groups);
      setCampaigns(completeData.liveCampaigns);
      setCampaignsWithInsights(completeData.campaignInsights);
      
      // Calcular e cachear métricas
      await calculateAndCacheMetrics(completeData);
      
      // Atualizar status do cache
      setCacheStatus({
        isLoading: false,
        fromCache: false,
        needsRefresh: false,
        lastSynced: new Date().toISOString()
      });
      
      // Log dos valores DEPOIS do refresh forçado
      console.log('📊 [Details Cache] Valores DEPOIS do refresh forçado:', {
        cplLiquido: metricsV2?.cplLiquido,
        cplMeta: metricsV2?.cplMeta,
        retentionRate: metricsV2?.retentionRate,
        lastSynced: new Date().toISOString()
      });
      
      console.log('✅ [Details Cache] Refresh forçado concluído');
      
    } catch (error) {
      console.error('❌ [Details Cache] Erro no refresh forçado:', error);
      setError(`Erro ao atualizar dados: ${error}`);
    } finally {
      setCacheStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Calcular métricas V2 quando os dados estiverem disponíveis
  useEffect(() => {
    const calculateMetrics = async () => {
      // Aguardar que todos os dados estejam carregados
      if (live && groups && campaignsWithInsights.length > 0 && !isLoading) {
        console.log('🔄 [Details V2] Calculando métricas com novos cálculos...');
        console.log('📊 [Details V2] Dados disponíveis:', {
          live: !!live,
          groups: groups.length,
          campaignsWithInsights: campaignsWithInsights.length,
          isLoading
        });
        
        try {
          // Preparar dados no formato esperado pelos novos cálculos
          const liveData = {
            live,
            groups,
            campaignInsights: campaignsWithInsights.map(campaign => ({
              campaign_id: campaign.campaign_id,
              insights: campaign.insights || []
            }))
          };

          // Validar parâmetros obrigatórios para cálculos
          if (!live?.insights_date_since || !live?.insights_date_until || !live?.user_id) {
            throw new Error(`Parâmetros obrigatórios ausentes: insights_date_since=${live?.insights_date_since}, insights_date_until=${live?.insights_date_until}, user_id=${live?.user_id}`);
          }

          // Calcular métricas usando a nova função
          const result = await calculateCompleteLiveMetrics(liveData, {
            enableLogging: true,
            enableValidation: true,
            orcamentoGasto: live?.ad_budget,
            dateFrom: live.insights_date_since,
            dateTo: live.insights_date_until,
            userId: live.user_id
          });

          setMetricsV2(result.metrics);
          setExtractedDataV2(result.extractedData);
          setValidationV2(result.validation);
          setSummaryV2(result.summary);

          console.log('✅ [Details V2] Métricas calculadas com sucesso:', result.summary);
        } catch (error) {
          console.error('❌ [Details V2] Erro ao calcular métricas:', error);
        }
      } else {
        console.log('⏳ [Details V2] Aguardando dados completos:', {
          live: !!live,
          groups: groups.length,
          campaignsWithInsights: campaignsWithInsights.length,
          isLoading
        });
      }
    };

    calculateMetrics();
  }, [live, groups, campaignsWithInsights, isLoading]);

  // ============================================================================
  // VERSÃO V2 - Novas funções
  // ============================================================================
  
  // Usar campanhas com insights do cache
  const finalCampaigns = campaignsWithInsights.length > 0 ? campaignsWithInsights : campaigns;
  
  // Função para obter campanhas para renderização (sempre retorna campanhas com dados completos)
  const getCampaignsForRender = () => {
    if (campaignsWithInsights.length > 0) {
      // Se temos insights, usar as campanhas do banco que têm dados completos
      return campaigns;
    }
    return campaigns;
  };

  // Calcular dados dos grupos V2
  const calculateGroupDataV2 = () => {
    // Usar dados reais extraídos se disponíveis
    if (extractedDataV2?.groupData) {
      return {
        entrou: extractedDataV2.groupData.entries,
        saiu: extractedDataV2.groupData.exits,
        ativos: extractedDataV2.groupData.activeMembers
      };
    }

    // Fallback para dados antigos se dados reais não estiverem disponíveis
    if (!groups || groups.length === 0) {
      return { entrou: 0, saiu: 0, ativos: 0 };
    }

    const totalMembros = groups.reduce((sum, group) => sum + group.group_size, 0);

    return {
      entrou: totalMembros,
      saiu: 0, // TODO: Implementar tracking de saídas
      ativos: totalMembros
    };
  };

  // ============================================================================
  // VERSÃO V2 - Nova função de teste
  // ============================================================================
  


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl">Carregando detalhes...</div>
          {isMetaLoading && (
            <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Buscando dados das campanhas do Meta...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!live) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Live não encontrada</div>
      </div>
    );
  }

  // ============================================================================
  // VERSÃO V2 - Novos dados
  // ============================================================================
  
  const groupData = calculateGroupDataV2();

  // Usar métricas V2 (novos cálculos)
  const cplLiquido = metricsV2?.cplLiquido || 0;
  const cplMeta = metricsV2?.cplMeta || 0;
  const retentionRate = metricsV2?.retentionRate || 0;
  const totalSpend = extractedDataV2?.metaData?.totalSpend || 0;

  // Debug: Log dos dados que serão exibidos nos cards
  console.log('🎯 [Details] Dados para os cards:', {
    cplLiquido,
    cplMeta,
    retentionRate,
    groupData,
    totalSpend,
    metricsV2: !!metricsV2,
    extractedDataV2: !!extractedDataV2
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      {/* Navegação interna */}
      <ScreenNavigatorLives 
        liveId={liveId} 
        onRefresh={handleForceRefresh}
        isRefreshing={cacheStatus.isLoading}
        showRefreshButton={true}
      />
      
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Detalhes da Live</h1>
            <p className="text-muted-foreground mt-1">{live?.name || 'Carregando...'}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Status das Campanhas */}
            <div className="flex items-center gap-2">
              {finalCampaigns.length > 0 ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {finalCampaigns.length === 1 ? '1 Campanha Vinculada' : `${finalCampaigns.length} Campanhas Vinculadas`}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-100 text-gray-600">
                  Nenhuma Campanha Vinculada
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">Erro ao carregar dados</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                  className="mt-2 text-red-600 hover:text-red-700"
                >
                  Fechar
                </Button>
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
          isLoading={isLoading || isMetaLoading}
        />

        {/* Análise de Performance */}
        <PerformanceAnalysis
          live={live}
          totalSpend={extractedDataV2?.metaData?.totalSpend || 0}
          totalGroupMembers={groupData.entrou}
          cplLiquido={cplLiquido}
          cplMeta={cplMeta}
        />
      </div>

    </div>
  );
};

export default Details;