/**
 * Meta API Utilities
 * Funções reutilizáveis para interação com Facebook Marketing API
 * Podem ser usadas em Lives, Campanhas, etc.
 */

import {
    MetaApiFields,
    MetaApiFilter,
    MetaCampaignStatus,
    MetaDatePreset,
    MetaFilterOperator,
    MetaInsightLevel,
    MetaInsightsOptions,
    createCampaignIdFilter,
    createCampaignNameFilter,
    createCampaignStatusFilter
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
  effective_status?: string;
  buying_type?: string;
  bid_strategy?: string;
  account_id?: string;
  account_name?: string;
}

export interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  campaign: {
    id: string;
    name: string;
  };
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
  campaign_name?: string;
  campaign_id?: string;
  adset_name?: string;
  adset_id?: string;
  ad_name?: string;
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


  const filters: MetaApiFilter[] = [];

  // Add status filter if provided
  if (status.length > 0) {
    filters.push({
      field: 'effective_status',
      operator: MetaFilterOperator.IN,
      value: status
    });
  }

  // Add search term filter if provided
  if (searchTerm && searchTerm.trim()) {
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

  return data.data || [];
}

/**
 * Busca conjuntos de anúncios (Ad Sets) de uma conta de anúncios
 * @param adAccountId - ID da conta de anúncios
 * @param accessToken - Token de acesso do Meta
 * @param options - Opções de busca
 * @returns Array de conjuntos de anúncios com dados da campanha
 */
export async function fetchAdSetInsights(
  adAccountId: string,
  accessToken: string,
  options: {
    dateRange?: {
      since: string;
      until: string;
    };
    searchTerm?: string;
  } = {}
): Promise<MetaInsight[]> {
  const {
    dateRange,
    searchTerm
  } = options;

  const params = new URLSearchParams({
    fields: 'adset_id,adset_name,campaign_id,campaign_name,spend,actions,impressions,clicks,reach',
    level: 'adset',
    access_token: accessToken
  });

  // Usar dateRange se fornecido, senão usar last_30d como padrão
  if (dateRange) {
    params.append('time_range', JSON.stringify({
      since: dateRange.since,
      until: dateRange.until
    }));
  } else {
    params.append('date_preset', 'last_30d');
  }

  // Adicionar filtro por termo de busca se fornecido
  if (searchTerm) {
    params.append('filtering', JSON.stringify([{
      field: 'campaign.name',
      operator: 'CONTAIN',
      value: searchTerm
    }]));
  }

  const url = `${BASE_URL}/${adAccountId}/insights?${params.toString()}`;
  console.log('🔍 [MetaAPI] Buscando insights de conjuntos de anúncios:', url);
  console.log('🔍 [MetaAPI] Parâmetros:', {
    dateRange,
    searchTerm,
    fields: 'adset_id,adset_name,campaign_id,campaign_name,spend,actions,impressions,clicks,reach'
  });
  
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Erro ao buscar insights de conjuntos de anúncios: ${response.status} - ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('📊 [MetaAPI] Resposta da API de insights de conjuntos de anúncios:', JSON.stringify(data, null, 2));
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
 * Valida se o período de datas está dentro do limite da API Meta (1 ano)
 * Baseado no erro 3018: "The start date of the time range cannot be beyond 37 months from the current date"
 * ATUALIZADO: Usar 1 ano como limite máximo para simplificar
 */
export function validateMetaTimeRange(dateRange: { since: string; until: string }): {
  isValid: boolean;
  error?: string;
  maxAllowedDate?: string;
} {
  const currentDate = new Date();
  const sinceDate = new Date(dateRange.since);
  const untilDate = new Date(dateRange.until);
  
  // ATUALIZADO: Calcular 1 ano a partir da data atual
  const maxAllowedDate = new Date(currentDate);
  maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() - 1);
  
  
  // Verificar se a data de início está dentro do limite (não pode ser mais antiga que 1 ano)
  if (sinceDate < maxAllowedDate) {
    return {
      isValid: false,
      error: `A data de início (${dateRange.since}) está além do limite de 1 ano da API Meta. Data máxima permitida: ${maxAllowedDate.toISOString().split('T')[0]}`,
      maxAllowedDate: maxAllowedDate.toISOString().split('T')[0]
    };
  }
  
  // Verificar se a data de fim não é futura
  if (untilDate > currentDate) {
    return {
      isValid: false,
      error: `A data de fim (${dateRange.until}) não pode ser futura. Data atual: ${currentDate.toISOString().split('T')[0]}`
    };
  }
  
  // Verificar se a data de início não é posterior à data de fim
  if (sinceDate > untilDate) {
    return {
      isValid: false,
      error: `A data de início (${dateRange.since}) não pode ser posterior à data de fim (${dateRange.until})`
    };
  }
  
  return { isValid: true };
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
    fields = [], // CORRIGIDO: Usar campos vazios por padrão
    dateRange,
    datePreset = MetaDatePreset.LAST_30D,
    filtering = [],
    limit
  } = options;

  // CORRIGIDO: Se não há campos especificados, usar campos mínimos
  const finalFields = fields.length > 0 ? fields : ['campaign_id', 'campaign_name', 'spend'];

  const params = new URLSearchParams({
    fields: finalFields.join(','),
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

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erro ao buscar insights agregados da conta');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Busca insights específicos de múltiplas campanhas com filtros avançados
 * Suporta filtros por status, nome e IDs específicos
 * MELHORADO: Filtro por termo de busca agora funciona corretamente
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
    fields = [], // CORRIGIDO: Usar campos vazios por padrão
    dateRange,
    datePreset = MetaDatePreset.LAST_30D,
    campaignIds,
    campaignStatuses = [MetaCampaignStatus.ACTIVE, MetaCampaignStatus.PAUSED],
    searchTerm,
    limit
  } = options;

  // CORRIGIDO: Se não há campos especificados, usar campos mínimos
  const finalFields = fields.length > 0 ? fields : ['campaign_id', 'campaign_name', 'spend'];

  const filters: MetaApiFilter[] = [];

  // Add campaign status filter
  if (campaignStatuses.length > 0) {
    filters.push(createCampaignStatusFilter(campaignStatuses));
  }

  // MELHORADO: Add campaign name filter if search term provided
  // Agora usa filtro mais robusto que funciona com a API Meta
  if (searchTerm && searchTerm.trim()) {
    filters.push(createCampaignNameFilter(searchTerm.trim()));
  }

  // Add campaign ID filter if specific IDs provided
  if (campaignIds && campaignIds.length > 0) {
    filters.push(createCampaignIdFilter(campaignIds));
  }

  const params = new URLSearchParams({
    fields: finalFields.join(','),
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

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erro ao buscar insights de múltiplas campanhas');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Função para buscar insights agregados de campanhas específicas de uma Live
 * Combina os dados de campanhas individuais com insights agregados
 * MELHORADO: Filtro por termo de busca agora funciona corretamente
 */
export async function fetchLiveCampaignsInsights(
  adAccountId: string,
  campaignIds: string[],
  accessToken: string,
  options: MetaInsightsOptions & {
    searchTerm?: string;
    campaignStatuses?: MetaCampaignStatus[];
  } = {}
): Promise<{
  results: MetaInsight[];
}> {
  const {
    level = MetaInsightLevel.CAMPAIGN,
    fields = [], // CORRIGIDO: Usar campos vazios por padrão, será preenchido pelas opções
    dateRange,
    datePreset = MetaDatePreset.LAST_30D,
    filtering = [],
    limit,
    searchTerm,
    campaignStatuses
  } = options;

  try {
    // VALIDAÇÃO: Verificar se o período de datas está dentro do limite da API Meta (37 meses)
    if (dateRange) {
      const validation = validateMetaTimeRange(dateRange);
      if (!validation.isValid) {
        console.error('📊 [fetchLiveCampaignsInsights] ❌ Período de datas inválido:', validation.error);
        throw new Error(validation.error);
      }
    }

    // MELHORADO: Usar as opções EXATAS que o usuário selecionou no modal
    const requestOptions: MetaInsightsOptions & {
      campaignIds?: string[];
      campaignStatuses?: MetaCampaignStatus[];
      searchTerm?: string;
    } = {
      level,
      fields, // Usar os campos selecionados pelo usuário
      dateRange,
      datePreset,
      filtering: [
        createCampaignIdFilter(campaignIds), // Sempre filtrar pelos IDs das campanhas da Live
        ...filtering // Adicionar filtros extras (status, nome, etc.)
      ],
      limit,
      campaignIds, // Passar IDs das campanhas
      campaignStatuses, // Passar status das campanhas
      searchTerm // Passar termo de busca
    };


    // Fazer apenas UMA requisição baseada no level escolhido
    let results: MetaInsight[];
    if (level === MetaInsightLevel.ACCOUNT) {
      // CORRIGIDO: Para level=account, não podemos filtrar por campaign.id
      // Remover filtro de campaign.id quando level=account
      const accountOptions = { ...requestOptions };
      if (accountOptions.filtering) {
        accountOptions.filtering = accountOptions.filtering.filter(f => 
          f.field !== 'campaign.id'
        );
      }
      results = await fetchAccountLevelInsights(adAccountId, accessToken, accountOptions);
    } else {
      results = await fetchMultipleCampaignInsights(adAccountId, accessToken, requestOptions);
    }

    
    // MELHORADO: Log adicional para debug do filtro
    if (searchTerm) {
      const filteredResults = results.filter(result => 
        result.campaign_name && result.campaign_name.toUpperCase().includes(searchTerm.toUpperCase())
      );
    }

    return {
      results
    };

  } catch (error) {
    console.error('📊 [fetchLiveCampaignsInsights] Erro:', error);
    throw error;
  }
}

/**
 * FUNÇÃO CENTRALIZADA PARA BUSCAR INSIGHTS DA API META
 * 
 * Esta é a função principal e reutilizável para buscar insights de campanhas, contas ou anúncios
 * da API Meta Marketing. Substitui todas as funções duplicadas existentes.
 * 
 * @param targetId - ID do recurso (campaign_id, ad_account_id, ad_id, etc.)
 * @param accessToken - Token de acesso da API Meta
 * @param options - Opções de configuração
 * @returns Promise com os dados de insights
 * 
 * @example
 * // Buscar insights de uma campanha específica
 * const insights = await fetchMetaInsights('123456789', token, {
 *   level: 'campaign',
 *   fields: ['impressions', 'spend', 'clicks'],
 *   timeRange: { since: '2024-01-01', until: '2024-01-31' }
 * });
 * 
 * @example
 * // Buscar insights de uma conta (múltiplas campanhas)
 * const accountInsights = await fetchMetaInsights('act_123456789', token, {
 *   level: 'account',
 *   fields: ['campaign_name', 'impressions', 'spend'],
 *   filtering: [{ field: 'campaign.status', operator: 'IN', value: ['ACTIVE'] }]
 * });
 */
export async function fetchMetaInsights(
  targetId: string,
  accessToken: string,
  options: {
    // OBRIGATÓRIOS
    level: 'campaign' | 'account' | 'adset' | 'ad';
    
    // OPCIONAIS COM VALORES PADRÃO
    fields?: string[];
    timeRange?: { since: string; until: string };
    datePreset?: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'last_3_months' | 'last_6_months' | 'last_12_months' | 'last_7_days' | 'last_14_days' | 'last_30_days' | 'last_90_days' | 'this_week_mon_today' | 'this_week_sun_today' | 'last_2_weeks' | 'last_28_days';
    filtering?: Array<{ field: string; operator: 'IN' | 'NOT_IN' | 'EQUAL' | 'NOT_EQUAL' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAIN' | 'NOT_CONTAIN'; value: string | string[] | number }>;
    limit?: number;
    timeIncrement?: number | '1' | '7' | '30';
  } = {}
): Promise<any[]> {
  const {
    level,
    fields = [], // Campos vazios por padrão
    timeRange,
    datePreset = 'last_30_days', // Valor padrão: últimos 30 dias
    filtering = [],
    limit,
    timeIncrement = '1'
  } = options;

  // VALIDAÇÃO: time_range é obrigatório, mas com valor padrão
  if (!timeRange && !datePreset) {
    throw new Error('timeRange ou datePreset é obrigatório');
  }

  // NOTA: Validação de 1 ano removida daqui para permitir visualização de dados históricos
  // A validação deve ser aplicada apenas na criação/edição de Lives

  // CAMPOS MÍNIMOS OBRIGATÓRIOS
  const minimumFields = ['campaign_name', 'impressions', 'spend'];
  const finalFields = fields.length > 0 ? fields : minimumFields;

  // Construir parâmetros da requisição
  const params = new URLSearchParams({
    fields: finalFields.join(','),
    access_token: accessToken,
    level: level,
    time_increment: timeIncrement.toString()
  });

  // Adicionar time_range ou date_preset
  if (timeRange) {
    params.append('time_range', JSON.stringify({
      since: timeRange.since,
      until: timeRange.until
    }));
  } else {
    params.append('date_preset', datePreset);
  }

  // Adicionar filtros se fornecidos
  if (filtering.length > 0) {
    params.append('filtering', JSON.stringify(filtering));
  }

  // Adicionar limite se fornecido
  if (limit) {
    params.append('limit', limit.toString());
  }

  // Construir URL
  const url = `${BASE_URL}/${targetId}/insights?${params}`;
  

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Erro ao buscar insights: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    

    return data.data || [];
  } catch (error) {
    console.error('📊 [fetchMetaInsights] ❌ Erro:', error);
    throw error;
  }
}