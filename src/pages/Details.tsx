import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, DollarSign, Target, Activity, RefreshCw, AlertCircle } from "lucide-react";
import PerformanceAnalysis from "@/components/PerformanceAnalysis";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Live, Group } from "@/types";
import { DEMO_MODE } from "@/lib/demo-mode";
import { useMetaLivesData } from "@/hooks/useMetaLivesData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetaCampaignsList } from "@/components/MetaCampaignsList";

const Details = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const liveId = searchParams.get('live');
  
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState<Live | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Usar hook para dados do Meta Ads
  const {
    creatives,
    isLoading: metaLoading,
    isConnected: metaConnected,
    hasMetaIntegration,
    error: metaError,
    lastUpdated,
    refreshData: refreshMetaData,
    clearError
  } = useMetaLivesData(userId || undefined);

  useEffect(() => {
    const fetchData = async () => {
      if (!liveId || DEMO_MODE) {
        // Para demo mode, criar dados fictícios
        setLive({
          id: 'demo-live-1',
          name: 'Live Demo',
          user_id: 'demo-user',
          live_date: new Date().toISOString(),
          participants: 1250,
          sales: 45,
          revenue: 15680.50,
          current_viewers: 320,
          peak_viewers: 580,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // Dados de creatives vêm do hook useMetaLivesData
        
        setGroups([
          {
            id: '1',
            nome_grupo: 'Grupo VIP Live',
            evento: 'ENTROU',
            telefone: '11999999999',
            data_hora: new Date().toISOString(),
            created_at: new Date().toISOString(),
            user_id: 'demo-user'
          }
        ]);
        
        setLoading(false);
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

        // Buscar dados de grupos (WhatsApp)
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .eq('user_id', liveData.user_id);

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
    if (!creatives || !groups || creatives.length === 0 || groups.length === 0) return 0;
    
    const totalSpent = creatives.reduce((sum, item) => {
      const amount = item.amount_spent || 0;
      return sum + amount;
    }, 0);
    
    const totalEntrou = groups.filter(grupo => grupo.evento === 'ENTROU').length;
    return totalEntrou > 0 ? totalSpent / totalEntrou : 0;
  };

  // Calcular dados dos grupos
  const calculateGroupData = () => {
    if (!groups || groups.length === 0) {
      return { entrou: 0, saiu: 0, ativos: 0 };
    }
    
    const entrou = groups.filter(grupo => grupo.evento === 'ENTROU').length;
    const saiu = groups.filter(grupo => grupo.evento === 'SAIU').length;
    const ativos = entrou - saiu;
    
    return { entrou, saiu, ativos };
  };

  // Calcular taxa de retenção
  const calculateRetentionRate = () => {
    if (!creatives || creatives.length === 0) return 0;
    
    const totalLeads = creatives.reduce((sum, item) => {
      const leads = item.leads || 0;
      return sum + leads;
    }, 0);
    
    const { entrou } = calculateGroupData();
    
    return totalLeads > 0 ? Math.round(entrou / totalLeads * 100) : 0;
  };

  // Calcular CPL Meta
  const calculateCPLMeta = () => {
    if (!creatives || creatives.length === 0) return 0;
    
    const totalSpent = creatives.reduce((sum, item) => {
      const amount = item.amount_spent || 0;
      return sum + amount;
    }, 0);
    
    const totalLeads = creatives.reduce((sum, item) => {
      const leads = item.leads || 0;
      return sum + leads;
    }, 0);
    
    return totalLeads > 0 ? totalSpent / totalLeads : 0;
  };

  if (loading || (userId && metaLoading && creatives.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl">Carregando detalhes...</div>
          {metaLoading && (
            <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Buscando dados do Meta Ads...
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Detalhes da Live</h1>
            <p className="text-muted-foreground mt-1">{live.name}</p>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-1">
                Dados atualizados: {lastUpdated.toLocaleString('pt-BR')}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Status da Integração Meta */}
            <div className="flex items-center gap-2">
              {hasMetaIntegration ? (
                metaConnected ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Meta Ads Conectado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Meta Ads: Sem Dados
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="bg-gray-100 text-gray-600">
                  Meta Ads Não Conectado
                </Badge>
              )}
            </div>
            
            {/* Botão Refresh */}
            {hasMetaIntegration && (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshMetaData}
                disabled={metaLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${metaLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            )}
          </div>
        </div>
        
        {/* Error Alert */}
        {metaError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">Erro ao carregar dados do Meta Ads</p>
                <p className="text-xs text-red-600 mt-1">{metaError}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
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
                  <strong>CPL Líquido & Meta:</strong> {hasMetaIntegration ? 'Meta Ads integrado' : 'Dados de exemplo - Configure integração Meta Ads'}
                </p>
                <p>
                  <strong>Dados de Grupos:</strong> WhatsApp Business via Evolution API
                </p>
                <p>
                  <strong>Total de Campanhas:</strong> {creatives.length} registro(s)
                </p>
              </div>
            </div>
            {!hasMetaIntegration && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/integrations')}
                className="bg-white hover:bg-blue-50"
              >
                Configurar Meta Ads
              </Button>
            )}
          </div>
        </div>
        
        {/* Lista de Campanhas Meta Ads */}
        <MetaCampaignsList 
          creatives={creatives} 
          isLoading={metaLoading}
        />
        
        {/* Análise de Performance */}
        <PerformanceAnalysis />
      </div>
    </div>
  );
};

export default Details;