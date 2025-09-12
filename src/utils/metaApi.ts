/**
 * Meta API Utilities
 * Funções reutilizáveis para interação com Facebook Marketing API
 * Podem ser usadas em Lives, Campanhas, etc.
 */

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
 */
export async function fetchCampaigns(
  adAccountId: string, 
  accessToken: string,
  options: {
    limit?: number;
    status?: string[];
    fields?: string[];
  } = {}
): Promise<MetaCampaign[]> {
  const {
    limit = 25,
    status = ['ACTIVE', 'PAUSED'],
    fields = [
      'id', 'name', 'status', 'objective', 
      'daily_budget', 'lifetime_budget', 
      'start_time', 'stop_time', 
      'created_time', 'updated_time'
    ]
  } = options;

  const params = new URLSearchParams({
    fields: fields.join(','),
    access_token: accessToken,
    limit: limit.toString()
  });

  if (status.length > 0) {
    params.append('filtering', JSON.stringify([{
      field: 'status',
      operator: 'IN',
      value: status
    }]));
  }

  const response = await fetch(`${BASE_URL}/${adAccountId}/campaigns?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erro ao buscar campanhas');
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