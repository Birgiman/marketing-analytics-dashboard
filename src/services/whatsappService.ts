import { supabase } from "@/integrations/supabase/client";
import {
  WhatsAppInstance,
  CreateInstanceResponse,
  ConnectionStatusResponse,
  WhatsAppStatus
} from "@/types";

// Interfaces para dados de API
interface EvolutionAPIData {
  instanceName?: string;
  [key: string]: unknown;
}

interface InstanceUpdateData {
  instance_id?: string;
  status: string;
  qr_code?: string;
  api_token?: string;
  updated_at: string;
}

interface InstanceInsertData {
  user_id: string;
  instance_name: string;
  instance_id?: string;
  status: string;
  qr_code?: string;
  api_token?: string;
}

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

      throw error;
    }
  }

  // Chamar Edge Function para interagir com Evolution API
  private async callEvolutionAPI(action: string, data: EvolutionAPIData) {
    try {
      const requestBody = { action, ...data };

      const response = await supabase.functions.invoke('whatsapp-api', {
        body: requestBody
      });


      if (response.error) {

        throw new Error(response.error.message || 'Erro na API WhatsApp');
      }

      return response.data;
    } catch (error) {

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


        await new Promise(resolve => setTimeout(resolve, 1000));
        
        result = await this.callEvolutionAPI('reconnect_instance', {
          instanceName,
          userId,
          profileData: { fullName }
        });
      } else {
        // Instância NÃO existe na Evolution API - criar nova

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

      const { data: existingInstance, error: queryError } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', userId)
        .eq('instance_name', instanceName)
        .single();

      // Log detalhado sobre instância existente
      if (existingInstance && !queryError) {


      } else if (queryError?.code === 'PGRST116') {

      } else if (queryError) {

      }

      let instance, supabaseError;
      
      if (existingInstance && !queryError) {
        // Atualizar instância existente no banco (SEMPRE SOBRESCREVER)

        const updateData: InstanceUpdateData = {
          instance_id: result.instance?.instanceId,
          status: result.qrCode ? 'pending-qr' : 'connecting',
          qr_code: result.qrCode,
          updated_at: new Date().toISOString()
        };
        
        // SEMPRE atualizar o token se disponível (sobrescrevendo o anterior)
        if (result.token) {
          updateData.api_token = result.token;

        }

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

        const insertData: InstanceInsertData = {
          user_id: userId,
          instance_name: instanceName,
          instance_id: result.instance?.instanceId,
          status: result.qrCode ? 'pending-qr' : 'connecting',
          qr_code: result.qrCode
        };
        
        // Adicionar token se disponível na resposta
        if (result.token) {
          insertData.api_token = result.token;

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

        throw new Error('Falha ao salvar instância no banco de dados');
      }


      return {
        success: true,
        instance_name: instanceName,
        qr_code: result.qrCode
      };
    } catch (error) {

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

        return;
      }

      if (!localInstances || localInstances.length === 0) {

        return;
      }

      // Para cada instância local, verificar status na Evolution API
      for (const localInstance of localInstances) {
        try {
          
          // Verificar se ainda existe na Evolution API
          const existsInAPI = await this.checkInstanceExists(localInstance.instance_name, userId);
          
          if (!existsInAPI) {
            // Instância não existe mais na API - marcar como desconectada

            await this.updateInstanceStatus(localInstance.instance_name, 'disconnected');
            continue;
          }

          // Se existe, verificar status atual
          const statusResponse = await this.checkConnectionStatus(localInstance.instance_name, userId);
          const apiStatus: WhatsAppStatus = statusResponse.connected ? 'connected' : 'disconnected';
          
          
          // Se status mudou, atualizar no banco
          if (apiStatus !== localInstance.status) {

            await this.updateInstanceStatus(localInstance.instance_name, apiStatus);
          }
          
        } catch (instanceError) {

          // Em caso de erro, assumir desconectado
          if (localInstance.status !== 'disconnected') {
            await this.updateInstanceStatus(localInstance.instance_name, 'disconnected');
          }
        }
      }
      
    } catch (error) {

      throw error;
    }
  }

  // Atualizar status da instância no Supabase
  async updateInstanceStatus(instanceName: string, status: WhatsAppStatus, qrCode?: string): Promise<void> {
    try {
      const updateData: InstanceUpdateData = { status, updated_at: new Date().toISOString() };
      if (qrCode) updateData.qr_code = qrCode;

      await supabase
        .from('whatsapp_instances')
        .update(updateData)
        .eq('instance_name', instanceName);
    } catch (error) {

      throw error;
    }
  }

  // Sincronizar grupos usando nova arquitetura de filas
  async syncGroupsWithQueue(instanceName: string, userId: string, searchTerm?: string): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      console.log('🚀 [syncGroupsWithQueue] Iniciando sincronização com fila para:', instanceName);
      
      const response = await supabase.functions.invoke('start-fetch-groups', {
        body: {
          instanceName,
          userId,
          searchTerm
        }
      });

      if (response.error) {
        console.error('❌ [syncGroupsWithQueue] Erro na Edge Function:', response.error);
        return {
          success: false,
          error: response.error.message || 'Erro na sincronização'
        };
      }

      const result = response.data;
      if (result.success) {
        console.log(`✅ [syncGroupsWithQueue] Job criado com sucesso: ${result.jobId}`);
        return {
          success: true,
          jobId: result.jobId
        };
      } else {
        console.error('❌ [syncGroupsWithQueue] Falha ao criar job:', result.error);
        return {
          success: false,
          error: result.error || 'Falha ao criar job'
        };
      }
    } catch (error) {
      console.error('❌ [syncGroupsWithQueue] Erro geral:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Sincronizar grupos com paginação multi-chamada (LEGACY - será removida)
  async syncGroupsPaged(instanceName: string, userId: string, searchTerm?: string): Promise<{ success: boolean; totalGroups: number; error?: string }> {
    try {
      console.log('🚀 [syncGroupsPaged] Iniciando sincronização paginada para:', instanceName);
      
      let currentPage = 1;
      let hasMore = true;
      let totalGroups = 0;
      let attemptCount = 0;
      const maxPagesPerCall = 8; // Páginas por chamada da Edge Function
      const maxRetries = 3;
      const baseDelay = 1000; // 1s base delay entre chamadas
      
      while (hasMore && attemptCount < 50) { // Safety: max 50 iterações (400 páginas)
        attemptCount++;
        
        try {
          console.log(`📄 [syncGroupsPaged] Chamada ${attemptCount}: páginas ${currentPage} até ${currentPage + maxPagesPerCall - 1}`);
          
          const response = await supabase.functions.invoke('fetch-groups-chunked', {
            body: {
              instanceName,
              userId,
              searchTerm,
              startPage: currentPage,
              maxPagesPerCall
            }
          });

          if (response.error) {
            console.error('❌ [syncGroupsPaged] Erro na Edge Function:', response.error);
            
            // Backoff em caso de erro
            if (attemptCount < maxRetries) {
              const delay = baseDelay * attemptCount; // 1s, 2s, 3s
              console.log(`⏳ [syncGroupsPaged] Retry em ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue; // Retry mesma página
            } else {
              throw new Error(response.error.message || 'Erro na sincronização');
            }
          }

          const result = response.data;
          
          if (result.savedCount) {
            totalGroups += result.savedCount;
            console.log(`✅ [syncGroupsPaged] Chamada ${attemptCount}: +${result.savedCount} grupos salvos (total: ${totalGroups})`);
          }
          
          hasMore = result.hasMore;
          if (result.nextPage) {
            currentPage = result.nextPage;
          } else {
            currentPage += maxPagesPerCall;
          }
          
          // Pequena pausa entre chamadas para não pressionar a Evolution API
          if (hasMore) {
            const delay = 500 + Math.random() * 200; // 500-700ms aleatório
            console.log(`⏸️ [syncGroupsPaged] Pausa de ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
        } catch (callError) {
          console.error(`❌ [syncGroupsPaged] Erro na chamada ${attemptCount}:`, callError);
          
          // Backoff exponencial em caso de erro
          if (attemptCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, attemptCount - 1); // 1s, 2s, 4s
            console.log(`⏳ [syncGroupsPaged] Retry em ${delay}ms após erro...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Retry mesma página
          } else {
            throw callError;
          }
        }
      }
      
      console.log(`🎯 [syncGroupsPaged] Concluído: ${totalGroups} grupos sincronizados em ${attemptCount} chamadas`);
      
      return {
        success: true,
        totalGroups
      };
      
    } catch (error) {
      console.error('❌ [syncGroupsPaged] Erro geral:', error);
      return {
        success: false,
        totalGroups: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido na sincronização'
      };
    }
  }
}

export const whatsappService = new WhatsAppService();