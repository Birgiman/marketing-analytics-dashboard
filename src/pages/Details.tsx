import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, DollarSign, Target, Activity, RefreshCw, AlertCircle } from "lucide-react";
import PerformanceAnalysis from "@/components/PerformanceAnalysis";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Live, LiveGroup } from "@/types";
import { useLiveCampaignData } from "@/hooks/useLiveCampaignData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetaCampaignsList } from "@/components/MetaCampaignsList";
import { fetchCompleteLiveData } from "@/utils/liveDataFetcher";

const Details = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const liveId = searchParams.get('live');
  
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState<Live | null>(null);
  const [groups, setGroups] = useState<LiveGroup[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  
  // Usar hook para dados das campanhas específicas da Live
  const {
    campaigns,
    isLoading: campaignsLoading,
    error: campaignsError,
    refreshData: refreshCampaigns,
    clearError: clearCampaignsError
  } = useLiveCampaignData(liveId || '');

  useEffect(() => {
    const fetchData = async () => {
      if (!liveId) {
        navigate('/lives');
        return;
      }

      try {
        // Buscar dados da live
        const { data: liveData, error: liveError } = await supabase
          .from('lives')
          .select('*')
          .eq('id', liveId)
          .single();

        if (liveError) throw liveError;
        setLive(liveData);
        setUserId(liveData.user_id);

        // Buscar dados de grupos vinculados à Live
        const { data: groupsData, error: groupsError } = await supabase
          .from('live_groups')
          .select('*')
          .eq('live_id', liveId);

        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

        // Dados de creatives agora vêm do Meta Ads via hook

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [liveId, navigate]);

  // Calcular CPL Líquido
  const calculateCPLLiquido = () => {
    if (!campaigns || !groups || campaigns.length === 0 || groups.length === 0) return 0;
    
    // Usar dados reais de spend dos insights
    const totalSpent = campaigns.reduce((sum, campaign) => {
      const spend = parseFloat(campaign.insights?.spend || '0');
      return sum + spend;
    }, 0);
    
    // Para o CPL Líquido, usamos a soma do tamanho dos grupos vinculados
    const totalEntrou = groups.reduce((sum, group) => sum + group.group_size, 0);
    return totalEntrou > 0 ? totalSpent / totalEntrou : 0;
  };

  // Calcular dados dos grupos
  const calculateGroupData = () => {
    if (!groups || groups.length === 0) {
      return { entrou: 0, saiu: 0, ativos: 0 };
    }
    
    // Com a nova estrutura, usamos o tamanho total dos grupos
    const totalMembros = groups.reduce((sum, group) => sum + group.group_size, 0);
    const gruposMonitorados = groups.filter(group => group.monitoring).length;
    
    return { 
      entrou: totalMembros, 
      saiu: 0, // TODO: Implementar tracking de saídas
      ativos: totalMembros 
    };
  };

  // Calcular taxa de retenção
  const calculateRetentionRate = () => {
    if (!campaigns || campaigns.length === 0) return 0;
    
    // Extrair leads reais das actions dos insights
    const totalLeads = campaigns.reduce((sum, campaign) => {
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

  // Calcular CPL Meta
  const calculateCPLMeta = () => {
    if (!campaigns || campaigns.length === 0) return 0;

    // Usar dados reais de spend dos insights
    const totalSpent = campaigns.reduce((sum, campaign) => {
      const spend = parseFloat(campaign.insights?.spend || '0');
      return sum + spend;
    }, 0);

    // Extrair leads reais das actions dos insights
    const totalLeads = campaigns.reduce((sum, campaign) => {
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
      alert(`✅ Teste concluído com sucesso!\n\nLive: ${completeData.live.name}\nGrupos: ${completeData.summary.totalGroups} (${completeData.summary.totalGroupMembers} membros)\nCampanhas: ${completeData.summary.totalCampaigns} (${completeData.summary.activeCampaigns} ativas)\nGasto Total: $${completeData.summary.totalSpend}\nImpressões: ${completeData.summary.totalImpressions}\nCliques: ${completeData.summary.totalClicks}\n\nINSIGHTS (${insights.totalInsights} registros):\n• CPM Médio: $${insights.avgCPM}\n• CTR Médio: ${insights.avgCTR}%\n• CPP Médio: $${insights.avgCPP}\n• Custo por Clique Único: $${insights.avgCostPerUniqueClick}\n• Frequência Média: ${insights.avgFrequency}\n• Total de Ações: ${insights.totalActions}\n\nVeja o console para mais detalhes!`);

    } catch (error) {
      console.error('🧪 [TESTE] ❌ Erro ao buscar dados:', error);
      alert(`❌ Erro no teste: ${error}`);
    } finally {
      setTestLoading(false);
    }
  };

  if (loading || campaignsLoading) {
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

  // Calculate total spend for PerformanceAnalysis
  const totalSpend = campaigns.reduce((sum, campaign) => {
    const spend = parseFloat(campaign.insights?.spend || '0');
    return sum + spend;
  }, 0);

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
              {campaigns.length > 0 ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {campaigns.length === 1 ? '1 Campanha Vinculada' : `${campaigns.length} Campanhas Vinculadas`}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-100 text-gray-600">
                  Nenhuma Campanha Vinculada
                </Badge>
              )}
            </div>
            
            {/* Botão Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshCampaigns}
              disabled={campaignsLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${campaignsLoading ? 'animate-spin' : ''}`} />
              Atualizar
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

        {/* Métricas Principais */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPL Líquido</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {cplLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPL Meta</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {cplMeta.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tx de Retenção</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {retentionRate}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entrou no Grupo</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {groupData.entrou.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saiu do Grupo</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {groupData.saiu.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {groupData.ativos.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>
        </div>

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
                  <strong>CPL Líquido & Meta:</strong> {campaigns.length > 0 ? `Baseado em ${campaigns.length === 1 ? '1 campanha vinculada' : `${campaigns.length} campanhas vinculadas`}` : 'Nenhuma campanha vinculada'}
                </p>
                <p>
                  <strong>Dados de Grupos:</strong> WhatsApp Business via Evolution API
                </p>
                <p>
                  <strong>Total de Campanhas:</strong> {campaigns.length === 0 ? 'Nenhum registro' : campaigns.length === 1 ? '1 registro' : `${campaigns.length} registros`}
                </p>
              </div>
            </div>
            {campaigns.length === 0 && (
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
          <h3 className="text-xl font-semibold">Campanhas Vinculadas</h3>
          {campaigns.length > 0 ? (
            <div className="grid gap-4">
              {campaigns.map((campaign) => (
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

      {/* Botão de Teste - Posição fixa no canto inferior direito */}
      <Button
        onClick={handleTestLiveData}
        disabled={testLoading}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 rounded-lg font-medium"
        size="sm"
      >
        {testLoading ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Testando...
          </>
        ) : (
          <>
            🧪 Testar Dados
          </>
        )}
      </Button>
    </div>
  );
};

export default Details;