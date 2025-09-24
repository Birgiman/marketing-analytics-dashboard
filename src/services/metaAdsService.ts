/**
 * Meta Ads API Service
 * Gerencia integração com Facebook Marketing API
 */

import { supabase } from '@/integrations/supabase/client';
import { MetaAction } from '@/types/live';

export interface MetaAdAccount {
  ad_account_id: string;
  account_name: string;
  currency: string;
  timezone_name: string;
  access_token: string;
  last_sync_at?: string;
}

export interface MetaCampaign {
  campaign_id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: number | null;
  lifetime_budget?: number | null;
  start_time?: string;
  stop_time?: string;
  created_time: string;
  updated_time: string;
}

export interface MetaInsights {
  impressions: number;
  clicks: number;
  spend: number; // em centavos
  reach: number;
  frequency: number;
  leads: number;
  conversions: number;
  cost_per_lead: number;
  cost_per_click: number;
  cpm: number;
  ctr: number;
  date_start: string;
  date_stop: string;
}

class MetaAdsService {
  private readonly BASE_URL = 'https://graph.facebook.com/v23.0';
  
  /**
   * Valida e salva um novo token de acesso
   */
  async validateAndSaveToken(accessToken: string, userId: string): Promise<MetaAdAccount[]> {
    try {
      // 1. Validar token e buscar contas de anúncios
      const response = await fetch(`${this.BASE_URL}/me/adaccounts?fields=id,name,currency,timezone_name&access_token=${accessToken}`);
      
      if (!response.ok) {
        throw new Error('Token inválido ou expirado');
      }
      
      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error('Nenhuma conta de anúncios encontrada');
      }
      
      const adAccounts: MetaAdAccount[] = [];
      
      // 2. Salvar cada conta no banco
      for (const account of data.data) {
        const adAccountData = {
          user_id: userId,
          ad_account_id: account.id,
          access_token: accessToken, // TODO: Encrypt this in production
          account_name: account.name,
          currency: account.currency,
          timezone_name: account.timezone_name,
          is_active: true,
          last_sync_at: new Date().toISOString()
        };
        
        // Upsert (insert or update)
        const { error } = await supabase
          .from('meta_ad_accounts')
          .upsert(adAccountData, { 
            onConflict: 'user_id,ad_account_id',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error('Error saving ad account:', error);
          throw error;
        }
        
        adAccounts.push(adAccountData);
      }
      
      return adAccounts;
      
    } catch (error) {
      console.error('Error validating Meta token:', error);
      throw error;
    }
  }
  
  /**
   * Busca campanhas de uma conta específica
   */
  async fetchCampaigns(adAccountId: string, accessToken: string, userId: string): Promise<MetaCampaign[]> {
    try {
      const url = `${this.BASE_URL}/${adAccountId}/campaigns`;
      const params = new URLSearchParams({
        fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time',
        access_token: accessToken,
        limit: '100'
      });
      
      const response = await fetch(`${url}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching campaigns: ${response.statusText}`);
      }
      
      const data = await response.json();
      const campaigns: MetaCampaign[] = [];
      
      // Salvar campanhas no banco
      for (const campaign of data.data || []) {
        const campaignData = {
          user_id: userId,
          ad_account_id: adAccountId,
          campaign_id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          daily_budget: campaign.daily_budget ? parseInt(campaign.daily_budget) : null,
          lifetime_budget: campaign.lifetime_budget ? parseInt(campaign.lifetime_budget) : null,
          start_time: campaign.start_time || null,
          stop_time: campaign.stop_time || null,
          created_time: campaign.created_time,
          updated_time: campaign.updated_time,
          last_fetched_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('meta_campaigns')
          .upsert(campaignData, { 
            onConflict: 'user_id,campaign_id',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error('Error saving campaign:', error);
          continue;
        }
        
        campaigns.push(campaignData);
      }
      
      await this.logSync(userId, adAccountId, 'campaigns', 'success', campaigns.length);
      
      return campaigns;
      
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      await this.logSync(userId, adAccountId, 'campaigns', 'error', 0, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  
  /**
   * Busca insights/métricas para campanhas
   */
  async fetchInsights(
    campaignIds: string[], 
    accessToken: string, 
    userId: string, 
    dateStart: string = '30d', 
    dateStop: string = 'today'
  ): Promise<MetaInsights[]> {
    try {
      const insights: MetaInsights[] = [];
      
      // Buscar insights para cada campanha
      for (const campaignId of campaignIds) {
        const url = `${this.BASE_URL}/${campaignId}/insights`;
        const params = new URLSearchParams();
        
        params.append('fields', 'impressions,clicks,spend,reach,frequency,actions,cost_per_action_type,cpm,ctr');
        params.append('access_token', accessToken);
        params.append('level', 'campaign');
        
        if (dateStart === '30d') {
          params.append('date_preset', 'last_30d');
        } else {
          params.append('time_range', JSON.stringify({since: dateStart, until: dateStop}));
        }
        
        const response = await fetch(`${url}?${params}`);
        
        if (!response.ok) {
          console.error(`Error fetching insights for campaign ${campaignId}:`, response.statusText);
          continue;
        }
        
        const data = await response.json();
        
        for (const insight of data.data || []) {
          // Extrair leads das actions
          const leads = this.extractLeadsFromActions(insight.actions);
          const conversions = this.extractConversionsFromActions(insight.actions);
          
          const insightData = {
            user_id: userId,
            campaign_id: campaignId,
            date_start: insight.date_start,
            date_stop: insight.date_stop,
            impressions: parseInt(insight.impressions) || 0,
            clicks: parseInt(insight.clicks) || 0,
            spend: Math.round(parseFloat(insight.spend) * 100) || 0, // converter para centavos
            reach: parseInt(insight.reach) || 0,
            frequency: parseFloat(insight.frequency) || 0,
            leads,
            conversions,
            cost_per_lead: leads > 0 ? Math.round((parseFloat(insight.spend) * 100) / leads) : 0,
            cost_per_click: parseInt(insight.clicks) > 0 ? Math.round((parseFloat(insight.spend) * 100) / parseInt(insight.clicks)) : 0,
            cpm: Math.round(parseFloat(insight.cpm) * 100) || 0,
            ctr: parseFloat(insight.ctr) || 0,
            raw_data: insight,
            fetched_at: new Date().toISOString()
          };
          
          const { error } = await supabase
            .from('meta_insights')
            .upsert(insightData, { 
              onConflict: 'user_id,campaign_id,adset_id,ad_id,date_start,date_stop',
              ignoreDuplicates: false 
            });
          
          if (error) {
            console.error('Error saving insights:', error);
            continue;
          }
          
          insights.push(insightData);
        }
      }
      
      await this.logSync(userId, null, 'insights', 'success', insights.length);
      
      return insights;
      
    } catch (error) {
      console.error('Error fetching insights:', error);
      await this.logSync(userId, null, 'insights', 'error', 0, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  
  /**
   * Sincronização completa de uma conta
   */
  async fullSync(userId: string, adAccountId?: string): Promise<void> {
    try {
      // 1. Verificar se a integração está ativa (pegar a mais recente)
      const { data: integrations } = await supabase
        .from('meta_integrations')
        .select('is_active')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!integrations || integrations.length === 0 || !integrations[0].is_active) {
        throw new Error('Integração Meta Ads não está ativa');
      }
      
      // 2. Buscar contas ativas do usuário
      let accounts;
      if (adAccountId) {
        const { data } = await supabase
          .from('meta_ad_accounts')
          .select('*')
          .eq('user_id', userId)
          .eq('id', adAccountId)
          .eq('is_active', true);
        accounts = data;
      } else {
        const { data } = await supabase
          .from('meta_ad_accounts')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true);
        accounts = data;
      }
      
      if (!accounts || accounts.length === 0) {
        throw new Error('Nenhuma conta Meta Ads ativa encontrada');
      }
      
      for (const account of accounts) {
        // 2. Buscar campanhas
        const campaigns = await this.fetchCampaigns(
          account.ad_account_id, 
          account.access_token, 
          userId
        );
        
        // 3. Buscar insights das campanhas
        if (campaigns.length > 0) {
          const campaignIds = campaigns.map(c => c.campaign_id);
          await this.fetchInsights(
            campaignIds, 
            account.access_token, 
            userId
          );
        }
        
        // 4. Atualizar timestamp da última sincronização
        await supabase
          .from('meta_ad_accounts')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', account.id);
      }
      
    } catch (error) {
      console.error('Error in full sync:', error);
      throw error;
    }
  }
  
  /**
   * Buscar dados salvos do usuário
   */
  async getUserData(userId: string) {
    try {
      // Primeiro verificar se a integração está ativa (pegar a mais recente)
      const { data: integrations } = await supabase
        .from('meta_integrations')
        .select('is_active')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      // Se não há integração ou não está ativa, retornar dados vazios
      if (!integrations || integrations.length === 0 || !integrations[0].is_active) {
        return {
          accounts: [],
          campaigns: [],
          insights: [],
          logs: []
        };
      }
      
      // Contas
      const { data: accounts } = await supabase
        .from('meta_ad_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      // Campanhas
      const { data: campaigns } = await supabase
        .from('meta_campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_time', { ascending: false });
      
      // Insights resumido (últimos 30 dias)
      const { data: insights } = await supabase
        .from('meta_insights')
        .select('*')
        .eq('user_id', userId)
        .gte('date_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      
      // Logs recentes
      const { data: logs } = await supabase
        .from('meta_sync_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      return {
        accounts: accounts || [],
        campaigns: campaigns || [],
        insights: insights || [],
        logs: logs || []
      };
      
    } catch (error) {
      console.error('[MetaAdsService] Error fetching user data:', error);
      throw error;
    }
  }
  
  /**
   * Desconectar integração Meta Ads
   */
  async disconnectIntegration(userId: string): Promise<void> {
    try {
      // Desativar integração
      const { error: integrationError } = await supabase
        .from('meta_integrations')
        .update({ is_active: false })
        .eq('user_id', userId);
      
      if (integrationError) {
        console.error('Error deactivating integration:', integrationError);
        throw integrationError;
      }
      
      // Desativar todas as contas de anúncios do usuário
      const { error: accountsError } = await supabase
        .from('meta_ad_accounts')
        .update({ is_active: false })
        .eq('user_id', userId);
      
      if (accountsError) {
        console.error('Error deactivating ad accounts:', accountsError);
        throw accountsError;
      }
      
      console.info('[MetaAdsService] Integration disconnected successfully');
      
    } catch (error) {
      console.error('[MetaAdsService] Error disconnecting integration:', error);
      throw error;
    }
  }
  
  /**
   * Helpers privados
   */
  private extractLeadsFromActions(actions: MetaAction[]): number {
    if (!actions) return 0;
    const leadAction = actions.find(action => 
      action.action_type === 'lead' || 
      action.action_type === 'submit_application' ||
      action.action_type === 'complete_registration'
    );
    return leadAction ? parseInt(leadAction.value) : 0;
  }
  
  private extractConversionsFromActions(actions: MetaAction[]): number {
    if (!actions) return 0;
    const conversionActions = actions.filter(action => 
      action.action_type.includes('conversion') ||
      action.action_type === 'purchase' ||
      action.action_type === 'add_to_cart'
    );
    return conversionActions.reduce((sum, action) => sum + parseInt(action.value), 0);
  }
  
  private async logSync(
    userId: string, 
    adAccountId: string | null, 
    syncType: string, 
    status: 'success' | 'error', 
    recordsProcessed: number = 0, 
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase
        .from('meta_sync_logs')
        .insert({
          user_id: userId,
          ad_account_id: adAccountId,
          sync_type: syncType,
          status,
          records_processed: recordsProcessed,
          records_created: status === 'success' ? recordsProcessed : 0,
          error_message: errorMessage,
          completed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging sync:', error);
    }
  }
}

export const metaAdsService = new MetaAdsService();