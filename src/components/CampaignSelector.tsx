import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, AlertCircle, Target, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { useMetaLivesData } from '@/hooks/useMetaLivesData';
import { MetaCampaign } from '@/utils/metaApi';
import { fetchAdAccounts, fetchCampaigns } from '@/utils/metaApi';
import { getUserMetaToken } from '@/utils/metaApiLives';

interface CampaignSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignsSelected: (campaigns: any[]) => void;
  userId?: string;
  alreadySelected?: any[];
}

const CampaignSelector: React.FC<CampaignSelectorProps> = ({
  isOpen,
  onClose,
  onCampaignsSelected,
  userId,
  alreadySelected = []
}) => {
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filtrar campanhas com base no termo de busca
  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && userId) {
      loadCampaigns();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    // Pré-selecionar campanhas já escolhidas
    const preSelected = alreadySelected.map(c => c.id);
    setSelectedCampaignIds(preSelected);
  }, [alreadySelected]);

  const loadCampaigns = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Buscar token do usuário
      const accessToken = await getUserMetaToken(userId);
      if (!accessToken) {
        throw new Error('Token de acesso do Meta não encontrado. Configure sua integração primeiro.');
      }

      // Buscar contas de anúncios
      const adAccounts = await fetchAdAccounts(accessToken);
      if (adAccounts.length === 0) {
        throw new Error('Nenhuma conta de anúncios encontrada.');
      }

      // Buscar campanhas de todas as contas
      const allCampaigns: MetaCampaign[] = [];
      
      for (const account of adAccounts) {
        try {
          const accountCampaigns = await fetchCampaigns(account.id, accessToken, {
            limit: 50,
            status: ['ACTIVE', 'PAUSED'],
            fields: ['id', 'name', 'status', 'objective', 'daily_budget', 'lifetime_budget', 'created_time', 'updated_time']
          });
          
          // Adicionar informação da conta para cada campanha
          const campaignsWithAccount = accountCampaigns.map(campaign => ({
            ...campaign,
            account_name: account.name,
            account_id: account.id
          }));
          
          allCampaigns.push(...campaignsWithAccount);
        } catch (accountError) {
          console.warn(`Erro ao buscar campanhas da conta ${account.name}:`, accountError);
        }
      }

      setCampaigns(allCampaigns);
      
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignToggle = (campaign: MetaCampaign) => {
    setSelectedCampaignIds(prev => {
      if (prev.includes(campaign.id)) {
        return prev.filter(id => id !== campaign.id);
      } else {
        return [...prev, campaign.id];
      }
    });
  };

  const handleConfirm = () => {
    const selectedCampaigns = campaigns.filter(campaign => 
      selectedCampaignIds.includes(campaign.id)
    );
    
    onCampaignsSelected(selectedCampaigns);
    onClose();
  };

  const formatCurrency = (value: string | undefined) => {
    if (!value) return 'N/A';
    const numValue = parseFloat(value) / 100; // Meta retorna em centavos
    return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Selecionar Campanhas Meta Ads
          </DialogTitle>
          <DialogDescription>
            Escolha as campanhas do Meta Ads que serão vinculadas a esta Live.
            Você poderá acompanhar as métricas específicas dessas campanhas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Barra de Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar campanhas por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Estado de Loading */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="text-sm text-gray-600">Carregando campanhas...</p>
              </div>
            </div>
          )}

          {/* Estado de Erro */}
          {error && !loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3 p-6">
                <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
                <div>
                  <p className="font-medium text-red-800">Erro ao carregar campanhas</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                  <Button 
                    variant="outline" 
                    onClick={loadCampaigns}
                    className="mt-3"
                    size="sm"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Campanhas */}
          {!loading && !error && (
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredCampaigns.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600">
                    {searchTerm ? 'Nenhuma campanha encontrada para sua busca' : 'Nenhuma campanha disponível'}
                  </p>
                  {searchTerm && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSearchTerm('')}
                      className="mt-2"
                    >
                      Limpar busca
                    </Button>
                  )}
                </div>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedCampaignIds.includes(campaign.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleCampaignToggle(campaign)}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedCampaignIds.includes(campaign.id)}
                        onChange={() => {}} // Handled by parent click
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 truncate pr-2">
                            {campaign.name}
                          </h3>
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span className="truncate">{campaign.objective || 'N/A'}</span>
                          </div>
                          
                          {campaign.daily_budget && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span>Orçamento: {formatCurrency(campaign.daily_budget)}/dia</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(campaign.created_time).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        
                        {(campaign as any).account_name && (
                          <div className="text-xs text-gray-500 mt-1">
                            Conta: {(campaign as any).account_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Rodapé com Actions */}
        <div className="border-t pt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedCampaignIds.length} campanha(s) selecionada(s)
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={selectedCampaignIds.length === 0}
            >
              Confirmar Seleção
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignSelector;