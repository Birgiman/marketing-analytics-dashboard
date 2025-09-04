import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoBanner } from '@/components/DemoBanner';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE } from '@/lib/demo-mode';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Group } from '@/types';
import { Users, MessageSquare, Phone, Calendar, Activity } from 'lucide-react';

export default function Groups() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { groups, loading: analyticsLoading } = useAnalytics(userId || undefined);

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

  const formatDateTime = (dateTime?: string) => {
    if (!dateTime) return 'N/A';
    return new Date(dateTime).toLocaleString('pt-BR');
  };

  const getEventIcon = (evento?: string) => {
    switch (evento?.toLowerCase()) {
      case 'entrada':
      case 'join':
        return <Activity className="h-4 w-4 text-green-600" />;
      case 'saida':
      case 'leave':
        return <Activity className="h-4 w-4 text-red-600" />;
      case 'mensagem':
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventColor = (evento?: string) => {
    switch (evento?.toLowerCase()) {
      case 'entrada':
      case 'join':
        return 'bg-green-100 text-green-800';
      case 'saida':
      case 'leave':
        return 'bg-red-100 text-red-800';
      case 'mensagem':
      case 'message':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Group activities by group name
  const groupsByName = groups.reduce((acc, group) => {
    const groupName = group.nome_grupo || 'Grupo sem nome';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(group);
    return acc;
  }, {} as Record<string, Group[]>);

  const totalGroups = Object.keys(groupsByName).length;
  const totalActivities = groups.length;
  const uniqueNumbers = new Set(groups.map(g => g.telefone).filter(Boolean)).size;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <>
      <title>Grupos - Live Shop Analytics</title>

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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Grupos WhatsApp</h1>
            <p className="text-gray-600">
              Monitore atividades e engajamento nos grupos WhatsApp
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Grupos</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalGroups}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Atividades</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalActivities}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Phone className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Números Únicos</p>
                  <p className="text-2xl font-semibold text-gray-900">{uniqueNumbers}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Última Atividade</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {groups.length > 0 ? 'Hoje' : 'Nenhuma'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Groups List */}
          <div className="space-y-6">
            {analyticsLoading ? (
              <div className="text-center py-8">
                <div className="text-lg">Carregando grupos...</div>
              </div>
            ) : Object.keys(groupsByName).length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum grupo encontrado</h3>
                <p className="text-gray-600 mb-4">
                  As atividades dos grupos WhatsApp aparecerão aqui
                </p>
              </Card>
            ) : (
              Object.entries(groupsByName).map(([groupName, groupActivities]) => (
                <Card key={groupName} className="overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{groupName}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>ID: {groupActivities[0]?.id_grupo || 'N/A'}</span>
                        <span>{groupActivities.length} atividades</span>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {groupActivities.slice(0, 10).map((activity) => (
                      <div key={activity.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getEventIcon(activity.evento)}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {activity.telefone || 'Número não identificado'}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventColor(activity.evento)}`}>
                                  {activity.evento || 'Evento'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {formatDateTime(activity.data_hora)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {groupActivities.length > 10 && (
                      <div className="px-6 py-4 text-center">
                        <Button variant="outline" size="sm">
                          Ver mais {groupActivities.length - 10} atividades
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}