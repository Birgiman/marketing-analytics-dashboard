import { supabase } from "@/integrations/supabase/client";
import { 
  WhatsAppInstance, 
  CreateInstanceResponse, 
  ConnectionStatusResponse,
  WhatsAppStatus 
} from "@/types";

class WhatsAppService {
  // Gerar nome da instância baseado no perfil do usuário
  private async generateInstanceName(userId: string): Promise<{ instanceName: string; fullName: string }> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        throw new Error('Perfil do usuário não encontrado');
      }

      const fullName = `${profile.first_name} ${profile.last_name}`;
      const instanceName = `liveshop_${profile.first_name}_${profile.last_name}`
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      return { instanceName, fullName };
    } catch (error) {
      console.error('Erro ao gerar nome da instância:', error);
      throw error;
    }
  }

  // Chamar Edge Function para interagir com Evolution API
  private async callEvolutionAPI(action: string, data: any) {
    try {
      const requestBody = { action, ...data };

      const response = await supabase.functions.invoke('whatsapp-api', {
        body: requestBody
      });

      console.log('Response error:', response.error);
      console.log('Response data:', response.data);

      if (response.error) {
        console.error('Edge Function retornou erro:', response.error);
        throw new Error(response.error.message || 'Erro na API WhatsApp');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao chamar Evolution API:', error);
      throw error;
    }
  }

  // Verificar se instância existe na Evolution API
  private async checkInstanceExists(instanceName: string, userId: string): Promise<boolean> {
    try {
      const result = await this.callEvolutionAPI('check_instance_exists', {
        instanceName,
        userId
      });
      
      return result.exists || false;
    } catch (error) {
      console.error('Erro ao verificar existência da instância:', error);
      return false;
    }
  }

  // Criar nova instância WhatsApp automaticamente usando perfil
  async createWhatsAppInstance(userId: string): Promise<CreateInstanceResponse> {
    try {

      // Gerar nome da instância baseado no perfil
      const { instanceName, fullName } = await this.generateInstanceName(userId);
      

      // PASSO 1: Verificar se instância existe na Evolution API (FONTE DA VERDADE)
      const instanceExistsInAPI = await this.checkInstanceExists(instanceName, userId);

      let result;
      
      if (instanceExistsInAPI) {
        // Instância existe na Evolution API - usar reconnect
        console.log('4. Instância existe na API - fazendo reconnect...');
        console.log('5. Aguardando 1s antes de reconectar...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        result = await this.callEvolutionAPI('reconnect_instance', {
          instanceName,
          userId,
          profileData: { fullName }
        });
      } else {
        // Instância NÃO existe na Evolution API - criar nova
        console.log('4. Instância NÃO existe na API - criando nova...');
        result = await this.callEvolutionAPI('create_instance', {
          instanceName,
          userId,
          profileData: { fullName }
        });
      }

      if (!result.success) {
        throw new Error(result.error || 'Falha ao criar/conectar instância');
      }

      // PASSO 2: Verificar se já existe no banco local para update/insert
      console.log('5. Verificando se instância existe no banco local...');
      const { data: existingInstance, error: queryError } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', userId)
        .eq('instance_name', instanceName)
        .single();

      // Log detalhado sobre instância existente
      if (existingInstance && !queryError) {
        console.log('5.1. Instância encontrada no banco local:', {
          id: existingInstance.id,
          status: existingInstance.status,
          has_token: !!existingInstance.api_token,
          created_at: existingInstance.created_at,
          updated_at: existingInstance.updated_at
        });
        console.log('5.2. Sobrescrevendo dados da instância existente...');
      } else if (queryError?.code === 'PGRST116') {
        console.log('5.1. Nenhuma instância encontrada no banco local - criando nova');
      } else if (queryError) {
        console.error('5.1. Erro ao consultar banco local:', queryError);
      }

      let instance, supabaseError;
      
      if (existingInstance && !queryError) {
        // Atualizar instância existente no banco (SEMPRE SOBRESCREVER)
        console.log('6. Atualizando instância existente no banco...');
        const updateData: any = {
          instance_id: result.instance?.instanceId,
          status: result.qrCode ? 'pending-qr' : 'connecting',
          qr_code: result.qrCode,
          updated_at: new Date().toISOString()
        };
        
        // SEMPRE atualizar o token se disponível (sobrescrevendo o anterior)
        if (result.token) {
          updateData.api_token = result.token;
          console.log('6.1. Token atualizado na instância existente (sobrescrevendo anterior)');
        }
        
        console.log('6.2. Dados que serão atualizados:', {
          instance_id: updateData.instance_id,
          status: updateData.status,
          has_qr: !!updateData.qr_code,
          has_token: !!updateData.api_token
        });
        
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .update(updateData)
          .eq('user_id', userId)
          .eq('instance_name', instanceName)
          .select()
          .single();
          
        instance = data;
        supabaseError = error;
      } else {
        // Criar nova instância no banco
        console.log('6. Criando nova instância no banco...');
        const insertData: any = {
          user_id: userId,
          instance_name: instanceName,
          instance_id: result.instance?.instanceId,
          status: result.qrCode ? 'pending-qr' : 'connecting',
          qr_code: result.qrCode
        };
        
        // Adicionar token se disponível na resposta
        if (result.token) {
          insertData.api_token = result.token;
          console.log('6.1. Token incluído na criação da nova instância');
        }
        
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .insert(insertData)
          .select()
          .single();
          
        instance = data;
        supabaseError = error;
      }

      if (supabaseError) {
        console.error('Erro ao salvar instância no Supabase:', supabaseError);
        throw new Error('Falha ao salvar instância no banco de dados');
      }

      console.log('7. Instância processada com sucesso');
      console.log('8. QR Code presente:', !!result.qrCode);

      return {
        success: true,
        instance_name: instanceName,
        qr_code: result.qrCode
      };
    } catch (error) {
      console.error('Erro ao criar instância WhatsApp:', error);
      throw error;
    }
  }

  // Obter QR code da instância
  async getInstanceQRCode(instanceName: string, userId: string): Promise<string> {
    try {
      const result = await this.callEvolutionAPI('get_qr', {
        instanceName,
        userId
      });

      return result.qrCode || '';
    } catch (error) {
      console.error('Erro ao obter QR code:', error);
      throw error;
    }
  }

  // Verificar status de conexão
  async checkConnectionStatus(instanceName: string, userId: string): Promise<ConnectionStatusResponse> {
    try {
      const result = await this.callEvolutionAPI('check_status', {
        instanceName,
        userId
      });

      return {
        status: result.status || 'disconnected',
        connected: result.connected || false
      };
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      throw error;
    }
  }

  // Desconectar instância
  async disconnectInstance(instanceName: string, userId: string): Promise<boolean> {
    try {
      // Desconectar via API
      await this.callEvolutionAPI('disconnect', {
        instanceName,
        userId
      });

      // Atualizar status no Supabase
      await supabase
        .from('whatsapp_instances')
        .update({ status: 'disconnected' })
        .eq('instance_name', instanceName);

      return true;
    } catch (error) {
      console.error('Erro ao desconectar instância:', error);
      throw error;
    }
  }

  // Deletar instância completamente
  async deleteInstance(instanceName: string, userId: string): Promise<boolean> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', userId)
        .single();

      const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown User';

      // Deletar via API e banco através do Edge Function
      await this.callEvolutionAPI('delete_instance', {
        instanceName,
        userId,
        profileData: { fullName }
      });

      return true;
    } catch (error) {
      console.error('Erro ao deletar instância:', error);
      throw error;
    }
  }

  // Buscar instâncias do usuário
  async getUserInstances(userId: string): Promise<WhatsAppInstance[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar instâncias:', error);
        throw error;
      }

      return data?.map(item => ({
        ...item,
        instance_id: item.instance_id ?? null,
        phone_number: item.phone_number ?? null,
        qr_code: item.qr_code ?? null,
        updated_at: item.updated_at ?? null,
        status: item.status as WhatsAppStatus
      })) || [];
    } catch (error) {
      console.error('Erro ao buscar instâncias do usuário:', error);
      throw error;
    }
  }

  // Sincronizar status com Evolution API e atualizar banco
  async syncInstanceStatus(userId: string): Promise<void> {
    try {
      
      // Buscar instâncias no banco local
      const { data: localInstances, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao buscar instâncias locais:', error);
        return;
      }

      if (!localInstances || localInstances.length === 0) {
        console.log('Nenhuma instância local encontrada');
        return;
      }

      // Para cada instância local, verificar status na Evolution API
      for (const localInstance of localInstances) {
        try {
          console.log(`Verificando status da instância: ${localInstance.instance_name}`);
          
          // Verificar se ainda existe na Evolution API
          const existsInAPI = await this.checkInstanceExists(localInstance.instance_name, userId);
          
          if (!existsInAPI) {
            // Instância não existe mais na API - marcar como desconectada
            console.log(`Instância ${localInstance.instance_name} não existe mais na API`);
            await this.updateInstanceStatus(localInstance.instance_name, 'disconnected');
            continue;
          }

          // Se existe, verificar status atual
          const statusResponse = await this.checkConnectionStatus(localInstance.instance_name, userId);
          const apiStatus: WhatsAppStatus = statusResponse.connected ? 'connected' : 'disconnected';
          
          console.log(`Status da API: ${apiStatus}, Status local: ${localInstance.status}`);
          
          // Se status mudou, atualizar no banco
          if (apiStatus !== localInstance.status) {
            console.log(`Atualizando status de ${localInstance.status} para ${apiStatus}`);
            await this.updateInstanceStatus(localInstance.instance_name, apiStatus);
          }
          
        } catch (instanceError) {
          console.error(`Erro ao verificar instância ${localInstance.instance_name}:`, instanceError);
          // Em caso de erro, assumir desconectado
          if (localInstance.status !== 'disconnected') {
            await this.updateInstanceStatus(localInstance.instance_name, 'disconnected');
          }
        }
      }
      
      console.log('=== SINCRONIZAÇÃO CONCLUÍDA ===');
    } catch (error) {
      console.error('Erro na sincronização de status:', error);
      throw error;
    }
  }

  // Atualizar status da instância no Supabase
  async updateInstanceStatus(instanceName: string, status: WhatsAppStatus, qrCode?: string): Promise<void> {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (qrCode) updateData.qr_code = qrCode;

      await supabase
        .from('whatsapp_instances')
        .update(updateData)
        .eq('instance_name', instanceName);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw error;
    }
  }
}

export const whatsappService = new WhatsAppService();