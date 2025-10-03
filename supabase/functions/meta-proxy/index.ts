// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { TokenCrypto } from '../_shared/token-crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const BASE_URL = 'https://graph.facebook.com/v23.0';

interface MetaProxyRequest {
  userId: string;
  action: 'fetch_ad_accounts' | 'fetch_campaigns' | 'fetch_insights';
  params?: {
    adAccountId?: string;
    campaignId?: string;
    fields?: string[];
    limit?: number;
    status?: string[];
    searchTerm?: string;
    filtering?: any[];
    timeRange?: { since: string; until: string };
    datePreset?: string;
    level?: string;
    timeIncrement?: string;
  };
}

/**
 * EDGE FUNCTION PROXY SEGURA PARA META API
 * 
 * Descriptografa o token do Meta e faz requisições seguras
 * SEM expor o token para o frontend
 */
// @ts-ignore
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: MetaProxyRequest = await req.json();
    const { userId, action, params = {} } = requestData;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar integração Meta ativa do usuário
    const { data: integration, error: integrationError } = await supabase
      .from('meta_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration?.access_token) {
      return new Response(
        JSON.stringify({
          error: 'Integração Meta não encontrada ou inativa',
          details: integrationError?.message
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SEGURANÇA: Descriptografar token
    let accessToken = integration.access_token;
    try {
      if (TokenCrypto.isEncrypted(accessToken)) {
        console.log('🔐 [meta-proxy] Token criptografado detectado, descriptografando...');
        accessToken = await TokenCrypto.decryptToken(accessToken);
        console.log('✅ [meta-proxy] Token descriptografado com sucesso');
      } else {
        console.log('⚠️ [meta-proxy] Token não criptografado (formato legacy)');
      }
    } catch (decryptError) {
      console.error('❌ [meta-proxy] Erro ao descriptografar token:', decryptError);
      return new Response(
        JSON.stringify({
          error: 'Erro ao descriptografar token',
          details: decryptError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Executar ação solicitada
    let url: string;
    let queryParams: URLSearchParams;

    switch (action) {
      case 'fetch_ad_accounts': {
        // Buscar contas de anúncios do usuário
        url = `${BASE_URL}/me/adaccounts`;
        queryParams = new URLSearchParams({
          fields: 'id,name,currency,timezone_name,account_status,amount_spent',
          access_token: accessToken
        });

        if (params.limit) {
          queryParams.append('limit', params.limit.toString());
        }

        url += `?${queryParams.toString()}`;
        break;
      }

      case 'fetch_campaigns': {
        // Buscar campanhas de uma conta específica
        if (!params.adAccountId) {
          return new Response(
            JSON.stringify({ error: 'adAccountId é obrigatório para fetch_campaigns' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const campaignFields = params.fields || [
          'id', 'name', 'status', 'objective', 'daily_budget', 'lifetime_budget',
          'created_time', 'updated_time', 'effective_status', 'buying_type', 'bid_strategy'
        ];

        url = `${BASE_URL}/${params.adAccountId}/campaigns`;
        queryParams = new URLSearchParams({
          fields: campaignFields.join(','),
          access_token: accessToken,
          limit: (params.limit || 50).toString()
        });

        // Adicionar filtro de busca se fornecido
        if (params.searchTerm && params.searchTerm.trim()) {
          queryParams.append('filtering', JSON.stringify([{
            field: 'name',
            operator: 'CONTAIN',
            value: params.searchTerm.trim()
          }]));
        }

        // Adicionar outros filtros
        if (params.filtering && params.filtering.length > 0) {
          queryParams.append('filtering', JSON.stringify(params.filtering));
        }

        url += `?${queryParams.toString()}`;
        break;
      }

      case 'fetch_insights': {
        // Buscar insights de uma campanha ou conta
        if (!params.adAccountId && !params.campaignId) {
          return new Response(
            JSON.stringify({ error: 'adAccountId ou campaignId é obrigatório para fetch_insights' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const targetId = params.campaignId || params.adAccountId;
        const insightFields = params.fields || [
          'campaign_id', 'campaign_name', 'spend', 'impressions', 'clicks', 'actions',
          'reach', 'frequency', 'cpm', 'ctr', 'cpp', 'cost_per_unique_click'
        ];

        url = `${BASE_URL}/${targetId}/insights`;
        queryParams = new URLSearchParams({
          fields: insightFields.join(','),
          access_token: accessToken,
          level: params.level || 'campaign',
          time_increment: params.timeIncrement || '1'
        });

        // Adicionar time_range ou date_preset
        if (params.timeRange) {
          queryParams.append('time_range', JSON.stringify({
            since: params.timeRange.since,
            until: params.timeRange.until
          }));
        } else {
          queryParams.append('date_preset', params.datePreset || 'last_30d');
        }

        // Adicionar limite se fornecido
        if (params.limit) {
          queryParams.append('limit', params.limit.toString());
        }

        // Adicionar filtros se fornecidos
        if (params.filtering && params.filtering.length > 0) {
          queryParams.append('filtering', JSON.stringify(params.filtering));
        }

        url += `?${queryParams.toString()}`;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação não suportada: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Fazer requisição à API Meta
    console.log(`🔄 [meta-proxy] Fazendo requisição: ${action}`);
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [meta-proxy] Erro na API Meta (${response.status}):`, errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        return new Response(
          JSON.stringify({
            error: errorData.error?.message || 'Erro na API Meta',
            code: errorData.error?.code,
            type: errorData.error?.type,
            status: response.status
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        return new Response(
          JSON.stringify({
            error: `Erro HTTP ${response.status}: ${response.statusText}`,
            details: errorText
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const data = await response.json();
    console.log(`✅ [meta-proxy] Requisição bem-sucedida: ${action} - ${data.data?.length || 0} resultados`);

    // Retornar dados ao frontend SEM expor o token
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [meta-proxy] Erro crítico:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

