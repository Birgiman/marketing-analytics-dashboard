import { ConfirmationModal } from "@/components/ConfirmationModal";
import { CreateLiveModal } from "@/components/CreateLiveModal";
import Header from "@/components/Header";
import { LivesListModal } from "@/components/LivesListModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLives } from "@/hooks/useLives";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { debounce } from "@/lib/utils";
import { whatsappService } from "@/services/whatsappService";
import { Live, LiveGroup } from "@/types/live";
import { ChevronRight, DollarSign, Edit, Eye, Plus, Search, Trash2, TrendingUp, Users, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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
const [lives, setLives] = useState<Live[]>([]);
  const [editingLive, setEditingLive] = useState<Live | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [liveToDelete, setLiveToDelete] = useState<Live | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { currentInstance } = useWhatsAppInstances();
  const { fetchUserLives, softDeleteLive } = useLives();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalLives: 0,
    totalParticipants: 0,
    totalSales: 0,
    totalRevenue: 0,
  });

  const [isSyncingGroups, setIsSyncingGroups] = useState(false);
  const [hasSyncedGroups, setHasSyncedGroups] = useState(false);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<number>(0);
  
  // Refs para evitar stale closures e controlar execução única
  const hasExecutedInitialSync = useRef(false);
  const syncInProgress = useRef(false);

  // Função para sincronizar grupos WhatsApp em background com debounce
  const syncWhatsAppGroupsInternal = useCallback(async (userId: string, instanceName: string) => {
    const now = Date.now();
    const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutos

    // Verificações de segurança com refs para evitar loops
    if (!instanceName || syncInProgress.current || hasSyncedGroups) {
      console.log(`🚫 [Dashboard] Sync bloqueado: instanceName=${!!instanceName}, syncInProgress=${syncInProgress.current}, hasSyncedGroups=${hasSyncedGroups}`);
      return;
    }

    // Verificar cooldown
    if (lastSyncAttempt && (now - lastSyncAttempt) < COOLDOWN_PERIOD) {
      console.log(`⏳ [Dashboard] Cooldown ativo: ${Math.round((COOLDOWN_PERIOD - (now - lastSyncAttempt)) / 1000)}s restantes`);
      return;
    }

    syncInProgress.current = true;
    setIsSyncingGroups(true);
    setLastSyncAttempt(now);

    try {

      // Verificar status da instância antes de chamar a edge function
      const { data: instanceData } = await supabase
        .from('whatsapp_instances')
        .select('status, api_token')
        .eq('instance_name', instanceName)
        .eq('user_id', userId)
        .single();

      if (!instanceData?.api_token || instanceData.status !== 'connected') {
        return;
      }

      // Iniciar sincronização assíncrona usando nova arquitetura de filas
      whatsappService.syncGroupsWithQueue(instanceName, userId).catch((error) => {
        console.error(`Erro na sincronização:`, error.message);
      });
      
    } catch (error) {
      console.error(`Erro na sincronização:`, error);
    } finally {
      syncInProgress.current = false;
      setIsSyncingGroups(false);
      setHasSyncedGroups(true);
    }
  }, [supabase, hasSyncedGroups, lastSyncAttempt]);

  // Função com debounce para evitar execuções excessivas
  const syncWhatsAppGroups = useCallback(
    debounce(syncWhatsAppGroupsInternal, 2000), // 2 segundos de debounce
    [syncWhatsAppGroupsInternal]
  );

  const [hasLoadedStats, setHasLoadedStats] = useState(false);

  const loadStats = useCallback(async (userId: string, forceReload = false) => {
    if (hasLoadedStats && !forceReload) return; // Evitar carregamento duplicado
    
    try {
      // Fetch user lives with groups
      const userLives = await fetchUserLives();
      setLives(userLives);

      const totalLives = userLives.length;
      
      // Calculate total participants from all groups in all lives
      const totalParticipants = userLives.reduce((sum: number, live: any) => {
        const liveParticipants = live.live_groups?.reduce((groupSum: number, group: LiveGroup) => {
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

    } finally {
      setLoading(false);
      setHasLoadedStats(true);
    }
  }, [fetchUserLives, hasLoadedStats]);

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
        console.log(`❌ [Dashboard] Erro na autenticação:`, error);
        if (!DEMO_MODE) {
          navigate("/auth/signin");
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, loadStats]); // Removidas dependências problemáticas

  // useEffect separado para sincronização de grupos (executado apenas uma vez)
  useEffect(() => {
    const handleGroupSync = async () => {
      // Só executa uma vez por sessão
      if (hasExecutedInitialSync.current || DEMO_MODE || !currentInstance?.instance_name) {
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        hasExecutedInitialSync.current = true;
        
        // Usar setTimeout para executar após o render inicial
        setTimeout(() => {
          syncWhatsAppGroups(session.user.id, currentInstance.instance_name);
        }, 1000);
        
      } catch (error) {
        console.log(`⚠️ [Dashboard] Erro na sincronização inicial:`, error);
      }
    };

    handleGroupSync();
  }, [currentInstance?.instance_name, syncWhatsAppGroups]); // Executar quando instance_name mudar

  const handleEditLive = (live: Live) => {
    setEditingLive(live);
    setShowEditModal(true);
  };

  const handleDeleteLive = (live: Live) => {
    setLiveToDelete(live);
    setShowDeleteModal(true);
  };

  const confirmDeleteLive = async () => {
    if (liveToDelete) {
      try {
        await softDeleteLive(liveToDelete.id);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await loadStats(session.user.id, true);
        }
        setShowDeleteModal(false);
        setLiveToDelete(null);
      } catch (error) {

      }
    }
  };


  // Filter lives based on search term
  const filteredLives = lives.filter(live =>
    live.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <Header />


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
              <CardTitle className="text-sm font-medium">Participantes</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalParticipants}</div>
              <p className="text-xs text-muted-foreground">Média: 0 por live</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Total de vendas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 0</div>
              <p className="text-xs text-muted-foreground">Total faturado</p>
            </CardContent>
          </Card>
        </div>

        {/* Lives Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Gerenciar Lives</CardTitle>
                <p className="text-sm text-muted-foreground">Crie, edite e acompanhe suas lives</p>
              </div>
              <Button variant="primary" className="gap-2" onClick={() => setIsCreateLiveOpen(true)}>
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Table Headers */}
            <div className="border rounded-lg">
              <div className="grid grid-cols-7 gap-4 p-4 bg-white border-b">
                <div className="text-sm font-medium">Nome da Live</div>
                <div className="text-sm font-medium">Data</div>
                <div className="text-sm font-medium">Status</div>
                <div className="text-sm font-medium">Entrou no grupo</div>
                <div className="text-sm font-medium">Pedidos</div>
                <div className="text-sm font-medium">Faturamento</div>
                <div className="text-sm font-medium">Ações</div>
              </div>
              
              {/* Lives List */}
              {filteredLives.length > 0 ? (
                filteredLives.map((live) => (
                  <div key={live.id} className="grid grid-cols-7 gap-4 p-4 border-b items-center">
                    <div 
                      className="font-medium cursor-pointer hover:text-primary transition-colors" 
                      onClick={() => navigate(`/details?live=${live.id}`)}
                    >
                      {live.name}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      📅 {live.live_date ? new Date(live.live_date).toLocaleDateString('pt-BR') : 'Não definida'}
                    </div>
                    <div>
                      <Badge variant="secondary">Captação</Badge>
                    </div>
                    <div className="text-sm">
                      {live.live_groups?.reduce((sum: number, group: LiveGroup) => sum + (group.group_size || 0), 0) || 0}
                    </div>
                    <div className="text-sm">
                      0
                    </div>
                    <div className="text-sm">
                      R$ 0
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate(`/details?live=${live.id}`)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditLive(live)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteLive(live)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : lives.length > 0 ? (
                /* No search results */
                <div className="flex flex-col items-center justify-center py-16">
                  <Search className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Nenhuma live encontrada para "{searchTerm}"</p>
                  <Button variant="outline" onClick={() => setSearchTerm("")}>
                    Limpar busca
                  </Button>
                </div>
              ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-16">
                  <Video className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Você ainda não possui lives cadastradas</p>
                  <Button variant="primary" onClick={() => setIsCreateLiveOpen(true)}>
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
        currentInstance={currentInstance as any}
        onLiveCreated={() => {
          const checkAuth = async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                await loadStats(session.user.id, true);
              }
            } catch (error) {

            }
          };
          checkAuth();
        }}
      />

      {/* Edit Live Modal */}
      <CreateLiveModal 
        open={showEditModal} 
        onOpenChange={setShowEditModal}
        currentInstance={currentInstance as any}
        editingLive={editingLive || undefined}
        onLiveCreated={() => {
          setShowEditModal(false);
          setEditingLive(null);
          const checkAuth = async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                await loadStats(session.user.id, true);
              }
            } catch (error) {

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
        currentInstance={currentInstance as any}
        onLivesUpdated={() => {
          const checkAuth = async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                await loadStats(session.user.id, true);
              }
            } catch (error) {

            }
          };
          checkAuth();
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal 
        open={showDeleteModal} 
        onOpenChange={setShowDeleteModal}
        title="Confirmar Exclusão"
        description={liveToDelete ? `Tem certeza que deseja excluir a live "${liveToDelete.name}"? Esta ação não pode ser desfeita.` : ""}
        onConfirm={confirmDeleteLive}
        onCancel={() => {
          setShowDeleteModal(false);
          setLiveToDelete(null);
        }}
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  );
}