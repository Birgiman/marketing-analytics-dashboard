import Header from "@/components/Header";
import { LiveMetricsCards } from "@/components/LiveMetricsCards";
import PerformanceAnalysis from "@/components/PerformanceAnalysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// import { useLiveLocalStorageCache } from "@/hooks/useLiveLocalStorageCache"; // REMOVIDO - sempre buscar dados frescos
import { fetchCompleteLiveData } from "@/utils/liveDataFetcher";
// V2 IMPORTS - Novos cálculos
import { calculateCompleteLiveMetrics } from "@/utils/live-metrics-v2";
// META API DIRECT - Requisições diretas ao Meta Marketing API
import { getCPLFromMeta } from "@/utils/meta-requests/getCPLFromMeta";
import { getLiveMetaDataWithFallback } from "@/utils/meta-requests/getLiveMetaData";
import { Activity, AlertCircle, RefreshCw, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const Details = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const liveId = searchParams.get('live');
  
  const [testLoading, setTestLoading] = useState(false);
  const [metaApiLoading, setMetaApiLoading] = useState(false);
  const [metaApiData, setMetaApiData] = useState<{
    cpl: number;
    totalSpend: number;
    totalLeads: number;
    campaignCount: number;
    logs: string[];
  } | null>(null);

  // ============================================================================
  // VERSÃO V1 (COMENTADA) - Código original
  // ============================================================================
  /*
  // Usar novo hook de cache localStorage compartilhado
  const {
    live,
    groups,
    campaigns,
    campaignsWithInsights,
    metrics,
    isLoading,
    isMetaLoading,
    error,
    isFromCache,
    canFetchMetaAgain,
    refreshData,
    clearError
  } = useLiveLocalStorageCache({ liveId: liveId || '' });
  */

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
    groupData: { totalGroups: number; totalMembers: number };
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


  // Navegar para /lives se não há liveId
  useEffect(() => {
    if (!liveId) {
      navigate('/lives');
    }
  }, [liveId, navigate]);

  // Buscar dados frescos quando a página carregar
  useEffect(() => {
    if (!liveId) return;

    const fetchFreshData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🔄 [Details] Buscando dados frescos para Live:', liveId);
        
        // Buscar dados completos frescos
        const completeData = await fetchCompleteLiveData(liveId);
        
        // Atualizar estados com dados frescos
        setLive(completeData.live);
        setGroups(completeData.groups);
        setCampaigns(completeData.liveCampaigns);
        setCampaignsWithInsights(completeData.campaignInsights);
        
        console.log('✅ [Details] Dados frescos carregados com sucesso');
        
      } catch (error) {
        console.error('❌ [Details] Erro ao buscar dados frescos:', error);
        setError(`Erro ao carregar dados: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFreshData();
  }, [liveId]);

  // Calcular métricas V2 quando os dados estiverem disponíveis
  useEffect(() => {
    if (live && groups && campaignsWithInsights.length > 0) {
      console.log('🔄 [Details V2] Calculando métricas com novos cálculos...');
      
      try {
        // Preparar dados no formato esperado pelos novos cálculos
        const liveData = {
          live,
          groups,
          campaignInsights: campaignsWithInsights.map(campaign => ({
            campaign_id: campaign.campaign_id,
            insights: campaign.insights ? [campaign.insights] : []
          }))
        };

        // Calcular métricas usando a nova função
        const result = calculateCompleteLiveMetrics(liveData, {
          enableLogging: true,
          enableValidation: true,
          orcamentoGasto: live.ad_budget
        });

        setMetricsV2(result.metrics);
        setExtractedDataV2(result.extractedData);
        setValidationV2(result.validation);
        setSummaryV2(result.summary);

        console.log('✅ [Details V2] Métricas calculadas com sucesso:', result.summary);
      } catch (error) {
        console.error('❌ [Details V2] Erro ao calcular métricas:', error);
      }
    }
  }, [live, groups, campaignsWithInsights]);

  // ============================================================================
  // VERSÃO V1 (COMENTADA) - Funções antigas
  // ============================================================================
  /*
  // Usar campanhas com insights do cache
  const finalCampaigns = campaignsWithInsights.length > 0 ? campaignsWithInsights : campaigns;

  // Calcular dados dos grupos
  const calculateGroupData = () => {
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
  */

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
  // VERSÃO V1 (COMENTADA) - Função de teste antiga
  // ============================================================================
  /*
  // Função para testar os dados completos da live
  const handleTestLiveData = async () => {
    if (!liveId) return;

    setTestLoading(true);
    try {
      console.log('🧪 [TESTE] Iniciando busca completa de dados para Live:', liveId);
      const completeData = await fetchCompleteLiveData(liveId);

      console.log('🧪 [TESTE] ✅ Dados completos obtidos:', completeData);
      console.log('📊 [RESUMO]', {
        live: completeData.live.name,
        grupos: completeData.summary.totalGroups,
        membros: completeData.summary.totalGroupMembers,
        campanhas: completeData.summary.totalCampaigns,
        campanhas_ativas: completeData.summary.activeCampaigns,
        gasto_total: `$${completeData.summary.totalSpend}`,
        impressoes: completeData.summary.totalImpressions
      });

      const insights = completeData.summary.insights;
      const live = completeData.live;

      // Formatação de datas para o alert
      const timeRangeText = live.insights_date_since && live.insights_date_until
        ? `\nPeríodo: ${live.insights_date_since} até ${live.insights_date_until}`
        : '\nPeríodo: Padrão (últimos 30 dias)';

      const searchTermText = live.campaign_search_term
        ? `\n🔍 Termo de busca: "${live.campaign_search_term}"`
        : '\n🔍 Termo de busca: Não definido';

      alert(`✅ Teste concluído com sucesso!\n\nLive: ${live.name}${timeRangeText}${searchTermText}\n\nGrupos: ${completeData.summary.totalGroups} (${completeData.summary.totalGroupMembers} membros)\nCampanhas: ${completeData.summary.totalCampaigns} (${completeData.summary.activeCampaigns} ativas)\nGasto Total: $${completeData.summary.totalSpend}\nImpressões: ${completeData.summary.totalImpressions}\nCliques: ${completeData.summary.totalClicks}\n\nINSIGHTS (${insights.totalInsights} registros):\n• CPM Médio: $${insights.avgCPM}\n• CTR Médio: ${insights.avgCTR}%\n• CPP Médio: $${insights.avgCPP}\n• Custo por Clique Único: $${insights.avgCostPerUniqueClick}\n• Frequência Média: ${insights.avgFrequency}\n• Total de Ações: ${insights.totalActions}\n\nVeja o console para mais detalhes!`);

    } catch (error) {
      console.error('🧪 [TESTE] ❌ Erro ao buscar dados:', error);
      alert(`❌ Erro no teste: ${error}`);
    } finally {
      setTestLoading(false);
    }
  };
  */

  // ============================================================================
  // VERSÃO V2 - Nova função de teste
  // ============================================================================
  
  // Função para testar os novos cálculos V2
  const handleTestLiveDataV2 = async () => {
    if (!liveId) return;

    setTestLoading(true);
    try {
      console.log('🧪 [TESTE V2] Iniciando teste dos novos cálculos para Live:', liveId);
      
      // Buscar dados completos
      const completeData = await fetchCompleteLiveData(liveId);
      
      // Calcular métricas usando a nova função
      const liveData = {
        live: completeData.live,
        groups: completeData.groups,
        campaignInsights: completeData.campaignInsights
      };

      const result = calculateCompleteLiveMetrics(liveData, {
        enableLogging: true,
        enableValidation: true,
        orcamentoGasto: undefined // TODO: Adicionar ad_budget ao tipo LiveDataResponse
      });

      console.log('🧪 [TESTE V2] ✅ Novos cálculos concluídos:', result);

      // Formatação de datas para o alert
      const timeRangeText = completeData.live.insights_date_since && completeData.live.insights_date_until
        ? `\nPeríodo: ${completeData.live.insights_date_since} até ${completeData.live.insights_date_until}`
        : '\nPeríodo: Padrão (últimos 30 dias)';

      const searchTermText = completeData.live.campaign_search_term
        ? `\n🔍 Termo de busca: "${completeData.live.campaign_search_term}"`
        : '\n🔍 Termo de busca: Não definido';

      alert(`✅ Teste V2 concluído com sucesso!\n\nLive: ${completeData.live.name}${timeRangeText}${searchTermText}\n\n📊 DADOS EXTRAÍDOS:\n• Grupos: ${result.extractedData.groupData.totalGroups} (${result.extractedData.groupData.totalMembers} membros)\n• Campanhas: ${result.extractedData.metaData.campaignCount}\n• Gasto Total: ${result.summary.cplLiquidoFormatted}\n• Leads Meta: ${result.extractedData.metaData.totalResults}\n\n🧮 NOVOS CÁLCULOS:\n• CPL Líquido: ${result.summary.cplLiquidoFormatted}\n• CPL Meta: ${result.summary.cplMetaFormatted}\n• Taxa de Retenção: ${result.summary.retentionRateFormatted}\n• CPL Planejamento: ${result.summary.cplLiquidoPlanejamentoFormatted}\n\n${result.validation.warnings.length > 0 ? `⚠️ Avisos: ${result.validation.warnings.join(', ')}\n` : ''}Veja o console para mais detalhes!`);

    } catch (error) {
      console.error('🧪 [TESTE V2] ❌ Erro ao testar novos cálculos:', error);
      alert(`❌ Erro no teste V2: ${error}`);
    } finally {
      setTestLoading(false);
    }
  };

  // ============================================================================
  // META API DIRECT - Função para testar requisição direta ao Meta
  // ============================================================================
  
  // Função para testar requisição direta ao Meta Marketing API
  const handleTestMetaApiDirect = async () => {
    if (!liveId) return;

    setMetaApiLoading(true);
    try {
      console.log('⚡ [META-API-DIRECT] Iniciando teste de requisição direta ao Meta...');
      
      // 1. Buscar dados da live no banco de dados
      console.log('🔍 [META-API-DIRECT] Buscando dados da live no banco...');
      const liveDataResult = await getLiveMetaDataWithFallback(liveId);
      
      if (!liveDataResult.success || !liveDataResult.data) {
        throw new Error(`Erro ao buscar dados da live: ${liveDataResult.error}`);
      }
      
      const liveData = liveDataResult.data;
      console.log('✅ [META-API-DIRECT] Dados da live obtidos:', liveData);
      
      // 2. Preparar dados para a requisição ao Meta
      const accountId = liveData.accountId || '269382281240887'; // Fallback para teste
      const accessToken = 'EAAPgBgJNkMYBPZA6EyZAvb2uFsRle6b9LN3D087Gdo5CCPgJqdwMGQc5ygtBVdCX1ZBiA42pYuk27ZAkvSKNnKOZCWrZCImhEFVvv7F6Cop3X0QZBZAlF6GfsiqA2CoRwTNyoLHKGUntIEzSmXL0o069wo168YlZABMpGWvhYnssc2VXfeZC5bQ197MlN1yW9UPp1F5Tlx'; // TODO: Pegar do ambiente
      
      // 3. Preparar filtros baseados nos dados do banco
      const filters = {
        campaignStatus: ['ACTIVE', 'PAUSED'] as string[],
        campaignName: liveData.campaignSearchTerm || undefined,
        dateRange: liveData.insightsDateSince && liveData.insightsDateUntil ? {
          since: liveData.insightsDateSince,
          until: liveData.insightsDateUntil
        } : undefined
      };

      // Debug: verificar se os dados estão corretos
      console.log('🔍 [META-API-DIRECT] Dados do banco:', {
        termo: liveData.campaignSearchTerm,
        accountId: liveData.accountId,
        periodo: `${liveData.insightsDateSince} até ${liveData.insightsDateUntil}`,
        campanhas: liveData.campaignCount
      });
      console.log('🔍 [META-API-DIRECT] Filtros preparados:', filters);

      // 4. Fazer requisição direta ao Meta
      const result = await getCPLFromMeta({
        accountId,
        accessToken,
        filters
      });

      if (result.success && result.data) {
        setMetaApiData({
          cpl: result.data.cpl,
          totalSpend: result.data.totalSpend,
          totalLeads: result.data.totalLeads,
          campaignCount: result.data.campaignCount,
          logs: result.logs || []
        });

        console.log('⚡ [META-API-DIRECT] ✅ Requisição direta concluída:', result.data);

        // Mostrar alert com resultados
        alert(`⚡ Meta API Direta - Sucesso!\n\n📊 RESULTADOS:\n• CPL: R$ ${result.data.cpl.toFixed(2)}\n• Gasto Total: R$ ${result.data.totalSpend.toFixed(2)}\n• Total Leads: ${result.data.totalLeads}\n• Campanhas analisadas: ${result.data.campaignCount}\n\n🔍 FILTROS APLICADOS:\n• Status: ${filters.campaignStatus.join(', ')}\n• Nome: ${filters.campaignName || 'Todos'}\n• Período: ${filters.dateRange ? `${filters.dateRange.since} até ${filters.dateRange.until}` : 'Padrão'}\n\n📋 DADOS DO BANCO:\n• Termo: ${liveData.campaignSearchTerm}\n• Account ID: ${liveData.accountId}\n• Campanhas vinculadas: ${liveData.campaignCount}\n\nVeja o console para logs detalhados!`);
      } else {
        console.error('⚡ [META-API-DIRECT] ❌ Erro na requisição:', result.error);
        alert(`❌ Erro na Meta API Direta: ${result.error}`);
      }

    } catch (error) {
      console.error('⚡ [META-API-DIRECT] ❌ Erro inesperado:', error);
      alert(`❌ Erro inesperado: ${error}`);
    } finally {
      setMetaApiLoading(false);
    }
  };

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
  // VERSÃO V1 (COMENTADA) - Dados antigos
  // ============================================================================
  /*
  const groupData = calculateGroupData();

  // Usar métricas do cache (já calculadas)
  const cplLiquido = metrics?.cplLiquido || 0;
  const cplMeta = metrics?.cplMeta || 0;
  const retentionRate = metrics?.retentionRate || 0;
  const totalSpend = metrics?.totalSpent || 0;
  */

  // ============================================================================
  // VERSÃO V2 - Novos dados
  // ============================================================================
  
  const groupData = calculateGroupDataV2();

  // Usar métricas V2 (novos cálculos)
  const cplLiquido = metricsV2?.cplLiquido || 0;
  const cplMeta = metricsV2?.cplMeta || 0;
  const retentionRate = metricsV2?.retentionRate || 0;
  const totalSpend = extractedDataV2?.metaData?.totalSpend || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Detalhes da Live</h1>
            <p className="text-muted-foreground mt-1">{live.name}</p>
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

        {/* Status dos Dados V2 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">🧮 Novos Cálculos V2</h3>
              <div className="text-sm text-green-700 space-y-1 mt-1">
                {metricsV2 ? (
                  <>
                    <p>
                      <strong>CPL Líquido:</strong> {summaryV2?.cplLiquidoFormatted || 'R$ 0,00'}
                    </p>
                    <p>
                      <strong>CPL Meta:</strong> {summaryV2?.cplMetaFormatted || 'R$ 0,00'}
                    </p>
                    <p>
                      <strong>Taxa de Retenção:</strong> {summaryV2?.retentionRateFormatted || '0%'}
                    </p>
                    <p>
                      <strong>Dados Extraídos:</strong> {extractedDataV2 ? `${extractedDataV2.groupData.totalGroups} grupos, ${extractedDataV2.metaData.campaignCount} campanhas` : 'Carregando...'}
                    </p>
                    {validationV2?.warnings && validationV2.warnings.length > 0 && (
                      <p className="text-orange-600">
                        <strong>⚠️ Avisos:</strong> {validationV2.warnings.join(', ')}
                      </p>
                    )}
                  </>
                ) : (
                  <p>🔄 Calculando métricas V2...</p>
                )}
                <p>
                  <strong>Status:</strong> 🔄 Dados sempre frescos (sem cache)
                </p>
              </div>
            </div>
            {finalCampaigns.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="bg-white hover:bg-green-50"
              >
                Vincular Campanhas
              </Button>
            )}
          </div>
        </div>

        {/* Status dos Dados Meta API Direta */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">⚡ Meta API Direta</h3>
              <div className="text-sm text-blue-700 space-y-1 mt-1">
                {metaApiData ? (
                  <>
                    <p>
                      <strong>CPL Direto:</strong> R$ {metaApiData.cpl.toFixed(2)}
                    </p>
                    <p>
                      <strong>Gasto Total:</strong> R$ {metaApiData.totalSpend.toFixed(2)}
                    </p>
                    <p>
                      <strong>Total Leads:</strong> {metaApiData.totalLeads}
                    </p>
                    <p>
                      <strong>Campanhas:</strong> {metaApiData.campaignCount}
                    </p>
                    <p className="text-xs text-blue-600">
                      <strong>Última atualização:</strong> {new Date().toLocaleTimeString()}
                    </p>
                  </>
                ) : (
                  <p>⚡ Clique no botão para testar requisição direta ao Meta</p>
                )}
              </div>
            </div>
            <Button
              onClick={handleTestMetaApiDirect}
              disabled={metaApiLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              {metaApiLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  ⚡ Testar Meta API
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Lista de Campanhas Meta Ads */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Campanhas Vinculadas</h3>
            {finalCampaigns.length > 3 && (
              <span className="text-sm text-gray-500">
                {finalCampaigns.length} campanhas
              </span>
            )}
          </div>
            {getCampaignsForRender().length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                {getCampaignsForRender().map((campaign) => (
                <Card key={campaign.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h4 className="font-medium">{campaign.campaign_name}</h4>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>ID: {campaign.campaign_id}</span>
                        <span>Status: {campaign.status}</span>
                        <span>Objetivo: {campaign.objective || '—'}</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span>Orçamento Diário: {campaign.daily_budget ? `R$ ${(Number(campaign.daily_budget) / 100).toFixed(2)}` : '—'}</span>
                        {campaign.lifetime_budget && (
                          <span>Orçamento Total: R$ {(Number(campaign.lifetime_budget) / 100).toFixed(2)}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Conta: {campaign.account_name || '—'} ({campaign.account_id || '—'})
                      </div>
                    </div>
                    <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {campaign.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nenhuma campanha vinculada a esta Live
            </div>
          )}
        </div>

        {/* Análise de Performance */}
        <PerformanceAnalysis
          live={live}
          totalSpend={totalSpend}
          totalGroupMembers={groupData.entrou}
          cplLiquido={cplLiquido}
          cplMeta={cplMeta}
        />
      </div>

      {/* Botão de Teste V2 - Posição fixa no canto inferior direito */}
      <Button
        onClick={handleTestLiveDataV2}
        disabled={testLoading}
        className="fixed bottom-6 right-6 z-50 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 rounded-lg font-medium"
        size="sm"
      >
        {testLoading ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Testando V2...
          </>
        ) : (
          <>
            🧪 Testar V2
          </>
        )}
      </Button>
    </div>
  );
};

export default Details;