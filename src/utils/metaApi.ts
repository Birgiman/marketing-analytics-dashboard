/**
 * Meta API Utilities
 * Funções reutilizáveis para interação com Facebook Marketing API
 * Podem ser usadas em Lives, Campanhas, etc.
 */

import {
  MetaInsightLevel,
  MetaFilterOperator,
  MetaCampaignStatus,
  MetaDatePreset,
  MetaApiFields,
  MetaInsightsOptions,
  MetaApiFilter,
  MetaTimeRange,
  buildMetaApiUrl,
  createCampaignStatusFilter,
  createCampaignNameFilter,
  createCampaignIdFilter
} from '../types/metaApi';

export interface MetaAdAccount {
  id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
  amount_spent: string;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  created_time: string;
  updated_time: string;
}

export interface MetaInsight {
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  frequency: string;
  cpm: string;
  ctr: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  date_start: string;
  date_stop: string;
}

const BASE_URL = 'https://graph.facebook.com/v23.0';

/**
 * Busca contas de anúncios de um usuário
 */
export async function fetchAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const response = await fetch(
    `${BASE_URL}/me/adaccounts?fields=id,name,currency,timezone_name,account_status,amount_spent&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erro ao buscar contas de anúncios');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Busca campanhas de uma conta específica
 * Atualizada para usar a nova estrutura padronizada com enums
 */
export async function fetchCampaigns(
  adAccountId: string,
  accessToken: string,
  options: {
    limit?: number;
    status?: string[];
    fields?: string[];
    searchTerm?: string;
  } = {}
): Promise<MetaCampaign[]> {
  const {
    limit = 25,
    status = ['ACTIVE', 'PAUSED'],
    fields = MetaApiFields.CAMPAIGN,
    searchTerm
  } = options;

  console.log('📱 fetchCampaigns - Parâmetros recebidos:', { adAccountId, options });

  const filters: MetaApiFilter[] = [];

  // Add status filter if provided
  if (status.length > 0) {
    console.log('📱 Adicionando filtro de status:', status);
    filters.push({
      field: 'status',
      operator: MetaFilterOperator.IN,
      value: status
    });
  } else {
    console.log('📱 Sem filtro de status (status array vazio)');
  }

  // Add search term filter if provided
  if (searchTerm && searchTerm.trim()) {
    console.log('📱 Adicionando filtro de busca:', searchTerm);
    filters.push(createCampaignNameFilter(searchTerm.trim()));
  }

  const params = new URLSearchParams({
    fields: fields.join(','),
    access_token: accessToken,
    limit: limit.toString()
  });

  // Add filtering if we have any filters
  if (filters.length > 0) {
    params.append('filtering', JSON.stringify(filters));
  }

  const url = `${BASE_URL}/${adAccountId}/campaigns?${params}`;
  console.log('📱 URL da requisição:', url.replace(accessToken, 'TOKEN_OCULTO'));

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('📱 ❌ Erro na resposta:', response.status, errorText);

    try {
      const error = JSON.parse(errorText);
      throw new Error(error.error?.message || 'Erro ao buscar campanhas');
    } catch {
      throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
    }
  }

  const data = await response.json();
  console.log('📱 ✅ Resposta da API:', data);
  console.log('📱 ✅ Total de campanhas encontradas:', data.data?.length || 0);

  return data.data || [];
}

/**
 * Busca dados específicos de uma campanha pelo ID
 * Atualizada para usar campos padronizados
 */
export async function fetchCampaignById(
  campaignId: string,
  accessToken: string,
  options: {
    fields?: string[];
  } = {}
): Promise<MetaCampaign> {
  const {
    fields = MetaApiFields.CAMPAIGN
  } = options;

  const params = new URLSearchParams({
    fields: fields.join(','),
    access_token: accessToken
  });

  const response = await fetch(`${BASE_URL}/${campaignId}?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erro ao buscar campanha');
  }

  return await response.json();
}

/**
 * Busca insights de uma campanha específica
 * Atualizada para usar a nova estrutura com enums e tipos
 */
export async function fetchCampaignInsightsById(
  campaignId: string,
  accessToken: string,
  options: MetaInsightsOptions & {
    timeIncrement?: string;
  } = {}
): Promise<any> {
  const {
    fields = MetaApiFields.CAMPAIGN_INSIGHTS,
    datePreset = MetaDatePreset.LAST_30D,
    dateRange,
    level = MetaInsightLevel.CAMPAIGN,
    timeIncrement = '1'
  } = options;

  const params = new URLSearchParams({
    fields: fields.join(','),
    access_token: accessToken,
    level: level,
    time_increment: timeIncrement
  });

  // Use dateRange if provided, otherwise fall back to datePreset
  if (dateRange) {
    params.append('time_range', JSON.stringify({
      since: dateRange.since,
      until: dateRange.until
    }));
  } else {
    params.append('date_preset', datePreset);
  }

  const response = await fetch(`${BASE_URL}/${campaignId}/insights?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erro ao buscar insights da campanha');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Busca insights/métricas de campanhas
 */
export async function fetchCampaignInsights(
  campaignIds: string[],
  accessToken: string,
  options: {
    dateRange?: { since: string; until: string };
    datePreset?: string;
    level?: 'campaign' | 'adset' | 'ad';
    fields?: string[];
  } = {}
): Promise<MetaInsight[]> {
  const {
    datePreset = 'last_30d',
    level = 'campaign',
    fields = [
      'impressions', 'clicks', 'spend', 'reach', 
      'frequency', 'actions', 'cpm', 'ctr'
    ]
  } = options;

  const insights: MetaInsight[] = [];

  // Buscar insights para cada campanha
  for (const campaignId of campaignIds) {
    const params = new URLSearchParams({
      fields: fields.join(','),
      access_token: accessToken,
      level
    });

    if (options.dateRange) {
      params.append('time_range', JSON.stringify({
        since: options.dateRange.since,
        until: options.dateRange.until
      }));
    } else {
      params.append('date_preset', datePreset);
    }

    try {
      const response = await fetch(`${BASE_URL}/${campaignId}/insights?${params}`);

      if (!response.ok) {
        console.warn(`Erro ao buscar insights para campanha ${campaignId}`);
        continue;
      }

      const data = await response.json();
      insights.push(...(data.data || []));

    } catch (error) {
      console.warn(`Erro ao processar insights da campanha ${campaignId}:`, error);
    }
  }

  return insights;
}

/**
 * Extrai leads das actions do Meta
 */
export function extractLeads(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions) return 0;
  
  const leadAction = actions.find(action => 
    action.action_type === 'lead' || 
    action.action_type === 'submit_application' ||
    action.action_type === 'complete_registration'
  );
  
  return leadAction ? parseInt(leadAction.value) : 0;
}

/**
 * Extrai conversões das actions do Meta
 */
export function extractConversions(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions) return 0;
  
  const conversionActions = actions.filter(action => 
    action.action_type.includes('conversion') ||
    action.action_type === 'purchase' ||
    action.action_type === 'add_to_cart'
  );
  
  return conversionActions.reduce((sum, action) => sum + parseInt(action.value), 0);
}

/**
 * Formata valor monetário do Meta (de centavos para reais)
 */
export function formatMetaCurrency(cents: number | string): number {
  const centsValue = typeof cents === 'string' ? parseFloat(cents) : cents;
  return Math.round(centsValue * 100); // Meta retorna em dólares/reais, convertemos para centavos
}

/**
 * Valida se um ID é de ad account do Meta
 */
export function isValidAdAccountId(id: string): boolean {
  return /^act_\d+$/.test(id);
}

/**
 * Valida se um token tem formato válido
 */
export function isValidAccessToken(token: string): boolean {
  // Tokens do Meta geralmente têm 200+ caracteres e começam com letras/números
  return token.length > 50 && /^[A-Za-z0-9]+/.test(token);
}

/**
 * Busca insights agregados a nível de conta (múltiplas campanhas)
 * Usado para obter dados consolidados de todas as campanhas selecionadas
 */
export async function fetchAccountLevelInsights(
  adAccountId: string,
  accessToken: string,
  options: MetaInsightsOptions = {}
): Promise<any[]> {
  const {
    level = MetaInsightLevel.ACCOUNT,
    fields = MetaApiFields.ACCOUNT_INSIGHTS,
    dateRange,
    datePreset = MetaDatePreset.LAST_30D,
    filtering = [],
    limit
  } = options;

  const params = new URLSearchParams({
    fields: fields.join(','),
    access_token: accessToken,
    level: level
  });

  // Só adicionar limit se fornecido
  if (limit) {
    params.append('limit', limit.toString());
  }

  // Add date range or preset
  if (dateRange) {
    params.append('time_range', JSON.stringify({
      since: dateRange.since,
      until: dateRange.until
    }));
  } else {
    params.append('date_preset', datePreset);
  }

  // Add filtering if provided
  if (filtering.length > 0) {
    params.append('filtering', JSON.stringify(filtering));
  }

  const url = `${BASE_URL}/${adAccountId}/insights?${params}`;
  console.log('📊 [fetchAccountLevelInsights] URL:', url.replace(accessToken, 'TOKEN_OCULTO'));

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erro ao buscar insights agregados da conta');
  }

  const data = await response.json();
  console.log('📊 [fetchAccountLevelInsights] Resposta:', data);
  return data.data || [];
}

/**
 * Busca insights específicos de múltiplas campanhas com filtros avançados
 * Suporta filtros por status, nome e IDs específicos
 */
export async function fetchMultipleCampaignInsights(
  adAccountId: string,
  accessToken: string,
  options: MetaInsightsOptions & {
    campaignIds?: string[];
    campaignStatuses?: MetaCampaignStatus[];
    searchTerm?: string;
  } = {}
): Promise<any[]> {
  const {
    level = MetaInsightLevel.CAMPAIGN,
    fields = MetaApiFields.CAMPAIGN_INSIGHTS,
    dateRange,
    datePreset = MetaDatePreset.LAST_30D,
    campaignIds,
    campaignStatuses = [MetaCampaignStatus.ACTIVE, MetaCampaignStatus.PAUSED],
    searchTerm,
    limit
  } = options;

  const filters: MetaApiFilter[] = [];

  // Add campaign status filter
  if (campaignStatuses.length > 0) {
    filters.push(createCampaignStatusFilter(campaignStatuses));
  }

  // Add campaign name filter if search term provided
  if (searchTerm && searchTerm.trim()) {
    filters.push(createCampaignNameFilter(searchTerm.trim()));
  }

  // Add campaign ID filter if specific IDs provided
  if (campaignIds && campaignIds.length > 0) {
    filters.push(createCampaignIdFilter(campaignIds));
  }

  const params = new URLSearchParams({
    fields: fields.join(','),
    access_token: accessToken,
    level: level
  });

  // Só adicionar limit se fornecido
  if (limit) {
    params.append('limit', limit.toString());
  }

  // Add date range or preset
  if (dateRange) {
    params.append('time_range', JSON.stringify({
      since: dateRange.since,
      until: dateRange.until
    }));
  } else {
    params.append('date_preset', datePreset);
  }

  // Add filtering
  if (filters.length > 0) {
    params.append('filtering', JSON.stringify(filters));
  }

  const url = `${BASE_URL}/${adAccountId}/insights?${params}`;
  console.log('📊 [fetchMultipleCampaignInsights] URL:', url.replace(accessToken, 'TOKEN_OCULTO'));
  console.log('📊 [fetchMultipleCampaignInsights] Filtros aplicados:', filters);

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erro ao buscar insights de múltiplas campanhas');
  }

  const data = await response.json();
  console.log('📊 [fetchMultipleCampaignInsights] Total de insights:', data.data?.length || 0);
  return data.data || [];
}

/**
 * Função para buscar insights agregados de campanhas específicas de uma Live
 * Combina os dados de campanhas individuais com insights agregados
 */
export async function fetchLiveCampaignsInsights(
  adAccountId: string,
  campaignIds: string[],
  accessToken: string,
  options: MetaInsightsOptions = {}
): Promise<{
  results: any[];
}> {
  const {
    level = MetaInsightLevel.CAMPAIGN,
    fields = MetaApiFields.CAMPAIGN_INSIGHTS,
    dateRange,
    datePreset = MetaDatePreset.LAST_30D,
    filtering = [],
    limit
  } = options;

  try {
    // Usar as opções EXATAS que o usuário selecionou no modal
    const requestOptions: MetaInsightsOptions = {
      level,
      fields, // Usar os campos selecionados pelo usuário
      dateRange,
      datePreset,
      filtering: [
        createCampaignIdFilter(campaignIds), // Sempre filtrar pelos IDs das campanhas da Live
        ...filtering // Adicionar filtros extras (status, nome, etc.)
      ],
      limit
    };

    console.log('📊 [fetchLiveCampaignsInsights] Fazendo UMA única requisição com:', requestOptions);

    // Fazer apenas UMA requisição baseada no level escolhido
    let results: any[];
    if (level === MetaInsightLevel.ACCOUNT) {
      results = await fetchAccountLevelInsights(adAccountId, accessToken, requestOptions);
    } else {
      results = await fetchMultipleCampaignInsights(adAccountId, accessToken, requestOptions);
    }

    console.log('📊 [fetchLiveCampaignsInsights] Resultados:', results.length);

    return {
      results
    };

  } catch (error) {
    console.error('📊 [fetchLiveCampaignsInsights] Erro:', error);
    throw error;
  }
}