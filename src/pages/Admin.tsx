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
import { useToast } from "@/hooks/use-toast";

interface ProfileWithAuth {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  status: 'pending' | 'approved' | 'rejected' | 'disabled';
  created_at: string;
  email?: string;
}

interface UserStats {
  pending: number;
  approved: number;
  rejected: number;
  disabled: number;
}

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileWithAuth[]>([]);
  const [stats, setStats] = useState<UserStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    disabled: 0
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate('/auth/signin');
          return;
        }
        setUserId(session.user.id);
        await loadProfiles();
      } catch (error) {
        console.error('Error checking auth:', error);
        navigate('/auth/signin'); 
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const loadProfiles = async () => {
    try {
      // Get profiles data
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get auth users data for emails
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      
      // Combine profile and auth data
      const enrichedProfiles = profilesData?.map(profile => {
        const authUser = authData?.users?.find(user => user.id === profile.user_id);
        return {
          ...profile,
          email: authUser?.email || 'Email não encontrado'
        };
      }) || [];

      setProfiles(enrichedProfiles);

      // Calculate stats
      const newStats = enrichedProfiles.reduce((acc, profile) => {
        acc[profile.status as keyof UserStats]++;
        return acc;
      }, { pending: 0, approved: 0, rejected: 0, disabled: 0 });

      setStats(newStats);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos usuários",
        variant: "destructive"
      });
    }
  };

  const handleApprove = async (profileUserId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'approved' })
        .eq('user_id', profileUserId);

      if (error) throw error;

      toast({
        title: "Usuário aprovado",
        description: `${userName} foi aprovado com sucesso`,
      });

      await loadProfiles();
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: "Erro",
        description: "Erro ao aprovar usuário",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (profileUserId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('user_id', profileUserId);

      if (error) throw error;

      toast({
        title: "Usuário rejeitado",
        description: `${userName} foi rejeitado`,
      });

      await loadProfiles();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({
        title: "Erro",
        description: "Erro ao rejeitar usuário",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = () => {
    loadProfiles();
    toast({
      title: "Dados atualizados",
      description: "Lista de usuários foi atualizada",
    });
  };

  const pendingUsers = profiles.filter(p => p.status === 'pending');

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.approved}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.rejected}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Desabilitados</CardTitle>
                <UserMinus className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.disabled}</div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Users Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Usuários Pendentes de Aprovação</h2>
            
            <div className="space-y-4">
              {pendingUsers.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Nenhum usuário pendente de aprovação</p>
                  </CardContent>
                </Card>
              ) : (
                pendingUsers.map((profile) => (
                  <Card key={profile.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="font-semibold text-lg">{profile.first_name} {profile.last_name}</h3>
                              <p className="text-primary text-sm">{profile.email}</p>
                            </div>
                            <Badge variant="secondary" className="text-orange-600 bg-orange-50">
                              Pendente
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-8 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Telefone:</span>
                              <div className="text-primary">{profile.phone || 'Não informado'}</div>
                            </div>
                            <div>
                              <span className="font-medium">Data de cadastro:</span>
                              <div>{new Date(profile.created_at).toLocaleString('pt-BR')}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleApprove(profile.user_id, `${profile.first_name} ${profile.last_name}`)}
                            className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Aprovar
                          </Button>
                          <Button 
                            onClick={() => handleReject(profile.user_id, `${profile.first_name} ${profile.last_name}`)}
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
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}