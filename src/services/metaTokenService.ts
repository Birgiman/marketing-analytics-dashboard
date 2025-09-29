/**
 * Meta Token Validation Service - SECURE VERSION
 * Agora usa Edge Functions seguras - NUNCA manipula tokens no frontend
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
  // REMOVIDO: access_token (nunca mais exposto no frontend)
  is_active: boolean;
  account_count: number;
  connected_at: string;
  last_validated_at?: string;
}

class MetaTokenService {
  // REMOVIDO: BASE_URL (não faz mais chamadas diretas ao Facebook)

  /**
   * SEGURANÇA: Conecta com token via Edge Function segura
   * NUNCA expõe o token - apenas envia para criptografia no servidor
   */
  async connectWithToken(userId: string, accessToken: string): Promise<MetaTokenValidation> {
    try {
      const response = await supabase.functions.invoke('meta-secure', {
        body: {
          action: 'connect',
          userId,
          accessToken
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro na conexão');
      }

      const result = response.data;
      if (result.status === 'error') {
        return {
          isValid: false,
          accountCount: 0,
          error: result.error
        };
      }

      return {
        isValid: true,
        accountCount: result.account_count || 0
        // user_info removido - não usado no frontend
      };

    } catch (error) {
      return {
        isValid: false,
        accountCount: 0,
        error: error instanceof Error ? error.message : 'Erro na validação do token'
      };
    }
  }

  /**
   * REMOVIDO: saveIntegration - agora integrado no connectWithToken
   * A Edge Function meta-secure já salva a integração de forma segura
   */

  /**
   * REMOVIDO: syncAdAccounts - agora feito pela Edge Function meta-secure
   */

  /**
   * SEGURANÇA: Busca status da integração via Edge Function segura
   * NUNCA retorna tokens - apenas status
   */
  async getUserIntegration(userId: string): Promise<MetaIntegration | null> {
    try {
      const response = await supabase.functions.invoke('meta-secure', {
        body: {
          action: 'status',
          userId
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao buscar status');
      }

      const result = response.data;
      if (result.status === 'disconnected') {
        return null;
      }

      // SEGURANÇA: Criar objeto MetaIntegration SEM token
      return {
        id: 'secure-integration', // ID fictício
        user_id: userId,
        // access_token: REMOVIDO - nunca exposto
        is_active: result.connected,
        account_count: result.account_count || 0,
        connected_at: result.connected_at || new Date().toISOString(),
        last_validated_at: result.last_validated_at || new Date().toISOString()
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * SEGURANÇA: Desconecta via Edge Function segura
   */
  async disconnectIntegration(userId: string): Promise<void> {
    try {
      const response = await supabase.functions.invoke('meta-secure', {
        body: {
          action: 'disconnect',
          userId
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao desconectar');
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * SEGURANÇA: Revalidação via Edge Function segura
   * NUNCA manipula tokens no frontend
   */
  async revalidateIntegration(integration: MetaIntegration): Promise<boolean> {
    try {
      // Simplesmente verifica o status atual via Edge Function
      const response = await supabase.functions.invoke('meta-secure', {
        body: {
          action: 'status',
          userId: integration.user_id
        }
      });

      if (response.error) {
        return false;
      }

      const result = response.data;
      return result.connected === true;

    } catch (error) {
      return false;
    }
  }
}

export const metaTokenService = new MetaTokenService();