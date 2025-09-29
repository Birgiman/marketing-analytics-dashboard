// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    // WhatsApp data processing

    // Buscar dados completos com paginação (Supabase limita em 1000 registros por página)
    // Buscar joins com paginação
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
      // Página processada

      if (joinsPage.length < pageSize) {
        break; // Última página
      }

      page++;
    }

    // Buscar exits com paginação
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
        // Erro ao buscar exits
        break;
      }

      if (!exitsPage || exitsPage.length === 0) {
        break;
      }

      allExits = allExits.concat(exitsPage);
      // Página exits processada

      if (exitsPage.length < pageSize) {
        break; // Última página
      }

      page++;
    }

    const rawJoins = allJoins;
    const rawExits = allExits;

    // Total de registros WhatsApp processados

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

    // Dados WhatsApp processados

    return {
      groups,
      dailyData
    };

  } catch (error) {
    // Erro na agregação de dados WhatsApp
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

    // STEP 2: Buscar integração Meta (mais recente, independente do status)
    const { data: metaIntegration, error: metaError } = await supabaseClient
      .from('meta_integrations')
      .select('access_token, is_active')
      .eq('user_id', liveData.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (metaError || !metaIntegration) {
      throw new Error(`Integração Meta não encontrada: ${metaError?.message}`);
    }

    // Log do status da integração para debug
    console.log(`🔍 [Meta Integration] Status: ${metaIntegration.is_active ? 'ativa' : 'inativa (tentando usar mesmo assim)'}`);

    if (!metaIntegration.is_active) {
      console.warn('⚠️ [Meta Integration] Usando token de integração marcada como inativa - pode estar em rate limit temporário');
    }

    // STEP 2.1: Descriptografar token se necessário
    let accessToken: string;
    try {
      if (TokenCrypto.isEncrypted(metaIntegration.access_token)) {
        accessToken = await TokenCrypto.decryptToken(metaIntegration.access_token);
        console.log('🔐 [Security] Token Meta descriptografado com sucesso');
      } else {
        // Token ainda em plaintext (durante migração)
        accessToken = metaIntegration.access_token;
        console.log('⚠️ [Security] Token Meta em plaintext detectado - considere migração');
      }
    } catch (error) {
      throw new Error(`Falha na descriptografia do token Meta: ${error.message}`);
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

    // STEP 4: Definir time_range válido
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const since = liveData.insights_date_since;
    const until = liveData.insights_date_until;

    let timeRange: { since: string; until: string };

    if (hoje < since) {
      timeRange = { since, until };
    } else if (since <= hoje && hoje <= until) {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const amanhaStr = amanha.toISOString().split('T')[0];
      timeRange = { since, until: amanhaStr };
    } else {
      timeRange = { since, until };
    }

    // ETAPA 2 - META API: Logs de debug para monitorar chamadas
    let metaApiCallsCount = 0;
    console.log(`🔍 [Meta API] Iniciando busca de dados para account_id: ${accountId}`);
    console.log(`📅 [Meta API] Período: ${timeRange.since} até ${timeRange.until}`);
    console.log(`🔎 [Meta API] Termo de busca: "${liveData.campaign_search_term}"`);

    // STEP 5: Buscar snapshot global (sem time_increment)
    console.log(`📊 [Meta API] Buscando snapshot global...`);
    const globalData = await fetchGlobalSnapshot(
      accountId,
      accessToken,
      timeRange,
      liveData.campaign_search_term
    );
    metaApiCallsCount += 3; // 3 chamadas (campaign, adset, ad)
    console.log(`✅ [Meta API] Snapshot global: ${globalData.length} registros obtidos`);

    // STEP 6: Buscar dados incrementais diários (time_increment=1)
    console.log(`📈 [Meta API] Buscando dados incrementais...`);
    const incrementalData = await fetchIncrementalData(
      accountId,
      accessToken,
      timeRange,
      liveData.campaign_search_term
    );
    metaApiCallsCount += 3; // 3 chamadas (campaign, adset, ad)
    console.log(`✅ [Meta API] Dados incrementais: ${incrementalData.length} registros obtidos`);

    console.log(`🚀 [Meta API] TOTAL DE CHAMADAS REALIZADAS: ${metaApiCallsCount} (otimizado vs ${globalData.filter(d => d.level === 'ad').length + incrementalData.filter(d => d.level === 'ad').length + 6} chamadas antes da otimização)`);

    // STEP 7: Construir hierarquia em memória com cache inteligente
    const globalHierarchy = await buildHierarchy(globalData, accessToken, supabaseClient, liveId);
    const incrementalHierarchy = await buildIncrementalHierarchy(incrementalData, accessToken, supabaseClient, liveId);

    // Dados processados com sucesso

    // STEP 8: Processar dados do WhatsApp

    // Buscar grupos da live
    const { data: liveGroups, error: groupsError } = await supabaseClient
      .from('live_groups')
      .select('group_id, group_name')
      .eq('live_id', liveId);

    if (groupsError) {
      // Erro ao buscar grupos da live
    }

    // Agregar dados de WhatsApp
    const whatsappData = await aggregateWhatsAppData(supabaseClient, liveGroups || [], timeRange);

    // Adicionar dados de WhatsApp aos dados incrementais
    if (whatsappData.dailyData && Object.keys(whatsappData.dailyData).length > 0) {
      Object.keys(incrementalHierarchy.campaignsByDate).forEach(date => {
        const dayWhatsApp = whatsappData.dailyData[date] || { joins: 0, exits: 0 };

        // Adicionar dados de WhatsApp a cada campanha do dia
        incrementalHierarchy.campaignsByDate[date].forEach(campaign => {
          campaign.whatsapp_joins = dayWhatsApp.joins;
          campaign.whatsapp_exits = dayWhatsApp.exits;
          campaign.whatsapp_active = dayWhatsApp.joins - dayWhatsApp.exits;
        });
      });
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
    ad: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,actions,creative{effective_object_story_id,object_story_id}'
  };

  for (const [level, fields] of Object.entries(levelConfigs)) {
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
    ad: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,actions,date_start,creative{effective_object_story_id,object_story_id}'
  };

  for (const [level, fields] of Object.entries(levelConfigs)) {
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

  }

  return allData;
}

async function buildHierarchy(globalData: any[], accessToken: string, supabaseClient?: any, liveId?: string): Promise<{ campaigns: CampaignHierarchy[] }> {

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

  // Processar ads com cache inteligente
  const adItems = globalData.filter(item => item.level === 'ad');
  console.log(`🎨 [Creative] Total de ads encontrados: ${adItems.length}`);

  // Usar cache inteligente se disponível
  let creativeUrls: Record<string, string> = {};
  if (supabaseClient && liveId) {
    const adIds = adItems.map(item => item.ad_id);
    creativeUrls = await getCreativeUrlsWithCache(supabaseClient, liveId, adIds, accessToken);
  }

  for (const item of adItems) {
    const spend = parseFloat(item.spend || '0');
    const leads = item.actions?.find((a: any) => a.action_type === 'lead')?.value ?
      parseInt(item.actions.find((a: any) => a.action_type === 'lead')!.value) : 0;
    const cpl = leads > 0 ? spend / leads : 0;

    // Usar URL do cache ou fallback para buildCreativeUrl
    const creative_url = creativeUrls[item.ad_id] || buildCreativeUrl(item.ad_id, item.creative);

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

async function buildIncrementalHierarchy(incrementalData: any[], accessToken: string, supabaseClient?: any, liveId?: string): Promise<{ campaignsByDate: Record<string, CampaignHierarchy[]> }> {

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
    const hierarchy = await buildHierarchy(dayData, accessToken, supabaseClient, liveId);
    campaignsByDate[date] = hierarchy.campaigns;
  }

  return { campaignsByDate };
}

function buildCreativeUrl(adId: string, creative: any): string {
  try {
    if (!creative) {
      // Creative não encontrado - retornar link para gerenciador de anúncios
      return `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
    }

    // Usar effective_object_story_id (mais confiável) ou object_story_id como fallback
    const storyId = creative.effective_object_story_id || creative.object_story_id;

    if (!storyId) {
      // Story ID não encontrado
      return `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
    }

    // Validar se o storyId tem o formato correto (pageId_postId)
    if (!storyId.includes('_')) {
      // Formato inválido
      return `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
    }

    // Fazer split no _ para obter pageId e postId
    const [pageId, postId] = storyId.split('_');

    if (!pageId || !postId) {
      // pageId/postId inválido
      return `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
    }

    // Construir permalink: https://www.facebook.com/{pageId}/posts/{postId}
    const permalinkUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;

    return permalinkUrl;

  } catch (error) {
    // Erro no processamento - retornar link para gerenciador
    return `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
  }
}

// Cache inteligente de criativos
async function getCreativeUrlsWithCache(
  supabaseClient: any,
  liveId: string,
  adIds: string[],
  accessToken: string
): Promise<Record<string, string>> {
  const cacheUrls: Record<string, string> = {};

  try {
    // Buscar cache existente
    const { data: liveData } = await supabaseClient
      .from('lives')
      .select('cache_creative_links')
      .eq('id', liveId)
      .single();

    const existingCache = liveData?.cache_creative_links || {};

    // Identificar IDs que precisam ser buscados
    const missingIds = adIds.filter(id => !existingCache[id]);

    console.log(`🔗 [Creative Cache] Total ads: ${adIds.length}, Cache hits: ${adIds.length - missingIds.length}, Miss: ${missingIds.length}`);

    // Usar cache existente
    Object.assign(cacheUrls, existingCache);

    // Buscar apenas IDs faltantes (otimização crítica)
    if (missingIds.length > 0) {
      console.log(`🔍 [Creative Cache] Buscando ${missingIds.length} criativos novos...`);

      for (const adId of missingIds) {
        try {
          const adUrl = `https://graph.facebook.com/v21.0/${adId}?fields=creative{effective_object_story_id,object_story_id}&access_token=${accessToken}`;
          const response = await fetch(adUrl);

          if (response.ok) {
            const data = await response.json();
            const creative = data.creative;

            if (creative) {
              const storyId = creative.effective_object_story_id || creative.object_story_id;

              if (storyId && storyId.includes('_')) {
                const [pageId, postId] = storyId.split('_');
                if (pageId && postId) {
                  cacheUrls[adId] = `https://www.facebook.com/${pageId}/posts/${postId}`;
                } else {
                  cacheUrls[adId] = `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
                }
              } else {
                cacheUrls[adId] = `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
              }
            } else {
              cacheUrls[adId] = `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
            }
          } else {
            cacheUrls[adId] = `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
          }
        } catch (error) {
          cacheUrls[adId] = `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${adId}`;
        }
      }

      // Salvar cache atualizado
      await supabaseClient
        .from('lives')
        .update({ cache_creative_links: cacheUrls })
        .eq('id', liveId);

      console.log(`💾 [Creative Cache] Cache atualizado com ${missingIds.length} novos links`);
    }

  } catch (error) {
    console.error('❌ [Creative Cache] Erro no cache de criativos:', error);
    // Fallback: URLs padrão para todos os IDs
    adIds.forEach(id => {
      cacheUrls[id] = `https://www.facebook.com/ads/manage/ads/?selected_ad_ids=${id}`;
    });
  }

  return cacheUrls;
}

// FUNÇÃO ANTIGA - REMOVER APÓS TESTES
async function fetchCreativeUrl_OLD(adId: string, accessToken: string): Promise<string> {
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