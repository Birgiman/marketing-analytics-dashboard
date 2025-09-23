import { supabase } from '@/integrations/supabase/client';

export interface PublicCacheData {
  live: any;
  groups: any[];
  campaigns: any[];
  metrics: {
    cplLiquido: number;
    cplMeta: number;
    retentionRate: number;
    totalSpent: number;
    totalLeads: number;
    totalGroupMembers: number;
  };
  insights: {
    lastMetaFetch: number;
    insightsCount: number;
  };
}

/**
 * Verifica se o cache está válido (menos de 30 minutos)
 */
export function isCacheValid(lastSyncedAt: string): boolean {
  const cacheAge = Date.now() - new Date(lastSyncedAt).getTime();
  const thirtyMinutes = 30 * 60 * 1000; // 30 minutos em ms
  return cacheAge < thirtyMinutes;
}

/**
 * Busca dados de públicos com verificação de cache
 */
export async function fetchPublicDataWithCache(liveId: string): Promise<{
  data: PublicCacheData | null;
  fromCache: boolean;
  needsRefresh: boolean;
}> {
  try {
    console.log('🔄 [Public Cache] Verificando cache para Live:', liveId);
    
    // Buscar dados básicos das tabelas existentes
    const [liveResult, groupsResult, campaignsResult] = await Promise.all([
      supabase.from('lives').select('*').eq('id', liveId).single(),
      supabase.from('live_groups').select('*').eq('live_id', liveId),
      supabase.from('live_campaigns').select('*').eq('live_id', liveId)
    ]);

    if (liveResult.error) throw liveResult.error;
    if (groupsResult.error) throw groupsResult.error;
    if (campaignsResult.error) throw campaignsResult.error;

    const live = liveResult.data;
    const groups = groupsResult.data || [];
    const campaigns = campaignsResult.data || [];

    if (!live) {
      return { data: null, fromCache: false, needsRefresh: false };
    }

    // Verificar se cache é válido
    const cacheValid = live.last_synced_at ? isCacheValid(live.last_synced_at) : false;
    
    if (cacheValid && live.cached_public_metrics) {
      console.log('✅ [Public Cache] Usando dados do cache');
      return {
        data: {
          live,
          groups,
          campaigns,
          metrics: live.cached_public_metrics,
          insights: live.cached_insights_metadata || { lastMetaFetch: 0, insightsCount: 0 }
        },
        fromCache: true,
        needsRefresh: false
      };
    }

    // Cache inválido - calcular métricas
    console.log('🔄 [Public Cache] Cache vencido, calculando métricas...');
    const metrics = calculatePublicMetrics(groups, campaigns);
    const insights = { lastMetaFetch: Date.now(), insightsCount: campaigns.length };
    
    // Salvar no cache
    await updatePublicCache(liveId, metrics, insights);
    
    console.log('✅ [Public Cache] Métricas calculadas e cache atualizado');
    
    return {
      data: { live, groups, campaigns, metrics, insights },
      fromCache: false,
      needsRefresh: true
    };

  } catch (error) {
    console.error('❌ [Public Cache] Erro ao buscar dados:', error);
    throw error;
  }
}

/**
 * Calcula métricas para a tela de públicos
 */
function calculatePublicMetrics(groups: any[], campaigns: any[]): any {
  const totalGroupMembers = groups.reduce((sum, group) => sum + (group.group_size || 0), 0);
  const totalSpent = campaigns.reduce((sum, campaign) => sum + (campaign.daily_budget || 0), 0);
  
  // Cálculos básicos - serão expandidos com dados do Meta
  const cplLiquido = totalGroupMembers > 0 ? totalSpent / totalGroupMembers : 0;
  
  console.log('📊 [Public Cache] Métricas calculadas:', {
    totalGroupMembers,
    totalSpent,
    cplLiquido: `R$ ${cplLiquido.toFixed(2)}`,
    groupsCount: groups.length,
    campaignsCount: campaigns.length
  });
  
  return {
    cplLiquido,
    cplMeta: 0, // Será calculado com dados do Meta
    retentionRate: 0, // Será calculado
    totalSpent,
    totalLeads: 0, // Será calculado com dados do Meta
    totalGroupMembers
  };
}

/**
 * Atualiza o cache de públicos
 */
export async function updatePublicCache(liveId: string, metrics: any, insights: any): Promise<void> {
  try {
    const { error } = await supabase
      .from('lives')
      .update({
        last_synced_at: new Date().toISOString(),
        cached_public_metrics: metrics,
        cached_insights_metadata: insights
      })
      .eq('id', liveId);

    if (error) {
      console.error('❌ [Public Cache] Erro ao atualizar cache:', error);
      throw error;
    }

    console.log('✅ [Public Cache] Cache atualizado com sucesso para live:', liveId);

  } catch (error) {
    console.error('❌ [Public Cache] Erro ao atualizar cache:', error);
    throw error;
  }
}

/**
 * Limpa o cache de públicos (força refresh)
 */
export async function clearPublicCache(liveId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('lives')
      .update({
        cached_public_metrics: null,
        cached_insights_metadata: null
      })
      .eq('id', liveId);

    if (error) {
      console.error('❌ [Public Cache] Erro ao limpar cache:', error);
      throw error;
    }

    console.log('✅ [Public Cache] Cache limpo para live:', liveId);

  } catch (error) {
    console.error('❌ [Public Cache] Erro ao limpar cache:', error);
    throw error;
  }
}
