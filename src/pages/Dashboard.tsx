import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ChevronRight, Users, TrendingUp, DollarSign, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SalesHeader } from "@/components/SalesHeader";
import { CreateLiveModal } from "@/components/CreateLiveModal";
import { LivesListModal } from "@/components/LivesListModal";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { useLives } from "@/hooks/useLives";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardStats {
  totalLives: number;
  totalParticipants: number;
  totalSales: number;
  totalRevenue: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isCreateLiveOpen, setIsCreateLiveOpen] = useState(false);
  const [isLivesListOpen, setIsLivesListOpen] = useState(false);
  const [lives, setLives] = useState<any[]>([]);
  const { currentInstance } = useWhatsAppInstances();
  const { fetchUserLives } = useLives();
  const [stats, setStats] = useState<DashboardStats>({
    totalLives: 0,
    totalParticipants: 0,
    totalSales: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (DEMO_MODE) {
          setStats({
            totalLives: 0,
            totalParticipants: 0,
            totalSales: 0,
            totalRevenue: 0,
          });
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate("/auth/signin");
          return;
        }

        await loadStats(session.user.id);
      } catch (error) {
        console.error("Error checking auth:", error);
        if (!DEMO_MODE) {
          navigate("/auth/signin");
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const loadStats = async (userId: string) => {
    try {
      // Fetch user lives with groups
      const userLives = await fetchUserLives();
      setLives(userLives);

      const totalLives = userLives.length;
      
      // Calculate total participants from all groups in all lives
      const totalParticipants = userLives.reduce((sum, live) => {
        const liveParticipants = live.live_groups?.reduce((groupSum: number, group: any) => {
          return groupSum + (group.group_size || 0);
        }, 0) || 0;
        return sum + liveParticipants;
      }, 0);

      // Mock data for sales and revenue with visual indication
      const mockSales = 45;
      const mockRevenue = 2850;

      setStats({
        totalLives,
        totalParticipants,
        totalSales: mockSales,
        totalRevenue: mockRevenue,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <SalesHeader 
        title="LiveShop Analytics" 
        salesTarget="R$ 1,10M / 10M"
        salesPercentage="11%"
        location="Endereço"
      />

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsLivesListOpen(true)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Lives</CardTitle>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLives}</div>
              <p className="text-xs text-muted-foreground">0 finalizadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Participantes</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalParticipants}</div>
              <p className="text-xs text-muted-foreground">Média: 0 por live</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.totalSales}</div>
              <p className="text-xs text-red-500">Dados mockados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">R$ {stats.totalRevenue}</div>
              <p className="text-xs text-red-500">Dados mockados</p>
            </CardContent>
          </Card>
        </div>

        {/* Lives Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Suas Lives</CardTitle>
                <p className="text-sm text-muted-foreground">Gerencie e analise todas as suas transmissões</p>
              </div>
              <Button className="gap-2" onClick={() => setIsCreateLiveOpen(true)}>
                <Plus className="w-4 h-4" />
                Nova Live
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar lives..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Table Headers */}
            <div className="border rounded-lg">
              <div className="grid grid-cols-7 gap-4 p-4 bg-muted/50 border-b">
                <div className="text-sm font-medium">Nome da Live</div>
                <div className="text-sm font-medium">Data</div>
                <div className="text-sm font-medium">Status</div>
                <div className="text-sm font-medium">Pessoas ao vivo</div>
                <div className="text-sm font-medium">Vendas</div>
                <div className="text-sm font-medium">Receita</div>
                <div className="text-sm font-medium">Ações</div>
              </div>
              
              {/* Lives List */}
              {lives.length > 0 ? (
                lives.map((live) => (
                  <div key={live.id} className="grid grid-cols-7 gap-4 p-4 border-b items-center">
                    <div className="font-medium">{live.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {live.live_date ? new Date(live.live_date).toLocaleDateString('pt-BR') : 'Não definida'}
                    </div>
                    <div>
                      <Badge variant="secondary">Criada</Badge>
                    </div>
                    <div className="text-sm">
                      {live.live_groups?.reduce((sum: number, group: any) => sum + (group.group_size || 0), 0) || 0}
                    </div>
                    <div className="text-sm text-red-500">
                      45 (mockado)
                    </div>
                    <div className="text-sm text-red-500">
                      R$ 2.850 (mockado)
                    </div>
                    <div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-16">
                  <Video className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Você ainda não possui lives cadastradas</p>
                  <Button onClick={() => setIsCreateLiveOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar sua primeira live
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Live Modal */}
      <CreateLiveModal 
        open={isCreateLiveOpen} 
        onOpenChange={setIsCreateLiveOpen}
        currentInstance={currentInstance}
        onLiveCreated={() => {
          const checkAuth = async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                await loadStats(session.user.id);
              }
            } catch (error) {
              console.error("Error reloading stats:", error);
            }
          };
          checkAuth();
        }}
      />

      {/* Lives List Modal */}
      <LivesListModal 
        open={isLivesListOpen} 
        onOpenChange={setIsLivesListOpen}
        lives={lives}
        currentInstance={currentInstance}
        onLivesUpdated={() => {
          const checkAuth = async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                await loadStats(session.user.id);
              }
            } catch (error) {
              console.error("Error reloading stats:", error);
            }
          };
          checkAuth();
        }}
      />
    </div>
  );
}