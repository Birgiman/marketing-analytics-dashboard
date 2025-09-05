import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserMinus, 
  UserCheck, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Download,
  Search,
  Settings,
  MapPin,
  BarChart3,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface GroupData {
  id: string;
  grupo: string;
  publico: string;
  live: string;
  entrouGrupo: number;
  saiuGrupo: number;
  leadsAtivos: number;
  vendas: number;
  receita: number;
  ticketMedio: number;
}

export default function Groups() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPublico, setSelectedPublico] = useState("todos");
  const [selectedLive, setSelectedLive] = useState("todas");

  // Mock data - replace with real data from your backend
  const mockGroupsData: GroupData[] = [
    {
      id: "1",
      grupo: "Grupo WhatsApp 1",
      publico: "Black Friday 2024",
      live: "Live Black Friday #1",
      entrouGrupo: 450,
      saiuGrupo: 32,
      leadsAtivos: 418,
      vendas: 15,
      receita: 7350,
      ticketMedio: 490
    },
    {
      id: "2", 
      grupo: "Grupo WhatsApp 2",
      publico: "Black Friday 2024",
      live: "Live Black Friday #1",
      entrouGrupo: 380,
      saiuGrupo: 28,
      leadsAtivos: 352,
      vendas: 12,
      receita: 5880,
      ticketMedio: 490
    },
    {
      id: "3",
      grupo: "Grupo Telegram VIP",
      publico: "Black Friday 2024", 
      live: "Live Black Friday #2",
      entrouGrupo: 125,
      saiuGrupo: 8,
      leadsAtivos: 117,
      vendas: 5,
      receita: 2440,
      ticketMedio: 488
    },
    {
      id: "4",
      grupo: "Grupo Exclusivo VIP",
      publico: "Lançamento Produto X",
      live: "Live Produto X",
      entrouGrupo: 220,
      saiuGrupo: 15,
      leadsAtivos: 205,
      vendas: 10,
      receita: 4680,
      ticketMedio: 468
    },
    {
      id: "5",
      grupo: "Grupo WhatsApp Beta",
      publico: "Lançamento Produto X",
      live: "Live Produto X",
      entrouGrupo: 180,
      saiuGrupo: 12,
      leadsAtivos: 168,
      vendas: 8,
      receita: 3740,
      ticketMedio: 467
    },
    {
      id: "6",
      grupo: "Grupo Premium Members",
      publico: "Cyber Monday",
      live: "Live Cyber Monday",
      entrouGrupo: 95,
      saiuGrupo: 5,
      leadsAtivos: 90,
      vendas: 7,
      receita: 3850,
      ticketMedio: 550
    },
    {
      id: "7",
      grupo: "Grupo Diamond",
      publico: "Black Friday 2024",
      live: "Live Black Friday #3",
      entrouGrupo: 300,
      saiuGrupo: 20,
      leadsAtivos: 280,
      vendas: 18,
      receita: 8640,
      ticketMedio: 480
    },
    {
      id: "8",
      grupo: "Grupo Elite",
      publico: "Cyber Monday",
      live: "Live Cyber Monday",
      entrouGrupo: 150,
      saiuGrupo: 10,
      leadsAtivos: 140,
      vendas: 9,
      receita: 4950,
      ticketMedio: 550
    }
  ];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate('/auth/signin');
          return;
        }
        setUserId(session.user.id);
      } catch (error) {
        console.error('Error checking auth:', error);
        navigate('/auth/signin'); 
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Calculate totals
  const totals = mockGroupsData.reduce((acc, group) => ({
    entrouGrupo: acc.entrouGrupo + group.entrouGrupo,
    saiuGrupo: acc.saiuGrupo + group.saiuGrupo,
    leadsAtivos: acc.leadsAtivos + group.leadsAtivos,
    vendas: acc.vendas + group.vendas,
    receita: acc.receita + group.receita,
    ticketMedio: acc.receita / acc.vendas || 0
  }), { entrouGrupo: 0, saiuGrupo: 0, leadsAtivos: 0, vendas: 0, receita: 0, ticketMedio: 0 });

  // Filter data
  const filteredData = mockGroupsData.filter(group => {
    const matchesSearch = group.grupo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPublico = selectedPublico === "todos" || group.publico === selectedPublico;
    const matchesLive = selectedLive === "todas" || group.live === selectedLive;
    return matchesSearch && matchesPublico && matchesLive;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              LiveShop Analytics
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>R$ 1,10M / 10M</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary">11%</Badge>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>Endereço</span>
          </div>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
                Vendas por Público - Geral
              </CardTitle>
              <CardDescription>
                Visualize e filtre os dados de todos os grupos e campanhas
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
            <Select value={selectedPublico} onValueChange={setSelectedPublico}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos os públicos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os públicos</SelectItem>
                <SelectItem value="Black Friday 2024">Black Friday 2024</SelectItem>
                <SelectItem value="Lançamento Produto X">Lançamento Produto X</SelectItem>
                <SelectItem value="Cyber Monday">Cyber Monday</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedLive} onValueChange={setSelectedLive}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas as lives" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as lives</SelectItem>
                <SelectItem value="Live Black Friday #1">Live Black Friday #1</SelectItem>
                <SelectItem value="Live Black Friday #2">Live Black Friday #2</SelectItem>
                <SelectItem value="Live Black Friday #3">Live Black Friday #3</SelectItem>
                <SelectItem value="Live Produto X">Live Produto X</SelectItem>
                <SelectItem value="Live Cyber Monday">Live Cyber Monday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Público</TableHead>
                  <TableHead>Live</TableHead>
                  <TableHead className="text-center">
                    Entrou no Grupo
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
                  <TableHead className="text-center">
                    Ticket Médio
                    <div className="text-xs text-muted-foreground font-normal">Média: R$ {Math.round(totals.ticketMedio)}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.grupo}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{group.publico}</Badge>
                    </TableCell>
                    <TableCell className="text-blue-600">{group.live}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">
                      {group.entrouGrupo}
                    </TableCell>
                    <TableCell className="text-center text-red-600 font-medium">
                      {group.saiuGrupo}
                    </TableCell>
                    <TableCell className="text-center text-blue-600 font-medium">
                      {group.leadsAtivos}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {group.vendas}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      R$ {group.receita.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      R$ {group.ticketMedio}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}