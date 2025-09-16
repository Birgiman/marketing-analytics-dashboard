import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MetaInsightLevel } from '@/types/metaApi';
import { fetchLiveCampaignsInsights } from '@/utils/metaApi';
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

// Campos padrão que normalmente são necessários
const DEFAULT_SELECTED_FIELDS = [
  'campaign_id',
  'campaign_name',
  'date_start',
  'date_stop',
  'spend',
  'impressions',
  'clicks'
];

export const MetaApiTestModal = ({ open, onOpenChange, liveId }: MetaApiTestModalProps) => {
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_SELECTED_FIELDS);
  const [level, setLevel] = useState<MetaInsightLevel>(MetaInsightLevel.CAMPAIGN);
  const [dateRange, setDateRange] = useState({
    since: '',
    until: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Carregar período da Live quando o modal abrir
  const loadLiveDateRange = async () => {
    try {
      const { data: live, error } = await supabase
        .from('lives')
        .select('insights_date_since, insights_date_until')
        .eq('id', liveId)
        .single();

      if (!error && live) {
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
    setSelectedFields(AVAILABLE_FIELDS.map(field => field.id));
  };

  const handleDeselectAll = () => {
    setSelectedFields([]);
  };

  const handleTest = async () => {
    if (selectedFields.length === 0) {
      alert('⚠️ Selecione pelo menos um campo para testar');
      return;
    }

    if (!dateRange.since || !dateRange.until) {
      alert('⚠️ Informe o período de datas');
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

      // Fazer a requisição para a API Meta com os parâmetros selecionados
      const options = {
        level: level,
        fields: selectedFields,
        dateRange: {
          since: dateRange.since,
          until: dateRange.until
        }
      };

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
      const aggregatedCount = result.aggregated?.length || 0;
      const individualCount = result.individual?.length || 0;

      alert(`✅ Teste concluído com sucesso!\n\n` +
            `📊 Insights agregados: ${aggregatedCount}\n` +
            `📈 Insights individuais: ${individualCount}\n` +
            `🎯 Level: ${level}\n` +
            `📅 Período: ${dateRange.since} até ${dateRange.until}\n` +
            `🔍 Campos: ${selectedFields.length} selecionados\n\n` +
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
            <Label className="text-sm font-semibold">Período de Datas</Label>
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
          </div>

          {/* Seleção de Campos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Campos da API ({selectedFields.length}/{AVAILABLE_FIELDS.length} selecionados)
              </Label>
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  Selecionar Todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                >
                  Desmarcar Todos
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
                      Insights agregados: {testResult.data.aggregated?.length || 0} |
                      Insights individuais: {testResult.data.individual?.length || 0}
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
              disabled={isLoading || selectedFields.length === 0}
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