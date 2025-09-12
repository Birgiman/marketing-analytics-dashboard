import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoBanner } from '@/components/DemoBanner';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_MODE } from '@/lib/demo-mode';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Live } from '@/types';
import { Plus, Play, Users, TrendingUp, Calendar, Clock, Eye, Edit, Trash2, Target } from 'lucide-react';
import { useMetaLivesData } from '@/hooks/useMetaLivesData';
import { Badge } from '@/components/ui/badge';

export default function Lives() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { lives, createLive, updateLive, deleteLive, loading: analyticsLoading } = useAnalytics(userId || undefined);
  
  // Verificar status da integração Meta
  const { hasMetaIntegration, isConnected: metaConnected } = useMetaLivesData(userId || undefined);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (DEMO_MODE) {
          setUserId('demo-user-123');
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate('/auth/signin');
          return;
        }

        setUserId(session.user.id);
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

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Não definido';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getLiveStatus = (live: Live) => {
    const now = new Date();
    const startTime = live.captacao_start ? new Date(live.captacao_start) : null;
    const endTime = live.ta_rolando_end ? new Date(live.ta_rolando_end) : null;

    if (endTime && now > endTime) {
      return { status: 'Finalizada', color: 'bg-gray-100 text-gray-600' };
    }
    if (startTime && now >= startTime && (!endTime || now <= endTime)) {
      return { status: 'Ao Vivo', color: 'bg-red-100 text-red-600' };
    }
    if (startTime && now < startTime) {
      return { status: 'Agendada', color: 'bg-blue-100 text-blue-600' };
    }
    return { status: 'Rascunho', color: 'bg-yellow-100 text-yellow-600' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <>
      <title>Lives - Live Shop Analytics</title>

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
                <Link to="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <Link to="/integrations">
                  <Button variant="outline">Integrações</Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Lives</h1>
              <p className="text-gray-600">
                Gerencie e monitore suas transmissões ao vivo
              </p>
            </div>
            <Button variant="primary" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Live
            </Button>
          </div>

          {/* Status da Integração Meta */}
          <div className="mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Meta Ads Integration</h3>
                    <p className="text-sm text-gray-600">
                      {hasMetaIntegration 
                        ? (metaConnected ? 'Conectado e funcionando' : 'Conectado, mas sem dados recentes') 
                        : 'Não configurado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasMetaIntegration ? (
                    metaConnected ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Sem Dados
                      </Badge>
                    )
                  ) : (
                    <>
                      <Badge variant="outline" className="bg-gray-100 text-gray-600">
                        Desconectado
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/integrations')}
                      >
                        Conectar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Play className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Lives</p>
                  <p className="text-2xl font-semibold text-gray-900">{(lives || []).length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Visualizações</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {(lives || []).reduce((sum, live) => sum + (live.participants || 0), 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Vendas</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {(lives || []).reduce((sum, live) => sum + (live.sales || 0), 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Receita</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    R$ {(lives || []).reduce((sum, live) => sum + (live.revenue || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Lives List */}
          <div className="grid gap-6">
            {analyticsLoading ? (
              <div className="text-center py-8">
                <div className="text-lg">Carregando lives...</div>
              </div>
            ) : !lives || lives.length === 0 ? (
              <Card className="p-8 text-center">
                <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma live encontrada</h3>
                <p className="text-gray-600 mb-4">
                  Crie sua primeira live para começar a transmitir
                </p>
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primera Live
                </Button>
              </Card>
            ) : (
              (lives || []).map((live) => {
                const { status, color } = getLiveStatus(live);
                return (
                  <Card key={live.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{live.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                            {status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Início: {formatDate(live.captacao_start)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Fim: {formatDate(live.ta_rolando_end)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{live.participants || 0} participantes</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/details?live=${live.id}`)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-gray-900">{live.participants || 0}</p>
                        <p className="text-sm text-gray-600">Participantes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-gray-900">{live.sales || 0}</p>
                        <p className="text-sm text-gray-600">Vendas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-gray-900">
                          R$ {(live.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-600">Receita</p>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </main>
    </>
  );
}