import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Live, LiveGroup } from "@/types";
import {
  BarChart3,
  DollarSign,
  Download,
  Search,
  ShoppingCart,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Groups() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const liveId = searchParams.get('live');
  
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [liveGroups, setLiveGroups] = useState<LiveGroup[]>([]);
  const [live, setLive] = useState<Live | null>(null);
  const [allGroups, setAllGroups] = useState<LiveGroup[]>([]);
  const [allLives, setAllLives] = useState<Live[]>([]);
  const [selectedLive, setSelectedLive] = useState(liveId || "todas");
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [livesGroupData, setLivesGroupData] = useState<any[]>([]);


  useEffect(() => {
    const initializePage = async () => {
      try {
        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate('/auth/signin');
          return;
        }
        setUserId(session.user.id);

        // Fetch all captações for filtering with cached_group_data
        const { data: livesData, error: livesError } = await supabase
          .from('captações')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (livesError) throw livesError;
        setAllLives(livesData || []);
        setLivesGroupData(livesData || []);

        // Fetch all groups for all captações
        const { data: groupsData, error: groupsError } = await supabase
          .from('live_groups')
          .select(`
            *,
            captações!inner(id, name, user_id)
          `)
          .eq('captações.user_id', session.user.id);

        if (groupsError) throw groupsError;
        setAllGroups(groupsData || []);

        // If specific live is requested, fetch that live's data
        if (liveId) {
          const { data: liveData, error: liveError } = await supabase
            .from('captações')
            .select('*')
            .eq('id', liveId)
            .single();

          if (liveError) throw liveError;
          setLive(liveData);

          // Filter groups for this live
          const filteredGroups = groupsData?.filter(group => group.live_id === liveId) || [];
          setLiveGroups(filteredGroups);
        } else {
          setLiveGroups(groupsData || []);
        }

      } catch (error) {

        navigate('/auth/signin');
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [navigate, liveId]);

  // Filter groups based on selected live, dates, and search
  const displayGroups = useMemo(() => {
    let groups = selectedLive === "todas" ? allGroups : allGroups.filter(group => group.live_id === selectedLive);

    // Apply date filtering to groups based on their live's date range
    if (startDate || endDate) {
      groups = groups.filter(group => {
        const live = livesGroupData.find(l => l.id === group.live_id);
        if (!live) return false;

        const liveStartDate = live.insights_date_since || new Date(live.created_at).toISOString().split('T')[0];
        const liveEndDate = live.insights_date_until || new Date(live.created_at).toISOString().split('T')[0];

        const matchesStartDate = !startDate || liveEndDate >= startDate;
        const matchesEndDate = !endDate || liveStartDate <= endDate;

        return matchesStartDate && matchesEndDate;
      });
    }

    return groups;
  }, [allGroups, selectedLive, startDate, endDate, livesGroupData]);

  const filteredData = displayGroups.filter(group =>
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Function to get group data for a specific live
  const getGroupDataForLive = (liveId: string) => {
    const live = livesGroupData.find(l => l.id === liveId);
    return live?.cached_group_data || { entries: 0, exits: 0, activeMembers: 0 };
  };

  // Calculate per-group values based on proportional distribution
  const calculateGroupValues = (group: any) => {
    const liveGroupData = getGroupDataForLive(group.live_id);
    const liveGroups = allGroups.filter(g => g.live_id === group.live_id);
    const totalGroupSize = liveGroups.reduce((sum, g) => sum + g.group_size, 0);

    // Calculate proportional values based on group size
    const proportion = totalGroupSize > 0 ? group.group_size / totalGroupSize : 0;

    return {
      entries: Math.round(liveGroupData.entries * proportion),
      exits: Math.round(liveGroupData.exits * proportion),
      activeMembers: Math.round(liveGroupData.activeMembers * proportion)
    };
  };

  // Calculate totals for the cards (global aggregated data from cached_group_data)
  const cardTotals = useMemo(() => {
    // Filter captações based on selected live and dates
    let relevantLives = selectedLive === "todas" ? livesGroupData : livesGroupData.filter(live => live.id === selectedLive);

    // Apply date filtering if dates are provided
    if (startDate || endDate) {
      relevantLives = relevantLives.filter(live => {
        // Usar insights_date_since e insights_date_until se disponíveis, senão created_at
        const liveStartDate = live.insights_date_since || new Date(live.created_at).toISOString().split('T')[0];
        const liveEndDate = live.insights_date_until || new Date(live.created_at).toISOString().split('T')[0];

        const matchesStartDate = !startDate || liveEndDate >= startDate;
        const matchesEndDate = !endDate || liveStartDate <= endDate;

        return matchesStartDate && matchesEndDate;
      });
    }

    const totals = relevantLives.reduce((acc, live) => {
      const groupData = live.cached_group_data;
      if (groupData) {
        return {
          entrouGrupo: acc.entrouGrupo + (groupData.entries || 0),
          saiuGrupo: acc.saiuGrupo + (groupData.exits || 0),
          leadsAtivos: acc.leadsAtivos + (groupData.activeMembers || 0),
          vendas: acc.vendas + 0, // Sales data not available
          receita: acc.receita + 0, // Revenue data not available
          ticketMedio: 0 // Will be calculated after we have sales data
        };
      }
      return acc;
    }, { entrouGrupo: 0, saiuGrupo: 0, leadsAtivos: 0, vendas: 0, receita: 0, ticketMedio: 0 });

    return totals;
  }, [livesGroupData, selectedLive, startDate, endDate]);

  // Calculate totals for the table headers (from filtered groups)
  const tableTotals = useMemo(() => {
    return filteredData.reduce((acc, group) => {
      const groupValues = calculateGroupValues(group);
      return {
        entrouGrupo: acc.entrouGrupo + group.group_size, // Use actual group size for "Tamanho do Grupo"
        saiuGrupo: acc.saiuGrupo + groupValues.exits,
        leadsAtivos: acc.leadsAtivos + groupValues.activeMembers,
        vendas: acc.vendas + 0, // Sales data not available
        receita: acc.receita + 0, // Revenue data not available
        ticketMedio: 0 // Will be calculated after we have sales data
      };
    }, { entrouGrupo: 0, saiuGrupo: 0, leadsAtivos: 0, vendas: 0, receita: 0, ticketMedio: 0 });
  }, [filteredData, allGroups, livesGroupData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <div className="flex-1 space-y-6 p-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrou no Grupo</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cardTotals.entrouGrupo.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saiu do Grupo</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cardTotals.saiuGrupo.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cardTotals.leadsAtivos.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cardTotals.vendas}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {Math.round(cardTotals.ticketMedio)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {cardTotals.receita.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales by Public Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Grupos WhatsApp por Captação
              </CardTitle>
              <CardDescription>
                {liveId ? `Grupos vinculados à Captação específica` : 'Visualize todos os grupos vinculados às suas Captações'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Data início:</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Data fim:</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do grupo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedLive} onValueChange={setSelectedLive}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas as captações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as captações</SelectItem>
                {allLives.map((live) => (
                  <SelectItem key={live.id} value={live.id}>
                    {live.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Captação</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">
                    Tamanho do Grupo
                    <div className="text-xs text-muted-foreground font-normal">Total: {tableTotals.entrouGrupo.toLocaleString()}</div>
                  </TableHead>
                  <TableHead className="text-center">
                    Saiu do Grupo  
                    <div className="text-xs text-muted-foreground font-normal">Total: {tableTotals.saiuGrupo.toLocaleString()}</div>
                  </TableHead>
                  <TableHead className="text-center">
                    Leads Ativos
                    <div className="text-xs text-muted-foreground font-normal">Total: {tableTotals.leadsAtivos.toLocaleString()}</div>
                  </TableHead>
                  <TableHead className="text-center">
                    Vendas
                    <div className="text-xs text-muted-foreground font-normal">Total: {tableTotals.vendas}</div>
                  </TableHead>
                  <TableHead className="text-center">
                    Receita
                    <div className="text-xs text-muted-foreground font-normal">Total: R$ {tableTotals.receita.toLocaleString()}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((group) => {
                  const liveName = allLives.find(live => live.id === group.live_id)?.name || 'Captação não encontrada';
                  const groupValues = calculateGroupValues(group);

                  return (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.group_name}</TableCell>
                      <TableCell className="text-blue-600">{liveName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={group.monitoring ? "default" : "secondary"}>
                          {group.monitoring ? "Monitorando" : "Pausado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-green-600 font-medium">
                        {group.group_size.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-red-600 font-medium">
                        {groupValues.exits.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-blue-600 font-medium">
                        {groupValues.activeMembers.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        0
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        R$ 0
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {selectedLive === "todas" ? "Nenhum grupo encontrado" : "Nenhum grupo vinculado a esta Captação"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}