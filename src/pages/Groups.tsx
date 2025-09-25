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
    ArrowDown,
    ArrowUp,
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
import { useEffect, useState } from "react";
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

        // Fetch all lives for filtering
        const { data: livesData, error: livesError } = await supabase
          .from('lives')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (livesError) throw livesError;
        setAllLives(livesData || []);

        // Fetch all groups for all lives
        const { data: groupsData, error: groupsError } = await supabase
          .from('live_groups')
          .select(`
            *,
            lives!inner(id, name, user_id)
          `)
          .eq('lives.user_id', session.user.id);

        if (groupsError) throw groupsError;
        setAllGroups(groupsData || []);

        // If specific live is requested, fetch that live's data
        if (liveId) {
          const { data: liveData, error: liveError } = await supabase
            .from('lives')
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

  // Filter groups based on selected live and search
  const displayGroups = selectedLive === "todas" ? allGroups : allGroups.filter(group => group.live_id === selectedLive);
  const filteredData = displayGroups.filter(group => 
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals from real data
  const totals = filteredData.reduce((acc, group) => ({
    entrouGrupo: acc.entrouGrupo + group.group_size,
    saiuGrupo: acc.saiuGrupo + 0, // TODO: Implement tracking of group exits
    leadsAtivos: acc.leadsAtivos + group.group_size,
    vendas: acc.vendas + 0, // TODO: Implement sales tracking per group
    receita: acc.receita + 0, // TODO: Implement revenue tracking per group
    ticketMedio: 0 // Will be calculated after we have sales data
  }), { entrouGrupo: 0, saiuGrupo: 0, leadsAtivos: 0, vendas: 0, receita: 0, ticketMedio: 0 });

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
            <div className="text-2xl font-bold">{totals.entrouGrupo.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUp className="h-3 w-3 mr-1" />
              +15% vs ontem
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saiu do Grupo</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.saiuGrupo}</div>
            <div className="flex items-center text-xs text-red-600">
              <ArrowDown className="h-3 w-3 mr-1" />
              -5% vs ontem
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.leadsAtivos.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUp className="h-3 w-3 mr-1" />
              +12% vs ontem
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.vendas}</div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUp className="h-3 w-3 mr-1" />
              +16% vs ontem
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {Math.round(totals.ticketMedio)}</div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUp className="h-3 w-3 mr-1" />
              +8% vs ontem
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totals.receita.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUp className="h-3 w-3 mr-1" />
              +22% vs ontem
            </div>
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
                Grupos WhatsApp por Live
              </CardTitle>
              <CardDescription>
                {liveId ? `Grupos vinculados à Live específica` : 'Visualize todos os grupos vinculados às suas Lives'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Data início:</label>
                <Input type="date" defaultValue="2024-11-01" className="w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Data fim:</label>
                <Input type="date" defaultValue="2024-11-30" className="w-auto" />
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
                <SelectValue placeholder="Todas as lives" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as lives</SelectItem>
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
                  <TableHead>Live</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">
                    Tamanho do Grupo
                    <div className="text-xs text-muted-foreground font-normal">Total: {totals.entrouGrupo.toLocaleString()}</div>
                  </TableHead>
                  <TableHead className="text-center">
                    Saiu do Grupo  
                    <div className="text-xs text-muted-foreground font-normal">Total: {totals.saiuGrupo}</div>
                  </TableHead>
                  <TableHead className="text-center">
                    Leads Ativos
                    <div className="text-xs text-muted-foreground font-normal">Total: {totals.leadsAtivos.toLocaleString()}</div>
                  </TableHead>
                  <TableHead className="text-center">
                    Vendas
                    <div className="text-xs text-muted-foreground font-normal">Total: {totals.vendas}</div>
                  </TableHead>
                  <TableHead className="text-center">
                    Receita
                    <div className="text-xs text-muted-foreground font-normal">Total: R$ {totals.receita.toLocaleString()}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((group) => {
                  const liveName = allLives.find(live => live.id === group.live_id)?.name || 'Live não encontrada';
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
                        0
                      </TableCell>
                      <TableCell className="text-center text-blue-600 font-medium">
                        {group.group_size.toLocaleString()}
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
                      {selectedLive === "todas" ? "Nenhum grupo encontrado" : "Nenhum grupo vinculado a esta Live"}
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