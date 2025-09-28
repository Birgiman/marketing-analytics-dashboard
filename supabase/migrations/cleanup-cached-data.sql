-- ===============================================
-- SCRIPT DE LIMPEZA DOS DADOS CACHED OBSOLETOS
-- ===============================================

-- 1. LIMPAR campos lastUpdated e requestTime do cached_traffic_data
UPDATE lives
SET cached_traffic_data = (
    SELECT jsonb_build_object(
        'campaign', cached_traffic_data->'campaign',
        'groups', cached_traffic_data->'groups',
        'campaignCount', cached_traffic_data->'campaignCount',
        'adSetCount', cached_traffic_data->'adSetCount',
        'adCount', cached_traffic_data->'adCount'
    )
)
WHERE cached_traffic_data IS NOT NULL;

-- 2. LIMPAR cached_metrics antigo (será recriado pela Edge Function)
UPDATE lives
SET cached_metrics = NULL;

-- 3. VERIFICAR resultados após limpeza
SELECT
    id,
    name,
    cached_traffic_data,
    cached_metrics,
    traffic_last_synced_at
FROM lives
WHERE id = 'SEU_LIVE_ID_AQUI'  -- Substitua pelo ID da sua live
LIMIT 1;

-- ===============================================
-- INSTRUÇÕES:
-- ===============================================
-- 1. Substitua 'SEU_LIVE_ID_AQUI' pelo ID real da sua live
-- 2. Execute o script no Dashboard do Supabase
-- 3. Após executar, force um refresh na tela Details para recriar cached_metrics
-- ===============================================