/**
 * SERVIÇO SEGURO PARA META API
 * 
 * Usa Edge Function proxy para fazer requisições à API Meta
 * SEM expor tokens criptografados ao frontend
 */

import { supabase } from '@/integrations/supabase/client';

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

export interface MetaInsight {
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  frequency: string;
  cpm: string;
  ctr: string;
  cpp?: string;
  cost_per_unique_click?: string;
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

class MetaSecureService {
  private edgeFunctionUrl = '';

  constructor() {
    // URL da Edge Function será resolvida automaticamente pelo Supabase
    this.edgeFunctionUrl = `${supabase.supabaseUrl}/functions/v1/meta-proxy`;
  }

  /**
   * SEGURANÇA: Faz requisição via Edge Function proxy
   * Token nunca é exposto ao frontend
   */
  private async callMetaProxy<T>(params: {
    userId: string;
    action: 'fetch_ad_accounts' | 'fetch_campaigns' | 'fetch_insights';
    params?: any;
  }): Promise<T> {
    try {
      console.log(`[MetaSecureService] Chamando proxy: ${params.action}`);

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`[MetaSecureService] Erro na API:`, error);
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[MetaSecureService] Sucesso: ${params.action}`);
      return data as T;

    } catch (error) {
      console.error(`[MetaSecureService] Erro ao chamar ${params.action}:`, error);
      throw error instanceof Error ? error : new Error('Erro desconhecido ao chamar Meta API');
    }
  }

  /**
   * Busca contas de anúncios do usuário
   * SEGURO: Usa proxy com token descriptografado
   */
  async fetchAdAccounts(userId: string): Promise<MetaAdAccount[]> {
    try {
      console.info('[MetaSecureService] Buscando ad accounts');

      const response = await this.callMetaProxy<{ data: MetaAdAccount[] }>({
        userId,
        action: 'fetch_ad_accounts',
        params: { limit: 100 }
      });

      console.info(`[MetaSecureService] ${response.data?.length || 0} ad accounts encontradas`);
      return response.data || [];

    } catch (error) {
      console.error('[MetaSecureService] Erro ao buscar ad accounts:', error);
      throw error;
    }
  }

  /**
   * Busca campanhas de uma conta específica
   * SEGURO: Usa proxy com token descriptografado
   */
  async fetchCampaigns(
    userId: string,
    adAccountId: string,
    options: {
      limit?: number;
      fields?: string[];
      searchTerm?: string;
      filtering?: any[];
    } = {}
  ): Promise<MetaCampaign[]> {
    try {
      console.info(`[MetaSecureService] Buscando campanhas da conta ${adAccountId}`);

      const response = await this.callMetaProxy<{ data: MetaCampaign[] }>({
        userId,
        action: 'fetch_campaigns',
        params: {
          adAccountId,
          limit: options.limit || 50,
          fields: options.fields,
          searchTerm: options.searchTerm,
          filtering: options.filtering
        }
      });

      console.info(`[MetaSecureService] ${response.data?.length || 0} campanhas encontradas`);
      return response.data || [];

    } catch (error) {
      console.error('[MetaSecureService] Erro ao buscar campanhas:', error);
      throw error;
    }
  }

  /**
   * Busca insights de uma campanha ou conta
   * SEGURO: Usa proxy com token descriptografado
   */
  async fetchInsights(
    userId: string,
    targetId: string,
    options: {
      fields?: string[];
      timeRange?: { since: string; until: string };
      datePreset?: string;
      level?: string;
      timeIncrement?: string;
      limit?: number;
      filtering?: any[];
    } = {}
  ): Promise<MetaInsight[]> {
    try {
      console.info(`[MetaSecureService] Buscando insights de ${targetId}`);

      const isAccount = targetId.startsWith('act_');
      const response = await this.callMetaProxy<{ data: MetaInsight[] }>({
        userId,
        action: 'fetch_insights',
        params: {
          [isAccount ? 'adAccountId' : 'campaignId']: targetId,
          fields: options.fields,
          timeRange: options.timeRange,
          datePreset: options.datePreset || 'last_30d',
          level: options.level || 'campaign',
          timeIncrement: options.timeIncrement || '1',
          limit: options.limit,
          filtering: options.filtering
        }
      });

      console.info(`[MetaSecureService] ${response.data?.length || 0} insights encontrados`);
      return response.data || [];

    } catch (error) {
      console.error('[MetaSecureService] Erro ao buscar insights:', error);
      throw error;
    }
  }
}

export const metaSecureService = new MetaSecureService();

