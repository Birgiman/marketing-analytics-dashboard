import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { Creative } from "@/types";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface TrafficAnalysisContentProps {
  live: any;
  groups: any[];
  campaigns: any[];
  metrics: any;
  liveMetrics: any;
  isLoading: boolean;
}

const TrafficAnalysisContent = ({
  live,
  groups,
  campaigns: finalCampaigns,
  metrics,
  liveMetrics,
  isLoading
}: TrafficAnalysisContentProps) => {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [adSetSortField, setAdSetSortField] = useState<string | null>(null);
  const [adSetSortDirection, setAdSetSortDirection] = useState<'asc' | 'desc'>('asc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [selectedPublico, setSelectedPublico] = useState<string>('todos');

  // Estados para filtros dos conjuntos de anúncios
  const [adSetStartDate, setAdSetStartDate] = useState<string>('');
  const [adSetEndDate, setAdSetEndDate] = useState<string>('');
  const [tempAdSetStartDate, setTempAdSetStartDate] = useState<string>('');
  const [tempAdSetEndDate, setTempAdSetEndDate] = useState<string>('');

  // Estados para dados
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const handleApplyFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
  };

  const handleApplyAdSetFilters = () => {
    setAdSetStartDate(tempAdSetStartDate);
    setAdSetEndDate(tempAdSetEndDate);
  };

  // Buscar dados do usuário logado
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (DEMO_MODE) {
          setUserId('demo-user');
          // Dados demo
          setCreatives([
            {
              id: '1',
              campaign_name: 'Campanha CTWA Quente',
              ad_set_name: 'Interesse Específico',
              ad_name: 'Criativo Principal',
              amount_spent: 1500,
              leads: 75,
              cost_per_lead: 20,
              day: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              user_id: 'demo-user'
            },
            {
              id: '2',
              campaign_name: 'Campanha Lookalike',
              ad_set_name: 'LAL 1%',
              ad_name: 'Criativo Secundário',
              amount_spent: 800,
              leads: 32,
              cost_per_lead: 25,
              day: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              user_id: 'demo-user'
            }
          ]);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          return;
        }

        setUserId(session.user.id);

        // Buscar criativos
        const { data: creativesData, error: creativesError } = await supabase
          .from('creatives')
          .select('*')
          .eq('user_id', session.user.id);

        if (creativesError) throw creativesError;
        setCreatives(creativesData || []);

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      }
    };

    fetchUserData();
  }, []);

  // Mapear campanhas para públicos baseado no nome
  const mapCampanhaToPublico = (campaignName: string) => {
    if (!campaignName) return '';
    return campaignName.includes('CTWA') ? 'OF' : 'NO';
  };

  // Obter públicos únicos dos dados de criativos baseado nos nomes das campanhas
  const getPublicosUnicos = () => {
    if (!creatives || !Array.isArray(creatives)) return [];
    const publicos = creatives
      .map(item => mapCampanhaToPublico(item.campaign_name || ''))
      .filter(publico => publico && publico.trim() !== '')
      .filter((publico, index, arr) => arr.indexOf(publico) === index);
    return publicos.sort();
  };

  // Calcular totais para os cabeçalhos das colunas
  const calculateTotals = () => {
    if (!creatives || !Array.isArray(creatives) || creatives.length === 0) {
      return {
        totalInvestment: 0,
        totalLeads: 0,
        totalGroup: 0,
        totalGroupExit: 0
      };
    }

    // Filtrar criativos por público se selecionado
    let filteredCreatives = creatives;
    if (selectedPublico !== 'todos') {
      filteredCreatives = creatives.filter(item =>
        mapCampanhaToPublico(item.campaign_name || '') === selectedPublico
      );
    }

    const totalInvestment = filteredCreatives.reduce((sum, item) => {
      const amount = item.amount_spent || 0;
      return sum + amount;
    }, 0);

    const totalLeads = filteredCreatives.reduce((sum, item) => {
      const leads = item.leads || 0;
      return sum + leads;
    }, 0);

    // Para os grupos
    let filteredGroups = groups;
    if (selectedPublico !== 'todos' && groups && Array.isArray(groups)) {
      // Como não temos campo publico nos grupos, vamos considerar todos
      filteredGroups = groups;
    }

    // Contar total de pessoas que entraram no grupo
    let totalGroup = 0;
    let totalGroupExit = 0;
    if (filteredGroups && Array.isArray(filteredGroups)) {
      totalGroup = filteredGroups.filter(grupo => grupo.evento === 'ENTROU').length;
      totalGroupExit = filteredGroups.filter(grupo => grupo.evento === 'SAIU').length;
    }

    return {
      totalInvestment,
      totalLeads,
      totalGroup,
      totalGroupExit
    };
  };

  // Calcular Total Gasto
  const calculateTotalSpent = () => {
    if (!creatives || !Array.isArray(creatives) || creatives.length === 0) {
      return 0;
    }

    // Filtrar criativos por público se selecionado
    let filteredCreatives = creatives;
    if (selectedPublico !== 'todos') {
      filteredCreatives = creatives.filter(item =>
        mapCampanhaToPublico(item.campaign_name || '') === selectedPublico
      );
    }

    return filteredCreatives.reduce((sum, item) => {
      const amount = item.amount_spent || 0;
      return sum + amount;
    }, 0);
  };

  // Calcular CPL Líquido usando dados do cache
  const calculateCPLLiquido = () => {
    if (!finalCampaigns || !groups || finalCampaigns.length === 0 || groups.length === 0) return 0;

    // Usar dados reais de spend dos insights
    const totalSpent = finalCampaigns.reduce((sum, campaign) => {
      const spend = parseFloat(campaign.insights?.spend || '0');
      return sum + spend;
    }, 0);

    // Para o CPL Líquido, usamos a soma do tamanho dos grupos vinculados
    const totalEntrou = groups.reduce((sum, group) => sum + (group.group_size || 0), 0);

    return totalEntrou > 0 ? totalSpent / totalEntrou : 0;
  };

  // Calcular CPL Meta usando dados do cache
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

  // Calcular taxa de retenção usando dados do cache
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

    const totalEntrou = groups.reduce((sum, group) => sum + (group.group_size || 0), 0);
    return totalLeads > 0 ? Math.round(totalEntrou / totalLeads * 100) : 0;
  };

  // Calcular dados dos grupos
  const calculateGroupData = () => {
    if (!groups || groups.length === 0) {
      return { entrou: 0, saiu: 0, ativos: 0 };
    }

    const totalMembros = groups.reduce((sum, group) => sum + (group.group_size || 0), 0);

    return {
      entrou: totalMembros,
      saiu: 0, // TODO: Implementar tracking de saídas
      ativos: totalMembros
    };
  };

  const totals = calculateTotals();
  const totalSpent = calculateTotalSpent();
  const cplMeta = calculateCPLMeta();
  const cplLiquido = calculateCPLLiquido();
  const retentionRate = calculateRetentionRate();
  const groupData = calculateGroupData();

  // Calcular dados diários
  const calculateDailyData = () => {
    if (!creatives || !Array.isArray(creatives) || creatives.length === 0) {
      return [];
    }

    // Filtrar criativos por público se selecionado
    let filteredCreatives = creatives;
    if (selectedPublico !== 'todos') {
      filteredCreatives = creatives.filter(item =>
        mapCampanhaToPublico(item.campaign_name || '') === selectedPublico
      );
    }

    const dailyData: Record<string, any> = {};
    filteredCreatives.forEach(item => {
      if (!item.day) return;

      const dateKey = new Date(item.day).toLocaleDateString('pt-BR');
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          originalDate: item.day,
          investment: 0,
          cadastros: 0,
          group: 0,
          groupExit: 0,
          cplMeta: 0,
          cplLiquido: 0,
          retention: 0
        };
      }

      const amount = item.amount_spent || 0;
      const leads = item.leads || 0;

      dailyData[dateKey].investment += amount;
      dailyData[dateKey].cadastros += leads;
    });

    // Calcular pessoas que entraram/saíram do grupo por dia
    if (groups && Array.isArray(groups)) {
      groups.forEach(grupo => {
        if (grupo.data) {
          const dateKey = grupo.data;

          if (dailyData[dateKey]) {
            if (grupo.evento === 'ENTROU') {
              dailyData[dateKey].group += 1;
            } else if (grupo.evento === 'SAIU') {
              dailyData[dateKey].groupExit += 1;
            }
          }
        }
      });
    }

    // Calcular CPL Meta e CPL Líquido para cada dia
    Object.values(dailyData).forEach((day: any) => {
      day.cplMeta = day.cadastros > 0 ? day.investment / day.cadastros : 0;
      day.cplLiquido = day.group > 0 ? day.investment / day.group : 0;
      day.retention = day.cadastros > 0 ? Math.round(day.group / day.cadastros * 100) : 0;
    });

    return Object.values(dailyData).sort((a: any, b: any) => new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime());
  };

  const tableData = calculateDailyData();

  // Filtrar dados por data
  const filterDataByDate = (data: any[]) => {
    if (!startDate || !endDate) return data;

    return data.filter(day => {
      if (!day.originalDate) return false;
      const dayDate = new Date(day.originalDate).toISOString().split('T')[0];
      return dayDate >= startDate && dayDate <= endDate;
    });
  };

  const filteredTableData = filterDataByDate(tableData);

  // Calcular melhores conjuntos de anúncios
  const calculateBestAdSets = () => {
    if (!creatives || !Array.isArray(creatives) || creatives.length === 0) {
      return [];
    }

    // Filtrar dados por data primeiro se houver filtro ativo
    let filteredCreatives = creatives;
    if (adSetStartDate && adSetEndDate) {
      filteredCreatives = creatives.filter(item => {
        if (!item.day) return false;
        const itemDate = new Date(item.day).toISOString().split('T')[0];
        return itemDate >= adSetStartDate && itemDate <= adSetEndDate;
      });
    }

    // Agrupar por Ad Set Name
    const adSetData: Record<string, any> = {};
    filteredCreatives.forEach(item => {
      if (!item.ad_set_name) return;
      const adSetKey = item.ad_set_name;
      if (!adSetData[adSetKey]) {
        adSetData[adSetKey] = {
          ad_set_name: adSetKey,
          campaign_name: item.campaign_name || '',
          total_spent: 0,
          total_leads: 0,
          cpl: 0,
          creative_link: item.creative_link || ''
        };
      }

      const amount = item.amount_spent || 0;
      const leads = item.leads || 0;

      adSetData[adSetKey].total_spent += amount;
      adSetData[adSetKey].total_leads += leads;
    });

    // Calcular CPL para todos os conjuntos
    const adSetsWithCPL = Object.values(adSetData)
      .map((adSet: any) => ({
        ...adSet,
        cpl: adSet.total_leads > 0 ? adSet.total_spent / adSet.total_leads : 999999
      }))
      .filter((adSet: any) => adSet.total_leads > 0)
      .sort((a: any, b: any) => a.cpl - b.cpl);

    return adSetsWithCPL;
  };

  const bestAdSets = calculateBestAdSets();
  const filteredAdSets = bestAdSets;

  const sortedAdSets = [...filteredAdSets].sort((a, b) => {
    if (!adSetSortField) return 0;
    let aValue = a[adSetSortField as keyof typeof a];
    let bValue = b[adSetSortField as keyof typeof b];

    // Para strings, comparação alfabética
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    if (aValue < bValue) return adSetSortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return adSetSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Calcular totais para os cabeçalhos da tabela de ad sets
  const calculateAdSetTotals = () => {
    if (sortedAdSets.length === 0) {
      return {
        totalLeads: 0,
        totalSpent: 0,
        averageCPL: 0
      };
    }

    const totalLeads = sortedAdSets.reduce((sum, adSet) => sum + adSet.total_leads, 0);
    const totalSpent = sortedAdSets.reduce((sum, adSet) => sum + adSet.total_spent, 0);
    const averageCPL = sortedAdSets.reduce((sum, adSet) => sum + adSet.cpl, 0) / sortedAdSets.length;

    return {
      totalLeads,
      totalSpent,
      averageCPL
    };
  };

  const adSetTotals = calculateAdSetTotals();

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAdSetSort = (field: string) => {
    if (adSetSortField === field) {
      setAdSetSortDirection(adSetSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAdSetSortField(field);
      setAdSetSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const getAdSetSortIcon = (field: string) => {
    if (adSetSortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return adSetSortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const sortedData = [...filteredTableData].sort((a, b) => {
    if (!sortField) return 0;
    let aValue = a[sortField as keyof typeof a];
    let bValue = b[sortField as keyof typeof b];

    // Para datas, converter para comparação numérica
    if (sortField === 'date') {
      const aDate = new Date(a.originalDate);
      const bDate = new Date(b.originalDate);
      aValue = aDate.getTime();
      bValue = bDate.getTime();
    }
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-xl">Carregando análise de tráfego...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Público:</label>
                <select
                  className="px-3 py-2 text-sm border border-input rounded-md bg-background"
                  value={selectedPublico}
                  onChange={e => setSelectedPublico(e.target.value)}
                >
                  <option value="todos">Todos os Públicos</option>
                  {getPublicosUnicos().map(publico => (
                    <option key={publico} value={publico}>{publico}</option>
                  ))}
                </select>
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
                        <div className="text-xs text-muted-foreground font-normal">
                          Total: R$ {totals.totalInvestment.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
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
                    <TableCell className="font-medium">{day.date}</TableCell>
                    <TableCell className="text-center font-medium">
                      R$ {day.investment.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </TableCell>
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
                      Nenhum dado encontrado para o período selecionado
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
            <ChartContainer
              config={{
                cplMeta: {
                  label: "CPL Meta",
                  color: "hsl(var(--chart-1))"
                },
                cplLiquido: {
                  label: "CPL Líquido",
                  color: "hsl(var(--chart-2))"
                }
              }}
              className="h-80"
            >
              <LineChart
                data={sortedData.map(day => ({
                  dia: day.date,
                  cplMeta: day.cplMeta,
                  cplLiquido: day.cplLiquido
                }))}
                width={800}
                height={320}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5
                }}
              >
                <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={value => `R$ ${value.toFixed(2)}`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value, name) => [
                    `R$ ${Number(value).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}`,
                    name === 'cplLiquido' ? 'CPL Líquido' : 'CPL Meta'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="cplLiquido"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={4}
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: "hsl(var(--destructive))"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cplMeta"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "hsl(var(--primary))"
                  }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

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
                <div className={`p-4 border-l-4 ${
                  totals.totalGroup / totals.totalLeads >= 0.7
                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                    : totals.totalGroup / totals.totalLeads >= 0.5
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
                    : 'border-red-500 bg-red-50 dark:bg-red-950'
                }`}>
                  <h5 className={`font-semibold ${
                    totals.totalGroup / totals.totalLeads >= 0.7
                      ? 'text-green-700 dark:text-green-300'
                      : totals.totalGroup / totals.totalLeads >= 0.5
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    📊 Taxa de Retenção: {Math.round(totals.totalGroup / totals.totalLeads * 100)}%
                  </h5>
                  <p className={`text-sm ${
                    totals.totalGroup / totals.totalLeads >= 0.7
                      ? 'text-green-600 dark:text-green-400'
                      : totals.totalGroup / totals.totalLeads >= 0.5
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {totals.totalGroup / totals.totalLeads >= 0.7
                      ? 'Excelente qualidade de tráfego! Continuar investindo nos conjuntos atuais.'
                      : totals.totalGroup / totals.totalLeads >= 0.5
                      ? 'Qualidade moderada. Testar novos públicos e criativos para melhorar conversão.'
                      : 'Baixa qualidade de tráfego. Revisar audiências e melhorar qualificação no funil.'}
                  </p>
                </div>
              )}

              {/* Análise dos Melhores Ad Sets */}
              {bestAdSets.length > 0 && (
                <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
                  <h5 className="font-semibold text-blue-700 dark:text-blue-300">🎯 Melhor Conjunto de Anúncios</h5>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    "{bestAdSets[0].ad_set_name}" com CPL de R$ {bestAdSets[0].cpl.toFixed(2)}.
                    {bestAdSets[0].cpl < 2.00
                      ? ' Aumentar orçamento em 30-50% para escalar.'
                      : ' Analisar elementos de sucesso para replicar em outros conjuntos.'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Ad Sets Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>🏆 Análise Profunda de Conjuntos de Anúncios</CardTitle>
            </div>
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Data início:</label>
                <Input type="date" className="w-auto" value={tempAdSetStartDate} onChange={e => setTempAdSetStartDate(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Data fim:</label>
                <Input type="date" className="w-auto" value={tempAdSetEndDate} onChange={e => setTempAdSetEndDate(e.target.value)} />
              </div>
              <Button onClick={handleApplyAdSetFilters} className="flex items-center gap-2">
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
                  <Button variant="ghost" onClick={() => handleAdSetSort('ad_set_name')} className="h-auto p-0 font-medium flex items-center gap-1">
                    Conjunto de Anúncios
                    {getAdSetSortIcon('ad_set_name')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button variant="ghost" onClick={() => handleAdSetSort('total_leads')} className="h-auto p-0 font-medium flex flex-col items-center gap-1">
                    <div className="text-center">
                      <div>Leads</div>
                      <div className="text-xs text-muted-foreground font-normal">Total: {adSetTotals.totalLeads.toLocaleString('pt-BR')}</div>
                    </div>
                    {getAdSetSortIcon('total_leads')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button variant="ghost" onClick={() => handleAdSetSort('total_spent')} className="h-auto p-0 font-medium flex flex-col items-center gap-1">
                    <div className="text-center">
                      <div>Investido</div>
                      <div className="text-xs text-muted-foreground font-normal">
                        Total: R$ {adSetTotals.totalSpent.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                    </div>
                    {getAdSetSortIcon('total_spent')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button variant="ghost" onClick={() => handleAdSetSort('cpl')} className="h-auto p-0 font-medium flex flex-col items-center gap-1">
                    <div className="text-center">
                      <div>CPL Meta</div>
                      <div className="text-xs text-muted-foreground font-normal">Média: R$ {adSetTotals.averageCPL.toFixed(2)}</div>
                    </div>
                    {getAdSetSortIcon('cpl')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">Link do Criativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAdSets.map((adSet, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div>
                      <div className="font-semibold">{adSet.ad_set_name}</div>
                      <div className="text-xs text-muted-foreground">{adSet.campaign_name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">{adSet.total_leads}</TableCell>
                  <TableCell className="text-center font-medium">R$ {adSet.total_spent.toFixed(2).replace('.', ',')}</TableCell>
                  <TableCell className="text-center font-medium">
                    R$ {adSet.cpl.toFixed(2).replace('.', ',')}
                  </TableCell>
                  <TableCell className="text-center">
                    {adSet.creative_link ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={adSet.creative_link} target="_blank" rel="noopener noreferrer">
                          <span className="text-xs">Ver Criativo</span>
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem link</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sortedAdSets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum conjunto de anúncios encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrafficAnalysisContent;