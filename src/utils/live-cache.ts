import { supabase } from '@/integrations/supabase/client';

export interface LiveCacheData {
  id: string;
  name: string;
  user_id: string;
  live_date?: string;
  insights_date_since?: string;
  insights_date_until?: string;
  campaign_search_term?: string;
  ad_budget?: number;
  sales_goal?: number;
  leads_goal?: number;
  created_at: string;
  updated_at: string;
  last_synced_at: string;
  // Dados calculados em cache
  cached_metrics?: {
    cplLiquido: number;
    cplMeta: number;
    retentionRate: number;
    cplLiquidoPlanejamento: number;
  };
  cached_group_data?: {
    totalGroups: number;
    totalMembers: number;
    entries: number;
    exits: number;
    activeMembers: number;
  };
  cached_meta_data?: {
    campaignCount: number;
    totalSpend: number;
    totalResults: number;
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
 * Busca dados da live com verificação de cache
 */
export async function fetchLiveWithCache(liveId: string): Promise<{
  data: LiveCacheData | null;
  fromCache: boolean;
  needsRefresh: boolean;
}> {
  try {
    // Buscar dados da live incluindo last_synced_at
    const { data: live, error } = await supabase
      .from('lives')
      .select('*')
      .eq('id', liveId)
      .single();

    if (error) {
      throw error;
    }

    if (!live) {
      return { data: null, fromCache: false, needsRefresh: false };
    }

    // Verificar se cache é válido
    const cacheValid = live.last_synced_at ? isCacheValid(live.last_synced_at) : false;
    
    return {
      data: live as LiveCacheData,
      fromCache: cacheValid,
      needsRefresh: !cacheValid
    };

  } catch (error) {
    console.error('❌ [Cache] Erro ao buscar live:', error);
    throw error;
  }
}

/**
 * Atualiza o cache da live com dados calculados
 */
export async function updateLiveCache(
  liveId: string, 
  metrics: {
    cplLiquido: number;
    cplMeta: number;
    retentionRate: number;
    cplLiquidoPlanejamento: number;
  },
  groupData: {
    totalGroups: number;
    totalMembers: number;
    entries: number;
    exits: number;
    activeMembers: number;
  },
  metaData: {
    campaignCount: number;
    totalSpend: number;
    totalResults: number;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('lives')
      .update({
        last_synced_at: new Date().toISOString(),
        cached_metrics: metrics,
        cached_group_data: groupData,
        cached_meta_data: metaData,
        updated_at: new Date().toISOString()
      })
      .eq('id', liveId);

    if (error) {
      console.error('❌ [Cache] Erro ao atualizar cache:', error);
      throw error;
    }

    console.log('✅ [Cache] Cache atualizado com sucesso para live:', liveId);

  } catch (error) {
    console.error('❌ [Cache] Erro ao atualizar cache:', error);
    throw error;
  }
}

/**
 * Limpa o cache de uma live (força refresh)
 */
export async function clearLiveCache(liveId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('lives')
      .update({
        last_synced_at: null,
        cached_metrics: null,
        cached_group_data: null,
        cached_meta_data: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', liveId);

    if (error) {
      console.error('❌ [Cache] Erro ao limpar cache:', error);
      throw error;
    }

    console.log('✅ [Cache] Cache limpo para live:', liveId);

  } catch (error) {
    console.error('❌ [Cache] Erro ao limpar cache:', error);
    throw error;
  }
}
