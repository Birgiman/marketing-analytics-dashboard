import Header from "@/components/Header";
import { LiveMetricsCards } from "@/components/LiveMetricsCards";
import { ScreenNavigatorLives } from "@/components/ScreenNavigatorLives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getLiveDataFromDatabase } from '@/utils/LiveData/getLiveData';
import { MetaHierarchicalTable } from "@/components/MetaHierarchicalTable";
import { AlertCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const TrafficAnalysis = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const liveId = searchParams.get('live');
  
  // Estados principais
  const [live, setLive] = useState<{
    id: string;
    name: string;
    ad_budget?: number;
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
    traffic_last_synced_at?: string;
  } | null>(null);

  const [campaignsWithInsights, setCampaignsWithInsights] = useState<Array<{
    campaign_id: string;
    campaign_name?: string;
    insights: Array<{
      campaign_name?: string;
      ad_name?: string;
      date_start?: string;
      spend?: string;
      impressions?: string;
      actions?: Array<{
        action_type: string;
        value: string;
      }>;
    }>;
  }>>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isButtonRefreshing, setIsButtonRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Métricas calculadas
  const [metrics, setMetrics] = useState<{
    cplLiquido: number;
    cplMeta: number;
    retentionRate: number;
  } | null>(null);

  const [extractedData, setExtractedData] = useState<{
    metaData: {
      totalSpend: number;
      totalResults: number;
      totalImpressions: number;
      totalClicks: number;
      totalReach: number;
      campaignCount: number;
      insightsCount: number;
    };
    groupData: {
      totalMembers: number;
      totalGroups: number;
      entries: number;
      exits: number;
      activeMembers: number;
    };
    liveInfo: {
      id: string;
      name: string;
      orcamentoGasto?: number;
      orcamentoTotal?: number;
    };
  } | null>(null);

  // Função para carregar dados do banco
  const loadDataFromDatabase = useCallback(async (isFromButton = false) => {
    if (!liveId) return;
    
    try {
      const liveData = await getLiveDataFromDatabase(liveId);
      
      if (liveData) {
        // Atualizar dados básicos da Live
        setLive({
          id: liveData.id,
          name: liveData.name,
          ad_budget: parseFloat(liveData.ad_budget),
          cached_metrics: liveData.cached_metrics || undefined,
          cached_group_data: liveData.cached_group_data || undefined,
          cached_traffic_data: liveData.cached_traffic_data || undefined,
          cached_traffic_metrics: liveData.cached_traffic_metrics as any || undefined,
          traffic_last_synced_at: liveData.traffic_last_synced_at
        });
        
        // Extrair métricas do cache
        if (liveData.cached_metrics) {
          const cachedMetrics = liveData.cached_metrics;
          setMetrics({
            cplMeta: cachedMetrics.cplMeta || 0,
            cplLiquido: cachedMetrics.cplLiquido || 0,
            retentionRate: cachedMetrics.retentionRate || 0
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
                totalImpressions: 0,
                totalClicks: 0,
                totalReach: 0,
                campaignCount: cachedMetaData.campaignCount || 0,
                insightsCount: 0
              },
              groupData: {
                totalGroups: cachedGroupData.totalGroups || 0,
                totalMembers: cachedGroupData.totalMembers || 0,
                entries: cachedGroupData.entries || 0,
                exits: cachedGroupData.exits || 0,
                activeMembers: cachedGroupData.activeMembers || 0
              },
              liveInfo: {
                id: liveData.id,
                name: liveData.name,
                orcamentoGasto: 0,
                orcamentoTotal: parseFloat(liveData.ad_budget)
              }
            });
          }
        }
        
        // Carregar campanhas com insights (dados para tabela hierárquica)
        if (liveData.cached_traffic_data && (liveData.cached_traffic_data as any).campaignsWithInsights) {
          const formattedCampaignsWithInsights = (liveData.cached_traffic_data as any).campaignsWithInsights.map((campaign: any) => ({
            campaign_id: campaign.campaign_id,
            campaign_name: campaign.campaign_name || '',
            insights: campaign.insights.map((insight: any) => ({
              campaign_name: insight.campaign_name || '',
              ad_name: insight.ad_name || '',
              date_start: insight.date_start || '',
              spend: insight.spend || '0',
              impressions: insight.impressions || '0',
              actions: insight.actions || []
            }))
          }));

          setCampaignsWithInsights(formattedCampaignsWithInsights);
        }
        
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      setError(`Erro ao carregar dados: ${error}`);
      setIsLoading(false);
    } finally {
      if (isFromButton) {
        setIsButtonRefreshing(false);
      }
    }
  }, [liveId]);

  // Carregar dados quando componente monta
  useEffect(() => {
    if (liveId) {
      loadDataFromDatabase();
    }
  }, [liveId, loadDataFromDatabase]);

  // Função para iniciar refresh
  const handleRefreshStart = () => {
    setIsButtonRefreshing(true);
  };

  // Preparar dados do gráfico
  const chartData = live?.cached_traffic_data?.dailyInsights?.map(insight => ({
    date: insight.date,
    spend: insight.spend,
    leads: insight.leads,
    cplMeta: insight.cplMeta
  })) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl">Carregando análise de tráfego...</div>
          <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin border-2 border-blue-600 border-t-transparent rounded-full"></div>
            Processando dados...
          </div>
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

  // Dados para exibição nas métricas
  const cplLiquido = metrics?.cplLiquido || 0;
  const cplMeta = metrics?.cplMeta || 0;
  const retentionRate = metrics?.retentionRate || 0;
  const totalSpend = extractedData?.metaData?.totalSpend || 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      {/* Navegação interna */}
      <ScreenNavigatorLives 
        liveId={liveId} 
        onRefresh={() => {}} 
        isRefreshing={false} 
        showRefreshButton={true} 
        onDataUpdated={loadDataFromDatabase} 
        onRefreshStart={handleRefreshStart} 
      />
      
      <div className="container mx-auto p-6 space-y-8 relative">
        {/* Overlay de loading quando está atualizando */}
        {isButtonRefreshing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-xl font-semibold">Atualizando dados...</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
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
          groupMembers={extractedData?.groupData?.totalMembers || 0} 
          groupExits={extractedData?.groupData?.exits || 0} 
          activeLeads={extractedData?.groupData?.activeMembers || 0} 
          isLoading={isLoading} 
        />

        {/* Gráfico de Performance Diária */}
        <Card>
          <CardHeader>
            <CardTitle>📈 Performance Diária</CardTitle>
            <CardDescription>Evolução dos gastos e leads ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{
              spend: {
                label: "Gasto (R$)",
                color: "hsl(var(--chart-1))",
              },
              leads: {
                label: "Leads",
                color: "hsl(var(--chart-2))",
              },
            }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="spend" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    dot={{
                      fill: "hsl(var(--chart-1))",
                      strokeWidth: 2,
                      r: 4,
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={{
                      fill: "hsl(var(--chart-2))",
                      strokeWidth: 2,
                      r: 4,
                    }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Análise Hierárquica Meta Ads */}
        <MetaHierarchicalTable 
          campaignsWithInsights={campaignsWithInsights}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default TrafficAnalysis;