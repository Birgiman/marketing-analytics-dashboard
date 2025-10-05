import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, RefreshCw, Users, MessageSquare, Loader } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_MODE } from '@/lib/demo-mode';

interface WhatsAppGroup {
  id: string;
  group_id: string;
  group_name: string;
  monitoring: boolean;
  group_size?: number;
  group_owner?: string;
  group_created_at?: string;
}

interface WhatsAppAdvancedSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentInstance: any;
}

export function WhatsAppAdvancedSettings({ 
  isOpen, 
  onClose, 
  currentInstance 
}: WhatsAppAdvancedSettingsProps) {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<WhatsAppGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true); // Always start loading until sync completes
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [allGroupsEnabled, setAllGroupsEnabled] = useState(true); // Track if all groups are enabled
  const [hasInitiallyFetched, setHasInitiallyFetched] = useState(false); // Cache control
  const [isFetchingFromAPI, setIsFetchingFromAPI] = useState(false); // Prevent duplicate API calls
  const [lastFetchTime, setLastFetchTime] = useState<number>(0); // Track last fetch time

  useEffect(() => {
    if (isOpen && currentInstance) {
      setLoading(true);
      loadGroupsFromDatabase().finally(() => {
        // Only fetch from API if haven't fetched before (smart cache)
        if (!hasInitiallyFetched) {
          fetchAllGroupsFromAPI();
        } else {
          // Use cached data - much faster

          setLoading(false);
        }
      });
    }
  }, [isOpen, currentInstance]);

  useEffect(() => {
    // Filter groups based on search term and update allGroupsEnabled state
    const filtered = groups.filter(group => 
      group.group_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredGroups(filtered);
    
    // Update allGroupsEnabled state based on current groups
    const enabledCount = groups.filter(g => g.monitoring).length;
    setAllGroupsEnabled(enabledCount === groups.length && groups.length > 0);
  }, [groups, searchTerm]);

  const loadGroupsFromDatabase = async () => {
    if (DEMO_MODE) {
      // Demo data
      const demoGroups = [
        { id: '1', group_id: 'demo1', group_name: 'Grupo Demo 1', monitoring: true },
        { id: '2', group_id: 'demo2', group_name: 'Grupo Demo 2', monitoring: false },
        { id: '3', group_id: 'demo3', group_name: 'Grupo Demo 3', monitoring: true },
      ];
      setGroups(demoGroups);
      return;
    }

    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const { data, error } = await supabase
        .from('whatsapp_groups')
        .select('id, group_id, group_name, monitoring, group_size, group_owner, group_created_at')
        .eq('user_id', session.session.user.id)
        .order('group_name');

      if (error) {

      } else {
        setGroups(data || []);
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const fetchAllGroupsFromAPI = async () => {
    // Prevent duplicate executions with time-based and state-based locks
    const now = Date.now();
    const MINIMUM_INTERVAL = 10000; // 10 seconds minimum between calls
    
    if (isFetchingFromAPI) {

      return;
    }
    
    if (now - lastFetchTime < MINIMUM_INTERVAL) {

      return;
    }

    if (DEMO_MODE) {
      // Simulate API fetch in demo mode
      setFetchingGroups(true);
      setIsFetchingFromAPI(true);
      setTimeout(() => {
        const newDemoGroups = [
          { id: '4', group_id: 'demo4', group_name: 'Novo Grupo Demo 4', monitoring: true },
          { id: '5', group_id: 'demo5', group_name: 'Novo Grupo Demo 5', monitoring: true },
          ...groups
        ];
        setGroups(newDemoGroups);
        setFetchingGroups(false);
        setIsFetchingFromAPI(false);
        setLastFetchTime(Date.now());
      }, 2000);
      return;
    }

    if (!currentInstance?.instance_name) {

      return;
    }

    try {
      setFetchingGroups(true);
      setIsFetchingFromAPI(true);
      setLastFetchTime(now);

      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      // Call start-fetch-groups Edge Function (new job queue architecture)
      const response = await supabase.functions.invoke('start-fetch-groups', {
        body: {
          instanceName: currentInstance.instance_name,
          userId: session.session.user.id,
          searchTerm: searchTerm || undefined
        }
      });

      if (response.error) {
        console.error('Erro ao iniciar sincronização:', response.error);
        return;
      }

      const result = response.data;

      if (result.success) {
        // Job iniciado com sucesso - grupos serão carregados em background
        console.log('Job de sincronização iniciado com sucesso');
        
        // Aguardar um pouco e recarregar grupos do banco
        setTimeout(async () => {
          await loadGroupsFromDatabase();
        }, 2000);
      } else {
        console.error('Falha ao iniciar job:', result.error);
      }

    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
    } finally {
      setFetchingGroups(false);
      setIsFetchingFromAPI(false);
      setLoading(false);
      setHasInitiallyFetched(true);
    }
  };

  const toggleGroupMonitoring = async (groupId: string, currentMonitoring: boolean) => {
    if (DEMO_MODE) {
      // Update demo data
      const updatedGroups = groups.map(group =>
        group.id === groupId 
          ? { ...group, monitoring: !currentMonitoring }
          : group
      );
      setGroups(updatedGroups);
      return;
    }

    try {
      const { error } = await supabase
        .from('whatsapp_groups')
        .update({ monitoring: !currentMonitoring })
        .eq('id', groupId);

      if (error) {

      } else {
        // Update local state
        const updatedGroups = groups.map(group =>
          group.id === groupId 
            ? { ...group, monitoring: !currentMonitoring }
            : group
        );
        setGroups(updatedGroups);
      }
    } catch (error) {

    }
  };

  const handleBulkToggle = async () => {
    // Toggle between all enabled/disabled based on current state
    const targetState = !allGroupsEnabled;
    
    if (DEMO_MODE) {
      // Update all demo data
      const updatedGroups = groups.map(group => ({
        ...group,
        monitoring: targetState
      }));
      setGroups(updatedGroups);
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const { error } = await supabase
        .from('whatsapp_groups')
        .update({ monitoring: targetState })
        .eq('user_id', session.session.user.id);

      if (error) {

      } else {
        // Update local state
        const updatedGroups = groups.map(group => ({
          ...group,
          monitoring: targetState
        }));
        setGroups(updatedGroups);
        setAllGroupsEnabled(targetState);

      }
    } catch (error) {

    }
  };

  // Block modal closing during loading
  const handleModalChange = (open: boolean) => {
    if (!open && (loading || fetchingGroups)) {
      // Prevent closing during loading

      return;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalChange}>
      <DialogContent className="max-w-4xl max-h-[850px] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Configurações Avançadas - WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1">
          {/* Search and Actions - Single Row */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar grupos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={fetchAllGroupsFromAPI}
              disabled={fetchingGroups || isFetchingFromAPI}
              variant="outline"
              className="shrink-0"
            >
              {fetchingGroups || isFetchingFromAPI ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  {isFetchingFromAPI ? 'Aguardando...' : 'Atualizando...'}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar Grupos
                </>
              )}
            </Button>
            <Button
              onClick={handleBulkToggle}
              disabled={fetchingGroups || loading || groups.length === 0}
              variant="outline"
              className={`shrink-0 ${
                allGroupsEnabled 
                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
              }`}
            >
              {allGroupsEnabled ? '❌ Desabilitar Todos' : '✅ Habilitar Todos'}
            </Button>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="text-blue-800 font-medium mb-1">
                  Gerenciamento de Grupos WhatsApp
                </p>
                <p className="text-blue-600">
                  Selecione quais grupos você deseja monitorar. Apenas grupos habilitados 
                  aparecerão na gestão de grupos e terão suas atividades registradas.
                  {fetchingGroups && (
                    <span className="block mt-1 text-blue-500 font-medium">
                      🔄 Sincronizando grupos automaticamente...
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Groups List */}
          <div className="flex-1 min-h-0">
            {loading || fetchingGroups ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                <p className="text-gray-600 text-sm">Sincronizando grupos...</p>
                <p className="text-gray-500 text-xs mt-1">Buscando dados mais recentes do WhatsApp</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Users className="h-12 w-12 mb-4 text-gray-300" />
                <p className="text-lg mb-2">
                  {searchTerm ? 'Nenhum grupo encontrado' : 'Nenhum grupo cadastrado'}
                </p>
                <p className="text-sm text-center max-w-md">
                  {searchTerm 
                    ? 'Tente ajustar o termo de busca ou busque novos grupos.'
                    : 'Clique em "Buscar Grupos" para sincronizar os grupos da sua instância WhatsApp.'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-2 pr-2 max-h-96">
                {filteredGroups.map((group) => {
                  return (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {group.group_name}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {group.group_size !== undefined && (
                            <span className="shrink-0">👥 {group.group_size}</span>
                          )}
                          {group.group_created_at && (
                            <span className="shrink-0">
                              📅 {new Date(group.group_created_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {group.monitoring ? 'Monitorando' : 'Parado'}
                        </span>
                        <Button
                          onClick={() => toggleGroupMonitoring(group.id, group.monitoring)}
                          variant="outline"
                          size="sm"
                          disabled={loading || fetchingGroups}
                          className={`shrink-0 w-8 h-8 p-0 hover:scale-110 transition-transform ${
                            group.monitoring 
                              ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200' 
                              : 'text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200'
                          }`}
                          title={group.monitoring ? 'Desativar monitoramento' : 'Ativar monitoramento'}
                        >
                          {group.monitoring ? '❌' : '✅'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Statistics */}
          {(filteredGroups.length > 0 || loading || fetchingGroups) && (
            <div className="border-t pt-4">
              <div className={`flex justify-between text-sm text-gray-600 ${
                loading || fetchingGroups ? 'animate-pulse' : ''
              }`}>
                <span>
                  Total: {loading || fetchingGroups ? '...' : `${filteredGroups.length} grupo${filteredGroups.length !== 1 ? 's' : ''}`}
                </span>
                <span>
                  Monitorando: {loading || fetchingGroups ? '...' : filteredGroups.filter(g => g.monitoring).length}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t mt-4 mb-2">
          <Button 
            onClick={onClose} 
            variant="outline"
            disabled={loading || fetchingGroups}
          >
            {loading || fetchingGroups ? 'Sincronizando...' : 'Fechar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}