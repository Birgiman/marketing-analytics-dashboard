-- Migration: Adicionar sistema de cache para Traffic Analysis
-- Data: 2025-01-23
-- Descrição: Adiciona colunas para cache de dados de análise de tráfego

-- Adicionar colunas para cache de dados de tráfego
ALTER TABLE public.lives 
ADD COLUMN cached_traffic_data JSONB,
ADD COLUMN cached_traffic_metrics JSONB,
ADD COLUMN traffic_last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Comentários para documentação
COMMENT ON COLUMN public.lives.cached_traffic_data IS 'Cache dos dados de tráfego (impressões, cliques, alcance por período)';
COMMENT ON COLUMN public.lives.cached_traffic_metrics IS 'Cache das métricas de tráfego calculadas (CTR, CPM, etc.)';
COMMENT ON COLUMN public.lives.traffic_last_synced_at IS 'Timestamp da última sincronização de dados de tráfego para esta live';

-- Atualizar registros existentes com timestamp atual
UPDATE public.lives 
SET traffic_last_synced_at = NOW() 
WHERE traffic_last_synced_at IS NULL;

-- Criar índice para performance em consultas de cache de tráfego
CREATE INDEX idx_lives_traffic_last_synced_at ON public.lives(traffic_last_synced_at);

-- Criar índice composto para consultas por usuário e sincronização de tráfego
CREATE INDEX idx_lives_user_traffic_sync ON public.lives(user_id, traffic_last_synced_at);

-- Criar índice para consultas de cache de tráfego válido
CREATE INDEX idx_lives_traffic_cache_valid ON public.lives(traffic_last_synced_at) 
WHERE traffic_last_synced_at IS NOT NULL;
