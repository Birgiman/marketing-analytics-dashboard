import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ChevronRight, Users, TrendingUp, DollarSign, Video } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEMO_MODE } from "@/lib/demo-mode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DashboardStats {
  totalLives: number;
  totalParticipants: number;
  totalSales: number;
  totalRevenue: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
      // Get lives data
      const { data: lives } = await supabase
        .from("lives")
        .select("participants, sales, revenue");

      const totalLives = lives?.length || 0;
      const totalParticipants = lives?.reduce((sum, live) => sum + (live.participants || 0), 0) || 0;
      const totalSales = lives?.reduce((sum, live) => sum + (live.sales || 0), 0) || 0;
      const totalRevenue = lives?.reduce((sum, live) => sum + (live.revenue || 0), 0) || 0;

      setStats({
        totalLives,
        totalParticipants,
        totalSales,
        totalRevenue,
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
      <header className="flex items-center justify-between p-6 border-b border-border bg-card">
        <h1 className="text-2xl font-semibold text-foreground">LiveShop Analytics</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>R$ 1,10M / 10M</span>
          <span>11%</span>
          <span>Endereço</span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
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
              <div className="text-2xl font-bold">{stats.totalSales}</div>
              <p className="text-xs text-muted-foreground">Média: 0 por live</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {stats.totalRevenue}</div>
              <p className="text-xs text-muted-foreground">Ticket médio: R$ 0</p>
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
              <Button className="gap-2">
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
              
              {/* Empty State */}
              <div className="flex flex-col items-center justify-center py-16">
                <Video className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Você ainda não possui lives cadastradas</p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar sua primeira live
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}