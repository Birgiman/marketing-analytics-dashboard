import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserCheck, 
  UserX, 
  UserMinus,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { SalesHeader } from "@/components/SalesHeader";
import { DemoBanner } from "@/components/DemoBanner";

interface PendingUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  registrationDate: string;
  status: 'pendente' | 'aprovado' | 'recusado';
}

export default function Admin() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data for pending users
  const [pendingUsers] = useState<PendingUser[]>([
    {
      id: "1",
      name: "Diana Maria",
      email: "dianamariademaria@gmail.com",
      phone: "47999520104",
      registrationDate: "01/09/2025 18:59",
      status: "pendente"
    },
    {
      id: "2", 
      name: "Arthur Santos",
      email: "arthursantos@evargoeducacao.com.br",
      phone: "81984942056",
      registrationDate: "01/09/2025 18:46",
      status: "pendente"
    },
    {
      id: "3",
      name: "Arthur Santos",
      email: "arthurgabriellbsantos@hotmail.com", 
      phone: "81984942056",
      registrationDate: "01/09/2025 18:45",
      status: "pendente"
    }
  ]);

  // Mock stats data
  const stats = {
    pendentes: 3,
    ativos: 1,
    bloqueados: 0,
    rejeitados: 0,
    desativados: 1
  };

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

  const handleApprove = (userId: string) => {
    console.log('Approving user:', userId);
    // TODO: Implement approve user logic
  };

  const handleReject = (userId: string) => {
    console.log('Rejecting user:', userId);
    // TODO: Implement reject user logic
  };

  const handleRefresh = () => {
    console.log('Refreshing data...');
    // TODO: Implement data refresh logic
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
      <title>Painel Administrativo - Live Shop Analytics</title>
      <main className="min-h-screen bg-gray-50">
        <DemoBanner />
        <SalesHeader title="LiveShop Analytics" />
        
        <div className="flex-1 space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Painel Administrativo
              </h1>
              <p className="text-muted-foreground">
                Gerencie usuários e permissões do sistema
              </p>
            </div>
            <Button onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendentes}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.ativos}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bloqueados</CardTitle>
                <UserX className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.bloqueados}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.rejeitados}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Desativados</CardTitle>
                <UserMinus className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.desativados}</div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Users Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Usuários Pendentes de Aprovação</h2>
            
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <Card key={user.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-semibold text-lg">{user.name}</h3>
                            <p className="text-blue-600 text-sm">{user.email}</p>
                          </div>
                          <Badge variant="secondary" className="text-orange-600 bg-orange-50">
                            Pendente
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-8 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Telefone:</span>
                            <div className="text-blue-600">{user.phone}</div>
                          </div>
                          <div>
                            <span className="font-medium">Data de cadastro:</span>
                            <div>{user.registrationDate}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleApprove(user.id)}
                          className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Aprovar
                        </Button>
                        <Button 
                          onClick={() => handleReject(user.id)}
                          variant="destructive"
                          className="gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Recusar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}