/**
 * Meta Token Validation Service
 * Apenas valida tokens e gerencia conexões simples
 */

import { supabase } from '@/integrations/supabase/client';

export interface MetaTokenValidation {
  isValid: boolean;
  accountCount: number;
  userInfo?: {
    id: string;
    name: string;
  };
  error?: string;
}

export interface MetaIntegration {
  id: string;
  user_id: string;
  access_token: string;
  is_active: boolean;
  account_count: number;
  connected_at: string;
  last_validated_at?: string;
}

class MetaTokenService {
  private readonly BASE_URL = 'https://graph.facebook.com/v23.0';

  /**
   * Valida um token de acesso sem salvar dados pesados
   */
  async validateToken(accessToken: string): Promise<MetaTokenValidation> {
    try {
      // 1. Verificar se é um User Token válido
      const userResponse = await fetch(`${this.BASE_URL}/me?access_token=${accessToken}`);
      
      if (!userResponse.ok) {
        return {
          isValid: false,
          accountCount: 0,
          error: 'Token inválido ou expirado'
        };
      }

      const userData = await userResponse.json();

      // 2. Verificar se pode acessar ad accounts
      const adAccountsResponse = await fetch(
        `${this.BASE_URL}/me/adaccounts?fields=id,name&limit=1&access_token=${accessToken}`
      );

      if (!adAccountsResponse.ok) {
        const error = await adAccountsResponse.json();
        return {
          isValid: false,
          accountCount: 0,
          error: error.error?.message || 'Não foi possível acessar contas de anúncios'
        };
      }

      const adAccountsData = await adAccountsResponse.json();

      // 3. Contar total de contas
      const countResponse = await fetch(
        `${this.BASE_URL}/me/adaccounts?summary=1&access_token=${accessToken}`
      );
      
      let accountCount = 0;
      if (countResponse.ok) {
        const countData = await countResponse.json();
        accountCount = countData.data?.length || 0;
      }

      return {
        isValid: true,
        accountCount,
        userInfo: {
          id: userData.id,
          name: userData.name
        }
      };

    } catch (error) {

      return {
        isValid: false,
        accountCount: 0,
        error: 'Erro na validação do token'
      };
    }
  }

  /**
   * Salva uma integração válida no banco (apenas token + metadados)
   */
  async saveIntegration(userId: string, accessToken: string, validation: MetaTokenValidation): Promise<MetaIntegration> {
    try {
      const integrationData = {
        access_token: accessToken, // TODO: Encrypt in production
        is_active: true,
        account_count: validation.accountCount,
        connected_at: new Date().toISOString(),
        last_validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Primeiro, desativar todas as integrações existentes do usuário
      await supabase
        .from('meta_integrations')
        .update({ is_active: false })
        .eq('user_id', userId);

      // Verificar se já existe uma integração para este usuário
      const { data: existingIntegration } = await supabase
        .from('meta_integrations')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let result;
      if (existingIntegration) {
        // Atualizar integração existente
        const { data, error } = await supabase
          .from('meta_integrations')
          .update(integrationData)
          .eq('id', existingIntegration.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Criar nova integração
        const { data, error } = await supabase
          .from('meta_integrations')
          .insert({
            user_id: userId,
            ...integrationData
          })
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      // Também criar registros na tabela meta_ad_accounts para compatibilidade
      await this.syncAdAccounts(userId, accessToken);

      return result;

    } catch (error) {

      throw error;
    }
  }

  /**
   * Sincroniza contas de anúncios para compatibilidade com useMetaAds
   */
  private async syncAdAccounts(userId: string, accessToken: string): Promise<void> {
    try {
      // Buscar contas de anúncios do usuário
      const response = await fetch(`https://graph.facebook.com/v23.0/me/adaccounts?fields=id,name,currency,timezone_name&access_token=${accessToken}`);
      
      if (!response.ok) {

        return;
      }
      
      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {

        return;
      }
      
      // Desativar contas anteriores
      await supabase
        .from('meta_ad_accounts')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);
      
      // Inserir novas contas
      for (const account of data.data) {
        const adAccountData = {
          user_id: userId,
          ad_account_id: account.id,
          access_token: accessToken,
          account_name: account.name,
          currency: account.currency,
          timezone_name: account.timezone_name,
          is_active: true,
          last_sync_at: new Date().toISOString()
        };
        
        await supabase
          .from('meta_ad_accounts')
          .upsert(adAccountData, { 
            onConflict: 'user_id,ad_account_id',
            ignoreDuplicates: false 
          });
      }
      
      
    } catch (error) {

      // Não falhar a integração por causa disso
    }
  }

  /**
   * Busca integração ativa do usuário
   */
  async getUserIntegration(userId: string): Promise<MetaIntegration | null> {
    try {
      // Buscar todas as integrações do usuário e pegar a mais recente
      const { data, error } = await supabase
        .from('meta_integrations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return null;
      }

      const integration = data[0];
      
      // Se a integração mais recente não está ativa, retornar null
      if (!integration.is_active) {
        return null;
      }

      return integration;

    } catch (error) {

      return null;
    }
  }

  /**
   * Desconecta integração
   */
  async disconnectIntegration(userId: string): Promise<void> {
    try {
      // Desativar TODAS as integrações do usuário (não apenas as ativas)
      await supabase
        .from('meta_integrations')
        .update({ is_active: false })
        .eq('user_id', userId);

      // Desativar contas de anúncios para compatibilidade
      await supabase
        .from('meta_ad_accounts')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

    } catch (error) {

      throw error;
    }
  }

  /**
   * Re-valida token existente
   */
  async revalidateIntegration(integration: MetaIntegration): Promise<boolean> {
    try {
      const validation = await this.validateToken(integration.access_token);
      
      if (!validation.isValid) {
        // Token inválido - desativar integração
        await this.disconnectIntegration(integration.user_id);
        return false;
      }

      // Atualizar timestamp de validação na integração mais recente
      await supabase
        .from('meta_integrations')
        .update({ 
          last_validated_at: new Date().toISOString(),
          account_count: validation.accountCount,
          is_active: true // Garantir que está ativa
        })
        .eq('user_id', integration.user_id)
        .order('created_at', { ascending: false })
        .limit(1);

      return true;

    } catch (error) {

      return false;
    }
  }
}

export const metaTokenService = new MetaTokenService();