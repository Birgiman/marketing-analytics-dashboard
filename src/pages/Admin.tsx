import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  UserCheck,
  UserMinus,
  UserX,
  XCircle
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected' | 'disabled'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<UserStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    disabled: 0
  });

  const loadProfiles = useCallback(async () => {
    try {
      // Get profiles data
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      setProfiles(profilesData || []);

      // Calculate stats
      const newStats = (profilesData || []).reduce((acc, profile) => {
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
  }, [toast]);

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
  }, [navigate, loadProfiles]);

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

  const handleDisable = async (profileUserId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'disabled' })
        .eq('user_id', profileUserId);

      if (error) throw error;

      toast({
        title: "Usuário desabilitado",
        description: `${userName} foi desabilitado`,
      });

      await loadProfiles();
    } catch (error) {
      console.error('Error disabling user:', error);
      toast({
        title: "Erro",
        description: "Erro ao desabilitar usuário",
        variant: "destructive"
      });
    }
  };

  const handleEnable = async (profileUserId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'approved' })
        .eq('user_id', profileUserId);

      if (error) throw error;

      toast({
        title: "Usuário habilitado",
        description: `${userName} foi habilitado novamente`,
      });

      await loadProfiles();
    } catch (error) {
      console.error('Error enabling user:', error);
      toast({
        title: "Erro",
        description: "Erro ao habilitar usuário",
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

  // Função para formatar telefone
  const formatPhone = (phone: string | undefined) => {
    if (!phone) return 'Não informado';
    
    // Remove todos os caracteres não numéricos
    const numbers = phone.replace(/\D/g, '');
    
    // Se tem código do país (55), remove
    if (numbers.startsWith('55') && numbers.length === 13) {
      const withoutCountryCode = numbers.substring(2);
      return formatPhoneNumber(withoutCountryCode);
    }
    
    // Se tem 11 dígitos (DDD + 9 + 8 dígitos)
    if (numbers.length === 11) {
      return formatPhoneNumber(numbers);
    }
    
    // Se tem 10 dígitos (DDD + 8 dígitos)
    if (numbers.length === 10) {
      return formatPhoneNumber(numbers);
    }
    
    return phone; // Retorna original se não conseguir formatar
  };

  const formatPhoneNumber = (numbers: string) => {
    if (numbers.length === 11) {
      // (21) 9 8848-7643
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 3)} ${numbers.substring(3, 7)}-${numbers.substring(7)}`;
    } else if (numbers.length === 10) {
      // (21) 8848-7643
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
    }
    return numbers;
  };

  const filteredUsers = profiles.filter(p => {
    const matchesStatus = p.status === activeFilter;
    const matchesSearch = searchTerm === '' || 
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });
  
  const getFilterTitle = () => {
    switch (activeFilter) {
      case 'pending': return 'Usuários Pendentes de Aprovação';
      case 'approved': return 'Usuários Aprovados';
      case 'rejected': return 'Usuários Rejeitados';
      case 'disabled': return 'Usuários Desabilitados';
      default: return 'Usuários';
    }
  };

  const handleFilterClick = (filter: 'pending' | 'approved' | 'rejected' | 'disabled') => {
    setActiveFilter(filter);
    setSearchTerm(''); // Limpa busca ao trocar filtro
  };

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
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'pending' ? 'ring-2 ring-orange-500' : ''}`}
              onClick={() => handleFilterClick('pending')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending}</div>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'approved' ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => handleFilterClick('approved')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.approved}</div>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'rejected' ? 'ring-2 ring-red-600' : ''}`}
              onClick={() => handleFilterClick('rejected')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.rejected}</div>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'disabled' ? 'ring-2 ring-gray-500' : ''}`}
              onClick={() => handleFilterClick('disabled')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Desabilitados</CardTitle>
                <UserMinus className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.disabled}</div>
              </CardContent>
            </Card>
          </div>

          {/* Users Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{getFilterTitle()}</h2>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou e-mail"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>
            
            {filteredUsers.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Nenhum usuário encontrado para esta busca' : 'Nenhum usuário encontrado para este filtro'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-left animate-slide-in">
                          <th className="p-4 font-medium">Nome</th>
                          <th className="p-4 font-medium">E-mail</th>
                          <th className="p-4 font-medium">Telefone</th>
                          <th className="p-4 font-medium">Status</th>
                          <th className="p-4 font-medium">Data de Cadastro</th>
                          <th className="p-4 font-medium text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((profile, index) => {
                          const getStatusBadge = (status: string) => {
                            switch (status) {
                              case 'pending':
                                return <Badge variant="secondary" className="text-orange-600 bg-orange-50">Pendente</Badge>;
                              case 'approved':
                                return <Badge variant="secondary" className="text-green-600 bg-green-50">Aprovado</Badge>;
                              case 'rejected':
                                return <Badge variant="secondary" className="text-red-600 bg-red-50">Rejeitado</Badge>;
                              case 'disabled':
                                return <Badge variant="secondary" className="text-gray-600 bg-gray-50">Desabilitado</Badge>;
                              default:
                                return <Badge variant="secondary">{status}</Badge>;
                            }
                          };

                          const getActionButtons = () => {
                            switch (profile.status) {
                              case 'pending':
                                return (
                                  <div className="flex gap-2 justify-center">
                                    <Button 
                                      onClick={() => handleApprove(profile.user_id, `${profile.first_name} ${profile.last_name}`)}
                                      size="sm"
                                      className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      Aprovar
                                    </Button>
                                    <Button 
                                      onClick={() => handleReject(profile.user_id, `${profile.first_name} ${profile.last_name}`)}
                                      size="sm"
                                      variant="destructive"
                                      className="gap-2"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Recusar
                                    </Button>
                                  </div>
                                );
                              case 'approved':
                                return (
                                  <div className="flex gap-2 justify-center">
                                    <Button 
                                      onClick={() => handleDisable(profile.user_id, `${profile.first_name} ${profile.last_name}`)}
                                      size="sm"
                                      variant="outline"
                                      className="gap-2"
                                    >
                                      <UserX className="h-4 w-4" />
                                      Desabilitar
                                    </Button>
                                  </div>
                                );
                              case 'disabled':
                                return (
                                  <div className="flex gap-2 justify-center">
                                    <Button 
                                      onClick={() => handleEnable(profile.user_id, `${profile.first_name} ${profile.last_name}`)}
                                      size="sm"
                                      variant="outline"
                                      className="gap-2"
                                    >
                                      <UserCheck className="h-4 w-4" />
                                      Habilitar
                                    </Button>
                                  </div>
                                );
                              default:
                                return null;
                            }
                          };

                          return (
                            <tr 
                              key={profile.id} 
                              className="border-b hover:bg-muted/50 animate-slide-in"
                              style={{
                                animationDelay: `${Math.min(index * 0.1, 0.5)}s`,
                                animationFillMode: 'both'
                              }}
                            >
                              <td className="p-4">
                                <div className="font-medium">{profile.first_name} {profile.last_name}</div>
                              </td>
                              <td className="p-4">
                                <div className="text-sm text-muted-foreground">{profile.email || 'Email não informado'}</div>
                              </td>
                              <td className="p-4">
                                <div className="text-sm">{formatPhone(profile.phone)}</div>
                              </td>
                              <td className="p-4">
                                {getStatusBadge(profile.status)}
                              </td>
                              <td className="p-4">
                                <div className="text-sm text-muted-foreground">
                                  {new Date(profile.created_at).toLocaleString('pt-BR')}
                                </div>
                              </td>
                              <td className="p-4">
                                {getActionButtons()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
  );
}
