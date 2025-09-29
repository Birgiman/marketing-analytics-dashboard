// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========================================================================================
// UTILITÁRIO DE CRIPTOGRAFIA - APENAS PARA USO INTERNO DA EDGE FUNCTION
// ========================================================================================

/**
 * Utilitário de criptografia AES-256-GCM para tokens sensíveis
 * SEGURANÇA: Este código roda apenas no ambiente seguro da Edge Function
 */
class TokenCrypto {
  private static cryptoKey: CryptoKey | null = null;

  private static async getCryptoKey(): Promise<CryptoKey> {
    if (this.cryptoKey) {
      return this.cryptoKey;
    }

    const secretKey = Deno.env.get('AES_SECRET_KEY');

    if (!secretKey) {
      throw new Error('Chave de criptografia não encontrada no environment');
    }

    const keyData = new TextEncoder().encode(secretKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);

    this.cryptoKey = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );

    return this.cryptoKey;
  }

  static async encryptToken(plaintext: string): Promise<string> {
    try {
      const key = await this.getCryptoKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = new TextEncoder().encode(plaintext);

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv, tagLength: 128 },
        key,
        data
      );

      const encryptedArray = new Uint8Array(encrypted);
      const encryptedData = encryptedArray.slice(0, -16);
      const tag = encryptedArray.slice(-16);

      return JSON.stringify({
        encrypted: btoa(String.fromCharCode(...encryptedData)),
        iv: btoa(String.fromCharCode(...iv)),
        tag: btoa(String.fromCharCode(...tag))
      });
    } catch (error) {
      throw new Error(`Falha na criptografia: ${error.message}`);
    }
  }

  static async decryptToken(encryptedString: string): Promise<string> {
    try {
      const key = await this.getCryptoKey();
      const { encrypted, iv, tag } = JSON.parse(encryptedString);

      const ivArray = new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0)));
      const encryptedArray = new Uint8Array(atob(encrypted).split('').map(c => c.charCodeAt(0)));
      const tagArray = new Uint8Array(atob(tag).split('').map(c => c.charCodeAt(0)));

      const combinedData = new Uint8Array(encryptedArray.length + tagArray.length);
      combinedData.set(encryptedArray, 0);
      combinedData.set(tagArray, encryptedArray.length);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivArray, tagLength: 128 },
        key,
        combinedData
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error(`Falha na descriptografia: ${error.message}`);
    }
  }

  static isEncrypted(value: string): boolean {
    try {
      const parsed = JSON.parse(value);
      return !!(parsed.encrypted && parsed.iv && parsed.tag);
    } catch {
      return false;
    }
  }
}

// ========================================================================================
// EDGE FUNCTION PRINCIPAL
// ========================================================================================

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(
        JSON.stringify({
          error: 'Evolution API não configurada',
          status: 'error'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const requestBody = await req.json();
    const { action, userId, instanceName } = requestBody;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID é obrigatório', status: 'error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': evolutionApiKey
    };

    switch (action) {
      case 'connect': {
        // Conectar nova instância WhatsApp
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', userId)
          .single();

        if (!profile) {
          throw new Error('Perfil do usuário não encontrado');
        }

        const fullName = `${profile.first_name} ${profile.last_name}`;
        const generatedInstanceName = `liveshop_${profile.first_name}_${profile.last_name}`
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');

        // PRIMEIRO: Buscar dados completos da instância (otimizado)
        console.log(`🔍 [WhatsApp Connect] Buscando dados da instância: ${generatedInstanceName}`);

        let connectionState = 'unknown';
        let instanceToken = null;
        let qrCode = null;
        let apiResponse = null;

        try {
          // Buscar dados completos da instância com token
          const instancesResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances?instanceName=${generatedInstanceName}`, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(15000)
          });

          if (instancesResponse.ok) {
            const instancesData = await instancesResponse.json();
            const currentInstance = instancesData[0]; // Primeiro resultado

            if (currentInstance) {
              const state = currentInstance.connectionStatus; // 'open', 'close', 'connecting'
              instanceToken = currentInstance.token;

              console.log(`📱 [WhatsApp] Estado da instância: ${state}, Token: ${!!instanceToken}`);

              if (state === 'open') {
                // JÁ CONECTADO - usar dados existentes
                connectionState = 'connected';
                console.log(`✅ [WhatsApp] Instância já conectada`);

                apiResponse = {
                  status: 'connected',
                  token: instanceToken,
                  hash: instanceToken,
                  message: 'Instância já conectada'
                };

              } else if (state === 'connecting') {
                // PENDENTE QR - gerar novo QR
                connectionState = 'pending-qr';
                console.log(`📱 [WhatsApp] Instância pendente - gerando QR`);

                const qrResponse = await fetch(`${evolutionApiUrl}/instance/connect/${generatedInstanceName}`, {
                  method: 'GET',
                  headers,
                  signal: AbortSignal.timeout(15000)
                });

                if (qrResponse.ok) {
                  const qrData = await qrResponse.json();
                  qrCode = qrData.qrcode?.base64 || qrData.base64;
                  console.log(`📱 [WhatsApp] QR Code gerado`);
                }

                apiResponse = {
                  qrcode: { base64: qrCode },
                  status: 'pending-qr',
                  token: instanceToken,
                  hash: instanceToken,
                  message: 'QR Code gerado'
                };

              } else {
                // DESCONECTADO - reconectar
                connectionState = 'disconnected';
                console.log(`📱 [WhatsApp] Instância desconectada - reconectando`);

                const reconnectResponse = await fetch(`${evolutionApiUrl}/instance/connect/${generatedInstanceName}`, {
                  method: 'GET',
                  headers,
                  signal: AbortSignal.timeout(30000)
                });

                if (reconnectResponse.ok) {
                  const qrData = await reconnectResponse.json();
                  qrCode = qrData.qrcode?.base64 || qrData.base64;
                  connectionState = 'pending-qr';
                  console.log(`🔧 [WhatsApp] Reconexão iniciada com QR`);
                }

                apiResponse = {
                  qrcode: { base64: qrCode },
                  status: 'pending-qr',
                  token: instanceToken,
                  hash: instanceToken,
                  message: 'Reconectando instância'
                };
              }

            } else {
              // Instância não encontrada nos dados
              connectionState = 'not-exists';
              console.log(`📱 [WhatsApp] Instância não encontrada`);
            }

          } else if (instancesResponse.status === 404) {
            // Instância não existe
            connectionState = 'not-exists';
            console.log(`📱 [WhatsApp] Instância não existe - criando nova`);
          }

        } catch (error) {
          console.warn(`⚠️ Erro ao buscar instância: ${error.message}`);
          connectionState = 'unknown';
        }

        // SEGUNDO: Criar instância se não existir
        if (connectionState === 'not-exists' || connectionState === 'unknown') {
          console.log(`🔧 [WhatsApp] Criando nova instância: ${generatedInstanceName}`);

          const createResponse = await fetch(`${evolutionApiUrl}/instance/create`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              instanceName: generatedInstanceName,
              qrcode: true,
              integration: "WHATSAPP-BAILEYS"
            }),
            signal: AbortSignal.timeout(30000)
          });

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Erro ao criar instância: ${createResponse.status} - ${errorText}`);
          }

          const createData = await createResponse.json();
          instanceToken = createData.hash || createData.token;
          qrCode = createData.qrcode?.base64 || createData.base64;
          connectionState = 'pending-qr';

          console.log(`🔧 [WhatsApp] Nova instância criada, Token: ${!!instanceToken}, QR: ${!!qrCode}`);

          apiResponse = {
            qrcode: { base64: qrCode },
            status: 'pending-qr',
            token: instanceToken,
            hash: instanceToken,
            message: 'Nova instância criada'
          };
        }

        // Extrair dados da resposta da API
        const finalQrCode = apiResponse?.qrcode?.base64 || apiResponse?.base64 || qrCode;
        const finalInstanceToken = apiResponse?.hash || apiResponse?.token || apiResponse?.apikey || apiResponse?.instance?.token || instanceToken;

        // Criptografar token antes de salvar no banco
        let encryptedToken = null;
        if (finalInstanceToken) {
          encryptedToken = await TokenCrypto.encryptToken(finalInstanceToken);
          console.log('🔐 [Security] Token WhatsApp criptografado com sucesso');
        }

        // Determinar status correto baseado no estado da conexão
        let finalStatus;
        if (connectionState === 'connected') {
          finalStatus = 'connected';
        } else if (finalQrCode) {
          finalStatus = 'pending-qr';
        } else {
          finalStatus = 'connecting';
        }

        // Salvar/atualizar instância no banco com token criptografado
        const instanceData = {
          user_id: userId,
          instance_name: generatedInstanceName,
          instance_id: apiResponse?.instance?.instanceId,
          status: finalStatus,
          qr_code: finalQrCode,
          api_token: encryptedToken,
          updated_at: new Date().toISOString()
        };

        console.log(`💾 [WhatsApp] Salvando no banco - Status: ${finalStatus}, Token: ${!!encryptedToken}, QR: ${!!finalQrCode}`);

        // Verificar se já existe instância para este usuário e nome
        const { data: existingInstance } = await supabase
          .from('whatsapp_instances')
          .select('id')
          .eq('user_id', userId)
          .eq('instance_name', generatedInstanceName)
          .single();

        let saveError;
        if (existingInstance) {
          // Atualizar existente
          const { error } = await supabase
            .from('whatsapp_instances')
            .update(instanceData)
            .eq('id', existingInstance.id);
          saveError = error;
        } else {
          // Inserir novo
          const { error } = await supabase
            .from('whatsapp_instances')
            .insert(instanceData);
          saveError = error;
        }

        if (saveError) {
          throw new Error(`Erro ao salvar instância: ${saveError.message}`);
        }

        // SEGURANÇA: Resposta SEM token - apenas status e QR
        const connectResponseData = {
          success: true,
          status: finalStatus,
          connected: finalStatus === 'connected',
          instance_name: generatedInstanceName,
          qr_code: finalQrCode,
          message: connectionState === 'connected' ? 'WhatsApp já conectado!' :
                   connectionState === 'pending-qr' ? 'QR Code gerado - escaneie para conectar' :
                   'Nova conexão iniciada'
          // NÃO retornar token para o frontend
        };

        // Log detalhado para debug
        console.log(`📤 [WhatsApp Connect Response] ${generatedInstanceName}:`);
        console.log(`   - Status: ${finalStatus}`);
        console.log(`   - Connected: ${finalStatus === 'connected'}`);
        console.log(`   - QR Code: ${!!finalQrCode}`);
        console.log(`   - Token Saved: ${!!encryptedToken}`);
        console.log(`   - Message: ${connectResponseData.message}`);

        return new Response(
          JSON.stringify(connectResponseData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disconnect': {
        if (!instanceName) {
          throw new Error('Instance name é obrigatório para disconnect');
        }

        // Desconectar da Evolution API
        const response = await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers,
          signal: AbortSignal.timeout(15000)
        });

        // Atualizar status no banco (mesmo se API falhar)
        await supabase
          .from('whatsapp_instances')
          .update({
            status: 'disconnected',
            qr_code: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('instance_name', instanceName);

        return new Response(
          JSON.stringify({
            success: true,
            status: 'disconnected'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'status': {
        if (!instanceName) {
          throw new Error('Instance name é obrigatório para status');
        }

        // Buscar instância no banco
        const { data: instance, error: instanceError } = await supabase
          .from('whatsapp_instances')
          .select('status, qr_code, api_token')
          .eq('user_id', userId)
          .eq('instance_name', instanceName)
          .single();

        if (instanceError || !instance) {
          return new Response(
            JSON.stringify({
              status: 'disconnected',
              connected: false
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Monitoramento otimizado usando /instance/connectionState (payload menor)
        let apiStatus = instance.status;
        let needsTokenUpdate = false;

        try {
          const statusResponse = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(10000)
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const currentState = statusData.instance?.state || statusData.status;
            const isConnected = currentState === 'open';
            const newApiStatus = isConnected ? 'connected' : 'disconnected';

            console.log(`🔍 [WhatsApp Status] ${instanceName}: ${currentState} -> ${newApiStatus}`);

            // Se mudou o status, atualizar
            if (newApiStatus !== instance.status) {
              apiStatus = newApiStatus;

              // Se conectou mas não temos token, precisamos buscar
              if (isConnected && !instance.api_token) {
                needsTokenUpdate = true;
                console.log(`🔄 [WhatsApp] Conectado sem token - buscando token da instância`);

                try {
                  const instanceResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
                    method: 'GET',
                    headers,
                    signal: AbortSignal.timeout(10000)
                  });

                  if (instanceResponse.ok) {
                    const instancesData = await instanceResponse.json();
                    const currentInstance = instancesData[0];

                    if (currentInstance?.token) {
                      // Criptografar e salvar o token
                      const encryptedToken = await TokenCrypto.encryptToken(currentInstance.token);
                      console.log('🔐 [Security] Token WhatsApp recuperado e criptografado');

                      // Atualizar status E token no banco
                      await supabase
                        .from('whatsapp_instances')
                        .update({
                          status: apiStatus,
                          api_token: encryptedToken,
                          updated_at: new Date().toISOString()
                        })
                        .eq('user_id', userId)
                        .eq('instance_name', instanceName);

                      console.log(`✅ [WhatsApp] ${instanceName} conectado com sucesso - token salvo`);
                      needsTokenUpdate = false; // Já atualizamos
                    }
                  }
                } catch (tokenError) {
                  console.warn('⚠️ Erro ao buscar token da instância:', tokenError.message);
                }
              }

              // Se não precisou atualizar token, atualizar apenas status
              if (!needsTokenUpdate) {
                await supabase
                  .from('whatsapp_instances')
                  .update({
                    status: apiStatus,
                    updated_at: new Date().toISOString()
                  })
                  .eq('user_id', userId)
                  .eq('instance_name', instanceName);

                console.log(`📱 [WhatsApp] ${instanceName} status atualizado: ${instance.status} -> ${apiStatus}`);
              }
            }
          }
        } catch (error) {
          // Se falhar verificação da API, usar status do banco
          console.warn('⚠️ Falha ao verificar status na Evolution API:', error.message);
        }

        // SEGURANÇA: Resposta SEM token - apenas status
        let responseData;

        if (apiStatus === 'connected') {
          // Conectado: apenas mensagem de sucesso
          responseData = {
            message: 'WhatsApp conectado com sucesso!'
          };
        } else if (apiStatus === 'pending-qr') {
          // Aguardando QR: incluir QR code e status
          responseData = {
            status: apiStatus,
            connected: false,
            qr_code: instance.qr_code,
            message: 'QR Code ativo'
          };
        } else {
          // Desconectado: apenas mensagem simples
          responseData = {
            message: 'WhatsApp desconectado!'
          };
        }
        // NÃO retornar token para o frontend

        // Log para debug
        console.log(`📤 [WhatsApp Status Response] ${instanceName}: ${JSON.stringify(responseData)}`);

        return new Response(
          JSON.stringify(responseData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'refresh-qr': {
        if (!instanceName) {
          throw new Error('Instance name é obrigatório para refresh QR');
        }

        // Gerar novo QR Code
        const response = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ao gerar QR: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const qrCode = data.base64 || data.qrcode?.base64;

        // Atualizar QR no banco
        await supabase
          .from('whatsapp_instances')
          .update({
            qr_code: qrCode,
            status: 'pending-qr',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('instance_name', instanceName);

        return new Response(
          JSON.stringify({
            success: true,
            qr_code: qrCode,
            status: 'pending-qr'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            error: `Ação não suportada: ${action}`,
            status: 'error'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

  } catch (error) {
    console.error('❌ [WhatsApp Secure] Erro:', error);

    return new Response(
      JSON.stringify({
        error: error?.message || 'Erro interno do servidor',
        status: 'error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});