import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LiveMetricsRequest {
  liveId: string;
  since: string;
  until: string;
}

interface LiveMetricsResponse {
  liveId: string;
  since: string;
  until: string;
  total_spend: number | null;
  total_leads: number | null;
  qualified_leads: number | null;
  cpl_bruto: number | null;
  cpl_liquido: number | null;
  cpl_meta: number | null;
}

interface MetaInsight {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  actions?: Array<{ action_type: string; value: string }>;
  impressions: string;
  clicks: string;
  reach: string;
  cpm: string;
  ctr: string;
  date_start: string;
  date_stop: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { liveId, since, until } = await req.json() as LiveMetricsRequest;

    // Validação de parâmetros obrigatórios
    if (!liveId || !since || !until) {
      return new Response(
        JSON.stringify({ 
          error: 'Parâmetros obrigatórios: liveId, since, until' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validação de formato de data
    const sinceDate = new Date(since);
    const untilDate = new Date(until);
    
    if (isNaN(sinceDate.getTime()) || isNaN(untilDate.getTime())) {
      return new Response(
        JSON.stringify({ 
          error: 'Formato de data inválido. Use YYYY-MM-DD' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📊 [LIVE_METRICS] Iniciando coleta de métricas para Live ${liveId}`, {
      since,
      until,
      period: `${since} até ${until}`
    });

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar dados da Live
    console.log(`📊 [LIVE_METRICS] Buscando dados da Live ${liveId}`);
    const { data: liveData, error: liveError } = await supabase
      .from('lives')
      .select('id, name, ad_budget, leads_goal, user_id')
      .eq('id', liveId)
      .single();

    if (liveError || !liveData) {
      console.error(`❌ [LIVE_METRICS] Erro ao buscar Live:`, liveError);
      return new Response(
        JSON.stringify({ 
          error: 'Live não encontrada' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ [LIVE_METRICS] Live encontrada:`, {
      name: liveData.name,
      ad_budget: liveData.ad_budget,
      leads_goal: liveData.leads_goal
    });

    // 2. Buscar campanhas vinculadas à Live
    console.log(`📊 [LIVE_METRICS] Buscando campanhas vinculadas`);
    const { data: liveCampaigns, error: campaignsError } = await supabase
      .from('live_campaigns')
      .select('campaign_id, account_id')
      .eq('live_id', liveId);

    if (campaignsError) {
      console.error(`❌ [LIVE_METRICS] Erro ao buscar campanhas:`, campaignsError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar campanhas vinculadas' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!liveCampaigns || liveCampaigns.length === 0) {
      console.log(`⚠️ [LIVE_METRICS] Nenhuma campanha vinculada à Live`);
      return new Response(
        JSON.stringify({
          liveId,
          since,
          until,
          total_spend: null,
          total_leads: null,
          qualified_leads: null,
          cpl_bruto: null,
          cpl_liquido: null,
          cpl_meta: liveData.leads_goal && liveData.ad_budget ? 
            (liveData.ad_budget / liveData.leads_goal) : null
        } as LiveMetricsResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ [LIVE_METRICS] ${liveCampaigns.length} campanhas encontradas`);

    // 3. Buscar token de acesso do Meta
    console.log(`📊 [LIVE_METRICS] Buscando token de acesso do Meta`);
    const { data: metaIntegration, error: metaError } = await supabase
      .from('meta_integrations')
      .select('access_token')
      .eq('user_id', liveData.user_id)
      .eq('is_active', true)
      .single();

    if (metaError || !metaIntegration?.access_token) {
      console.error(`❌ [LIVE_METRICS] Erro ao buscar token Meta:`, metaError);
      return new Response(
        JSON.stringify({ 
          error: 'Token de acesso do Meta não encontrado' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 4. Coletar insights do Meta para todas as campanhas
    console.log(`📊 [LIVE_METRICS] Coletando insights do Meta`);
    const campaignIds = liveCampaigns.map(c => c.campaign_id);
    const accountId = liveCampaigns[0].account_id; // Assumindo que todas as campanhas são da mesma conta

    const metaInsights = await fetchMetaInsights(
      accountId,
      campaignIds,
      metaIntegration.access_token,
      since,
      until
    );

    console.log(`✅ [LIVE_METRICS] ${metaInsights.length} insights coletados do Meta`);

    // 5. Calcular métricas do Meta
    const metaMetrics = calculateMetaMetrics(metaInsights);
    console.log(`📊 [LIVE_METRICS] Métricas do Meta calculadas:`, metaMetrics);

    // 6. Buscar leads qualificados do WhatsApp
    console.log(`📊 [LIVE_METRICS] Buscando leads qualificados do WhatsApp`);
    const qualifiedLeads = await fetchWhatsAppLeads(supabase, liveId, since, until);
    console.log(`✅ [LIVE_METRICS] ${qualifiedLeads} leads qualificados encontrados`);

    // 7. Calcular métricas finais
    const finalMetrics = calculateFinalMetrics(
      metaMetrics,
      qualifiedLeads,
      liveData.ad_budget,
      liveData.leads_goal
    );

    console.log(`🎯 [LIVE_METRICS] Métricas finais calculadas:`, finalMetrics);

    const response: LiveMetricsResponse = {
      liveId,
      since,
      until,
      ...finalMetrics
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error(`❌ [LIVE_METRICS] Erro interno:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Busca insights do Meta para campanhas específicas
 */
async function fetchMetaInsights(
  accountId: string,
  campaignIds: string[],
  accessToken: string,
  since: string,
  until: string
): Promise<MetaInsight[]> {
  const BASE_URL = 'https://graph.facebook.com/v23.0';
  
  // Construir filtro para campanhas específicas
  const campaignFilter = {
    field: 'campaign.id',
    operator: 'IN',
    value: campaignIds
  };

  const params = new URLSearchParams({
    fields: 'campaign_id,campaign_name,spend,impressions,clicks,reach,cpm,ctr,actions,date_start,date_stop',
    access_token: accessToken,
    level: 'campaign',
    time_range: JSON.stringify({ since, until }),
    filtering: JSON.stringify([campaignFilter])
  });

  const url = `${BASE_URL}/${accountId}/insights?${params}`;
  console.log(`🔍 [META_INSIGHTS] URL:`, url.replace(accessToken, 'TOKEN_OCULTO'));

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Meta API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ [META_INSIGHTS] Resposta recebida:`, {
      dataCount: data.data?.length || 0,
      paging: data.paging
    });

    return data.data || [];
  } catch (error) {
    console.error(`❌ [META_INSIGHTS] Erro:`, error);
    throw error;
  }
}

/**
 * Calcula métricas agregadas do Meta
 */
function calculateMetaMetrics(insights: MetaInsight[]) {
  let totalSpend = 0;
  let totalLeads = 0;

  insights.forEach(insight => {
    // Soma do gasto
    totalSpend += parseFloat(insight.spend || '0');

    // Contagem de leads nas actions
    if (insight.actions) {
      insight.actions.forEach(action => {
        if (action.action_type === 'lead') {
          totalLeads += parseInt(action.value || '0');
        }
      });
    }
  });

  return {
    total_spend: totalSpend,
    total_leads: totalLeads
  };
}

/**
 * Busca leads qualificados do WhatsApp
 */
async function fetchWhatsAppLeads(
  supabase: any,
  liveId: string,
  since: string,
  until: string
): Promise<number> {
  try {
    // Buscar grupos vinculados à Live
    const { data: liveGroups, error: groupsError } = await supabase
      .from('live_groups')
      .select('group_id')
      .eq('live_id', liveId);

    if (groupsError || !liveGroups || liveGroups.length === 0) {
      console.log(`⚠️ [WHATSAPP_LEADS] Nenhum grupo vinculado à Live`);
      return 0;
    }

    const groupIds = liveGroups.map(g => g.group_id);
    console.log(`📊 [WHATSAPP_LEADS] Buscando leads em ${groupIds.length} grupos`);

    // Buscar eventos de entrada nos grupos no período
    const { data: whatsappEvents, error: eventsError } = await supabase
      .from('whatsapp_events')
      .select('phone_number')
      .in('group_id', groupIds)
      .eq('event_type', 'member_joined')
      .gte('created_at', since)
      .lte('created_at', until);

    if (eventsError) {
      console.error(`❌ [WHATSAPP_LEADS] Erro ao buscar eventos WhatsApp:`, eventsError);
      return 0;
    }

    // Contar telefones únicos
    const uniquePhones = new Set(whatsappEvents?.map(e => e.phone_number) || []);
    const qualifiedLeads = uniquePhones.size;

    console.log(`✅ [WHATSAPP_LEADS] ${qualifiedLeads} leads únicos encontrados`);
    return qualifiedLeads;

  } catch (error) {
    console.error(`❌ [WHATSAPP_LEADS] Erro:`, error);
    return 0;
  }
}

/**
 * Calcula métricas finais (CPL)
 */
function calculateFinalMetrics(
  metaMetrics: { total_spend: number; total_leads: number },
  qualifiedLeads: number,
  adBudget?: number,
  leadsGoal?: number
) {
  const { total_spend, total_leads } = metaMetrics;

  // CPL Bruto
  const cpl_bruto = total_leads > 0 ? total_spend / total_leads : null;

  // CPL Líquido
  const cpl_liquido = qualifiedLeads > 0 ? total_spend / qualifiedLeads : cpl_bruto;

  // CPL Meta (baseado no orçamento e meta da Live)
  const cpl_meta = (adBudget && leadsGoal && leadsGoal > 0) ? 
    adBudget / leadsGoal : null;

  return {
    total_spend,
    total_leads,
    qualified_leads: qualifiedLeads,
    cpl_bruto,
    cpl_liquido,
    cpl_meta
  };
}
