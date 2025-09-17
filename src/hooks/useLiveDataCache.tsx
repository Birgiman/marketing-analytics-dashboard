import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useState } from 'react';

interface LiveDataCache {
  live: any;
  groups: any[];
  campaigns: any[];
  metrics: any;
  lastUpdated: number;
}

interface UseLiveDataCacheOptions {
  liveId: string;
  cacheTimeout?: number; // em milissegundos, padrão 5 minutos
}

export function useLiveDataCache({ 
  liveId, 
  cacheTimeout = 5 * 60 * 1000 // 5 minutos
}: UseLiveDataCacheOptions) {
  const [cache, setCache] = useState<LiveDataCache | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar se o cache é válido
  const isCacheValid = useCallback((cacheData: LiveDataCache): boolean => {
    const now = Date.now();
    return (now - cacheData.lastUpdated) < cacheTimeout;
  }, [cacheTimeout]);

  // Buscar dados da Live
  const fetchLiveData = useCallback(async () => {
    if (!liveId) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 [useLiveDataCache] Buscando dados da Live:', liveId);

      // Buscar dados da Live
      const { data: live, error: liveError } = await supabase
        .from('lives')
        .select('*')
        .eq('id', liveId)
        .single();

      if (liveError) throw liveError;

      // Buscar grupos vinculados
      const { data: groups, error: groupsError } = await supabase
        .from('live_groups')
        .select('*')
        .eq('live_id', liveId);

      if (groupsError) throw groupsError;

      // Buscar campanhas vinculadas
      const { data: campaigns, error: campaignsError } = await supabase
        .from('live_campaigns')
        .select('*')
        .eq('live_id', liveId);

      if (campaignsError) throw campaignsError;

      const newCache: LiveDataCache = {
        live,
        groups: groups || [],
        campaigns: campaigns || [],
        metrics: null, // Será preenchido pelo hook de métricas
        lastUpdated: Date.now()
      };

      setCache(newCache);
      console.log('✅ [useLiveDataCache] Dados carregados e cacheados');

    } catch (err: any) {
      console.error('❌ [useLiveDataCache] Erro:', err);
      setError(err.message || 'Erro ao carregar dados da Live');
    } finally {
      setIsLoading(false);
    }
  }, [liveId]);

  // Atualizar métricas no cache
  const updateMetrics = useCallback((metrics: any) => {
    setCache(prev => prev ? {
      ...prev,
      metrics,
      lastUpdated: Date.now()
    } : null);
  }, []);

  // Forçar atualização (ignorar cache)
  const refresh = useCallback(() => {
    setCache(null);
    fetchLiveData();
  }, [fetchLiveData]);

  // Carregar dados se necessário
  useEffect(() => {
    if (!liveId) return;

    // Se não há cache ou cache expirado, buscar dados
    if (!cache || !isCacheValid(cache)) {
      fetchLiveData();
    } else {
      console.log('📦 [useLiveDataCache] Usando dados do cache');
    }
  }, [liveId, cache, isCacheValid, fetchLiveData]);

  return {
    // Dados
    live: cache?.live || null,
    groups: cache?.groups || [],
    campaigns: cache?.campaigns || [],
    metrics: cache?.metrics || null,
    
    // Estado
    isLoading,
    error,
    isFromCache: cache ? isCacheValid(cache) : false,
    
    // Ações
    refresh,
    updateMetrics
  };
}
