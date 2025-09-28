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
  whatsapp_joins?: number;
  whatsapp_exits?: number;
  whatsapp_active?: number;
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

// NOTA: Esta Edge Function deve ser chamada com verificação de cache no frontend.
// O frontend deve verificar traffic_last_synced_at e apenas chamar esta função
// se o cache tiver mais de 30 minutos ou se for um refresh forçado.

// Função para agregar dados do WhatsApp por data
async function aggregateWhatsAppData(
  supabaseClient: any,
  liveGroups: any[],
  timeRange: { since: string; until: string }
): Promise<{
  groups: { groupId: string; groupName: string; total_joins: number; total_exits: number }[];
  dailyData: { [date: string]: { joins: number; exits: number } };
}> {
  if (liveGroups.length === 0) {
    return { groups: [], dailyData: {} };
  }

  const groupIds = liveGroups.map(g => g.group_id);

  try {
    console.log(`🔍 [WhatsApp] Buscando dados para ${groupIds.length} grupos no período ${timeRange.since} a ${timeRange.until}`);
    console.log(`🔍 [WhatsApp] Group IDs:`, groupIds);

    // Buscar dados completos com paginação (Supabase limita em 1000 registros por página)
    console.log(`🔄 [WhatsApp] Buscando joins com paginação...`);
    let allJoins: any[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data: joinsPage, error: joinsError } = await supabaseClient
        .from('whatsapp_groups_log')
        .select('id_grupo, created_at')
        .in('id_grupo', groupIds)
        .eq('event', 'join')
        .gte('created_at', timeRange.since)
        .lte('created_at', timeRange.until)
        .order('created_at', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (joinsError) {
        console.error(`❌ [WhatsApp] Erro ao buscar joins página ${page}:`, joinsError);
        break;
      }

      if (!joinsPage || joinsPage.length === 0) {
        break;
      }

      allJoins = allJoins.concat(joinsPage);
      console.log(`📄 [WhatsApp] Página ${page}: ${joinsPage.length} joins encontrados`);

      if (joinsPage.length < pageSize) {
        break; // Última página
      }

      page++;
    }

    console.log(`🔄 [WhatsApp] Buscando exits com paginação...`);
    let allExits: any[] = [];
    page = 0;

    while (true) {
      const { data: exitsPage, error: exitsError } = await supabaseClient
        .from('whatsapp_groups_log')
        .select('id_grupo, created_at')
        .in('id_grupo', groupIds)
        .eq('event', 'leave')
        .gte('created_at', timeRange.since)
        .lte('created_at', timeRange.until)
        .order('created_at', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (exitsError) {
        console.error(`❌ [WhatsApp] Erro ao buscar exits página ${page}:`, exitsError);
        break;
      }

      if (!exitsPage || exitsPage.length === 0) {
        break;
      }

      allExits = allExits.concat(exitsPage);
      console.log(`📄 [WhatsApp] Página ${page}: ${exitsPage.length} exits encontrados`);

      if (exitsPage.length < pageSize) {
        break; // Última página
      }

      page++;
    }

    const rawJoins = allJoins;
    const rawExits = allExits;

    console.log(`📊 [WhatsApp] TOTAL encontrado: ${rawJoins?.length || 0} joins e ${rawExits?.length || 0} exits`);

    // Processar dados diários (agregação geral por data)
    const dailyData: { [date: string]: { joins: number; exits: number } } = {};

    // Agregar entradas por data
    rawJoins?.forEach((record: any) => {
      const date = record.created_at.split('T')[0];
      if (!dailyData[date]) dailyData[date] = { joins: 0, exits: 0 };
      dailyData[date].joins++;
    });

    // Agregar saídas por data
    rawExits?.forEach((record: any) => {
      const date = record.created_at.split('T')[0];
      if (!dailyData[date]) dailyData[date] = { joins: 0, exits: 0 };
      dailyData[date].exits++;
    });

    // Processar dados por grupo individual
    const groupData: { [groupId: string]: { joins: number; exits: number } } = {};

    // Agregar entradas por grupo
    rawJoins?.forEach((record: any) => {
      const groupId = record.id_grupo;
      if (!groupData[groupId]) groupData[groupId] = { joins: 0, exits: 0 };
      groupData[groupId].joins++;
    });

    // Agregar saídas por grupo
    rawExits?.forEach((record: any) => {
      const groupId = record.id_grupo;
      if (!groupData[groupId]) groupData[groupId] = { joins: 0, exits: 0 };
      groupData[groupId].exits++;
    });

    // Criar array de grupos com dados individuais usando nomes reais
    const groups = liveGroups.map(group => ({
      groupId: group.group_id,
      groupName: group.group_name,
      total_joins: groupData[group.group_id]?.joins || 0,
      total_exits: groupData[group.group_id]?.exits || 0
    }));

    console.log(`📊 [WhatsApp] Processados ${Object.keys(dailyData).length} dias de dados`);
    console.log(`📊 [WhatsApp] Dados por dia:`, dailyData);
    console.log(`📊 [WhatsApp] Dados por grupo:`, groups);

    return {
      groups,
      dailyData
    };

  } catch (error) {
    console.error(`❌ [WhatsApp] Erro ao agregar dados:`, error);
    return { groups: [], dailyData: {} };
  }
}

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
      // Caso 2: since <= hoje <= until - usar até hoje + 1 dia para incluir registros do dia atual
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const amanhaStr = amanha.toISOString().split('T')[0];
      timeRange = { since, until: amanhaStr };
      console.log(`📅 [Time Range] Caso 2 (ativo): ${since} → ${amanhaStr} (incluindo dia atual completo)`);
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
    const globalHierarchy = await buildHierarchy(globalData, metaIntegration.access_token);
    const incrementalHierarchy = await buildIncrementalHierarchy(incrementalData, metaIntegration.access_token);

    // Log dos objetos antes de salvar
    console.log(`💾 [Final Data] Snapshot Global:`, JSON.stringify(globalHierarchy, null, 2));
    console.log(`💾 [Final Data] Dados Incrementais:`, JSON.stringify(incrementalHierarchy, null, 2));

    // STEP 8: Processar dados do WhatsApp
    console.log(`🔄 [WhatsApp] Processando dados do WhatsApp...`);

    // Buscar grupos da live
    const { data: liveGroups, error: groupsError } = await supabaseClient
      .from('live_groups')
      .select('group_id, group_name')
      .eq('live_id', liveId);

    if (groupsError) {
      console.warn(`⚠️ [WhatsApp] Erro ao buscar grupos da live: ${groupsError.message}`);
    }

    console.log(`📊 [WhatsApp] Encontrados ${liveGroups?.length || 0} grupos para processar`);

    // Agregar dados de WhatsApp
    const whatsappData = await aggregateWhatsAppData(supabaseClient, liveGroups || [], timeRange);
    console.log(`🔄 [WhatsApp] Resultado da agregação:`, whatsappData);

    // Adicionar dados de WhatsApp aos dados incrementais
    if (whatsappData.dailyData && Object.keys(whatsappData.dailyData).length > 0) {
      console.log(`🔄 [WhatsApp] Adicionando dados a ${Object.keys(incrementalHierarchy.campaignsByDate).length} dias`);

      Object.keys(incrementalHierarchy.campaignsByDate).forEach(date => {
        const dayWhatsApp = whatsappData.dailyData[date] || { joins: 0, exits: 0 };
        console.log(`📅 [WhatsApp] Data ${date}: ${dayWhatsApp.joins} joins, ${dayWhatsApp.exits} exits`);

        // Adicionar dados de WhatsApp a cada campanha do dia
        incrementalHierarchy.campaignsByDate[date].forEach(campaign => {
          campaign.whatsapp_joins = dayWhatsApp.joins;
          campaign.whatsapp_exits = dayWhatsApp.exits;
          campaign.whatsapp_active = dayWhatsApp.joins - dayWhatsApp.exits;
        });
      });
      console.log(`✅ [WhatsApp] Dados de WhatsApp adicionados aos dados incrementais`);
    } else {
      console.log(`⚠️ [WhatsApp] Nenhum dado diário encontrado para adicionar`);
    }

    // STEP 9: Calcular métricas para cached_metrics
    console.log(`🧮 [Metrics] Calculando métricas...`);

    // Calcular totais do Meta
    const totalSpend = globalHierarchy.campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
    const totalLeads = globalHierarchy.campaigns.reduce((sum, campaign) => sum + campaign.leads, 0);

    // Calcular totais do WhatsApp
    const totalEntries = Object.values(whatsappData.dailyData).reduce((sum, day) => sum + day.joins, 0);
    const totalExits = Object.values(whatsappData.dailyData).reduce((sum, day) => sum + day.exits, 0);
    const totalActiveLeads = totalEntries - totalExits;

    // Calcular CPLs
    const cplMeta = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const cplLiquido = totalEntries > 0 ? totalSpend / totalEntries : 0; // Baseado em pessoas que entraram

    // Calcular Taxa de Retenção
    const retentionRate = totalLeads > 0 ? (totalEntries / totalLeads) * 100 : 0;

    console.log(`✅ [Metrics] Métricas calculadas:`, {
      totalSpend: totalSpend.toFixed(2),
      totalLeads,
      totalEntries,
      totalExits,
      totalActiveLeads,
      cplMeta: cplMeta.toFixed(2),
      cplLiquido: cplLiquido.toFixed(2),
      retentionRate: retentionRate.toFixed(1)
    });

    // STEP 10: Salvar no Supabase
    console.log(`💾 [Database] Salvando no banco...`);
    const { error: updateError } = await supabaseClient
      .from('lives')
      .update({
        cached_traffic_data: {
          campaign: globalHierarchy.campaigns,
          groups: whatsappData.groups || [],
          campaignCount: globalHierarchy.campaigns.length,
          adSetCount: globalHierarchy.campaigns.reduce((sum, c) => sum + c.adsets.length, 0),
          adCount: globalHierarchy.campaigns.reduce((sum, c) =>
            sum + c.adsets.reduce((adSum, adSet) => adSum + adSet.ads.length, 0), 0
          )
        },
        cached_metrics: {
          cplLiquido,
          cplMeta,
          retentionRate,
          cplLiquidoPlanejamento: cplLiquido, // Por enquanto, mesmo valor do CPL Líquido
          totalSpend,
          totalLeads,
          totalEntries,
          totalExits,
          totalActiveLeads
        },
        cached_traffic_data_incremented: {
          campaignsByDate: incrementalHierarchy.campaignsByDate,
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

async function buildHierarchy(globalData: any[], accessToken: string): Promise<{ campaigns: CampaignHierarchy[] }> {

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
  const adItems = globalData.filter(item => item.level === 'ad');
  for (const item of adItems) {
    const spend = parseFloat(item.spend || '0');
    const leads = item.actions?.find((a: any) => a.action_type === 'lead')?.value ?
      parseInt(item.actions.find((a: any) => a.action_type === 'lead')!.value) : 0;
    const cpl = leads > 0 ? spend / leads : 0;

    // Buscar link correto do criativo
    const creative_url = await fetchCreativeUrl(item.ad_id, accessToken);

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
  }

  return {
    campaigns: Array.from(campaignMap.values())
  };
}

async function buildIncrementalHierarchy(incrementalData: any[], accessToken: string): Promise<{ campaignsByDate: Record<string, CampaignHierarchy[]> }> {

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
  for (const [date, dayData] of Array.from(dataByDate.entries())) {
    const hierarchy = await buildHierarchy(dayData, accessToken);
    campaignsByDate[date] = hierarchy.campaigns;
  }

  return { campaignsByDate };
}

async function fetchCreativeUrl(adId: string, accessToken: string): Promise<string> {
  try {
    // Buscar dados do ad para obter o creative com effective_object_story_id
    const adUrl = `https://graph.facebook.com/v21.0/${adId}?fields=creative{effective_object_story_id,object_story_id}&access_token=${accessToken}`;
    const adResponse = await fetch(adUrl);
    
    if (!adResponse.ok) {
      // Erro 400 = sem permissão (token de conta não acessa todos os ads)
      // Erro 404 = ad não encontrado
      // Ambos são esperados e não devem travar a execução
      if (adResponse.status === 400 || adResponse.status === 404) {
        // Log silencioso - não poluir logs com erros esperados
        return `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
      }
      // Outros erros (500, 503, etc.) - logar como warning
      return `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
    }
    
    const adData = await adResponse.json();
    const creative = adData.creative;
    
    if (!creative) {
      // Log silencioso - creative não encontrado é comum
      return `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
    }
    
    // Usar effective_object_story_id (mais confiável) ou object_story_id como fallback
    const storyId = creative.effective_object_story_id || creative.object_story_id;
    
    if (!storyId) {
      // Log silencioso - story ID não encontrado é comum
      return `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
    }
    
    // Validar se o storyId tem o formato correto (pageId_postId)
    if (!storyId.includes('_')) {
      // Log silencioso - formato inválido é comum
      return `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
    }
    
    // Fazer split no _ para obter pageId e postId
    const [pageId, postId] = storyId.split('_');
    
    if (!pageId || !postId) {
      // Log silencioso - pageId/postId inválido é comum
      return `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
    }
    
    // Construir permalink: https://www.facebook.com/{pageId}/posts/{postId}
    const permalinkUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
    return permalinkUrl;
    
  } catch (error) {
    // Log silencioso - erros de rede/timeout são comuns
    return `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
  }
}