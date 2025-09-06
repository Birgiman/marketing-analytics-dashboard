// @ts-nocheck
// supabase/functions/whatsapp-api/index.ts - Updated with timeout and error handling

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('=== VERIFICANDO VARIÁVEIS DE AMBIENTE ===');
    console.log('Evolution API URL:', evolutionApiUrl);
    console.log('Evolution API Key presente:', !!evolutionApiKey);

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error('ERRO: Variáveis de ambiente não configuradas');
      console.error('EVOLUTION_API_URL:', evolutionApiUrl || 'UNDEFINED');
      console.error('EVOLUTION_API_KEY presente:', !!evolutionApiKey);
      
      return new Response(
        JSON.stringify({ 
          error: 'Evolution API não configurada',
          hasConfig: false,
          debug: {
            evolutionApiUrl: evolutionApiUrl || 'UNDEFINED',
            evolutionApiKeyPresent: !!evolutionApiKey
          }
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const requestBody = await req.json();
    console.log('=== WHATSAPP EDGE FUNCTION DEBUG ===');
    console.log('Request body recebido:', JSON.stringify(requestBody, null, 2));
    
    const { action, instanceName, userId, profileData } = requestBody;

    console.log('=== WHATSAPP API DEBUG ===');
    console.log('TIMESTAMP:', new Date().toISOString());
    console.log('Action extraída:', action);
    console.log('Instance Name:', instanceName);
    console.log('User ID:', userId);
    console.log('Profile Data:', profileData);
    console.log('API URL:', evolutionApiUrl);
    console.log('API Key presente:', !!evolutionApiKey);

    // Log function para salvar no Supabase
    const logWhatsAppAction = async (actionType: string, data: any, error?: string) => {
      try {
        await supabase.from('whatsapp_logs').insert({
          user_id: userId,
          instance_name: instanceName || 'unknown',
          user_name: profileData?.fullName || 'Unknown User',
          action: actionType,
          data: data,
          error: error,
          user_agent: req.headers.get('user-agent') || 'Unknown',
          timestamp: new Date().toISOString()
        });
      } catch (logError) {
        console.error('Erro ao salvar log:', logError);
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'apikey': evolutionApiKey
    };

    console.log('=== ENTRANDO NO SWITCH ===');
    console.log('Action type:', typeof action);
    console.log('Action value:', JSON.stringify(action));
    console.log('Action === "reconnect_instance":', action === 'reconnect_instance');
    console.log('Action === "create_instance":', action === 'create_instance');
    
    switch (action) {
      case 'reconnect_instance': {
        console.log('1. Reconectando instância existente e gerando novo QR Code...');
        console.log('1.1. Evolution API URL:', evolutionApiUrl);
        console.log('1.2. Evolution API Key presente:', !!evolutionApiKey);
        console.log('1.3. Instance Name:', instanceName);
        console.log('1.4. Headers:', JSON.stringify(headers, null, 2));
        
        await logWhatsAppAction('reconnect_instance_start', { instanceName });

        // Primeiro, gerar novo QR Code para a instância existente
        const qrUrl = `${evolutionApiUrl}/instance/connect/${instanceName}`;
        console.log('1.5. URL para gerar QR Code:', qrUrl);
        
        try {
          console.log('1.6. Iniciando fetch request para gerar QR Code...');
          
          const response = await fetch(qrUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(30000) // 30s timeout
          });

          console.log('2. QR Code response status:', response.status);
          console.log('2.1. QR Code response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('3. QR Code API Error:', errorText);
            await logWhatsAppAction('reconnect_instance_error', null, `HTTP ${response.status}: ${errorText}`);
            throw new Error(`Erro na Evolution API: ${response.status} - ${errorText}`);
          }

          console.log('2.2. Response OK, parseando JSON...');
          const data = await response.json();
          console.log('3. QR Code response data:', JSON.stringify(data, null, 2));
          
          // Se não retornou QR Code, tentar endpoint alternativo
          let qrCode = data.qrcode?.base64 || data.base64;
          
          if (!qrCode) {
            console.log('4. QR Code não encontrado, tentando endpoint alternativo...');
            
            const alternativeUrl = `${evolutionApiUrl}/instance/qr/${instanceName}`;
            console.log('4.1. URL alternativa:', alternativeUrl);
            
            const qrResponse = await fetch(alternativeUrl, {
              method: 'GET',
              headers,
              signal: AbortSignal.timeout(30000)
            });
            
            if (qrResponse.ok) {
              const qrData = await qrResponse.json();
              console.log('4.2. QR Code alternativo:', JSON.stringify(qrData, null, 2));
              qrCode = qrData.qrcode?.base64 || qrData.base64;
            }
          }
          
          console.log('5. QR Code final presente:', !!qrCode);
          
          // Extrair token da instância se disponível durante reconnect
          const instanceToken = data.hash || data.token || data.apikey || data.instance?.token;
          console.log('5.1. Token da instância presente no reconnect:', !!instanceToken);
          
          // Salvar o token no banco de dados se disponível
          if (instanceToken) {
            console.log('5.2. Salvando token no banco de dados (reconnect)...');
            const { error: tokenError } = await supabase
              .from('whatsapp_instances')
              .upsert({
                user_id: userId,
                instance_name: instanceName,
                instance_id: data.instance?.instanceId,
                api_token: instanceToken,
                status: qrCode ? 'pending-qr' : 'connecting',
                qr_code: qrCode,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id,instance_name'
              });
            
            if (tokenError) {
              console.error('5.3. Erro ao salvar token no reconnect:', tokenError);
            } else {
              console.log('5.3. Token salvo com sucesso no reconnect');
            }
          }
          
          await logWhatsAppAction('reconnect_instance_success', { 
            instanceId: data.instance?.instanceId,
            status: data.instance?.status,
            qrCodeLength: qrCode?.length,
            tokenPresent: !!instanceToken
          });

          console.log('6. Retornando response com novo QR Code...');
          return new Response(
            JSON.stringify({
              success: true,
              instance: data.instance,
              qrCode: qrCode,
              instanceName: instanceName,
              token: instanceToken
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
          
        } catch (fetchError) {
          console.error('=== ERRO NO FETCH RECONNECT ===');
          console.error('Tipo do erro:', typeof fetchError);
          console.error('Erro:', fetchError);
          console.error('Stack:', fetchError.stack);
          console.error('Message:', fetchError.message);
          
          await logWhatsAppAction('reconnect_instance_fetch_error', null, `Fetch error: ${fetchError.message}`);
          throw new Error(`Erro ao conectar com Evolution API: ${fetchError.message}`);
        }
      }

      case 'create_instance': {
        console.log('1. Iniciando criação de instância...');
        await logWhatsAppAction('create_instance_start', { instanceName });

        const response = await fetch(`${evolutionApiUrl}/instance/create`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            instanceName: instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
          })
        });

        console.log('2. Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('3. API Error:', errorText);
          await logWhatsAppAction('create_instance_error', null, `HTTP ${response.status}: ${errorText}`);
          throw new Error(`Erro na Evolution API: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('3. Response data:', data);
        console.log('4. QR Code presente:', !!(data.qrcode?.base64 || data.base64));

        const qrCode = data.qrcode?.base64 || data.base64;
        
        // Extrair token da instância se disponível
        const instanceToken = data.hash || data.token || data.apikey || data.instance?.token;
        console.log('4.1. Token da instância presente:', !!instanceToken);
        
        // Salvar o token no banco de dados se disponível
        if (instanceToken) {
          console.log('4.2. Salvando token no banco de dados...');
          const { error: tokenError } = await supabase
            .from('whatsapp_instances')
            .upsert({
              user_id: userId,
              instance_name: instanceName,
              instance_id: data.instance?.instanceId,
              api_token: instanceToken,
              status: qrCode ? 'pending-qr' : 'connecting',
              qr_code: qrCode,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,instance_name'
            });
          
          if (tokenError) {
            console.error('4.3. Erro ao salvar token:', tokenError);
          } else {
            console.log('4.3. Token salvo com sucesso');
          }
        }
        
        await logWhatsAppAction('create_instance_success', { 
          instanceId: data.instance?.instanceId,
          status: data.instance?.status,
          qrCodeLength: qrCode?.length,
          tokenPresent: !!instanceToken
        });

        return new Response(
          JSON.stringify({
            success: true,
            instance: data.instance,
            qrCode: qrCode,
            instanceName: instanceName,
            token: instanceToken
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check_instance_exists': {
        console.log('1. Verificando se instância específica existe na Evolution API...');
        await logWhatsAppAction('instance_existence_check_start', { instanceName });

        try {
          // SEGURANÇA: Consultar apenas a instância específica do usuário
          const response = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(15000)
          });

          console.log('2. Instance check response status:', response.status);

          // Se retornou 404, a instância não existe
          if (response.status === 404) {
            console.log('3. Instância não existe (404)');
            await logWhatsAppAction('instance_existence_check_success', { 
              instanceExists: false,
              reason: 'Instance not found (404)'
            });

            return new Response(
              JSON.stringify({
                exists: false,
                reason: 'Instance not found'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error('3. Instance check API Error:', errorText);
            await logWhatsAppAction('instance_existence_check_error', null, `HTTP ${response.status}: ${errorText}`);
            
            return new Response(
              JSON.stringify({
                exists: false,
                error: `HTTP ${response.status}: ${errorText}`
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const data = await response.json();
          console.log('3. Instance data:', JSON.stringify(data, null, 2));

          // Se conseguiu buscar dados da instância, ela existe
          const instanceExists = !!(data.instance || data.instanceName || data.name);
          console.log('4. Instance exists check result:', instanceExists);
          
          await logWhatsAppAction('instance_existence_check_success', { 
            instanceExists,
            instanceState: data.instance?.state || data.status
          });

          return new Response(
            JSON.stringify({
              exists: instanceExists,
              state: data.instance?.state || data.status || 'unknown'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );

        } catch (fetchError) {
          console.error('=== ERRO NO FETCH CHECK INSTANCE ===');
          console.error('Erro:', fetchError.message);
          await logWhatsAppAction('instance_existence_fetch_error', null, `Fetch error: ${fetchError.message}`);
          
          return new Response(
            JSON.stringify({
              exists: false,
              error: `Erro ao verificar instância: ${fetchError.message}`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'check_status': {
        console.log('1. Verificando status da instância...');
        await logWhatsAppAction('status_check_start', { instanceName });

        const response = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('2. Status check error:', errorText);
          await logWhatsAppAction('status_check_error', null, `HTTP ${response.status}: ${errorText}`);
          throw new Error(`Erro ao verificar status: ${response.status}`);
        }

        const data = await response.json();
        console.log('2. Status response:', data);

        const isConnected = data.instance?.state === 'open' || data.status === 'open';
        
        await logWhatsAppAction('status_check_success', { 
          status: data.instance?.state || data.status,
          connected: isConnected
        });

        return new Response(
          JSON.stringify({
            status: data.instance?.state || data.status || 'disconnected',
            connected: isConnected,
            instance: data.instance
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_qr': {
        console.log('1. Gerando novo QR Code...');
        await logWhatsAppAction('qr_refresh_start', { instanceName });

        const response = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('2. QR generation error:', errorText);
          await logWhatsAppAction('qr_refresh_error', null, `HTTP ${response.status}: ${errorText}`);
          throw new Error(`Erro ao gerar QR: ${response.status}`);
        }

        const data = await response.json();
        console.log('2. QR response data:', data);

        const qrCode = data.base64 || data.qrcode?.base64;
        
        await logWhatsAppAction('qr_refresh_success', { 
          qrCodeLength: qrCode?.length
        });

        return new Response(
          JSON.stringify({
            qrCode: qrCode
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disconnect': {
        console.log('1. Desconectando instância...');
        await logWhatsAppAction('disconnect_start', { instanceName });

        const response = await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('2. Disconnect error:', errorText);
          await logWhatsAppAction('disconnect_error', null, `HTTP ${response.status}: ${errorText}`);
          throw new Error(`Erro ao desconectar: ${response.status}`);
        }

        await logWhatsAppAction('disconnect_success', null);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_instance': {
        console.log('1. Deletando instância completamente...');
        await logWhatsAppAction('delete_instance_start', { instanceName });

        // 1. Deletar da Evolution API
        const response = await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('2. Delete API error:', errorText);
          await logWhatsAppAction('delete_instance_api_error', null, `HTTP ${response.status}: ${errorText}`);
          // Continuar mesmo se der erro na API (instância pode não existir)
        }

        // 2. Deletar do banco Supabase
        const { error: dbError } = await supabase
          .from('whatsapp_instances')
          .delete()
          .eq('user_id', userId)
          .eq('instance_name', instanceName);

        if (dbError) {
          console.error('3. Delete DB error:', dbError);
          await logWhatsAppAction('delete_instance_db_error', null, dbError.message);
          throw new Error(`Erro ao deletar do banco: ${dbError.message}`);
        }

        await logWhatsAppAction('delete_instance_success', { instanceName });
        console.log('3. Instância deletada com sucesso');

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        console.error('Action não reconhecida:', action);
        console.error('Actions disponíveis: create_instance, reconnect_instance, check_instance_exists, check_status, get_qr, disconnect, delete_instance');
        return new Response(
          JSON.stringify({ 
            error: `Ação não suportada: ${action}`,
            availableActions: ['create_instance', 'reconnect_instance', 'check_instance_exists', 'check_status', 'get_qr', 'disconnect', 'delete_instance']
          }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('=== ERRO GERAL NA FUNÇÃO ===');
    console.error('Erro na função WhatsApp API:', error);
    console.error('Stack trace:', error.stack);
    console.error('Error type:', typeof error);
    console.error('Error properties:', Object.keys(error));
    
    const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        errorType: typeof error,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});