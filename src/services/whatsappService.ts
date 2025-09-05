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
      console.log('=== WHATSAPP SERVICE DEBUG ===');
      console.log('Action sendo enviada:', action);
      console.log('Data sendo enviada:', JSON.stringify(data, null, 2));
      
      const requestBody = { action, ...data };
      console.log('Request body completo:', JSON.stringify(requestBody, null, 2));

      const response = await supabase.functions.invoke('whatsapp-api', {
        body: requestBody
      });

      console.log('Response status:', response.status);
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

  // Criar nova instância WhatsApp automaticamente usando perfil
  async createWhatsAppInstance(userId: string): Promise<CreateInstanceResponse> {
    try {
      console.log('=== WHATSAPP CONNECTION DEBUG ===');
      console.log('1. Iniciando conexão de instância...');
      console.log('User ID:', userId);

      // Gerar nome da instância baseado no perfil
      const { instanceName, fullName } = await this.generateInstanceName(userId);
      
      console.log('User:', fullName);
      console.log('Instance Name:', instanceName);

      // Verificar se já existe uma instância no banco
      console.log('2. Verificando se instância já existe no banco...');
      const { data: existingInstance, error: queryError } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', userId)
        .eq('instance_name', instanceName)
        .single();

      console.log('3. Erro na query:', queryError);
      console.log('4. Instância encontrada:', existingInstance);

      let result;
      
      // Aguardar um pouco para garantir que a desconexão foi processada
      if (existingInstance && !queryError) {
        // Instância já existe - usar connect para reconectar
        console.log('5. Instância existente encontrada - reconectando...');
        console.log('6. Status da instância existente:', existingInstance.status);
        console.log('7. Aguardando 2s antes de reconectar...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        result = await this.callEvolutionAPI('reconnect_instance', {
          instanceName,
          userId,
          profileData: { fullName }
        });
      } else {
        // Primeira conexão - criar nova instância
        console.log('5. Primeira conexão - criando nova instância...');
        console.log('6. Motivo: existingInstance =', !!existingInstance, ', queryError =', queryError?.code);
        result = await this.callEvolutionAPI('create_instance', {
          instanceName,
          userId,
          profileData: { fullName }
        });
      }

      if (!result.success) {
        throw new Error(result.error || 'Falha ao criar instância');
      }

      // Salvar ou atualizar no Supabase
      let instance, supabaseError;
      
      if (existingInstance && !queryError) {
        // Atualizar instância existente
        console.log('7. Atualizando instância existente no banco...');
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .update({
            instance_id: result.instance?.instanceId,
            status: result.qrCode ? 'pending-qr' : 'connecting',
            qr_code: result.qrCode,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('instance_name', instanceName)
          .select()
          .single();
          
        instance = data;
        supabaseError = error;
      } else {
        // Criar nova instância
        console.log('7. Criando nova instância no banco...');
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .insert({
            user_id: userId,
            instance_name: instanceName,
            instance_id: result.instance?.instanceId,
            status: result.qrCode ? 'pending-qr' : 'connecting',
            qr_code: result.qrCode
          })
          .select()
          .single();
          
        instance = data;
        supabaseError = error;
      }

      if (supabaseError) {
        console.error('Erro ao salvar instância no Supabase:', supabaseError);
        throw new Error('Falha ao salvar instância no banco de dados');
      }

      console.log('2. Instância criada com sucesso');
      console.log('3. QR Code presente:', !!result.qrCode);

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

  // Atualizar status da instância no Supabase
  async updateInstanceStatus(instanceName: string, status: WhatsAppStatus, qrCode?: string): Promise<void> {
    try {
      const updateData: any = { status };
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