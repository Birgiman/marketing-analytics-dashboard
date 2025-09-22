import Header from "@/components/Header";
import { MetricCard } from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLiveLocalStorageCache } from "@/hooks/useLiveLocalStorageCache";
import { supabase } from "@/integrations/supabase/client";
import { PublicAudience, PublicAudienceCorrelation } from "@/types/audience";
import { LiveGroup as LiveGroupType } from "@/types/live";
import {
  createPublicAudience,
  deletePublicAudience,
  fetchPublicAudiences,
  generateAudienceCorrelation
} from "@/utils/audienceService";
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, Database, Search, ShoppingCart, Target, Trash2, Upload, UserMinus, UserPlus, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AudienceTestComponent } from "@/components/AudienceTestComponent";

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
  const location = useLocation();
  const liveId = searchParams.get('live');

  // Usar cache localStorage para dados da Live
  const {
    live,
    groups,
    isLoading: cacheLoading,
    isFromCache,
    canFetchMetaAgain
  } = useLiveLocalStorageCache({ liveId: liveId || '' });

  // Estado para integração Meta
  const [metaIntegration, setMetaIntegration] = useState<{
    account_id: string;
    access_token: string;
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [publicoFilter, setPublicoFilter] = useState("all");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);

  // Data states for Live-specific groups
  const [liveGroups, setLiveGroups] = useState<LiveGroupType[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Sales data upload
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Public Audiences state
  const [publicAudiences, setPublicAudiences] = useState<PublicAudience[]>([]);
  const [audienceCorrelations, setAudienceCorrelations] = useState<PublicAudienceCorrelation[]>([]);
  const [newAudience, setNewAudience] = useState({
    title: "",
    campaign_term: "",
    emoji: ""
  });
  const [isCreatingAudience, setIsCreatingAudience] = useState(false);

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

      // Buscar integração Meta
      await fetchMetaIntegration();

      // Buscar públicos da Live
      await fetchPublicAudiencesData();

    } catch (error) {
      console.error('Error fetching data:', error);
      navigate('/lives');
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar integração Meta
  const fetchMetaIntegration = async () => {
    if (!userId) return;

    try {
      const { data: metaIntegrationData, error } = await supabase
        .from('meta_integrations')
        .select('access_token')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !metaIntegrationData?.access_token) {
        console.warn('Meta integration não encontrada');
        return;
      }

      // Buscar account_id das campanhas da Live
      const { data: liveCampaigns } = await supabase
        .from('live_campaigns')
        .select('account_id')
        .eq('live_id', liveId)
        .limit(1);

      if (liveCampaigns && liveCampaigns.length > 0) {
        setMetaIntegration({
          account_id: liveCampaigns[0].account_id || '',
          access_token: metaIntegrationData.access_token
        });
      }
    } catch (error) {
      console.error('Erro ao buscar integração Meta:', error);
    }
  };

  // Buscar públicos da Live
  const fetchPublicAudiencesData = async () => {
    if (!liveId) return;

    try {
      const audiences = await fetchPublicAudiences(liveId);
      setPublicAudiences(audiences);
      
      // Gerar correlações para cada público
      if (audiences.length > 0 && metaIntegration) {
        await generateAllCorrelations(audiences);
      }
    } catch (error) {
      console.error('Erro ao buscar públicos:', error);
    }
  };

  // Gerar correlações para todos os públicos
  const generateAllCorrelations = async (audiences: PublicAudience[]) => {
    if (!metaIntegration?.account_id || !metaIntegration?.access_token) {
      console.warn('Meta integration não disponível para gerar correlações');
      return;
    }

    try {
      const correlations = await Promise.all(
        audiences.map(audience => 
          generateAudienceCorrelation(
            audience,
            metaIntegration!.account_id,
            metaIntegration!.access_token,
            {
              since: live?.insights_date_since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              until: live?.insights_date_until || new Date().toISOString().split('T')[0]
            }
          )
        )
      );
      
      setAudienceCorrelations(correlations);
    } catch (error) {
      console.error('Erro ao gerar correlações:', error);
    }
  };

  useEffect(() => {
    if (liveId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId, userId]);

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
  const addAudience = async () => {
    if (!newAudience.title || !newAudience.campaign_term || !newAudience.emoji || !liveId) {
      return;
    }

    setIsCreatingAudience(true);
    try {
      const createdAudience = await createPublicAudience(liveId, {
        title: newAudience.title,
        campaign_term: newAudience.campaign_term.replace(/\s+/g, ''),
        emoji: newAudience.emoji
      });

      setPublicAudiences(prev => [createdAudience, ...prev]);
      setNewAudience({ title: "", campaign_term: "", emoji: "" });

      // Gerar correlação para o novo público
      if (metaIntegration) {
        const correlation = await generateAudienceCorrelation(
          createdAudience,
          metaIntegration.account_id,
          metaIntegration.access_token,
          {
            since: live?.insights_date_since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            until: live?.insights_date_until || new Date().toISOString().split('T')[0]
          }
        );
        setAudienceCorrelations(prev => [correlation, ...prev]);
      }
    } catch (error) {
      console.error('Erro ao criar público:', error);
    } finally {
      setIsCreatingAudience(false);
    }
  };

  const removeAudience = async (audienceId: string) => {
    try {
      await deletePublicAudience(audienceId);
      setPublicAudiences(prev => prev.filter(a => a.id !== audienceId));
      setAudienceCorrelations(prev => prev.filter(c => c.id !== audienceId));
    } catch (error) {
      console.error('Erro ao deletar público:', error);
    }
  };

  // Generate correlation data from audience correlations
  const correlationData = audienceCorrelations.map(correlation => ({
    id: correlation.id,
    audienceName: correlation.title,
    campaignTerm: correlation.campaign_term,
    groupEmoji: correlation.emoji,
    trafficLeads: correlation.metrics.totalLeads,
    trafficInvestment: correlation.metrics.totalSpend,
    trafficCPL: correlation.metrics.cplMeta,
    groupEntradas: correlation.metrics.groupEntradas,
    groupSaidas: correlation.metrics.groupSaidas,
    groupAtivos: correlation.metrics.groupAtivos
  }));

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


        {/* Overview Geral */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <MetricCard
            title="Entrou no Grupo"
            value={totalGroupMembers}
            icon={UserPlus}
            type="integer"
            isLoading={isLoading || cacheLoading}
          />

          <MetricCard
            title="Saiu do Grupo"
            value={0}
            icon={UserMinus}
            type="integer"
            isLoading={isLoading || cacheLoading}
          />

          <MetricCard
            title="Leads Ativos"
            value={totalGroupMembers}
            icon={Users}
            type="integer"
            isLoading={isLoading || cacheLoading}
          />

          <MetricCard
            title="Vendas"
            value={salesData.length || subtotals.sales}
            icon={ShoppingCart}
            type="integer"
            isLoading={isLoading || cacheLoading}
          />

          <MetricCard
            title="Ticket Médio"
            value={salesData.length > 0 
              ? Math.round(salesData.reduce((acc, sale) => acc + sale.valor, 0) / salesData.length)
              : Math.round(averageTicketTotal)
            }
            icon={Target}
            type="currency"
            isLoading={isLoading || cacheLoading}
          />
        </div>

        {/* Cards de Públicos com Métricas Detalhadas */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Públicos Configurados
              </CardTitle>
              <CardDescription>
                Visualize e gerencie seus públicos com correlação automática de campanhas e grupos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Formulário para criar novo público */}
              <div className="mb-6 p-4 border rounded-lg bg-muted/20">
                <h4 className="font-medium mb-3">Criar Novo Público</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Input
                    placeholder="Nome do público (ex: Público 100 reais)"
                    value={newAudience.title}
                    onChange={(e) => setNewAudience({ ...newAudience, title: e.target.value })}
                    disabled={isCreatingAudience}
                  />
                  <Input
                    placeholder="Termo de campanha (ex: NOVOS_MACEIO)"
                    value={newAudience.campaign_term}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\s+/g, '');
                      setNewAudience({ ...newAudience, campaign_term: value });
                    }}
                    disabled={isCreatingAudience}
                  />
                  <Input
                    placeholder="Emoji do grupo (ex: 🚀)"
                    value={newAudience.emoji}
                    onChange={(e) => setNewAudience({ ...newAudience, emoji: e.target.value })}
                    className="text-center"
                    disabled={isCreatingAudience}
                  />
                  <Button 
                    onClick={addAudience} 
                    disabled={isCreatingAudience || !newAudience.title || !newAudience.campaign_term || !newAudience.emoji}
                    className="w-full"
                  >
                    {isCreatingAudience ? "Criando..." : "Criar Público"}
                  </Button>
                </div>
              </div>

              {/* Cards dos públicos existentes */}
              <div className="grid gap-4">
                {audienceCorrelations.map((correlation) => (
                  <Card key={correlation.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-lg">
                            {correlation.emoji} {correlation.title}
                          </Badge>
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {correlation.campaign_term}
                          </code>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAudience(correlation.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Métricas principais */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {correlation.metrics.totalLeads.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">Leads Tráfego</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            R$ {correlation.metrics.totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-muted-foreground">Investimento</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            R$ {correlation.metrics.cplMeta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-muted-foreground">CPL Meta</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            R$ {correlation.metrics.cplLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-muted-foreground">CPL Líquido</div>
                        </div>
                      </div>

                      {/* Métricas de grupos */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">
                            {correlation.metrics.groupEntradas.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">Entraram no Grupo</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-red-600">
                            {correlation.metrics.groupSaidas.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">Sairam do Grupo</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-blue-600">
                            {correlation.metrics.groupAtivos.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">Ativos no Grupo</div>
                        </div>
                      </div>

                      {/* Detalhes das campanhas e grupos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium mb-2">Campanhas Correlacionadas ({correlation.campaigns.length})</h5>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {correlation.campaigns.length > 0 ? (
                              correlation.campaigns.map((campaign) => (
                                <div key={campaign.id} className="text-sm p-2 bg-muted/50 rounded">
                                  <div className="font-medium">{campaign.name}</div>
                                  <div className="text-muted-foreground">
                                    R$ {campaign.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • {campaign.leads} leads
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground italic">
                                Nenhuma campanha encontrada com o termo "{correlation.campaign_term}"
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium mb-2">Grupos Correlacionados ({correlation.groups.length})</h5>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {correlation.groups.length > 0 ? (
                              correlation.groups.map((group) => (
                                <div key={group.id} className="text-sm p-2 bg-muted/50 rounded">
                                  <div className="font-medium">{group.name}</div>
                                  <div className="text-muted-foreground">
                                    {group.size} membros
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground italic">
                                Nenhum grupo encontrado com o emoji "{correlation.emoji}"
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {audienceCorrelations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum público configurado ainda.</p>
                    <p className="text-sm">Crie seu primeiro público usando o formulário acima.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Componente de Teste - Remover em produção */}
        {process.env.NODE_ENV === 'development' && (
          <AudienceTestComponent 
            liveId={liveId || ''} 
            metaIntegration={metaIntegration || undefined}
          />
        )}

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