import { Button } from '@/components/ui/button';
import { DemoBanner } from '@/components/DemoBanner';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE, DEMO_STATS } from '@/lib/demo-mode';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BarChart3, MessageSquare, Users, TrendingUp, Eye, DollarSign } from 'lucide-react';

interface DashboardStats {
  totalViews: number;
  totalSales: number;
  totalRevenue: number;
  whatsappInstances: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalViews: 0,
    totalSales: 0,
    totalRevenue: 0,
    whatsappInstances: 0
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (DEMO_MODE) {
          // Modo demo - carregr dados de exemplo
          setStats(DEMO_STATS);
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate('/auth/signin');
          return;
        }

        // Load dashboard stats
        await loadStats(session.user.id);
      } catch (error) {
        console.error('Error checking auth:', error);
        if (!DEMO_MODE) {
          navigate('/auth/signin');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const loadStats = async (userId: string) => {
    try {
      // Load WhatsApp instances
      const { data: whatsappData } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('user_id', userId);

      // Load lives data
      const { data: livesData } = await supabase
        .from('lives')
        .select('participants, sales, revenue');

      const totalViews = livesData?.reduce((sum, live) => sum + (live.participants || 0), 0) || 0;
      const totalSales = livesData?.reduce((sum, live) => sum + (live.sales || 0), 0) || 0;
      const totalRevenue = livesData?.reduce((sum, live) => sum + (live.revenue || 0), 0) || 0;

      setStats({
        totalViews,
        totalSales,
        totalRevenue,
        whatsappInstances: whatsappData?.length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <title>Dashboard - Live Shop Analytics</title>

      <main className="min-h-screen bg-gray-50">
        <DemoBanner />
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-gray-900">
                  Live Shop Analytics
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link to="/integrations">
                  <Button variant="outline">Integrações</Button>
                </Link>
                <Link to="/analytics">
                  <Button variant="outline">Analytics</Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">
              Visão geral das suas métricas e performance
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Visualizações</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalViews.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Vendas</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalSales}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Receita Total</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">WhatsApp Conectado</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.whatsappInstances}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center mb-4">
                <BarChart3 className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold">Analytics Detalhado</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Veja análises detalhadas de performance e conversões
              </p>
              <Link to="/analytics">
                <Button className="w-full">Ver Analytics</Button>
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center mb-4">
                <MessageSquare className="h-6 w-6 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold">Integrações</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Configure WhatsApp e outras integrações
              </p>
              <Link to="/integrations">
                <Button className="w-full">Configurar</Button>
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center mb-4">
                <Users className="h-6 w-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold">Lives</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Gerencie e monitore suas transmissões ao vivo
              </p>
              <Link to="/lives">
                <Button className="w-full">Gerenciar Lives</Button>
              </Link>
            </div>
          </div>

          {/* Recent Activity placeholder */}
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <h3 className="text-lg font-semibold mb-4">Atividade Recente</h3>
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Conecte suas integrações para ver atividades recentes aqui
                </p>
                <Link to="/integrations">
                  <Button variant="outline" className="mt-4">
                    Configurar Integrações
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}