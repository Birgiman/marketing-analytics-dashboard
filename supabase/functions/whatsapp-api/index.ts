// @ts-nocheck
// supabase/functions/whatsapp-api/index.ts 

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
        console.log('1. Reconectando instância existente...');
        console.log('1.1. Evolution API URL:', evolutionApiUrl);
        console.log('1.2. Evolution API Key presente:', !!evolutionApiKey);
        console.log('1.3. Instance Name:', instanceName);
        console.log('1.4. Headers:', JSON.stringify(headers, null, 2));
        
        await logWhatsAppAction('reconnect_instance_start', { instanceName });

        const connectUrl = `${evolutionApiUrl}/instance/connect/${instanceName}`;
        console.log('1.5. URL completa:', connectUrl);
        
        try {
          console.log('1.6. Iniciando fetch request...');
          
          const response = await fetch(connectUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(30000) // 30s timeout
          });

          console.log('2. Reconnect response status:', response.status);
          console.log('2.1. Reconnect response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('3. Reconnect API Error:', errorText);
            await logWhatsAppAction('reconnect_instance_error', null, `HTTP ${response.status}: ${errorText}`);
            throw new Error(`Erro na Evolution API: ${response.status} - ${errorText}`);
          }

          console.log('2.2. Response OK, parseando JSON...');
          const data = await response.json();
          console.log('3. Reconnect response data:', JSON.stringify(data, null, 2));
          console.log('4. QR Code presente:', !!(data.qrcode?.base64 || data.base64));

          const qrCode = data.qrcode?.base64 || data.base64;
          
          await logWhatsAppAction('reconnect_instance_success', { 
            instanceId: data.instance?.instanceId,
            status: data.instance?.status,
            qrCodeLength: qrCode?.length
          });

          console.log('5. Retornando response de sucesso...');
          return new Response(
            JSON.stringify({
              success: true,
              instance: data.instance,
              qrCode: qrCode,
              instanceName: instanceName
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
        
        await logWhatsAppAction('create_instance_success', { 
          instanceId: data.instance?.instanceId,
          status: data.instance?.status,
          qrCodeLength: qrCode?.length
        });

        return new Response(
          JSON.stringify({
            success: true,
            instance: data.instance,
            qrCode: qrCode,
            instanceName: instanceName
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check_instance_exists': {
        console.log('1. Verificando se instância existe na Evolution API...');
        await logWhatsAppAction('instance_existence_check_start', { instanceName });

        try {
          const response = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(15000)
          });

          console.log('2. FetchInstances response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('3. FetchInstances API Error:', errorText);
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
          console.log('3. FetchInstances response data:', JSON.stringify(data, null, 2));

          // Verificar se a instância específica existe na lista
          const instanceExists = Array.isArray(data) ? 
            data.some(instance => instance.instanceName === instanceName || instance.name === instanceName) :
            (data.instanceName === instanceName || data.name === instanceName);

          console.log('4. Instance exists check result:', instanceExists);
          
          await logWhatsAppAction('instance_existence_check_success', { 
            instanceExists,
            totalInstances: Array.isArray(data) ? data.length : 1
          });

          return new Response(
            JSON.stringify({
              exists: instanceExists,
              instances: data
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