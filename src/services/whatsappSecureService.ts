/**
 * WhatsApp Secure Service - SECURE VERSION
 * Usa Edge Functions seguras - NUNCA manipula tokens no frontend
 */

import { supabase } from "@/integrations/supabase/client";
import {
  WhatsAppInstance,
  CreateInstanceResponse,
  ConnectionStatusResponse,
  WhatsAppStatus
} from "@/types";

interface SecureInstanceResponse {
  success: boolean;
  status: WhatsAppStatus;
  instance_name?: string;
  qr_code?: string;
  error?: string;
}

class WhatsAppSecureService {
  /**
   * SEGURANÇA: Conectar via Edge Function segura
   * Token é criptografado automaticamente na Edge Function
   */
  async createWhatsAppInstance(userId: string): Promise<CreateInstanceResponse> {
    try {
      const response = await supabase.functions.invoke('whatsapp-secure', {
        body: {
          action: 'connect',
          userId
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro na conexão WhatsApp');
      }

      const result: SecureInstanceResponse = response.data;

      if (!result.success) {
        throw new Error(result.error || 'Falha ao conectar WhatsApp');
      }

      return {
        success: true,
        instance_name: result.instance_name || '',
        qr_code: result.qr_code
        // SEGURANÇA: Token nunca retornado para o frontend
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * SEGURANÇA: Gerar novo QR via Edge Function segura
   */
  async getInstanceQRCode(instanceName: string, userId: string): Promise<string> {
    try {
      const response = await supabase.functions.invoke('whatsapp-secure', {
        body: {
          action: 'refresh-qr',
          userId,
          instanceName
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar QR');
      }

      const result = response.data;
      return result.qr_code || '';

    } catch (error) {
      throw error;
    }
  }

  /**
   * SEGURANÇA: Verificar status via Edge Function segura
   */
  async checkConnectionStatus(instanceName: string, userId: string): Promise<ConnectionStatusResponse> {
    try {
      const response = await supabase.functions.invoke('whatsapp-secure', {
        body: {
          action: 'status',
          userId,
          instanceName
        }
      });

      if (response.error) {
        return {
          status: 'disconnected',
          connected: false
        };
      }

      const result = response.data;
      return {
        status: result.status || 'disconnected',
        connected: result.connected || false
      };

    } catch (error) {
      return {
        status: 'disconnected',
        connected: false
      };
    }
  }

  /**
   * SEGURANÇA: Desconectar via Edge Function segura
   */
  async disconnectInstance(instanceName: string, userId: string): Promise<boolean> {
    try {
      const response = await supabase.functions.invoke('whatsapp-secure', {
        body: {
          action: 'disconnect',
          userId,
          instanceName
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao desconectar');
      }

      return true;

    } catch (error) {
      throw error;
    }
  }

  /**
   * SEGURANÇA: Buscar instâncias do usuário SEM tokens
   * Apenas dados seguros expostos ao frontend
   */
  async getUserInstances(userId: string): Promise<WhatsAppInstance[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select(`
          id,
          user_id,
          instance_name,
          instance_id,
          status,
          qr_code,
          phone_number,
          created_at,
          updated_at
        `) // SEGURANÇA: api_token REMOVIDO da query
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data?.map(item => ({
        ...item,
        instance_id: item.instance_id ?? null,
        phone_number: item.phone_number ?? null,
        qr_code: item.qr_code ?? null,
        updated_at: item.updated_at ?? null,
        status: item.status as WhatsAppStatus
        // SEGURANÇA: api_token nunca incluído
      })) || [];

    } catch (error) {
      throw error;
    }
  }

  /**
   * Sincronizar status com Evolution API via Edge Function
   * Mantido para compatibilidade, mas agora usa Edge Function segura
   */
  async syncInstanceStatus(userId: string): Promise<void> {
    try {
      // Buscar todas as instâncias do usuário
      const instances = await this.getUserInstances(userId);

      // Verificar status de cada instância via Edge Function
      for (const instance of instances) {
        try {
          await this.checkConnectionStatus(instance.instance_name, userId);
          // Status é atualizado automaticamente pela Edge Function
        } catch (error) {
          // Se falhar, continuar com próxima instância
          console.warn(`Erro ao sincronizar instância ${instance.instance_name}:`, error);
        }
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualizar status da instância no Supabase
   * NOTA: Este método não deve ser usado diretamente pelo frontend
   * Apenas para compatibilidade interna
   */
  async updateInstanceStatus(instanceName: string, status: WhatsAppStatus, qrCode?: string): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };
      if (qrCode) updateData.qr_code = qrCode;

      await supabase
        .from('whatsapp_instances')
        .update(updateData)
        .eq('instance_name', instanceName);

    } catch (error) {
      throw error;
    }
  }

  /**
   * REMOVIDO: deleteInstance
   * Por questões de segurança, remoção deve ser feita via admin
   */

  /**
   * REMOVIDO: syncGroupsWithQueue, syncGroupsPaged
   * Estes métodos permanecem no serviço original para compatibilidade
   * Não envolvem manipulação de tokens sensíveis
   */
}

export const whatsappSecureService = new WhatsAppSecureService();