import Header from "@/components/Header";
import { LiveMetricsCards } from "@/components/LiveMetricsCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateCompleteLiveMetrics } from "@/utils/live-metrics-v2";
import { fetchCompleteLiveData } from "@/utils/liveDataFetcher";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const TrafficAnalysis = () => {
  const [searchParams] = useSearchParams();
  const liveId = searchParams.get('live');
  
  // Estados para dados V2 (mesmo padrão da Details.tsx)
  const [live, setLive] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignsWithInsights, setCampaignsWithInsights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para métricas V2
  const [metricsV2, setMetricsV2] = useState<any>(null);
  const [extractedDataV2, setExtractedDataV2] = useState<any>(null);
  
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
        setGroups(completeData.groups || []);
        setCampaigns(completeData.liveCampaigns || []);
        setCampaignsWithInsights(completeData.campaignInsights || []);
        
        // Calcular métricas V2 usando o mesmo padrão da Details.tsx
        // Validar se campaignInsights existe antes de mapear
        const campaignInsights = (completeData.campaignInsights || []).map((campaign: any) => ({
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
  
  // Calcular dados diários (baseado no exemplo)
  const calculateDailyData = () => {
    if (!campaignsWithInsights || campaignsWithInsights.length === 0) {
      return [];
    }
    
    const dailyData: Record<string, any> = {};
    
    campaignsWithInsights.forEach(campaign => {
      if (!campaign.insights || !Array.isArray(campaign.insights)) return;
      
      campaign.insights.forEach((insight: any) => {
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
        const results = parseInt(insight.results?.[0]?.values?.[0]?.value || '0');
        
        dailyData[dateKey].investment += spend;
        dailyData[dateKey].cadastros += results;
      });
    });
    
    // Calcular CPL Meta e CPL Líquido para cada dia
    Object.values(dailyData).forEach((day: any) => {
      day.cplMeta = day.cadastros > 0 ? day.investment / day.cadastros : 0;
      day.cplLiquido = day.group > 0 ? day.investment / day.group : 0;
      day.retention = day.cadastros > 0 ? Math.round(day.group / day.cadastros * 100) : 0;
    });
    
    return Object.values(dailyData).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };
  
  const tableData = calculateDailyData();
  
  // Filtrar dados por data
  const filterDataByDate = (data: any[]) => {
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
  
  const handleApplyFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
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
    <div className="min-h-screen bg-background">
      <Header />
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
                      <TableCell className="font-medium">{day.date}</TableCell>
                      <TableCell className="text-center font-medium">R$ {day.investment.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</TableCell>
                      <TableCell className="text-center font-medium">{day.cadastros.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-center font-medium">{day.group.toLocaleString('pt-BR')}</TableCell>
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
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        {isLoading ? 'Carregando dados...' : 'Nenhum dado encontrado para o período selecionado'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* Evolução do CPL e Recomendações - Lado a lado */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Gráfico de Evolução do CPL */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Evolução do CPL</CardTitle>
              <CardDescription>Comparação entre CPL Meta e CPL Líquido ao longo dos dias</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{
                cplMeta: {
                  label: "CPL Meta",
                  color: "hsl(var(--chart-1))"
                },
                cplLiquido: {
                  label: "CPL Líquido",
                  color: "hsl(var(--chart-2))"
                }
              }} className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortedData.map(day => ({
                    dia: day.date,
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
          
          {/* Recomendações Baseadas em Dados */}
          <Card>
            <CardHeader>
              <CardTitle>🎯 Recomendações Baseadas em Dados</CardTitle>
              <CardDescription>Ações práticas para atingir a meta de CPL líquido</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* Análise de CPL vs Meta */}
                {cplLiquido < 2.00 ? (
                  <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950">
                    <h5 className="font-semibold text-green-700 dark:text-green-300">✅ Performance Excelente</h5>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      CPL Líquido (R$ {cplLiquido.toFixed(2)}) está {((1 - cplLiquido / 3.00) * 100).toFixed(0)}% abaixo da meta de R$ 3,00. Escalar gradualmente os conjuntos de anúncios com melhor performance.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-950">
                    <h5 className="font-semibold text-red-700 dark:text-red-300">❌ CPL Acima da Meta</h5>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      CPL Líquido (R$ {cplLiquido.toFixed(2)}) está {((cplLiquido / 3.00 - 1) * 100).toFixed(0)}% acima da meta de R$ 3,00. Pausar conjuntos com pior performance e otimizar criativos.
                    </p>
                  </div>
                )}
                
                {/* Análise de Retenção */}
                {totals.totalLeads > 0 && (
                  <div className={`p-4 border-l-4 ${totals.totalGroup / totals.totalLeads >= 0.7 ? 'border-green-500 bg-green-50 dark:bg-green-950' : totals.totalGroup / totals.totalLeads >= 0.5 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : 'border-red-500 bg-red-50 dark:bg-red-950'}`}>
                    <h5 className={`font-semibold ${totals.totalGroup / totals.totalLeads >= 0.7 ? 'text-green-700 dark:text-green-300' : totals.totalGroup / totals.totalLeads >= 0.5 ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'}`}>
                      📊 Taxa de Retenção: {Math.round(totals.totalGroup / totals.totalLeads * 100)}%
                    </h5>
                    <p className={`text-sm ${totals.totalGroup / totals.totalLeads >= 0.7 ? 'text-green-600 dark:text-green-400' : totals.totalGroup / totals.totalLeads >= 0.5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {totals.totalGroup / totals.totalLeads >= 0.7 ? 'Excelente qualidade de tráfego! Continuar investindo nos conjuntos atuais.' : totals.totalGroup / totals.totalLeads >= 0.5 ? 'Qualidade moderada. Testar novos públicos e criativos para melhorar conversão.' : 'Baixa qualidade de tráfego. Revisar audiências e melhorar qualificação no funil.'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Análise Profunda de Campanhas */}
        <Card>
          <CardHeader>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>🏆 Análise Profunda de Campanhas</CardTitle>
                <CardDescription>Performance detalhada das campanhas do Meta</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Campanha</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Objetivo</TableHead>
                  <TableHead className="text-center">ID da Campanha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{campaign.campaign_name || 'N/A'}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{campaign.objective || 'N/A'}</TableCell>
                    <TableCell className="text-center font-mono text-sm">{campaign.campaign_id || 'N/A'}</TableCell>
                  </TableRow>
                ))}
                {campaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {isLoading ? 'Carregando dados...' : 'Nenhuma campanha encontrada'}
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