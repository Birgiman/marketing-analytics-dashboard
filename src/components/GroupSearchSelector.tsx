import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_MODE } from '@/lib/demo-mode';
import { fetchWhatsAppGroups, hasWhatsAppGroups } from '@/utils/whatsapp-groups';
import { AlertCircle, Calendar, Crown, Loader, Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GroupResult {
  id: string;
  group_id: string;
  group_name: string;
  group_size: number;
  group_owner?: string;
  group_created_at?: string;
  group_created_formatted: string;
  group_owner_formatted?: string;
  selectable: boolean;
}

interface GroupSearchSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupsSelected: (groups: GroupResult[]) => void;
  currentInstance: any;
}

export function GroupSearchSelector({ 
  isOpen, 
  onClose, 
  onGroupsSelected,
  currentInstance 
}: GroupSearchSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<GroupResult[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [groupsAvailable, setGroupsAvailable] = useState(false);

  // Verificar se grupos estão disponíveis quando o modal abre
  useEffect(() => {
    if (isOpen && !DEMO_MODE) {
      checkGroupsAvailability();
    }
  }, [isOpen]);

  const checkGroupsAvailability = async () => {
    try {
      setIsLoadingGroups(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const hasGroups = await hasWhatsAppGroups(session.user.id);
        setGroupsAvailable(hasGroups);
        
        // Grupos ainda não sincronizados
      }
    } catch (error) {
      console.error('❌ [GroupSearch] Erro ao verificar grupos:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      return;
    }

    if (DEMO_MODE) {
      // Demo data
      setIsSearching(true);
      setTimeout(() => {
        const demoResults = [
          {
            id: 'demo1',
            group_id: 'demo1@g.us',
            group_name: `${searchTerm} - Demo Group 1`,
            group_size: 25,
            group_created_formatted: '15/01/2024',
            group_owner_formatted: '(11) 99999-9999',
            selectable: true
          },
          {
            id: 'demo2', 
            group_id: 'demo2@g.us',
            group_name: `Grupo ${searchTerm} Teste`,
            group_size: 42,
            group_created_formatted: '22/02/2024',
            group_owner_formatted: '(11) 98888-8888',
            selectable: true
          }
        ];
        setSearchResults(demoResults as GroupResult[]);
        setHasSearched(true);
        setIsSearching(false);
      }, 1500);
      return;
    }

    // Verificar se grupos estão disponíveis
    if (!groupsAvailable) {
      return;
    }

    try {
      setIsSearching(true);
      setSearchResults([]);
      setSelectedGroups(new Set());

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsSearching(false);
        return;
      }

      // Buscar grupos na tabela whatsapp_groups
      const groups = await fetchWhatsAppGroups(session.user.id, searchTerm.trim());
      
      // Transformar os dados para o formato esperado
      const formattedResults: GroupResult[] = groups.map((group) => ({
        id: group.group_id,
        group_id: group.group_id,
        group_name: group.group_name,
        group_size: group.group_size,
        group_owner: group.group_owner,
        group_created_at: group.group_created_at || undefined,
        group_created_formatted: group.group_created_at ? new Date(group.group_created_at).toLocaleDateString('pt-BR') : 'Data não disponível',
        group_owner_formatted: group.group_owner ? `@${group.group_owner}` : 'Proprietário não disponível',
        selectable: true
      }));

      setSearchResults(formattedResults);
      setHasSearched(true);

    } catch (error) {
      console.error('Error searching groups:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedGroups.size === searchResults.length) {
      // Unselect all
      setSelectedGroups(new Set());
    } else {
      // Select all
      setSelectedGroups(new Set(searchResults.map(g => g.id)));
    }
  };

  const handleConfirmSelection = () => {
    const selectedGroupsList = searchResults.filter(group => 
      selectedGroups.has(group.id)
    );
    onGroupsSelected(selectedGroupsList);
    onClose();
  };

  const handleClose = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedGroups(new Set());
    setHasSearched(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[850px] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Buscar Grupos para a Live
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Digite o termo para buscar grupos (ex: Battlefield, FIFA, etc.)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchTerm.trim() || searchTerm.trim().length < 2}
              className="shrink-0"
            >
              {isSearching ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          {isLoadingGroups ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader className="h-4 w-4 animate-spin text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  <strong>🔄 Sincronizando grupos...</strong> Aguarde enquanto sincronizamos seus grupos do WhatsApp.
                </p>
              </div>
            </div>
          ) : !groupsAvailable ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <p className="text-sm text-orange-800">
                  <strong>⚠️ Grupos não sincronizados:</strong> Os grupos ainda estão sendo sincronizados. Tente novamente em alguns segundos.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> Digite um termo para buscar grupos pelo nome. 
                Exemplo: "Battlefield" para encontrar todos os grupos que contenham essa palavra.
              </p>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 min-h-0">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 text-sm">Buscando grupos...</p>
                <p className="text-gray-500 text-xs mt-1">Isso pode levar alguns segundos</p>
              </div>
            ) : hasSearched && searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Search className="h-12 w-12 mb-4 text-gray-300" />
                <p className="text-lg mb-2">Nenhum grupo encontrado</p>
                <p className="text-sm text-center max-w-md">
                  Não encontramos grupos com o termo "{searchTerm}". 
                  Tente usar palavras diferentes ou verifique se o grupo existe.
                </p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-4">
                {/* Selection Controls */}
                <div className="flex justify-between items-center bg-gray-200 p-3 rounded-lg">
                  <span className="text-sm text-gray-700">
                    {searchResults.length} grupo{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
                    {selectedGroups.size > 0 && ` • ${selectedGroups.size} selecionado${selectedGroups.size !== 1 ? 's' : ''}`}
                  </span>
                  <Button
                    onClick={handleSelectAll}
                    variant="outline" 
                    size="sm"
                    disabled={searchResults.length === 0}
                  >
                    {selectedGroups.size === searchResults.length ? '❌ Desmarcar todos' : '✅ Selecionar todos'}
                  </Button>
                </div>

                {/* Groups List */}
                <div className="overflow-y-auto space-y-2 min-h-80 max-h-96 bg-gray-200 rounded-lg p-3">
                  {searchResults.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Checkbox
                        checked={selectedGroups.has(group.id)}
                        onCheckedChange={() => handleGroupToggle(group.id)}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {group.group_name}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {group.group_size}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {group.group_created_formatted}
                          </span>
                          {group.group_owner_formatted && (
                            <span className="flex items-center gap-1">
                              <Crown className="h-3 w-3" />
                              {group.group_owner_formatted}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Search className="h-16 w-16 mb-4" />
                <p className="text-lg">Digite um termo para buscar grupos</p>
                <p className="text-sm">Os resultados aparecerão aqui</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t gap-3">
            <Button 
              onClick={handleClose}
              variant="outline"
              className="flex-shrink-0"
            >
              Cancelar
            </Button>
            
            {selectedGroups.size > 0 && (
              <Button
                onClick={handleConfirmSelection}
                variant="primary"
                className="flex-shrink-0"
              >
                Adicionar {selectedGroups.size} grupo{selectedGroups.size !== 1 ? 's' : ''} selecionado{selectedGroups.size !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}