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

    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Evolution API não configurada',
          hasConfig: false 
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { action, instanceName, userId, profileData } = await req.json();

    console.log('=== WHATSAPP API DEBUG ===');
    console.log('Action:', action);
    console.log('Instance Name:', instanceName);
    console.log('User ID:', userId);
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

    switch (action) {
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
        return new Response(
          JSON.stringify({ error: 'Ação não suportada' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('Erro na função WhatsApp API:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});