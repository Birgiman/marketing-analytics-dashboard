import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, AlertCircle, Target, Calendar, DollarSign, TrendingUp, ArrowLeft, Building2 } from 'lucide-react';
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
  const [step, setStep] = useState(1); // 1 = Select Account, 2 = Select Campaigns
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filtrar campanhas (só usado quando useSearch = false)
  const filteredCampaigns = useSearch ? campaigns : campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && userId) {
      loadAdAccounts();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    // Reset quando modal abre/fecha
    if (isOpen) {
      setStep(1);
      setSelectedAccount(null);
      setCampaigns([]);
      setSearchTerm('');
      setUseSearch(false);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    // Pré-selecionar campanhas já escolhidas
    const preSelected = alreadySelected.map(c => c.id);
    setSelectedCampaignIds(preSelected);
  }, [alreadySelected]);

  const loadAdAccounts = async () => {
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
      const accounts = await fetchAdAccounts(accessToken);
      if (accounts.length === 0) {
        throw new Error('Nenhuma conta de anúncios encontrada.');
      }

      setAdAccounts(accounts);
      
      // Se só tem 1 conta, seleciona automaticamente
      if (accounts.length === 1) {
        setSelectedAccount(accounts[0]);
        setStep(2);
        await loadCampaignsFromAccount(accounts[0], accessToken);
      }
      
    } catch (err) {
      console.error('Erro ao carregar contas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignsFromAccount = async (account: any, accessToken?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = accessToken || await getUserMetaToken(userId!);
      if (!token) {
        throw new Error('Token de acesso não encontrado');
      }

      // Preparar opções da requisição
      const options: any = {
        limit: 50,
        status: ['ACTIVE', 'PAUSED'],
        fields: ['id', 'name', 'status', 'objective', 'daily_budget', 'lifetime_budget', 'created_time', 'updated_time']
      };

      // Buscar campanhas com filtro se solicitado
      if (useSearch && searchTerm.trim()) {
        // Usar a API do Meta com filtering
        const response = await fetch(
          `https://graph.facebook.com/v23.0/${account.id}/campaigns?` +
          new URLSearchParams({
            fields: options.fields.join(','),
            access_token: token,
            limit: options.limit.toString(),
            filtering: JSON.stringify([{
              field: 'name',
              operator: 'CONTAIN',
              value: searchTerm.trim()
            }])
          })
        );

        if (!response.ok) {
          throw new Error(`Erro na API: ${response.statusText}`);
        }

        const data = await response.json();
        const campaignsWithAccount = data.data.map((campaign: any) => ({
          ...campaign,
          account_name: account.name,
          account_id: account.id
        }));
        setCampaigns(campaignsWithAccount || []);
      } else {
        // Buscar todas as campanhas
        const campaignsData = await fetchCampaigns(account.id, token, options);
        const campaignsWithAccount = campaignsData.map(campaign => ({
          ...campaign,
          account_name: account.name,
          account_id: account.id
        }));
        setCampaigns(campaignsWithAccount);
      }
      
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = (account: any) => {
    setSelectedAccount(account);
    setStep(2);
    loadCampaignsFromAccount(account);
  };

  const handleBackToAccounts = () => {
    setStep(1);
    setSelectedAccount(null);
    setCampaigns([]);
    setSearchTerm('');
    setUseSearch(false);
  };

  const handleSearchModeChange = (searchMode: boolean) => {
    setUseSearch(searchMode);
    setSearchTerm('');
    if (selectedAccount) {
      loadCampaignsFromAccount(selectedAccount);
    }
  };

  const handleSearchSubmit = () => {
    if (useSearch && selectedAccount) {
      loadCampaignsFromAccount(selectedAccount);
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
    const numValue = parseFloat(value) / 100;
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
            {step === 1 ? (
              <><Building2 className="h-5 w-5 text-blue-600" />Selecionar Conta de Anúncios</>
            ) : (
              <><Target className="h-5 w-5 text-blue-600" />Selecionar Campanhas Meta Ads</>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? 'Escolha a conta de anúncios para buscar campanhas.'
              : 'Escolha as campanhas do Meta Ads que serão vinculadas a esta Live.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Step 1: Select Ad Account */}
          {step === 1 && (
            <>
              {/* Loading */}
              {loading && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                    <p className="text-sm text-gray-600">Carregando contas de anúncios...</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-3 p-6">
                    <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
                    <div>
                      <p className="font-medium text-red-800">Erro ao carregar contas</p>
                      <p className="text-sm text-red-600 mt-1">{error}</p>
                      <Button 
                        variant="outline" 
                        onClick={loadAdAccounts}
                        className="mt-3"
                        size="sm"
                      >
                        Tentar Novamente
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ad Accounts List */}
              {!loading && !error && adAccounts.length > 0 && (
                <div className="flex-1 overflow-y-auto space-y-2">
                  {adAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="border rounded-lg p-4 cursor-pointer transition-colors hover:border-blue-300 hover:bg-blue-50"
                      onClick={() => handleAccountSelect(account)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{account.name}</h3>
                          <div className="text-sm text-gray-600 space-y-1 mt-1">
                            <p>ID: {account.id}</p>
                            <p>Moeda: {account.currency} • Timezone: {account.timezone_name}</p>
                            <p>Total gasto: {formatCurrency(account.amount_spent)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={account.account_status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {account.account_status === 1 ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step 2: Select Campaigns */}
          {step === 2 && (
            <>
              {/* Conta selecionada + Opções de busca */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToAccounts}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Voltar
                    </Button>
                    <span className="text-sm text-gray-600">Conta: {selectedAccount?.name}</span>
                  </div>
                </div>

                {/* Opções de busca */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="show-all"
                      name="search-mode"
                      checked={!useSearch}
                      onChange={() => handleSearchModeChange(false)}
                    />
                    <label htmlFor="show-all" className="text-sm">Exibir todas as campanhas</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="search-by-keyword"
                      name="search-mode"
                      checked={useSearch}
                      onChange={() => handleSearchModeChange(true)}
                    />
                    <label htmlFor="search-by-keyword" className="text-sm">Buscar por palavra-chave</label>
                  </div>
                </div>

                {/* Barra de busca */}
                {useSearch ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Digite palavra-chave da campanha (ex: Black Friday)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                      />
                    </div>
                    <Button onClick={handleSearchSubmit} disabled={!searchTerm.trim()}>
                      Buscar
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Filtrar campanhas por nome..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}
              </div>

              {/* Estado de Loading */}
              {loading && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                    <p className="text-sm text-gray-600">
                      {useSearch ? 'Buscando campanhas...' : 'Carregando campanhas...'}
                    </p>
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
                        onClick={() => loadCampaignsFromAccount(selectedAccount)}
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
                        {useSearch && searchTerm ? 
                          'Nenhuma campanha encontrada para sua busca' : 
                          campaigns.length === 0 ? 'Nenhuma campanha disponível nesta conta' :
                          'Nenhuma campanha corresponde ao filtro'
                        }
                      </p>
                      {searchTerm && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSearchTerm('')}
                          className="mt-2"
                        >
                          Limpar {useSearch ? 'busca' : 'filtro'}
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
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé com Actions */}
        <div className="border-t pt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {step === 1 ? 
              `${adAccounts.length} conta(s) de anúncios encontrada(s)` :
              `${selectedCampaignIds.length} campanha(s) selecionada(s)`
            }
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {step === 2 && (
              <Button 
                onClick={handleConfirm}
                disabled={selectedCampaignIds.length === 0}
              >
                Confirmar Seleção
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignSelector;