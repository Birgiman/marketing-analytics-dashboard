import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MetaInsightLevel, MetaCampaignStatus } from '@/types/metaApi';
import { fetchLiveCampaignsInsights, validateMetaTimeRange } from '@/utils/metaApi';
import { supabase } from '@/integrations/supabase/client';

interface MetaApiTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liveId: string;
}

// Campos disponíveis baseados na lista fornecida
const AVAILABLE_FIELDS = [
  { id: 'campaign_id', label: 'Campaign ID', description: 'ID da campanha' },
  { id: 'campaign_name', label: 'Campaign Name', description: 'Nome da campanha' },
  { id: 'ad_name', label: 'Ad Name', description: 'Nome do anúncio' },
  { id: 'date_start', label: 'Date Start', description: 'Data de início' },
  { id: 'date_stop', label: 'Date Stop', description: 'Data de fim' },
  { id: 'spend', label: 'Spend', description: 'Gasto total' },
  { id: 'impressions', label: 'Impressions', description: 'Impressões' },
  { id: 'clicks', label: 'Clicks', description: 'Cliques' },
  { id: 'reach', label: 'Reach', description: 'Alcance' },
  { id: 'frequency', label: 'Frequency', description: 'Frequência' },
  { id: 'cpm', label: 'CPM', description: 'Custo por mil impressões' },
  { id: 'ctr', label: 'CTR', description: 'Taxa de cliques' },
  { id: 'cpp', label: 'CPP', description: 'Custo por postagem' },
  { id: 'cost_per_unique_click', label: 'Cost Per Unique Click', description: 'Custo por clique único' },
  { id: 'actions', label: 'Actions', description: 'Ações/Conversões' }
];

// Campos padrão otimizados para testes eficientes
const DEFAULT_SELECTED_FIELDS = [
  'campaign_id',
  'campaign_name',
  'date_start',
  'date_stop',
  'spend',
  'impressions'
];

// Conjunto mínimo para testes rápidos
const MINIMAL_FIELDS = [
  'campaign_id',
  'campaign_name',
  'spend'
];

// Conjunto completo para análise detalhada
const COMPLETE_FIELDS = AVAILABLE_FIELDS.map(field => field.id);

export const MetaApiTestModal = ({ open, onOpenChange, liveId }: MetaApiTestModalProps) => {
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_SELECTED_FIELDS);
  const [level, setLevel] = useState<MetaInsightLevel>(MetaInsightLevel.CAMPAIGN);
  const [dateRange, setDateRange] = useState({
    since: '',
    until: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignStatus, setCampaignStatus] = useState<string[]>(['ACTIVE', 'PAUSED']);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Carregar período da Live quando o modal abrir
  const loadLiveDateRange = async () => {
    try {
      const { data: live, error } = await supabase
        .from('lives')
        .select('insights_date_since, insights_date_until, campaign_search_term')
        .eq('id', liveId)
        .single();

      if (!error && live) {
        // Carregar período de datas
        if (live.insights_date_since && live.insights_date_until) {
          setDateRange({
            since: live.insights_date_since,
            until: live.insights_date_until
          });
        } else {
          // Fallback para mês atual se não tiver período definido
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          setDateRange({
            since: firstDayOfMonth.toISOString().split('T')[0],
            until: now.toISOString().split('T')[0]
          });
        }

        // Carregar termo de busca das campanhas
        if (live.campaign_search_term) {
          setSearchTerm(live.campaign_search_term);
          console.log('🧪 [TESTE META API] Termo de busca carregado da Live:', live.campaign_search_term);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar período da Live:', error);
    }
  };

  // Carregar período quando o modal abrir
  React.useEffect(() => {
    if (open) {
      loadLiveDateRange();
    }
  }, [open, liveId]);

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAll = () => {
    setSelectedFields(COMPLETE_FIELDS);
  };

  const handleDeselectAll = () => {
    setSelectedFields([]);
  };

  const handleSelectMinimal = () => {
    setSelectedFields(MINIMAL_FIELDS);
  };

  const handleSelectDefault = () => {
    setSelectedFields(DEFAULT_SELECTED_FIELDS);
  };

  const handleTest = async () => {
    if (selectedFields.length === 0) {
      alert('⚠️ Selecione pelo menos um campo para testar');
      return;
    }

    if (searchTerm.trim().length < 2) {
      alert('⚠️ Termo de busca deve ter pelo menos 2 caracteres');
      return;
    }

    if (!dateRange.since || !dateRange.until) {
      alert('⚠️ Informe o período de datas');
      return;
    }

    // VALIDAÇÃO: Verificar se o período de datas está dentro do limite da API Meta (37 meses)
    const timeRangeValidation = validateMetaTimeRange(dateRange);
    if (!timeRangeValidation.isValid) {
      alert(`⚠️ Período de datas inválido:\n\n${timeRangeValidation.error}\n\n${timeRangeValidation.maxAllowedDate ? `Data máxima permitida: ${timeRangeValidation.maxAllowedDate}` : ''}`);
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      console.log('🧪 [TESTE META API] Iniciando teste com parâmetros:', {
        fields: selectedFields,
        level: level,
        dateRange: dateRange,
        liveId: liveId
      });

      // Buscar dados da Live e integração Meta
      console.log('🧪 [TESTE META API] Buscando dados da Live:', liveId);
      const { data: live, error: liveError } = await supabase
        .from('lives')
        .select('user_id')
        .eq('id', liveId)
        .single();

      if (liveError || !live) {
        console.error('🧪 [TESTE META API] Erro ao buscar Live:', liveError);
        throw new Error(`Live não encontrada: ${liveError?.message || 'ID inválido'}`);
      }

      console.log('🧪 [TESTE META API] Live encontrada, user_id:', live.user_id);

      // Verificar se existe alguma integração Meta para este usuário
      const { data: allIntegrations, error: allIntegrationsError } = await supabase
        .from('meta_integrations')
        .select('*')
        .eq('user_id', live.user_id);

      console.log('🧪 [TESTE META API] Todas as integrações do usuário:', allIntegrations);

      let { data: metaIntegration, error: metaError } = await supabase
        .from('meta_integrations')
        .select('access_token, is_active')
        .eq('user_id', live.user_id)
        .eq('is_active', true)
        .single();

      if (metaError) {
        console.error('🧪 [TESTE META API] Erro ao buscar integração Meta:', metaError);
        console.log('🧪 [TESTE META API] Total de integrações encontradas:', allIntegrations?.length || 0);

        if (allIntegrations && allIntegrations.length > 0) {
          console.log('🧪 [TESTE META API] Integrações disponíveis:', allIntegrations.map(i => ({
            id: i.id,
            is_active: i.is_active,
            created_at: i.created_at
          })));

          // Tentar pegar a primeira integração (mesmo que não esteja ativa)
          const firstIntegration = allIntegrations[0];
          console.log('🧪 [TESTE META API] Usando primeira integração disponível:', firstIntegration);

          if (firstIntegration.access_token) {
            console.log('🧪 [TESTE META API] ⚠️ Usando integração inativa, mas com access_token válido');
            // Usar a primeira integração disponível
            metaIntegration = {
              access_token: firstIntegration.access_token,
              is_active: firstIntegration.is_active
            };
          } else {
            throw new Error(`Integração Meta encontrada mas sem access_token necessário`);
          }
        } else {
          throw new Error('Nenhuma integração Meta encontrada para este usuário. Verifique se a integração com Facebook/Meta está configurada.');
        }
      }

      if (!metaIntegration) {
        throw new Error('Integração Meta não encontrada');
      }

      console.log('🧪 [TESTE META API] Integração Meta encontrada:', {
        is_active: metaIntegration.is_active,
        has_access_token: !!metaIntegration.access_token
      });

      // Buscar campanhas da Live
      const { data: liveCampaigns, error: campaignsError } = await supabase
        .from('live_campaigns')
        .select('campaign_id, account_id')
        .eq('live_id', liveId);

      if (campaignsError || !liveCampaigns || liveCampaigns.length === 0) {
        throw new Error('Nenhuma campanha encontrada para esta Live');
      }

      const campaignIds = liveCampaigns.map(c => c.campaign_id);

      // Obter account_id da primeira campanha (todas devem ter o mesmo account)
      const accountId = liveCampaigns[0].account_id;

      if (!accountId) {
        throw new Error('Account ID não encontrado nas campanhas da Live');
      }

      console.log('🧪 [TESTE META API] Account ID obtido das campanhas:', accountId);

      // Validar período de datas para evitar "número excessivo de linhas"
      const dateRangeStart = new Date(dateRange.since);
      const dateRangeEnd = new Date(dateRange.until);
      const diffTime = Math.abs(dateRangeEnd.getTime() - dateRangeStart.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      console.log('🧪 [TESTE META API] Período de dias:', diffDays);

      // Removed 365 days limit - user can choose any period

      // Determinar limite baseado no período e número de campos
      let apiLimit = 25;
      if (diffDays > 180) {
        apiLimit = 15; // Períodos longos: menos resultados
      } else if (diffDays > 90) {
        apiLimit = 20; // Períodos médios
      } else {
        apiLimit = 25; // Períodos curtos: mais resultados
      }

      // Ajustar limite baseado no número de campos selecionados
      if (selectedFields.length > 10) {
        apiLimit = Math.max(10, Math.floor(apiLimit * 0.7)); // Reduzir limite se muitos campos
      }

      console.log('🧪 [TESTE META API] Limite calculado:', apiLimit);

      // Fazer a requisição para a API Meta com os parâmetros selecionados
      // Criar filtros dinâmicos baseados na seleção do usuário
      const filters = [];

      // Filtro de status (sempre presente, baseado na seleção)
      if (campaignStatus.length > 0) {
        filters.push({
          "field": "campaign.effective_status",
          "operator": "IN",
          "value": campaignStatus
        });
      }

      // Filtro de nome (só se termo for fornecido)
      if (searchTerm.trim()) {
        filters.push({
          "field": "campaign.name",
          "operator": "CONTAIN",
          "value": searchTerm.trim()
        });
      }

      const options = {
        level: level,
        fields: selectedFields, // Usar campos selecionados pelo usuário
        dateRange: {
          since: dateRange.since,
          until: dateRange.until
        },
        filtering: filters,
        searchTerm: searchTerm.trim(), // MELHORADO: Passar termo de busca explicitamente
        campaignStatuses: campaignStatus // CORRIGIDO: Usar variável correta (singular)
      };

      console.log('🧪 [TESTE META API] Filtros dinâmicos criados:', filters);

      console.log('🧪 [TESTE META API] Chamando fetchLiveCampaignsInsights com:', {
        adAccountId: accountId,
        campaignIds: campaignIds,
        options: options
      });

      const result = await fetchLiveCampaignsInsights(
        accountId,
        campaignIds,
        metaIntegration.access_token,
        options
      );

      console.log('🧪 [TESTE META API] ✅ Resultado:', result);

      setTestResult({
        success: true,
        data: result,
        params: {
          fields: selectedFields,
          level: level,
          dateRange: dateRange,
          campaignIds: campaignIds,
          accountId: accountId
        }
      });

      // Mostrar alerta com resumo
      const resultsCount = result.results?.length || 0;

      alert(`✅ Teste concluído com sucesso!\n\n` +
            `📊 Resultados encontrados: ${resultsCount}\n` +
            `🎯 Level: ${level}\n` +
            `📅 Período: ${dateRange.since} até ${dateRange.until}\n` +
            `🔍 Campos: ${selectedFields.length} selecionados\n` +
            `🔍 Termo: "${searchTerm.trim()}"\n\n` +
            `Verifique o console para detalhes completos.`);

    } catch (error: any) {
      console.error('🧪 [TESTE META API] ❌ Erro:', error);

      setTestResult({
        success: false,
        error: error.message || 'Erro desconhecido'
      });

      alert(`❌ Erro no teste:\n\n${error.message || 'Erro desconhecido'}\n\nVerifique o console para mais detalhes.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[850px] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>🧪 Teste de API Meta - Configurar Parâmetros</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Termo de Busca das Campanhas */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Termo de Busca das Campanhas</Label>
            <Input
              type="text"
              placeholder="Ex: BLACK_FRIDAY_2025, NATAL_2024, PROMOCAO_VERAO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              className="font-mono"
            />
            <p className="text-xs text-gray-500">
              Filtro de nome usado quando a Live foi criada. Apenas campanhas que contêm este termo serão buscadas.
            </p>
            {searchTerm && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <p className="text-xs text-blue-800">
                  🎯 <strong>Filtro ativo:</strong> Campanhas contendo "{searchTerm}"
                </p>
              </div>
            )}
          </div>

          {/* Status das Campanhas */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Status das Campanhas
            </Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={campaignStatus.includes('ACTIVE')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setCampaignStatus(prev => [...prev.filter(s => s !== 'ACTIVE'), 'ACTIVE']);
                    } else {
                      setCampaignStatus(prev => prev.filter(s => s !== 'ACTIVE'));
                    }
                  }}
                />
                <Label htmlFor="active" className="text-sm text-green-600">✅ Ativas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="paused"
                  checked={campaignStatus.includes('PAUSED')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setCampaignStatus(prev => [...prev.filter(s => s !== 'PAUSED'), 'PAUSED']);
                    } else {
                      setCampaignStatus(prev => prev.filter(s => s !== 'PAUSED'));
                    }
                  }}
                />
                <Label htmlFor="paused" className="text-sm text-orange-600">⏸️ Pausadas</Label>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Selecione quais status de campanhas incluir na busca ({campaignStatus.length} selecionados)
            </p>
          </div>

          {/* Seleção de Level */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Level da API</Label>
            <Select value={level} onValueChange={(value) => setLevel(value as MetaInsightLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MetaInsightLevel.CAMPAIGN}>
                  Campaign (dados individuais por campanha)
                </SelectItem>
                <SelectItem value={MetaInsightLevel.ACCOUNT}>
                  Account (dados agregados da conta)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Campaign = insights separados por campanha | Account = insights agregados de todas as campanhas
            </p>
          </div>

          {/* Período de Datas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Período de Datas</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(today.getDate() - 30);

                    setDateRange({
                      since: thirtyDaysAgo.toISOString().split('T')[0],
                      until: today.toISOString().split('T')[0]
                    });
                  }}
                  className="text-xs"
                >
                  30 dias
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const ninetyDaysAgo = new Date();
                    ninetyDaysAgo.setDate(today.getDate() - 90);

                    setDateRange({
                      since: ninetyDaysAgo.toISOString().split('T')[0],
                      until: today.toISOString().split('T')[0]
                    });
                  }}
                  className="text-xs"
                >
                  3 meses
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const oneYearAgo = new Date();
                    oneYearAgo.setFullYear(today.getFullYear() - 1);

                    setDateRange({
                      since: oneYearAgo.toISOString().split('T')[0],
                      until: today.toISOString().split('T')[0]
                    });
                  }}
                  className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  📅 1 ano
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const maxAllowedDate = new Date();
                    maxAllowedDate.setMonth(maxAllowedDate.getMonth() - 36); // CORRIGIDO: 36 meses (desconsiderando mês atual)

                    setDateRange({
                      since: maxAllowedDate.toISOString().split('T')[0],
                      until: today.toISOString().split('T')[0]
                    });
                  }}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                >
                  ⚠️ 36 meses (máximo)
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Data Início</Label>
                <Input
                  type="date"
                  value={dateRange.since}
                  onChange={(e) => setDateRange(prev => ({ ...prev, since: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Data Fim</Label>
                <Input
                  type="date"
                  value={dateRange.until}
                  onChange={(e) => setDateRange(prev => ({ ...prev, until: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Período configurado na Live será carregado automaticamente
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
              <p className="text-xs text-blue-800">
                💡 <strong>Dica:</strong> Períodos longos podem retornar muitos dados. Use os limites dinâmicos para otimizar.
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2">
              <p className="text-xs text-yellow-800">
                ⚠️ <strong>Limite da API Meta:</strong> O período máximo permitido é de 36 meses a partir da data atual. Períodos maiores resultarão em erro 3018.
              </p>
            </div>
          </div>

          {/* Seleção de Campos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Campos da API ({selectedFields.length}/{AVAILABLE_FIELDS.length} selecionados)
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectMinimal}
                  className="text-xs"
                >
                  Mínimo (3)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectDefault}
                  className="text-xs"
                >
                  Padrão (6)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  Todos (15)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="text-xs"
                >
                  Limpar
                </Button>
              </div>
            </div>

            {/* Campos Selecionados */}
            {selectedFields.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedFields.map(fieldId => {
                  const field = AVAILABLE_FIELDS.find(f => f.id === fieldId);
                  return (
                    <Badge key={fieldId} variant="secondary" className="text-xs">
                      {field?.label || fieldId}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Lista de Campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto border rounded-lg p-3">
              {AVAILABLE_FIELDS.map((field) => (
                <div key={field.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => handleFieldToggle(field.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={field.id}
                      className="text-xs font-medium cursor-pointer"
                    >
                      {field.label}
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {field.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resultado do Teste */}
          {testResult && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Resultado do Teste</Label>
              <div className={`p-3 rounded-lg text-xs ${
                testResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                {testResult.success ? (
                  <div>
                    <p className="font-medium text-green-800">✅ Teste concluído com sucesso!</p>
                    <p className="text-green-700 mt-1">
                      Resultados encontrados: {testResult.data.results?.length || 0}
                    </p>
                    <p className="text-green-600 mt-1">
                      Verifique o console para dados completos
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-red-800">❌ Erro no teste</p>
                    <p className="text-red-700 mt-1">{testResult.error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Fechar
            </Button>
            <Button
              type="button"
              onClick={handleTest}
              disabled={isLoading || selectedFields.length === 0 || searchTerm.trim().length < 2}
              className="min-w-32"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Testando...</span>
                </div>
              ) : (
                '🧪 Executar Teste'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};