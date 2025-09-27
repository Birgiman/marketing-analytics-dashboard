// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LiveMetaData {
  id: string;
  campaign_search_term: string;
  insights_date_since: string;
  insights_date_until: string;
  user_id: string;
}

interface MetaIntegration {
  access_token: string;
  account_id: string;
}

interface MetaInsight {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  date_start?: string;
  date_stop?: string;
  creative?: {
    effective_object_story_id?: string;
    object_story_id?: string;
  };
}

interface CampaignHierarchy {
  id: string;
  name: string;
  spend: number;
  leads: number;
  cpl_meta: number;
  adsets: Array<{
    id: string;
    name: string;
    spend: number;
    leads: number;
    cpl_meta: number;
    ads: Array<{
      id: string;
      name: string;
      spend: number;
      leads: number;
      cpl_meta: number;
      creative_url?: string;
    }>;
  }>;
}

console.log('Sync Live Meta Data function loaded');

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { liveId } = await req.json();

    if (!liveId) {
      throw new Error('liveId é obrigatório');
    }

    console.log(`🚀 [Sync Meta Data] Iniciando sincronização para Live: ${liveId}`);

    // STEP 1: Buscar dados da Live do banco
    const { data: liveData, error: liveError } = await supabaseClient
      .from('lives')
      .select('id, campaign_search_term, insights_date_since, insights_date_until, user_id')
      .eq('id', liveId)
      .single();

    if (liveError || !liveData) {
      throw new Error(`Live não encontrada: ${liveError?.message}`);
    }

    console.log(`📊 [Live Data] ${liveData.campaign_search_term} | ${liveData.insights_date_since} → ${liveData.insights_date_until}`);

    // STEP 2: Buscar integração Meta ativa
    const { data: metaIntegration, error: metaError } = await supabaseClient
      .from('meta_integrations')
      .select('access_token')
      .eq('user_id', liveData.user_id)
      .eq('is_active', true)
      .single();

    if (metaError || !metaIntegration) {
      throw new Error(`Integração Meta não encontrada: ${metaError?.message}`);
    }

    // STEP 3: Buscar account_id das campanhas da Live
    const { data: liveCampaigns } = await supabaseClient
      .from('live_campaigns')
      .select('account_id')
      .eq('live_id', liveId)
      .limit(1);

    const accountId = liveCampaigns?.[0]?.account_id;
    if (!accountId) {
      throw new Error('Account ID não encontrado');
    }

    console.log(`🔑 [Meta Config] Account: ${accountId}`);

    // STEP 4: Definir time_range válido
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const since = liveData.insights_date_since;
    const until = liveData.insights_date_until;

    let timeRange: { since: string; until: string };

    if (hoje < since) {
      // Caso 1: hoje < since - usar intervalo original
      timeRange = { since, until };
      console.log(`📅 [Time Range] Caso 1 (futuro): ${since} → ${until}`);
    } else if (since <= hoje && hoje <= until) {
      // Caso 2: since <= hoje <= until - usar até hoje
      timeRange = { since, until: hoje };
      console.log(`📅 [Time Range] Caso 2 (ativo): ${since} → ${hoje}`);
    } else {
      // Caso 3: hoje > until - usar intervalo original
      timeRange = { since, until };
      console.log(`📅 [Time Range] Caso 3 (passado): ${since} → ${until}`);
    }

    // STEP 5: Buscar snapshot global (sem time_increment)
    console.log(`🌐 [Global Snapshot] Buscando dados globais...`);
    const globalData = await fetchGlobalSnapshot(
      accountId,
      metaIntegration.access_token,
      timeRange,
      liveData.campaign_search_term
    );

    // STEP 6: Buscar dados incrementais diários (time_increment=1)
    console.log(`📊 [Incremental Data] Buscando dados diários...`);
    const incrementalData = await fetchIncrementalData(
      accountId,
      metaIntegration.access_token,
      timeRange,
      liveData.campaign_search_term
    );

    // STEP 7: Construir hierarquia em memória
    console.log(`🏗️ [Hierarchy] Construindo hierarquia...`);
    const globalHierarchy = buildHierarchy(globalData);
    const incrementalHierarchy = buildIncrementalHierarchy(incrementalData);

    // Log dos objetos antes de salvar
    console.log(`💾 [Final Data] Snapshot Global:`, JSON.stringify(globalHierarchy, null, 2));
    console.log(`💾 [Final Data] Dados Incrementais:`, JSON.stringify(incrementalHierarchy, null, 2));

    // STEP 8: Salvar no Supabase
    console.log(`💾 [Database] Salvando no banco...`);
    const { error: updateError } = await supabaseClient
      .from('lives')
      .update({
        cached_traffic_data: {
          campaign: globalHierarchy.campaigns,
          groups: [], // Será preenchido por outras funções
          lastUpdated: new Date().toISOString(),
          requestTime: Date.now(),
          campaignCount: globalHierarchy.campaigns.length,
          adSetCount: globalHierarchy.campaigns.reduce((sum, c) => sum + c.adsets.length, 0),
          adCount: globalHierarchy.campaigns.reduce((sum, c) =>
            sum + c.adsets.reduce((adSum, adSet) => adSum + adSet.ads.length, 0), 0
          )
        },
        cached_traffic_data_incremented: {
          campaignsByDate: incrementalHierarchy.campaignsByDate,
          lastUpdated: new Date().toISOString(),
          requestTime: Date.now(),
          totalDays: Object.keys(incrementalHierarchy.campaignsByDate).length,
          dateRange: timeRange
        },
        traffic_last_synced_at: new Date().toISOString()
      })
      .eq('id', liveId);

    if (updateError) {
      throw new Error(`Erro ao salvar no banco: ${updateError.message}`);
    }

    console.log(`✅ [Sync Complete] Sincronização concluída para Live: ${liveId}`);

    // STEP 9: Resposta da Edge Function
    return new Response(
      JSON.stringify({ status: 'ok' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error(`❌ [Sync Error]`, error);

    return new Response(
      JSON.stringify({
        error: (error as Error).message || 'Erro interno do servidor',
        status: 'error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// ========================================================================================
// FUNÇÕES AUXILIARES
// ========================================================================================

async function fetchGlobalSnapshot(
  accountId: string,
  accessToken: string,
  timeRange: { since: string; until: string },
  searchTerm: string
): Promise<any[]> {

  const allData: any[] = [];

  // Definir campos específicos para cada nível (sem duplicação)
  const levelConfigs = {
    campaign: 'campaign_id,campaign_name,spend,actions',
    adset: 'campaign_id,campaign_name,adset_id,adset_name,spend,actions',
    ad: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,actions'
  };

  for (const [level, fields] of Object.entries(levelConfigs)) {
    console.log(`📊 [Global ${level}] Buscando dados...`);

    const params = new URLSearchParams({
      level,
      fields,
      access_token: accessToken,
      time_range: JSON.stringify(timeRange),
      filtering: JSON.stringify([
        {
          field: 'campaign.effective_status',
          operator: 'IN',
          value: ['ACTIVE', 'PAUSED']
        },
        {
          field: 'campaign.name',
          operator: 'CONTAIN',
          value: searchTerm
        }
      ]),
      limit: '1000'
    });

    const url = `https://graph.facebook.com/v21.0/${accountId}/insights?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Global ${level}] Erro HTTP ${response.status}: ${errorText}`);
      continue;
    }

    const data = await response.json();
    const insights = data.data || [];

    insights.forEach((insight: any) => {
      allData.push({
        ...insight,
        level
      });
    });

    console.log(`✅ [Global ${level}] ${insights.length} registros encontrados`);
  }

  return allData;
}

async function fetchIncrementalData(
  accountId: string,
  accessToken: string,
  timeRange: { since: string; until: string },
  searchTerm: string
): Promise<any[]> {

  const allData: any[] = [];

  // Definir campos específicos para cada nível (sem duplicação)
  const levelConfigs = {
    campaign: 'campaign_id,campaign_name,spend,actions,date_start',
    adset: 'campaign_id,campaign_name,adset_id,adset_name,spend,actions,date_start',
    ad: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,actions,date_start'
  };

  for (const [level, fields] of Object.entries(levelConfigs)) {
    console.log(`📅 [Incremental ${level}] Buscando dados diários...`);

    const params = new URLSearchParams({
      level,
      fields,
      access_token: accessToken,
      time_range: JSON.stringify(timeRange),
      time_increment: '1', // Dados diários
      filtering: JSON.stringify([
        {
          field: 'campaign.effective_status',
          operator: 'IN',
          value: ['ACTIVE', 'PAUSED']
        },
        {
          field: 'campaign.name',
          operator: 'CONTAIN',
          value: searchTerm
        }
      ]),
      limit: '1000'
    });

    const url = `https://graph.facebook.com/v21.0/${accountId}/insights?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Incremental ${level}] Erro HTTP ${response.status}: ${errorText}`);
      continue;
    }

    const data = await response.json();
    const insights = data.data || [];

    insights.forEach((insight: any) => {
      allData.push({
        ...insight,
        level
      });
    });

    console.log(`✅ [Incremental ${level}] ${insights.length} registros encontrados`);
  }

  return allData;
}

function buildHierarchy(globalData: any[]): { campaigns: CampaignHierarchy[] } {

  const campaignMap = new Map<string, CampaignHierarchy>();
  const adSetMap = new Map<string, any>();

  // Processar campanhas
  globalData.filter(item => item.level === 'campaign').forEach(item => {
    const spend = parseFloat(item.spend || '0');
    const leads = item.actions?.find((a: any) => a.action_type === 'lead')?.value ?
      parseInt(item.actions.find((a: any) => a.action_type === 'lead')!.value) : 0;
    const cpl = leads > 0 ? spend / leads : 0;

    campaignMap.set(item.campaign_id, {
      id: item.campaign_id,
      name: item.campaign_name,
      spend,
      leads,
      cpl_meta: cpl,
      adsets: []
    });
  });

  // Processar adSets
  globalData.filter(item => item.level === 'adset').forEach(item => {
    const spend = parseFloat(item.spend || '0');
    const leads = item.actions?.find((a: any) => a.action_type === 'lead')?.value ?
      parseInt(item.actions.find((a: any) => a.action_type === 'lead')!.value) : 0;
    const cpl = leads > 0 ? spend / leads : 0;

    const adSet = {
      id: item.adset_id,
      name: item.adset_name,
      spend,
      leads,
      cpl_meta: cpl,
      ads: []
    };

    adSetMap.set(item.adset_id, adSet);

    // Adicionar ao campaign correspondente
    const campaign = campaignMap.get(item.campaign_id);
    if (campaign) {
      campaign.adsets.push(adSet);
    }
  });

  // Processar ads
  globalData.filter(item => item.level === 'ad').forEach(item => {
    const spend = parseFloat(item.spend || '0');
    const leads = item.actions?.find((a: any) => a.action_type === 'lead')?.value ?
      parseInt(item.actions.find((a: any) => a.action_type === 'lead')!.value) : 0;
    const cpl = leads > 0 ? spend / leads : 0;

    // Gerar URL simples para o ad (sem dados de creative do insights)
    const creative_url = `https://www.facebook.com/ads/manage/ads/?act=${item.account_id || ''}&selected_ad_ids=${item.ad_id}`;

    const ad = {
      id: item.ad_id,
      name: item.ad_name,
      spend,
      leads,
      cpl_meta: cpl,
      creative_url
    };

    // Adicionar ao adSet correspondente
    const adSet = adSetMap.get(item.adset_id);
    if (adSet) {
      adSet.ads.push(ad);
    }
  });

  return {
    campaigns: Array.from(campaignMap.values())
  };
}

function buildIncrementalHierarchy(incrementalData: any[]): { campaignsByDate: Record<string, CampaignHierarchy[]> } {

  const campaignsByDate: Record<string, CampaignHierarchy[]> = {};

  // Agrupar por data
  const dataByDate = new Map<string, any[]>();

  incrementalData.forEach(item => {
    const date = item.date_start;
    if (!date) return;

    if (!dataByDate.has(date)) {
      dataByDate.set(date, []);
    }
    dataByDate.get(date)!.push(item);
  });

  // Para cada data, construir hierarquia
  dataByDate.forEach((dayData, date) => {
    const hierarchy = buildHierarchy(dayData);
    campaignsByDate[date] = hierarchy.campaigns;
  });

  return { campaignsByDate };
}