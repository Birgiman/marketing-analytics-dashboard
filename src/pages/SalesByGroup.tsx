import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { UserPlus, UserMinus, Users, TrendingUp, ShoppingCart, Target, BarChart3, Search, ArrowUpDown, ArrowUp, ArrowDown, Download, Database, Upload, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LiveGroup, Live } from "@/types";
import { useLiveLocalStorageCache } from "@/hooks/useLiveLocalStorageCache";

// These interfaces are no longer used as we now use LiveGroup from types

interface SalesData {
  id: number;
  dataHora: string;
  telefone: string;
  nome: string;
  valor: number;
}

const SalesByGroup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const liveId = searchParams.get('live');

  // Usar cache localStorage para dados da Live
  const {
    live,
    groups,
    isLoading: cacheLoading,
    isFromCache,
    canFetchMetaAgain
  } = useLiveLocalStorageCache({ liveId: liveId || '' });

  const [searchTerm, setSearchTerm] = useState("");
  const [publicoFilter, setPublicoFilter] = useState("all");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);

  // Data states for Live-specific groups
  const [liveGroups, setLiveGroups] = useState<LiveGroup[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Sales data upload
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audiences configuration state
  const [audiences, setAudiences] = useState([
    {
      id: 1,
      name: "Público Quente",
      campaignTerm: "quente",
      groupEmoji: "⭐"
    },
    {
      id: 2,
      name: "Público Frio", 
      campaignTerm: "frio",
      groupEmoji: "❤️"
    }
  ]);
  const [newAudience, setNewAudience] = useState({
    name: "",
    campaignTerm: "",
    groupEmoji: ""
  });

  // Fetch Live-specific data from Supabase (agora usa cache principalmente)
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/auth/signin');
        return;
      }
      setUserId(session.user.id);

      // Check if Live ID is provided
      if (!liveId) {
        navigate('/lives');
        return;
      }

      // Dados da Live e grupos agora vêm do cache localStorage
      if (groups && groups.length > 0) {
        setLiveGroups(groups);
      } else {
        // Fallback: buscar diretamente se cache estiver vazio
        const { data: groupsResult, error: groupsError } = await supabase
          .from('live_groups')
          .select('*')
          .eq('live_id', liveId)
          .order('created_at', { ascending: false });

        if (groupsError) {
          console.error('Error fetching live groups:', groupsError);
          setLiveGroups([]);
        } else {
          setLiveGroups(groupsResult || []);
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      navigate('/lives');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [liveId]);

  // Atualizar grupos quando cache mudar
  useEffect(() => {
    if (groups && groups.length > 0) {
      setLiveGroups(groups);
    }
  }, [groups]);

  // Calculate statistics from Live groups
  const totalGroupMembers = liveGroups.reduce((sum, group) => sum + group.group_size, 0);
  const totalGroups = liveGroups.length;

  // Convert Live groups to table display format
  const processedGroupsData = liveGroups.map((group, index) => ({
    id: index + 1,
    name: group.group_name,
    campaign: "N/A", // TODO: Add campaign detection based on group name patterns
    entered: group.group_size,
    left: 0, // TODO: Implement exit tracking
    active: group.group_size,
    sales: 0, // TODO: Implement sales tracking per group
    revenue: 0, // TODO: Implement revenue tracking per group
    averageTicket: 0 // Will be calculated when sales data is available
  }));

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

  const filteredAndSortedData = processedGroupsData.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPublico = publicoFilter === "all" || group.campaign.toLowerCase().includes(publicoFilter.toLowerCase());
    return matchesSearch && matchesPublico;
  }).sort((a, b) => {
    if (!sortField) return 0;
    let aValue = a[sortField as keyof typeof a];
    let bValue = b[sortField as keyof typeof b];
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Functions for audience management
  const addAudience = () => {
    if (newAudience.name && newAudience.campaignTerm && newAudience.groupEmoji) {
      setAudiences([
        ...audiences,
        {
          id: Date.now(),
          name: newAudience.name,
          campaignTerm: newAudience.campaignTerm.replace(/\s+/g, ''),
          groupEmoji: newAudience.groupEmoji
        }
      ]);
      setNewAudience({ name: "", campaignTerm: "", groupEmoji: "" });
    }
  };

  const removeAudience = (id: number) => {
    setAudiences(audiences.filter(a => a.id !== id));
  };

  // Generate correlation data from audiences and live groups
  const correlationData = audiences.map(audience => {
    // Find groups that match this audience's term in their name (case insensitive)
    const matchingGroups = liveGroups.filter(group => 
      group.group_name.toLowerCase().includes(audience.campaignTerm.toLowerCase())
    );
    
    const groupEntradas = matchingGroups.reduce((sum, group) => sum + group.group_size, 0);
    const groupSaidas = 0; // TODO: Implement exit tracking
    const groupAtivos = groupEntradas - groupSaidas;

    return {
      id: audience.id,
      audienceName: audience.name,
      campaignTerm: audience.campaignTerm,
      groupEmoji: audience.groupEmoji,
      trafficLeads: 0, // TODO: Get from Meta insights
      trafficInvestment: 0, // TODO: Get from Meta insights
      trafficCPL: 0, // TODO: Calculate from Meta insights
      groupEntradas,
      groupSaidas,
      groupAtivos
    };
  });

  // Sales upload functionality
  const handleSalesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus("Processando arquivo...");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          setUploadStatus("Erro: Arquivo deve ter pelo menos 2 linhas (header + dados)");
          return;
        }

        const [header, ...dataLines] = lines;
        const expectedColumns = ['DATA_HORA', 'TELEFONE', 'NOME', 'VALOR'];
        const headerColumns = header.split(',').map(col => col.trim().toUpperCase());

        const missingColumns = expectedColumns.filter(col => !headerColumns.includes(col));
        if (missingColumns.length > 0) {
          setUploadStatus(`Erro: Colunas obrigatórias ausentes: ${missingColumns.join(', ')}`);
          return;
        }

        const processedData = dataLines.map((line, index) => {
          const values = line.split(',').map(val => val.trim());
          if (values.length !== headerColumns.length) {
            throw new Error(`Linha ${index + 2}: número de colunas não confere`);
          }

          const dataIndex = headerColumns.indexOf('DATA_HORA');
          const phoneIndex = headerColumns.indexOf('TELEFONE');
          const nameIndex = headerColumns.indexOf('NOME');
          const valueIndex = headerColumns.indexOf('VALOR');

          return {
            id: index + 1,
            dataHora: values[dataIndex],
            telefone: values[phoneIndex],
            nome: values[nameIndex],
            valor: parseFloat(values[valueIndex].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
          };
        });

        setSalesData(processedData);
        setUploadStatus(`✅ ${processedData.length} vendas importadas com sucesso!`);
        setTimeout(() => setUploadStatus(""), 3000);
      } catch (error) {
        setUploadStatus(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    };
    reader.readAsText(file);
  };

  const clearSalesData = () => {
    setSalesData([]);
    setUploadStatus("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Calculate subtotals
  const subtotals = filteredAndSortedData.reduce((acc, group) => {
    acc.entered += group.entered;
    acc.left += group.left;
    acc.active += group.active;
    acc.sales += group.sales;
    acc.revenue += group.revenue;
    return acc;
  }, {
    entered: 0,
    left: 0,
    active: 0,
    sales: 0,
    revenue: 0
  });

  const averageTicketTotal = subtotals.sales > 0 ? subtotals.revenue / subtotals.sales : 0;

  if (isLoading || cacheLoading) {
    return (
      <div>
        <Header />
        <div className="container mx-auto p-6">
          <div className="space-y-6">
            <div className="text-center">Carregando dados da Live...</div>
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-32 bg-muted animate-pulse rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Debug info
  console.log('SalesByGroup Debug:', { liveId, live, liveGroups, totalGroupMembers, isLoading });

  return (
    <div>
      <Header />
      <div className="container mx-auto p-6 space-y-8">


        {/* Overview Geral */}
        <div className="grid gap-6 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entrou no Grupo</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGroupMembers.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saiu do Grupo</CardTitle>
              <UserMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGroupMembers.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesData.length || subtotals.sales}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Venda Média p/ Grupo</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {salesData.length > 0 
                  ? Math.round(salesData.reduce((acc, sale) => acc + sale.valor, 0) / salesData.length)
                  : Math.round(averageTicketTotal)
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela Unificada de Públicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Correlação de Públicos
            </CardTitle>
            <CardDescription>
              Configure públicos e visualize a correlação entre campanhas de tráfego e grupos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Público</th>
                    <th className="text-left p-3 font-medium">Termo Campanha</th>
                    <th className="text-center p-3 font-medium">Emoji Grupo</th>
                    <th className="text-center p-3 font-medium">Leads Tráfego</th>
                    <th className="text-center p-3 font-medium">Investimento</th>
                    <th className="text-center p-3 font-medium">CPL Meta</th>
                    <th className="text-center p-3 font-medium">Entrou Grupo</th>
                    <th className="text-center p-3 font-medium">Saiu Grupo</th>
                    <th className="text-center p-3 font-medium">Ativos Grupo</th>
                    <th className="text-center p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {correlationData.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <Badge variant="secondary">{row.audienceName}</Badge>
                      </td>
                      <td className="p-3 text-sm">
                        <code className="bg-muted px-2 py-1 rounded">{row.campaignTerm}</code>
                      </td>
                      <td className="p-3 text-center text-lg">
                        {row.groupEmoji}
                      </td>
                      <td className="p-3 text-center font-medium">
                        {row.trafficLeads.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-medium">
                        R$ {row.trafficInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center font-medium">
                        R$ {row.trafficCPL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center font-medium text-green-600">
                        {row.groupEntradas.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-medium text-red-600">
                        {row.groupSaidas.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-medium text-blue-600">
                        {row.groupAtivos.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAudience(row.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {/* Add new audience row */}
                  <tr className="border-b bg-muted/30">
                    <td className="p-3">
                      <Input
                        placeholder="Nome do público"
                        value={newAudience.name}
                        onChange={(e) => setNewAudience({ ...newAudience, name: e.target.value })}
                        className="h-8"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        placeholder="termo"
                        value={newAudience.campaignTerm}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s+/g, '');
                          setNewAudience({ ...newAudience, campaignTerm: value });
                        }}
                        className="h-8"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        placeholder="emoji"
                        value={newAudience.groupEmoji}
                        onChange={(e) => setNewAudience({ ...newAudience, groupEmoji: e.target.value })}
                        className="h-8 text-center"
                      />
                    </td>
                    <td className="p-3 text-center text-muted-foreground">-</td>
                    <td className="p-3 text-center text-muted-foreground">-</td>
                    <td className="p-3 text-center text-muted-foreground">-</td>
                    <td className="p-3 text-center text-muted-foreground">-</td>
                    <td className="p-3 text-center text-muted-foreground">-</td>
                    <td className="p-3 text-center text-muted-foreground">-</td>
                    <td className="p-3 text-center">
                      <Button onClick={addAudience} size="sm" className="h-8">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tabela Principal de Grupos */}
        <Card>
          <CardHeader>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {live ? `Grupos da Live: ${live.name}` : 'Dados por Público'}
                </CardTitle>
                <CardDescription>
                  {live ? `Grupos vinculados à Live "${live.name}"` : 'Visualize e filtre os dados de todos os grupos e campanhas'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros de Busca */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do grupo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={publicoFilter} onValueChange={setPublicoFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por público" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os públicos</SelectItem>
                  <SelectItem value="quente">Público Quente</SelectItem>
                  <SelectItem value="frio">Público Frio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('name')}
                        className="h-auto p-0 font-medium flex items-center gap-1"
                      >
                        <div>Grupo</div>
                        {getSortIcon('name')}
                      </Button>
                    </th>
                    <th className="text-left p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('campaign')}
                        className="h-auto p-0 font-medium flex items-center gap-1"
                      >
                        <div>Público</div>
                        {getSortIcon('campaign')}
                      </Button>
                    </th>
                    <th className="text-center p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('entered')}
                        className="h-auto p-0 font-medium flex flex-col items-center gap-1"
                      >
                        <div className="text-center">
                          <div>Entrou no Grupo</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            Total: {subtotals.entered.toLocaleString()}
                          </div>
                        </div>
                        {getSortIcon('entered')}
                      </Button>
                    </th>
                    <th className="text-center p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('left')}
                        className="h-auto p-0 font-medium flex flex-col items-center gap-1"
                      >
                        <div className="text-center">
                          <div>Saiu do Grupo</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            Total: {subtotals.left.toLocaleString()}
                          </div>
                        </div>
                        {getSortIcon('left')}
                      </Button>
                    </th>
                    <th className="text-center p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('active')}
                        className="h-auto p-0 font-medium flex flex-col items-center gap-1"
                      >
                        <div className="text-center">
                          <div>Leads Ativos</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            Total: {subtotals.active.toLocaleString()}
                          </div>
                        </div>
                        {getSortIcon('active')}
                      </Button>
                    </th>
                    <th className="text-center p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('sales')}
                        className="h-auto p-0 font-medium flex flex-col items-center gap-1"
                      >
                        <div className="text-center">
                          <div>Vendas por Grupo</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            Total: {subtotals.sales}
                          </div>
                        </div>
                        {getSortIcon('sales')}
                      </Button>
                    </th>
                    <th className="text-center p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('revenue')}
                        className="h-auto p-0 font-medium flex flex-col items-center gap-1"
                      >
                        <div className="text-center">
                          <div>Faturamento</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            Total: R$ {subtotals.revenue.toLocaleString()}
                          </div>
                        </div>
                        {getSortIcon('revenue')}
                      </Button>
                    </th>
                    <th className="text-center p-3 font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('averageTicket')}
                        className="h-auto p-0 font-medium flex flex-col items-center gap-1"
                      >
                        <div className="text-center">
                          <div>Ticket Médio</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            Média: R$ {Math.round(averageTicketTotal)}
                          </div>
                        </div>
                        {getSortIcon('averageTicket')}
                      </Button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedData.map((group) => (
                    <tr key={group.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{group.name}</td>
                      <td className="p-3">
                        <Badge variant="outline">{group.campaign || 'N/A'}</Badge>
                      </td>
                      <td className="text-center p-3">{group.entered}</td>
                      <td className="text-center p-3">{group.left}</td>
                      <td className="text-center p-3">{group.active}</td>
                      <td className="text-center p-3">
                        <Badge variant="default">{group.sales} vendas</Badge>
                      </td>
                      <td className="text-center p-3 font-medium">
                        R$ {group.revenue.toLocaleString()}
                      </td>
                      <td className="text-center p-3 font-medium">
                        R$ {group.averageTicket}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredAndSortedData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum grupo encontrado com os filtros aplicados.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção de Upload de Dados de Vendas */}
        <div className="border rounded-lg p-4 bg-muted/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Dados de Vendas</span>
              {salesData.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {salesData.length} vendas
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs flex items-center gap-1"
              >
                <Upload className="h-3 w-3" />
                Importar CSV
              </Button>
              {salesData.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSalesData}
                  className="text-xs"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleSalesUpload}
            className="hidden"
          />

          {uploadStatus && (
            <div
              className={`text-xs mb-2 ${
                uploadStatus.includes('✅')
                  ? 'text-green-600'
                  : uploadStatus.includes('Erro')
                  ? 'text-red-600'
                  : 'text-blue-600'
              }`}
            >
              {uploadStatus}
            </div>
          )}

          {salesData.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Importe um arquivo CSV (DATA_HORA, TELEFONE, NOME, VALOR) para cruzar com os dados dos leads
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Vendas:</span>
                <span className="ml-1 font-medium">{salesData.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="ml-1 font-medium">
                  R$ {salesData.reduce((acc, sale) => acc + sale.valor, 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Ticket Médio:</span>
                <span className="ml-1 font-medium">
                  R$ {(salesData.reduce((acc, sale) => acc + sale.valor, 0) / salesData.length).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesByGroup;