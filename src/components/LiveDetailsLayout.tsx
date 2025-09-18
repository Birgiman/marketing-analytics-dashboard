import Header from "@/components/Header";
import { LiveMetricsCards } from "@/components/LiveMetricsCards";
import PerformanceAnalysis from "@/components/PerformanceAnalysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiveCampaignData } from "@/hooks/useLiveCampaignData";
import { useLiveDataCache } from "@/hooks/useLiveDataCache";
import { useLiveMetrics } from "@/hooks/useLiveMetrics";
import { fetchCompleteLiveData } from "@/utils/liveDataFetcher";
import { Activity, AlertCircle, BarChart3, RefreshCw, Search, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// Importar os componentes das sub-páginas
import TrafficAnalysisContent from "./TrafficAnalysisContent";
import ResearchInsightsContent from "./ResearchInsightsContent";

interface LiveDetailsLayoutProps {
  defaultTab?: string;
}

const LiveDetailsLayout = ({ defaultTab = "details" }: LiveDetailsLayoutProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const liveId = searchParams.get('live');
  const currentTab = searchParams.get('tab') || defaultTab;

  const [testLoading, setTestLoading] = useState(false);

  // ===============================================
  // SISTEMA DE CACHE COMPARTILHADO
  // ===============================================

  // Usar hook de cache para dados da Live (compartilhado entre abas)
  const {
    live,
    groups,
    campaigns,
    metrics,
    isLoading: cacheLoading,
    error: cacheError,
    isFromCache,
    refresh: refreshCache,
    updateMetrics
  } = useLiveDataCache({ liveId: liveId || '' });

  // Usar hook para dados das campanhas específicas da Live (com cache)
  const {
    campaigns: campaignData,
    isLoading: campaignsLoading,
    error: campaignsError,
    refreshData: refreshCampaigns,
    clearError: clearCampaignsError
  } = useLiveCampaignData(liveId || '');

  // Usar dados do hook que tem insights, senão usar dados do cache
  const finalCampaigns = campaignData.length > 0 ? campaignData : campaigns;

  // Usar hook para métricas em tempo real com dados salvos da Live
  const {
    metrics: liveMetrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useLiveMetrics({
    liveId: liveId || '',
    since: live?.insights_date_since || '',
    until: live?.insights_date_until || '',
    enabled: !!liveId && !!live?.insights_date_since && !!live?.insights_date_until
  });

  // Atualizar métricas no cache quando recebidas
  useEffect(() => {
    if (liveMetrics) {
      updateMetrics(liveMetrics);
    }
  }, [liveMetrics, updateMetrics]);

  // Navegar para /lives se não há liveId
  useEffect(() => {
    if (!liveId) {
      navigate('/lives');
    }
  }, [liveId, navigate]);

  // ===============================================
  // NAVEGAÇÃO POR ABAS SEM RECARREGAMENTO
  // ===============================================

  const handleTabChange = (newTab: string) => {
    // Atualizar URL sem recarregar página
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', newTab);
    setSearchParams(newParams);
  };

  // ===============================================
  // CÁLCULOS COMPARTILHADOS
  // ===============================================

  const calculateCPLLiquido = () => {
    if (!finalCampaigns || !groups || finalCampaigns.length === 0 || groups.length === 0) return 0;

    const totalSpent = finalCampaigns.reduce((sum, campaign) => {
      const spend = parseFloat(campaign.insights?.spend || '0');
      return sum + spend;
    }, 0);

    const totalEntrou = groups.reduce((sum, group) => sum + (group.group_size || 0), 0);

    return totalEntrou > 0 ? totalSpent / totalEntrou : 0;
  };

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

  const calculateRetentionRate = () => {
    if (!finalCampaigns || finalCampaigns.length === 0) return 0;

    const totalLeads = finalCampaigns.reduce((sum, campaign) => {
      const actions = campaign.insights?.actions || [];
      const leadAction = actions.find(action =>
        action.action_type === 'lead' ||
        action.action_type === 'submit_application' ||
        action.action_type === 'complete_registration'
      );
      return sum + (leadAction ? parseInt(leadAction.value) : 0);
    }, 0);

    const { entrou } = calculateGroupData();

    return totalLeads > 0 ? Math.round(entrou / totalLeads * 100) : 0;
  };

  const calculateCPLMeta = () => {
    if (!finalCampaigns || finalCampaigns.length === 0) return 0;

    const totalSpent = finalCampaigns.reduce((sum, campaign) => {
      const spend = parseFloat(campaign.insights?.spend || '0');
      return sum + spend;
    }, 0);

    const totalLeads = finalCampaigns.reduce((sum, campaign) => {
      const actions = campaign.insights?.actions || [];
      const leadAction = actions.find(action =>
        action.action_type === 'lead' ||
        action.action_type === 'submit_application' ||
        action.action_type === 'complete_registration'
      );
      return sum + (leadAction ? parseInt(leadAction.value) : 0);
    }, 0);

    return totalLeads > 0 ? totalSpent / totalLeads : 0;
  };

  // ===============================================
  // FUNÇÃO DE ATUALIZAÇÃO PRINCIPAL (BOTÃO ANALISAR DADOS)
  // ===============================================

  const handleAnalyzeData = async () => {
    if (!liveId) return;

    setTestLoading(true);
    try {
      console.log('🔄 [LiveDetailsLayout] Atualizando dados completos da Live:', liveId);

      // Atualizar cache principal
      refreshCache();

      // Atualizar dados das campanhas (busca fresh no Meta)
      await refreshCampaigns();

      // Buscar métricas atualizadas
      await refetchMetrics();

      console.log('✅ [LiveDetailsLayout] Dados atualizados com sucesso');

    } catch (error) {
      console.error('❌ [LiveDetailsLayout] Erro ao atualizar dados:', error);
    } finally {
      setTestLoading(false);
    }
  };

  // ===============================================
  // LOADING E ERROR STATES
  // ===============================================

  if (cacheLoading || campaignsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl">Carregando detalhes...</div>
          {campaignsLoading && (
            <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Buscando dados das campanhas...
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

  const cplLiquido = calculateCPLLiquido();
  const groupData = calculateGroupData();
  const retentionRate = calculateRetentionRate();
  const cplMeta = calculateCPLMeta();

  const totalSpend = finalCampaigns.reduce((sum, campaign) => {
    const spend = parseFloat(campaign.insights?.spend || '0');
    return sum + spend;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-8">
        {/* Header com botão principal */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">LiveShop Analytics</h1>
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

            {/* Botão Principal - Analisar Dados */}
            <Button
              onClick={handleAnalyzeData}
              disabled={testLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              {testLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analisar Dados
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {campaignsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">Erro ao carregar dados das campanhas</p>
                <p className="text-xs text-red-600 mt-1">{campaignsError}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCampaignsError}
                  className="mt-2 text-red-600 hover:text-red-700"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Métricas Principais (compartilhadas entre abas) */}
        <LiveMetricsCards
          cplLiquido={cplLiquido}
          cplMeta={metrics?.cpl_meta || cplMeta}
          retentionRate={retentionRate}
          groupMembers={groupData.entrou}
          groupExits={groupData.saiu}
          activeLeads={groupData.ativos}
          isLoading={metricsLoading || cacheLoading}
        />

        {/* Sistema de Abas */}
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="traffic" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Análise de Tráfego
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Insights de Pesquisa
            </TabsTrigger>
          </TabsList>

          {/* Aba Detalhes */}
          <TabsContent value="details" className="space-y-6">
            {/* Status dos Dados */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900">Fontes de Dados</h3>
                  <div className="text-sm text-blue-700 space-y-1 mt-1">
                    <p>
                      <strong>CPL Líquido & Meta:</strong> {finalCampaigns.length > 0 ? `Baseado em ${finalCampaigns.length === 1 ? '1 campanha vinculada' : `${finalCampaigns.length} campanhas vinculadas`}` : 'Nenhuma campanha vinculada'}
                    </p>
                    <p>
                      <strong>Dados de Grupos:</strong> WhatsApp Business via Evolution API
                    </p>
                    <p>
                      <strong>Total de Campanhas:</strong> {finalCampaigns.length === 0 ? 'Nenhum registro' : finalCampaigns.length === 1 ? '1 registro' : `${finalCampaigns.length} registros`}
                    </p>
                  </div>
                </div>
                {finalCampaigns.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/dashboard')}
                    className="bg-white hover:bg-blue-50"
                  >
                    Vincular Campanhas
                  </Button>
                )}
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
              {finalCampaigns.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                  {finalCampaigns.map((campaign) => (
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
          </TabsContent>

          {/* Aba Análise de Tráfego */}
          <TabsContent value="traffic">
            <TrafficAnalysisContent
              live={live}
              groups={groups}
              campaigns={finalCampaigns}
              metrics={metrics}
              liveMetrics={liveMetrics}
              isLoading={cacheLoading || campaignsLoading || metricsLoading}
            />
          </TabsContent>

          {/* Aba Insights de Pesquisa */}
          <TabsContent value="insights">
            <ResearchInsightsContent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LiveDetailsLayout;