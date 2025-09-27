import Header from "@/components/Header";
import { LiveMetricsCards } from "@/components/LiveMetricsCards";
import { ScreenNavigatorLives } from "@/components/ScreenNavigatorLives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const TrafficAnalysis = () => {
  const [searchParams] = useSearchParams();
  const liveId = searchParams.get('live');
  
  // Estados básicos
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<any>(null);
  const [cacheStatus, setCacheStatus] = useState({
    isLoading: false,
    fromCache: false,
    needsRefresh: false,
    lastSynced: new Date().toISOString()
  });

  // Função para carregar dados do banco
  const loadDataFromDatabase = useCallback(async () => {
    if (!liveId) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Buscar dados básicos da Live diretamente do Supabase
      const { data: liveData, error } = await supabase
        .from('lives')
        .select('*')
        .eq('id', liveId)
        .single();

      if (error || !liveData) {
        console.error('[TrafficAnalysis] Erro ao buscar Live:', error);
        setError('Live não encontrada');
        return;
      }

      // Atualizar dados básicos da Live
      setLive({
        id: liveData.id,
        name: liveData.name,
        ad_budget: parseFloat(liveData.ad_budget),
        insights_date_since: liveData.insights_date_since,
        insights_date_until: liveData.insights_date_until,
        campaign_search_term: liveData.campaign_search_term,
        sales_goal: liveData.sales_goal,
        leads_goal: liveData.leads_goal,
        created_at: liveData.created_at,
        updated_at: liveData.updated_at
      });

      // Atualizar status do cache
      setCacheStatus({
        isLoading: false,
        fromCache: true,
        needsRefresh: false,
        lastSynced: liveData.traffic_last_synced_at || new Date().toISOString()
      });

    } catch (error) {
      console.error('[TrafficAnalysis] Erro ao carregar dados:', error);
      setError('Erro ao carregar dados da live');
    } finally {
      setIsLoading(false);
    }
  }, [liveId]);

  // Função para chamar Edge Function
  const syncLiveMetaData = async (liveId: string) => {
    try {
      console.log(`🔄 [TrafficAnalysis] Chamando Edge Function syncLiveMetaData para Live: ${liveId}`);
      
      const { data, error } = await supabase.functions.invoke('sync-live-meta-data', {
        body: { liveId }
      });

      if (error) {
        console.error(`❌ [TrafficAnalysis] Edge Function falhou:`, error);
        throw error;
      }

      console.log(`✅ [TrafficAnalysis] Edge Function executada com sucesso:`, data);
      return data;
    } catch (error) {
      console.error(`❌ [TrafficAnalysis] Erro na Edge Function:`, error);
      throw error;
    }
  };

  // Função para refresh
  const handleRefresh = async () => {
    if (!liveId) return;
    
    setCacheStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Chamar Edge Function para atualizar dados
      await syncLiveMetaData(liveId);
      
      // Recarregar dados do cache atualizado
      await loadDataFromDatabase();
      
    } catch (error) {
      console.error('❌ [TrafficAnalysis] Erro ao atualizar dados:', error);
      setError(`Erro ao atualizar dados: ${error}`);
    } finally {
      setCacheStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Carregar dados na inicialização
  useEffect(() => {
    if (liveId) {
      loadDataFromDatabase();
    }
  }, [liveId, loadDataFromDatabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl">Carregando análise de tráfego...</div>
          <div className="text-sm text-gray-600">Aguarde enquanto carregamos os dados</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div className="text-xl text-red-600">Erro</div>
          <div className="text-sm text-gray-600">{error}</div>
          <Button onClick={() => loadDataFromDatabase()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!live) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl">Live não encontrada</div>
          <div className="text-sm text-gray-600">Verifique se o ID da live está correto</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Navegação entre telas */}
        <ScreenNavigatorLives 
          liveId={liveId!} 
          onRefreshStart={handleRefresh}
          onDataUpdated={() => loadDataFromDatabase()}
        />

        {/* Título e botão de refresh */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Análise de Tráfego</h1>
            <p className="text-gray-600 mt-2">
              {live.name} • {live.insights_date_since} → {live.insights_date_until}
            </p>
          </div>
          
          <Button 
            onClick={handleRefresh}
            disabled={cacheStatus.isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${cacheStatus.isLoading ? 'animate-spin' : ''}`} />
            {cacheStatus.isLoading ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>

        {/* Status do cache */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Status dos Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">Fonte</div>
                <div className="text-gray-600">
                  {cacheStatus.fromCache ? 'Cache' : 'API'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Última Sincronização</div>
                <div className="text-gray-600">
                  {new Date(cacheStatus.lastSynced).toLocaleString('pt-BR')}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Status</div>
                <div className="text-gray-600">
                  {cacheStatus.isLoading ? 'Carregando...' : 'Atualizado'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Necessita Refresh</div>
                <div className="text-gray-600">
                  {cacheStatus.needsRefresh ? 'Sim' : 'Não'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas da Live */}
        <LiveMetricsCards 
          cplLiquido={0}
          cplMeta={0}
          retentionRate={0}
          groupMembers={0}
          groupExits={0}
          activeLeads={0}
        />

        {/* Placeholder para dados de tráfego */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Dados de Tráfego</CardTitle>
            <CardDescription>
              Os dados de tráfego serão carregados pela Edge Function syncLiveMetaData
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <div className="text-lg mb-2">🚧 Em Desenvolvimento</div>
              <div className="text-sm">
                Esta seção será implementada para exibir os dados de tráfego
                coletados pela Edge Function syncLiveMetaData
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrafficAnalysis;