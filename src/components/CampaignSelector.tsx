import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { fetchAdAccounts, fetchCampaigns, MetaAdAccount, MetaCampaign } from '@/utils/metaApi';
import { getUserMetaToken } from '@/utils/metaApiLives';
import { AlertCircle, ArrowLeft, Building2, Calendar, DollarSign, Loader2, Search, Target } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface CampaignSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignsSelected: (campaigns: MetaCampaign[], searchTerm?: string) => void;
  userId?: string;
  alreadySelected?: MetaCampaign[];
  linkedCampaigns?: string[];
  dateRange?: {
    since: string;
    until: string;
  };
  onDateRangeChange?: (dateRange: { since: string; until: string }) => void;
  initialSearchTerm?: string; // Termo inicial para modo de edição
}

const CampaignSelector: React.FC<CampaignSelectorProps> = ({
  isOpen,
  onClose,
  onCampaignsSelected,
  userId,
  alreadySelected = [],
  linkedCampaigns = [],
  dateRange,
  onDateRangeChange,
  initialSearchTerm
}) => {
  const [step, setStep] = useState(1); // 1 = Select Account, 2 = Select Campaigns
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<MetaAdAccount | null>(null);
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [useSearch, setUseSearch] = useState(false);
  const [useAutoSearch, setUseAutoSearch] = useState(true); // MODIFICADO: Abrir direto na busca automática
  const [hasSearched, setHasSearched] = useState(false); // Controla se já foi feita uma busca
  const [autoSearchTerm, setAutoSearchTerm] = useState('');


  // Função para atualizar termo de busca
  const saveSearchTerm = (term: string) => {
    setSearchTerm(term);
  };

  // Função para limpar termo de busca
  const clearSearchTerm = () => {
    setSearchTerm('');
  };
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showActive, setShowActive] = useState(true);
  const [showPaused, setShowPaused] = useState(true);
  const [accountSearchTerm, setAccountSearchTerm] = useState('');

  // Filtrar contas por nome
  const filteredAccounts = adAccounts.filter(account => {
    if (!accountSearchTerm.trim()) return true;
    return account.name.toLowerCase().includes(accountSearchTerm.toLowerCase());
  });

  // Filtrar campanhas com filtros de status e busca por nome
  const filteredCampaigns = campaigns.filter(campaign => {
    // Filtro de status
    const statusMatch =
      (campaign.status === 'ACTIVE' && showActive) ||
      (campaign.status === 'PAUSED' && showPaused);

    if (!statusMatch) return false;

    // Filtro de busca automática
    if (useAutoSearch && autoSearchTerm) {
      return campaign.name.toUpperCase().includes(autoSearchTerm.trim().toUpperCase());
    }

    // Filtro de nome (apenas quando não está usando busca na API)
    if (!useSearch && searchTerm) {
      return campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    }

    return true;
  });

  useEffect(() => {
    if (isOpen && userId) {
      loadAdAccounts();
    }
  }, [isOpen, userId]);


  // Atualizar searchTerm quando initialSearchTerm mudar (modo de edição)
  useEffect(() => {
    if (initialSearchTerm && initialSearchTerm !== searchTerm) {
      setSearchTerm(initialSearchTerm);
      setUseSearch(true);
    }
  }, [initialSearchTerm]);

  useEffect(() => {
    // Reset quando modal abre/fecha (mas preserva termo de busca)
    if (isOpen) {
      setStep(1);
      setSelectedAccount(null);
      setCampaigns([]);
      setError(null);
      setShowActive(true);
      setShowPaused(true);
      setHasSearched(false);
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
      
      // Se só tem 1 conta, seleciona automaticamente (mas não carrega campanhas)
      if (accounts.length === 1) {
        setSelectedAccount(accounts[0]);
        setStep(2);
        // Não carrega campanhas automaticamente - aguarda ação do usuário
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignsFromAccount = async (account: MetaAdAccount, accessToken?: string) => {
    setLoading(true);
    setError(null);

    try {
      const token = accessToken || await getUserMetaToken(userId!);
      if (!token) {
        throw new Error('Token de acesso não encontrado');
      }

      // Preparar opções da requisição
      const options: {
        limit: number;
        fields: string[];
        status: string[];
      } = {
        limit: 50,
        fields: ['id', 'name', 'status', 'objective', 'daily_budget', 'lifetime_budget', 'created_time', 'updated_time'],
        status: [] // Sem filtro de status na API para evitar erros
      };
      // Buscar campanhas com filtro se solicitado
      if (useSearch && searchTerm.trim()) {
        // Usar a API do Meta com filtering
        const url = `https://graph.facebook.com/v23.0/${account.id}/campaigns?` +
          new URLSearchParams({
            fields: options.fields.join(','),
            access_token: token,
            limit: options.limit.toString(),
            filtering: JSON.stringify([{
              field: 'name',
              operator: 'CONTAIN',
              value: searchTerm.trim()
            }])
          });
        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro na API: ${response.statusText}`);
        }

        const data = await response.json();
        const campaignsWithAccount = (data.data || []).map((campaign: MetaCampaign) => ({
          ...campaign,
          account_name: account.name,
          account_id: account.id
        }));
        setCampaigns(campaignsWithAccount);
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
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = (account: MetaAdAccount) => {
    setSelectedAccount(account);
    setStep(2);
    // Não carrega campanhas automaticamente - aguarda ação do usuário
  };

  const handleBackToAccounts = () => {
    setStep(1);
    setSelectedAccount(null);
    setCampaigns([]);
    setSearchTerm('');
    setUseSearch(false);
  };

  const handleSearchModeChange = (mode: 'all' | 'manual' | 'auto') => {
    setUseSearch(mode === 'manual');
    setUseAutoSearch(mode === 'auto');
    clearSearchTerm();
    setAutoSearchTerm('');

    if (selectedAccount) {
      loadCampaignsFromAccount(selectedAccount);
    }
  };

  const handleSearchSubmit = () => {
    if (useSearch && selectedAccount) {
      loadCampaignsFromAccount(selectedAccount);
    }
  };

  const handleAutoSearch = async () => {
    if (!autoSearchTerm.trim() || !selectedAccount) return;

    try {
      setLoading(true);
      setHasSearched(true);

      // Buscar todas as campanhas da conta
      await loadCampaignsFromAccount(selectedAccount);

    } catch (error) {
      setLoading(false);
    }
  };

  // Efeito para selecionar automaticamente campanhas após carregamento
  useEffect(() => {
    if (hasSearched && autoSearchTerm && campaigns.length > 0 && !loading) {
      const matchingCampaigns = campaigns.filter(campaign =>
        campaign.name.toUpperCase().includes(autoSearchTerm.trim().toUpperCase())
      );

      // Selecionar automaticamente todas as campanhas que contêm o termo
      const matchingIds = matchingCampaigns.map(c => c.id);
      setSelectedCampaignIds(matchingIds);
    }
  }, [campaigns, autoSearchTerm, hasSearched, loading]);

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

    // Passar termo de busca junto com campanhas
    const currentSearchTerm = useSearch ? searchTerm.trim() : autoSearchTerm.trim();
    onCampaignsSelected(selectedCampaigns, currentSearchTerm || undefined);
    onClose();
  };

  const formatCurrency = (value: string | undefined) => {
    if (!value) return 'N/A';
    const numValue = parseFloat(value) / 100; // Facebook sends values in cents
    return `R$ ${numValue.toFixed(2)}`;
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
      <DialogContent className="max-w-4xl max-h-[850px] overflow-y-auto flex flex-col">
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

              {/* Search Field for Accounts */}
              {!loading && !error && adAccounts.length > 0 && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar conta por nome..."
                      value={accountSearchTerm}
                      onChange={(e) => setAccountSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {accountSearchTerm && (
                    <div className="text-sm text-gray-600">
                      {filteredAccounts.length} de {adAccounts.length} conta{adAccounts.length !== 1 ? 's' : ''} encontrada{filteredAccounts.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}

              {/* Ad Accounts List */}
              {!loading && !error && adAccounts.length > 0 && (
                <>
                  {filteredAccounts.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Search className="h-8 w-8 text-gray-300 mx-auto" />
                        <p className="text-gray-500">Nenhuma conta encontrada</p>
                        <p className="text-sm text-gray-400">Tente usar um termo diferente</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-2">
                      {filteredAccounts.map((account) => (
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

                {/*
                =====================================================================================
                NOTA PARA FUTURAS MELHORIAS:

                As opções "Exibir todas" e "Busca manual" foram temporariamente desabilitadas
                para simplificar a UX do usuário. Atualmente apenas a "Busca automática" está ativa.

                Essas opções podem ser reativadas em versões futuras conforme necessidade:

                1. "Exibir todas" - Mostra todas as campanhas da conta sem filtros
                2. "Busca manual" - Permite busca com palavra-chave específica na API do Meta
                3. "Busca automática" - Busca por padrão e seleciona automaticamente (ATIVA)

                Para reativar, descomente o código abaixo e ajuste o grid para 3 colunas.
                =====================================================================================
                */}

                {/* Opções de busca - Atualmente apenas Busca Automática está ativa */}
                <div className="grid grid-cols-1 gap-4">
                  {/*
                  FUTURAS MELHORIAS: Opções comentadas para possível reativação

                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <input
                      type="radio"
                      id="show-all"
                      name="search-mode"
                      checked={!useSearch && !useAutoSearch}
                      onChange={() => handleSearchModeChange('all')}
                    />
                    <label htmlFor="show-all" className="text-sm">Exibir todas</label>
                  </div>

                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <input
                      type="radio"
                      id="search-by-keyword"
                      name="search-mode"
                      checked={useSearch && !useAutoSearch}
                      onChange={() => handleSearchModeChange('manual')}
                    />
                    <label htmlFor="search-by-keyword" className="text-sm">Busca manual</label>
                  </div>
                  */}

                  {/* Opção ativa: Busca automática com seleção inteligente */}
                  <div className="flex items-center gap-2 p-3 border-2 border-blue-300 rounded-lg bg-blue-50">
                    <input
                      type="radio"
                      id="auto-search"
                      name="search-mode"
                      checked={useAutoSearch}
                      onChange={() => handleSearchModeChange('auto')}
                      readOnly
                    />
                    <label htmlFor="auto-search" className="text-sm font-medium text-blue-700">
                      🎯 Busca automática
                    </label>
                  </div>
                </div>

                {/* Filtros de Status */}
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="status-active"
                      checked={showActive}
                      onCheckedChange={(checked) => setShowActive(checked === true)}
                    />
                    <label htmlFor="status-active" className="text-sm text-gray-600">Ativas</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="status-paused"
                      checked={showPaused}
                      onCheckedChange={(checked) => setShowPaused(checked === true)}
                    />
                    <label htmlFor="status-paused" className="text-sm text-gray-600">Pausadas</label>
                  </div>
                </div>

                {/* Barra de busca - Atualmente apenas busca automática está ativa */}
                {useAutoSearch && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        Digite o padrão das campanhas e o sistema selecionará automaticamente todas as campanhas que contenham esse termo.
                      </p>
                    </div>

                    {/* Linha com busca e período de datas */}
                    <div className="flex gap-3 items-end">
                      <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Black Friday 2025"
                          value={autoSearchTerm}
                          onChange={(e) => setAutoSearchTerm(e.target.value.toUpperCase())}
                          className="pl-10 font-mono"
                          onKeyPress={(e) => e.key === 'Enter' && handleAutoSearch()}
                        />
                      </div>

                      {/* Período de dados inline */}
                      <div className="flex gap-2 items-end flex-shrink-0">
                        <div className="space-y-1">
                          <label className="text-xs text-gray-600 block">Data inicial</label>
                          <Input
                            type="date"
                            value={dateRange?.since || ''}
                            onChange={(e) => {
                              if (dateRange && onDateRangeChange) {
                                onDateRangeChange({ ...dateRange, since: e.target.value });
                              }
                            }}
                            className="text-xs w-36 h-9"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-gray-600 block">Data final</label>
                          <Input
                            type="date"
                            value={dateRange?.until || ''}
                            onChange={(e) => {
                              if (dateRange && onDateRangeChange) {
                                onDateRangeChange({ ...dateRange, until: e.target.value });
                              }
                            }}
                            className="text-xs w-36 h-9"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleAutoSearch}
                        disabled={!autoSearchTerm.trim()}
                        className="flex-shrink-0 h-9"
                      >
                        Buscar Campanhas
                      </Button>
                    </div>
                  </div>
                )}

                {/*
                =====================================================================================
                FUTURAS MELHORIAS: Outros tipos de busca comentados

                Para reativar as outras opções de busca, será necessário:

                1. BUSCA MANUAL: Implementar busca com palavra-chave específica
                   - Campo de input para termo de busca
                   - Botão para executar busca na API do Meta
                   - Filtro aplicado diretamente na requisição

                2. FILTRO LOCAL: Implementar filtro simples por nome
                   - Campo de input para filtrar campanhas já carregadas
                   - Filtragem realizada no frontend sem nova requisição
                   - Útil para explorar campanhas já obtidas

                3. EXIBIR TODAS: Mostrar todas as campanhas sem filtros
                   - Carrega todas as campanhas da conta selecionada
                   - Permite exploração completa do catálogo
                   - Pode ser útil para descoberta de campanhas

                Para implementar, descomente o código nas linhas 500-524 e ajuste a lógica
                condicional para incluir os casos useSearch e !useSearch && !useAutoSearch.
                =====================================================================================
                */}
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
                        onClick={() => selectedAccount && loadCampaignsFromAccount(selectedAccount)}
                        className="mt-3"
                        size="sm"
                        disabled={!selectedAccount}
                      >
                        Tentar Novamente
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Campanhas */}
              {!loading && !error && (
                <div className="flex-1 overflow-y-auto space-y-2 min-h-80">
                  {!hasSearched ? (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-600">Nenhuma campanha encontrada</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Digite um termo e clique em "Buscar Campanhas" para começar
                      </p>
                    </div>
                  ) : filteredCampaigns.length === 0 ? (
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
                          onClick={() => saveSearchTerm('')}
                          className="mt-2"
                        >
                          Limpar {useSearch ? 'busca' : 'filtro'}
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredCampaigns.map((campaign) => {
                      const isLinked = linkedCampaigns.includes(campaign.id);
                      const isSelected = selectedCampaignIds.includes(campaign.id);

                      return (
                        <div
                          key={campaign.id}
                          className={`border rounded-lg p-4 transition-colors ${
                            isLinked
                              ? 'border-orange-300 bg-orange-50 cursor-default'
                              : isSelected
                                ? 'border-blue-500 bg-blue-50 cursor-pointer'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                          }`}
                          onClick={() => !isLinked && handleCampaignToggle(campaign)}
                        >
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={isSelected || isLinked}
                              disabled={isLinked}
                              onChange={() => {}} // Handled by parent click
                              className="mt-1"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className={`font-medium truncate pr-2 ${
                                  isLinked ? 'text-orange-700' : 'text-gray-900'
                                }`}>
                                  {campaign.name}
                                </h3>
                                <div className="flex gap-1">
                                  {isLinked && (
                                    <Badge className="bg-orange-100 text-orange-800 text-xs">
                                      Já vinculada
                                    </Badge>
                                  )}
                                  <Badge className={getStatusColor(campaign.status)}>
                                    {campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                                  </Badge>
                                </div>
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
                      );
                    })
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
              hasSearched ? (
                <div className="space-y-1">
                  <div>Total de campanhas: {filteredCampaigns.length}</div>
                  {(!dateRange?.since || !dateRange?.until) && (
                    <div className="text-orange-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Preencha as datas para confirmar seleção
                    </div>
                  )}
                </div>
              ) :
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
                disabled={selectedCampaignIds.length === 0 || !dateRange?.since || !dateRange?.until}
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