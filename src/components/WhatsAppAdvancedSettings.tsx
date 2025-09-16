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
          console.log('✅ Using cached group data (faster)');
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
        console.error('Error loading groups:', error);
      } else {
        setGroups(data || []);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllGroupsFromAPI = async () => {
    // Prevent duplicate executions with time-based and state-based locks
    const now = Date.now();
    const MINIMUM_INTERVAL = 10000; // 10 seconds minimum between calls
    
    if (isFetchingFromAPI) {
      console.log('⏳ API fetch already in progress - ignoring duplicate call');
      return;
    }
    
    if (now - lastFetchTime < MINIMUM_INTERVAL) {
      console.log(`⏳ Too soon since last fetch (${Math.round((now - lastFetchTime) / 1000)}s ago) - ignoring duplicate call`);
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
      console.error('No instance name available');
      return;
    }

    try {
      setFetchingGroups(true);
      setIsFetchingFromAPI(true);
      setLastFetchTime(now);
      console.log('🔄 Fetching groups for instance:', currentInstance.instance_name);

      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      // Call our Edge Function to fetch groups from Evolution API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-fetch-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          instanceName: currentInstance.instance_name,
          userId: session.session.user.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error fetching groups:', errorText);
        return;
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Groups fetched successfully:', result.groups?.length || 0);
        // Reload groups from database to show the updated list
        await loadGroupsFromDatabase();
      } else {
        console.error('❌ Error fetching groups:', result.error);
      }

    } catch (error) {
      console.error('Error fetching groups from API:', error);
    } finally {
      setFetchingGroups(false);
      setIsFetchingFromAPI(false); // Release the lock
      setLoading(false); // Always turn off loading when fetch completes
      setHasInitiallyFetched(true); // Mark as initially fetched for future cache use
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
        console.error('Error updating group monitoring:', error);
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
      console.error('Error updating group monitoring:', error);
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

      console.log(`🔄 ${targetState ? 'Enabling' : 'Disabling'} monitoring for all groups...`);
      
      const { error } = await supabase
        .from('whatsapp_groups')
        .update({ monitoring: targetState })
        .eq('user_id', session.session.user.id);

      if (error) {
        console.error('Error updating all groups:', error);
      } else {
        // Update local state
        const updatedGroups = groups.map(group => ({
          ...group,
          monitoring: targetState
        }));
        setGroups(updatedGroups);
        setAllGroupsEnabled(targetState);
        console.log(`✅ All groups ${targetState ? 'enabled' : 'disabled'} successfully`);
      }
    } catch (error) {
      console.error('Error bulk updating groups:', error);
    }
  };

  // Block modal closing during loading
  const handleModalChange = (open: boolean) => {
    if (!open && (loading || fetchingGroups)) {
      // Prevent closing during loading
      console.log('⛔ Modal close blocked - sync in progress');
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