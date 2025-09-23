/**
 * Meta API for LiveShop Integration
 * Substitui dados mockados da tabela 'creatives' com dados reais do Meta Ads
 */

import { supabase } from '@/integrations/supabase/client';
import {
  fetchAdAccounts,
  fetchCampaigns,
  extractLeads,
  formatMetaCurrency,
  type MetaInsight
} from './metaApi';

// Interface para dados formatados da tabela de creativos
interface CreativeTableData {
  id: string;
  day: string;
  campaign_name: string;
  ad_set_name: string;
  ad_name: string;
  amount_spent: number;
  leads: number;
  cpl: number;
  quality_score?: number;
  thumb_url?: string;
  impressions?: number;
  clicks?: number;
  reach?: number;
  frequency?: number;
  cpm?: string;
  ctr?: string;
  cpp?: string;
  cost_per_unique_click?: string;
}

const BASE_URL = 'https://graph.facebook.com/v23.0';

export interface LiveCampaignData {
  campaign_name: string;
  ad_set_name: string | null;
  ad_name: string;
  amount_spent: number; // em centavos para compatibilidade
  leads: number;
  cost_per_lead: number; // em centavos
  impressions: number;
  day: string; // YYYY-MM-DD
  date_start: string;
  date_stop: string;
}

/**
 * Busca token do usuário no Supabase
 */
export async function getUserMetaToken(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('meta_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log('No Meta integration found for user:', userId);
      return null;
    }

    return data.access_token;
  } catch (error) {
    console.error('Error fetching user Meta token:', error);
    return null;
  }
}

/**
 * Busca dados de campanhas formatados para substituir tabela 'creatives'
 * SUBSTITUI: SELECT * FROM creatives WHERE user_id = ?
 */
export async function fetchLiveCampaignData(
  userId: string,
  options: {
    dateRange?: { since: string; until: string };
    campaignIds?: string[];
    limit?: number;
  } = {}
): Promise<LiveCampaignData[]> {
  try {
    // 1. Buscar token do usuário
    const accessToken = await getUserMetaToken(userId);
    if (!accessToken) {
      console.log('No Meta token found for user, returning empty data');
      return [];
    }

    // 2. Buscar contas do usuário
    const adAccounts = await fetchAdAccounts(accessToken);
    if (adAccounts.length === 0) {
      console.log('No ad accounts found for user');
      return [];
    }

    const liveData: LiveCampaignData[] = [];

    // 3. Para cada conta, buscar campanhas e insights
    for (const account of adAccounts) {
      try {
        // Buscar campanhas da conta
        const campaigns = await fetchCampaigns(account.id, accessToken, {
          limit: options.limit || 25,
          status: ['ACTIVE', 'PAUSED'],
          fields: ['id', 'name', 'status', 'created_time', 'updated_time']
        });

        if (campaigns.length === 0) continue;

        // Filtrar campanhas se especificadas
        const campaignsToFetch = options.campaignIds 
          ? campaigns.filter(c => options.campaignIds!.includes(c.id))
          : campaigns;

        // Para cada campanha, buscar Ad Sets e Ads
        for (const campaign of campaignsToFetch) {
          try {
            // Buscar Ad Sets da campanha
            const adSets = await fetchAdSets(campaign.id, accessToken, {
              fields: ['id', 'name', 'status']
            });

            for (const adSet of adSets) {
              // Buscar Ads do Ad Set
              const ads = await fetchAds(adSet.id, accessToken, {
                fields: ['id', 'name', 'status']
              });

              for (const ad of ads) {
                // Buscar insights do Ad
                const insights = await fetchAdInsights(ad.id, accessToken, {
                  dateRange: options.dateRange,
                  fields: [
                    'impressions', 'clicks', 'spend', 'reach', 
                    'frequency', 'actions', 'cpm', 'ctr'
                  ]
                });

                // Processar insights
                for (const insight of insights) {
                  const leads = extractLeads(insight.actions);
                  const spend = formatMetaCurrency(insight.spend || '0');
                  const costPerLead = leads > 0 ? Math.round(spend / leads) : 0;

                  liveData.push({
                    campaign_name: campaign.name,
                    ad_set_name: adSet.name,
                    ad_name: ad.name,
                    amount_spent: spend,
                    leads,
                    cost_per_lead: costPerLead,
                    impressions: parseInt(insight.impressions || '0'),
                    day: insight.date_start,
                    date_start: insight.date_start,
                    date_stop: insight.date_stop
                  });
                }
              }
            }
          } catch (campaignError) {
            console.warn(`Error processing campaign ${campaign.id}:`, campaignError);
          }
        }
      } catch (accountError) {
        console.warn(`Error processing account ${account.id}:`, accountError);
      }
    }

    console.log(`Fetched ${liveData.length} campaign records for user ${userId}`);
    return liveData;

  } catch (error) {
    console.error('Error in fetchLiveCampaignData:', error);
    return [];
  }
}

/**
 * Busca Ad Sets de uma campanha
 */
export async function fetchAdSets(
  campaignId: string,
  accessToken: string,
  options: {
    fields?: string[];
    limit?: number;
  } = {}
): Promise<Array<{ id: string; name: string; status: string }>> {
  const {
    fields = ['id', 'name', 'status'],
    limit = 25
  } = options;

  const params = new URLSearchParams({
    fields: fields.join(','),
    access_token: accessToken,
    limit: limit.toString()
  });

  const response = await fetch(`${BASE_URL}/${campaignId}/adsets?${params}`);

  if (!response.ok) {
    throw new Error(`Error fetching ad sets: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Busca Ads de um Ad Set
 */
export async function fetchAds(
  adSetId: string,
  accessToken: string,
  options: {
    fields?: string[];
    limit?: number;
  } = {}
): Promise<Array<{ id: string; name: string; status: string }>> {
  const {
    fields = ['id', 'name', 'status'],
    limit = 25
  } = options;

  const params = new URLSearchParams({
    fields: fields.join(','),
    access_token: accessToken,
    limit: limit.toString()
  });

  const response = await fetch(`${BASE_URL}/${adSetId}/ads?${params}`);

  if (!response.ok) {
    throw new Error(`Error fetching ads: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Busca insights de um Ad específico
 */
export async function fetchAdInsights(
  adId: string,
  accessToken: string,
  options: {
    dateRange?: { since: string; until: string };
    datePreset?: string;
    fields?: string[];
  } = {}
): Promise<MetaInsight[]> {
  const {
    datePreset = 'last_30d',
    fields = [
      'impressions', 'clicks', 'spend', 'reach', 
      'frequency', 'actions', 'cpm', 'ctr'
    ]
  } = options;

  const params = new URLSearchParams({
    fields: fields.join(','),
    access_token: accessToken
  });

  if (options.dateRange) {
    params.append('time_range', JSON.stringify({
      since: options.dateRange.since,
      until: options.dateRange.until
    }));
  } else {
    params.append('date_preset', datePreset);
  }

  const response = await fetch(`${BASE_URL}/${adId}/insights?${params}`);

  if (!response.ok) {
    console.warn(`Error fetching insights for ad ${adId}: ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Helper: Formata dados para serem compatíveis com a estrutura atual
 * Permite migração gradual sem quebrar a interface existente
 */
export function formatForCreativesTable(data: LiveCampaignData[]): CreativeTableData[] {
  return data.map((item, index) => ({
    id: `meta_${index}`,
    day: item.day,
    campaign_name: item.campaign_name,
    ad_set_name: item.ad_set_name || '', // Garantir que não seja null
    ad_name: item.ad_name,
    amount_spent: item.amount_spent,
    leads: item.leads,
    cpl: item.cost_per_lead,
    creative_link: null,
    created_at: new Date().toISOString(),
    user_id: null // será preenchido pelo componente
  }));
}

/**
 * Função principal para substituir queries da tabela creatives
 * USO: const creatives = await getCreativesData(userId);
 */
export async function getCreativesData(
  userId: string,
  options: {
    dateRange?: { since: string; until: string };
    campaignIds?: string[];
  } = {}
) {
  const liveData = await fetchLiveCampaignData(userId, options);
  return formatForCreativesTable(liveData);
}

// Função removida - não usar dados de fallback em produção