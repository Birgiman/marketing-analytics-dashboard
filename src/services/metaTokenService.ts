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
      console.error('Error validating Meta token:', error);
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
        user_id: userId,
        access_token: accessToken, // TODO: Encrypt in production
        is_active: true,
        account_count: validation.accountCount,
        connected_at: new Date().toISOString(),
        last_validated_at: new Date().toISOString()
      };

      // Upsert (desativar integração anterior se existir)
      await supabase
        .from('meta_integrations')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('meta_integrations')
        .insert(integrationData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      console.error('Error saving Meta integration:', error);
      throw error;
    }
  }

  /**
   * Busca integração ativa do usuário
   */
  async getUserIntegration(userId: string): Promise<MetaIntegration | null> {
    try {
      const { data, error } = await supabase
        .from('meta_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return data;

    } catch (error) {
      console.error('Error fetching user integration:', error);
      return null;
    }
  }

  /**
   * Desconecta integração
   */
  async disconnectIntegration(userId: string): Promise<void> {
    try {
      await supabase
        .from('meta_integrations')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

    } catch (error) {
      console.error('Error disconnecting integration:', error);
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

      // Atualizar timestamp de validação
      await supabase
        .from('meta_integrations')
        .update({ 
          last_validated_at: new Date().toISOString(),
          account_count: validation.accountCount
        })
        .eq('id', integration.id);

      return true;

    } catch (error) {
      console.error('Error revalidating integration:', error);
      return false;
    }
  }
}

export const metaTokenService = new MetaTokenService();