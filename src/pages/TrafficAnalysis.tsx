import Header from "@/components/Header";
import { LiveMetricsCards } from "@/components/LiveMetricsCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateCorrectAverageCPL, CampaignData, extractCampaignData } from "@/utils/data-extractors-v2";
import { calculateCompleteLiveMetrics } from "@/utils/live-metrics-v2";
import { fetchCompleteLiveData } from "@/utils/liveDataFetcher";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const TrafficAnalysis = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const liveId = searchParams.get('live');
  
  // Estados para dados V2 (mesmo padrão da Details.tsx)
  const [live, setLive] = useState<{
    id: string;
    name: string;
    ad_budget?: number;
  } | null>(null);
  const [groups, setGroups] = useState<Array<{
    id: string;
    group_id: string;
    group_name: string;
    group_size: number;
    monitoring: boolean;
    created_at: string;
    updated_at: string;
  }>>([]);
  const [campaigns, setCampaigns] = useState<Array<{
    campaign_id: string;
    campaign_name: string;
  }>>([]);
  const [campaignsWithInsights, setCampaignsWithInsights] = useState<Array<{
    campaign_id: string;
    campaign_name?: string;
    insights: Array<{
      date_start: string;
      spend: string;
      impressions: string;
      clicks: string;
      reach: string;
      actions?: Array<{
        action_type: string;
        value: string;
      }>;
    }>;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para métricas V2
  const [metricsV2, setMetricsV2] = useState<{
    cplLiquido: number;
    cplMeta: number;
    retentionRate: number;
  } | null>(null);
  const [extractedDataV2, setExtractedDataV2] = useState<{
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
  
  // Estados para dados por campanha
  const [campaignData, setCampaignData] = useState<CampaignData[]>([]);
  
  // Estados para filtros (baseado no exemplo)
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  
  // Buscar dados completos (mesmo padrão da Details.tsx)
  useEffect(() => {
    const fetchData = async () => {
      if (!liveId) return;
      
      try {
        setIsLoading(true);
        console.log('🔄 [TrafficAnalysis] Buscando dados completos...');
        
        const completeData = await fetchCompleteLiveData(liveId);
        
        console.log('✅ [TrafficAnalysis] Dados obtidos:', {
          live: completeData.live?.name,
          groups: completeData.groups?.length,
          campaigns: completeData.liveCampaigns?.length,
          insights: completeData.campaignInsights?.length
        });
        
        setLive(completeData.live);
        setGroups((completeData.groups || []).map(group => ({
          ...group,
          updated_at: (group as { updated_at?: string }).updated_at || group.created_at
        })));
        setCampaigns(completeData.liveCampaigns || []);
        setCampaignsWithInsights(completeData.campaignInsights || []);
        
        // Preencher campos de data com valores padrão da Live
        if (completeData.live?.insights_date_since && completeData.live?.insights_date_until) {
          setTempStartDate(completeData.live.insights_date_since);
          setTempEndDate(completeData.live.insights_date_until);
          setStartDate(completeData.live.insights_date_since);
          setEndDate(completeData.live.insights_date_until);
        }
        
        // Calcular métricas V2 usando o mesmo padrão da Details.tsx
        // Validar se campaignInsights existe antes de mapear
        const campaignInsights = (completeData.campaignInsights || []).map((campaign) => ({
          ...campaign,
          insights: campaign.insights || []
        }));
        
        // Preparar dados no formato correto para calculateCompleteLiveMetrics
        const liveDataForCalculations = {
          live: completeData.live,
          groups: completeData.groups || [],
          campaignInsights: campaignInsights
        };
        
        console.log('🔍 [TrafficAnalysis] Dados para cálculo:', {
          live: liveDataForCalculations.live?.name,
          groups: liveDataForCalculations.groups?.length,
          campaignInsights: liveDataForCalculations.campaignInsights?.length
        });
        
        const result = calculateCompleteLiveMetrics(liveDataForCalculations);
        
        console.log('🧮 [TrafficAnalysis] Métricas V2 calculadas:', {
          cplLiquido: result.metrics.cplLiquido,
          cplMeta: result.metrics.cplMeta,
          retentionRate: result.metrics.retentionRate
        });
        
        setMetricsV2(result.metrics);
        setExtractedDataV2(result.extractedData);
        
        // Extrair dados individuais por campanha
        const individualCampaignData = extractCampaignData(campaignInsights, completeData.allUserCampaigns);
        setCampaignData(individualCampaignData);
        
        console.log('🎯 [TrafficAnalysis] Dados por campanha:', individualCampaignData);
        
      } catch (err) {
        console.error('❌ [TrafficAnalysis] Erro ao carregar dados:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [liveId]);
  
  // Usar métricas V2 calculadas
  const cplLiquido = metricsV2?.cplLiquido || 0;
  const cplMeta = metricsV2?.cplMeta || 0;
  const retentionRate = metricsV2?.retentionRate || 0;
  
  // Calcular dados dos grupos
  const groupData = {
    entrou: groups?.reduce((sum, group) => sum + (group.group_size || 0), 0) || 0,
    saiu: 0, // TODO: Implementar tracking de saídas
    ativos: groups?.reduce((sum, group) => sum + (group.group_size || 0), 0) || 0
  };
  
  // Calcular totais para os cabeçalhos das colunas
  const calculateTotals = () => {
    return {
      totalInvestment: extractedDataV2?.metaData?.totalSpend || 0,
      totalLeads: extractedDataV2?.metaData?.totalResults || 0,
      totalGroup: groupData.entrou,
      totalGroupExit: groupData.saiu
    };
  };
  
  const totals = calculateTotals();
  
  // Calcular CPL médio correto para a tabela de campanhas
  const correctAverageCPL = calculateCorrectAverageCPL(campaignData);
  
  // Calcular dados diários (baseado no exemplo)
  const calculateDailyData = () => {
    if (!campaignsWithInsights || campaignsWithInsights.length === 0) {
      return [];
    }
    
    const dailyData: Record<string, {
      date: string;
      investment: number;
      cadastros: number;
      group: number;
      groupExit: number;
      cplMeta: number;
      cplLiquido: number;
      retention: number;
    }> = {};
    
    // Processar dados das campanhas (Meta API)
    campaignsWithInsights.forEach(campaign => {
      if (!campaign.insights || !Array.isArray(campaign.insights)) return;
      
      campaign.insights.forEach((insight) => {
        if (!insight.date_start) return;
        
        const dateKey = insight.date_start;
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = {
            date: dateKey,
            investment: 0,
            cadastros: 0,
            group: 0,
            groupExit: 0,
            cplMeta: 0,
            cplLiquido: 0,
            retention: 0
          };
        }
        
        const spend = parseFloat(insight.spend || '0');
        const results = parseInt(insight.actions?.[0]?.value || '0');
        
        dailyData[dateKey].investment += spend;
        dailyData[dateKey].cadastros += results;
      });
    });
    
    // Processar dados dos grupos (WhatsApp/Evolution API)
    // TODO: Implementar lógica de grupos quando dados estiverem disponíveis
    // Por enquanto, usar dados simulados baseados nos cadastros
    Object.values(dailyData).forEach((day) => {
      // Simular entrada no grupo baseado nos cadastros (80% de retenção)
      day.group = Math.round(day.cadastros * 0.8);
      // Simular saídas do grupo (5% dos que entraram)
      day.groupExit = Math.round(day.group * 0.05);
    });
    
    // Calcular CPL Meta e CPL Líquido para cada dia
    Object.values(dailyData).forEach((day) => {
      day.cplMeta = day.cadastros > 0 ? day.investment / day.cadastros : 0;
      day.cplLiquido = day.group > 0 ? day.investment / day.group : 0;
      day.retention = day.cadastros > 0 ? Math.round(day.group / day.cadastros * 100) : 0;
    });
    
    return Object.values(dailyData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };
  
  const tableData = calculateDailyData();
  
  // Filtrar dados por data
  const filterDataByDate = (data: Array<{
    date: string;
    investment: number;
    cadastros: number;
    group: number;
    groupExit: number;
    cplMeta: number;
    cplLiquido: number;
    retention: number;
  }>) => {
    if (!startDate || !endDate) return data;
    
    return data.filter(day => {
      if (!day.date) return false;
      return day.date >= startDate && day.date <= endDate;
    });
  };
  
  const filteredTableData = filterDataByDate(tableData);
  
  // Funções de ordenação (baseado no exemplo)
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
  
  const sortedData = [...filteredTableData].sort((a, b) => {
    if (!sortField) return 0;
    const aValue = a[sortField as keyof typeof a];
    const bValue = b[sortField as keyof typeof b];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  const handleApplyFilters = async () => {
    if (!tempStartDate || !tempEndDate) return;
    
    try {
      setIsLoading(true);
      console.log('🔄 [TrafficAnalysis] Aplicando filtros de data:', {
        startDate: tempStartDate,
        endDate: tempEndDate
      });
      
      // Atualizar as datas ativas
      setStartDate(tempStartDate);
      setEndDate(tempEndDate);
      
      // Fazer nova requisição com o período filtrado
      if (liveId) {
        const completeData = await fetchCompleteLiveData(liveId, tempStartDate, tempEndDate);
        
        console.log('✅ [TrafficAnalysis] Dados filtrados obtidos:', {
          live: completeData.live?.name,
          groups: completeData.groups?.length,
          campaigns: completeData.liveCampaigns?.length,
          insights: completeData.campaignInsights?.length
        });
        
        // Atualizar dados com o novo período
        setGroups((completeData.groups || []).map(group => ({
          ...group,
          updated_at: (group as { updated_at?: string }).updated_at || group.created_at
        })));
        setCampaigns(completeData.liveCampaigns || []);
        setCampaignsWithInsights(completeData.campaignInsights || []);
        
        // Recalcular métricas V2
        const campaignInsights = (completeData.campaignInsights || []).map((campaign) => ({
          ...campaign,
          insights: campaign.insights || []
        }));
        
        const liveDataForCalculations = {
          live: completeData.live,
          groups: completeData.groups || [],
          campaignInsights: campaignInsights
        };
        
        const result = calculateCompleteLiveMetrics(liveDataForCalculations);
        setMetricsV2(result.metrics);
        setExtractedDataV2(result.extractedData);
        
        // Recalcular dados por campanha
        const individualCampaignData = extractCampaignData(campaignInsights, completeData.allUserCampaigns);
        setCampaignData(individualCampaignData);
        
        console.log('🎯 [TrafficAnalysis] Dados filtrados por campanha:', individualCampaignData);
      }
      
    } catch (err) {
      console.error('❌ [TrafficAnalysis] Erro ao aplicar filtros:', err);
      setError(err instanceof Error ? err.message : 'Erro ao aplicar filtros');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl">Carregando análise de tráfego...</div>
          <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin border-2 border-blue-600 border-t-transparent rounded-full"></div>
            Buscando dados do Meta Ads...
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl text-red-600">❌ Erro: {error}</div>
          <div className="text-sm text-gray-600">
            Verifique se a live existe e se você tem permissão para acessá-la.
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      {/* Navegação interna */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="flex flex-1 items-center justify-center space-x-2">
            <Button variant={location.pathname === "/details" ? "default" : "outline"} size="sm" asChild>
              <Link to={`/details?live=${liveId}`}>Dashboard</Link>
            </Button>
            <Button variant={location.pathname === "/traffic-analysis" ? "default" : "outline"} size="sm" asChild>
              <Link to={`/traffic-analysis?live=${liveId}`}>Análise de Tráfego</Link>
            </Button>
            <Button variant={location.pathname === "/research-insights" ? "default" : "outline"} size="sm" asChild>
              <Link to={`/research-insights?live=${liveId}`}>Insights de Pesquisa</Link>
            </Button>
            <Button variant={location.pathname === "/sales-by-group" ? "default" : "outline"} size="sm" asChild>
              <Link to={`/sales-by-group?live=${liveId}`}>Públicos</Link>
            </Button>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto p-6 space-y-8">
        {/* Métricas Principais */}
        <LiveMetricsCards
          cplLiquido={cplLiquido}
          cplMeta={cplMeta}
          retentionRate={retentionRate}
          groupMembers={groupData.entrou}
          groupExits={groupData.saiu}
          activeLeads={groupData.ativos}
          isLoading={isLoading}
        />
        
        {/* Tabela de Dados Diários */}
        <Card>
          <CardHeader>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>📅 Dados Diários de Captação</CardTitle>
                <CardDescription>Performance detalhada dos últimos dias por campanha</CardDescription>
              </div>
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Data início:</label>
                  <Input type="date" className="w-auto" value={tempStartDate} onChange={e => setTempStartDate(e.target.value)} />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Data fim:</label>
                  <Input type="date" className="w-auto" value={tempEndDate} onChange={e => setTempEndDate(e.target.value)} />
                </div>
                <Button onClick={handleApplyFilters} className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtrar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('date')} className="h-auto p-0 font-medium flex items-center gap-1">
                        Data
                        {getSortIcon('date')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('investment')} className="h-auto p-0 font-medium flex flex-col items-center gap-1">
                        <div className="text-center">
                          <div>Investimento</div>
                          <div className="text-xs text-muted-foreground font-normal">Total: R$ {totals.totalInvestment.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}</div>
                        </div>
                        {getSortIcon('investment')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('cadastros')} className="h-auto p-0 font-medium flex flex-col items-center gap-1">
                        <div className="text-center">
                          <div>Cadastros Meta</div>
                          <div className="text-xs text-muted-foreground font-normal">Total: {totals.totalLeads.toLocaleString('pt-BR')}</div>
                        </div>
                        {getSortIcon('cadastros')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('group')} className="h-auto p-0 font-medium flex flex-col items-center gap-1">
                        <div className="text-center">
                          <div>Entrou no Grupo</div>
                          <div className="text-xs text-muted-foreground font-normal">Total: {totals.totalGroup.toLocaleString('pt-BR')}</div>
                        </div>
                        {getSortIcon('group')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('groupExit')} className="h-auto p-0 font-medium flex flex-col items-center gap-1">
                        <div className="text-center">
                          <div>Saiu do Grupo</div>
                          <div className="text-xs text-muted-foreground font-normal">Total: {totals.totalGroupExit.toLocaleString('pt-BR')}</div>
                        </div>
                        {getSortIcon('groupExit')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('cplMeta')} className="h-auto p-0 font-medium flex items-center gap-1">
                        CPL Meta
                        {getSortIcon('cplMeta')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('cplLiquido')} className="h-auto p-0 font-medium flex items-center gap-1">
                        CPL Líquido
                        {getSortIcon('cplLiquido')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button variant="ghost" onClick={() => handleSort('retention')} className="h-auto p-0 font-medium flex items-center gap-1">
                        Taxa Retenção
                        {getSortIcon('retention')}
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((day, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {new Date(day.date).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit' 
                        })}
                      </TableCell>
                      <TableCell className="text-center font-medium">R$ {day.investment.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</TableCell>
                      <TableCell className="text-center font-medium">{day.cadastros.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-center font-medium">{day.group.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-center font-medium">{day.groupExit.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-center font-semibold">
                        R$ {day.cplMeta.toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        R$ {day.cplLiquido.toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell className="text-center">
                        {day.retention}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        {isLoading ? 'Carregando dados...' : 'Nenhum dado encontrado para o período selecionado'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* Gráfico de Evolução do CPL */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Evolução do CPL</CardTitle>
            <CardDescription>Comparação entre CPL Meta e CPL Líquido ao longo dos dias</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ChartContainer config={{
              cplMeta: {
                label: "CPL Meta",
                color: "hsl(var(--chart-1))"
              },
              cplLiquido: {
                label: "CPL Líquido",
                color: "hsl(var(--chart-2))"
              }
            }} className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedData.map(day => ({
                  dia: new Date(day.date).toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit' 
                  }),
                  cplMeta: day.cplMeta,
                  cplLiquido: day.cplLiquido
                }))} margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5
                }}>
                  <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={value => `R$ ${value.toFixed(2)}`} />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={(value, name) => [`R$ ${Number(value).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}`, name === 'cplLiquido' ? 'CPL Líquido' : 'CPL Meta']} />
                  <Line type="monotone" dataKey="cplLiquido" stroke="hsl(var(--destructive))" strokeWidth={4} dot={false} activeDot={{
                    r: 6,
                    fill: "hsl(var(--destructive))"
                  }} />
                  <Line type="monotone" dataKey="cplMeta" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="8 4" dot={false} activeDot={{
                    r: 4,
                    fill: "hsl(var(--primary))"
                  }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        
        {/* Análise Profunda de Conjuntos de Anúncios */}
        <Card>
          <CardHeader>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>🏆 Análise Profunda de Conjuntos de Anúncios</CardTitle>
              </div>
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Data início:</label>
                  <Input type="date" className="w-auto" value={tempStartDate} onChange={e => setTempStartDate(e.target.value)} />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Data fim:</label>
                  <Input type="date" className="w-auto" value={tempEndDate} onChange={e => setTempEndDate(e.target.value)} />
                </div>
                <Button onClick={handleApplyFilters} className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtrar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('ad_set_name')} className="h-auto p-0 font-medium flex items-center gap-1">
                      Conjunto de Anúncios
                      {getSortIcon('ad_set_name')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" onClick={() => handleSort('total_leads')} className="h-auto p-0 font-medium flex flex-col items-center gap-1">
                      <div className="text-center">
                        <div>Leads</div>
                        <div className="text-xs text-muted-foreground font-normal">Total: {totals.totalLeads.toLocaleString('pt-BR')}</div>
                      </div>
                      {getSortIcon('total_leads')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" onClick={() => handleSort('total_spent')} className="h-auto p-0 font-medium flex flex-col items-center gap-1">
                      <div className="text-center">
                        <div>Investido</div>
                        <div className="text-xs text-muted-foreground font-normal">Total: R$ {totals.totalInvestment.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}</div>
                      </div>
                      {getSortIcon('total_spent')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" onClick={() => handleSort('cpl')} className="h-auto p-0 font-medium flex flex-col items-center gap-1">
                      <div className="text-center">
                        <div>CPL Meta</div>
                        <div className="text-xs text-muted-foreground font-normal">Média: R$ {correctAverageCPL.toFixed(2).replace('.', ',')}</div>
                      </div>
                      {getSortIcon('cpl')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Link do Criativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignData.sort((a, b) => {
                  if (!sortField) return 0;
                  
                  if (sortField === 'ad_set_name') {
                    const aValue = a.campaign_name || '';
                    const bValue = b.campaign_name || '';
                    return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                  }
                  
                  if (sortField === 'total_leads') {
                    return sortDirection === 'asc' ? a.totalResults - b.totalResults : b.totalResults - a.totalResults;
                  }
                  
                  if (sortField === 'total_spent') {
                    return sortDirection === 'asc' ? a.totalSpend - b.totalSpend : b.totalSpend - a.totalSpend;
                  }
                  
                  if (sortField === 'cpl') {
                    return sortDirection === 'asc' ? a.cpl - b.cpl : b.cpl - a.cpl;
                  }
                  
                  return 0;
                }).map((campaign, index) => (
                  <TableRow key={campaign.campaign_id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold">{campaign.ad_set_name || campaign.campaign_name}</div>
                        <div className="text-xs text-muted-foreground">{campaign.campaign_name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{campaign.totalResults.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-center font-medium">R$ {campaign.totalSpend.toFixed(2).replace('.', ',')}</TableCell>
                    <TableCell className="text-center font-medium">
                      R$ {campaign.cpl.toFixed(2).replace('.', ',')}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs text-muted-foreground">Sem link</span>
                    </TableCell>
                  </TableRow>
                ))}
                {campaignData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {isLoading ? 'Carregando dados...' : 'Nenhum conjunto de anúncios encontrado'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrafficAnalysis;