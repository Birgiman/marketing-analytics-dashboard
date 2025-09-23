-- Migration: Adicionar sistema de cache para dados Meta nas lives
-- Data: 2025-01-23
-- Descrição: Adiciona colunas para cache de dados Meta calculados

-- Adicionar coluna last_synced_at na tabela lives
ALTER TABLE public.lives 
ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adicionar colunas para cache de métricas calculadas
ALTER TABLE public.lives 
ADD COLUMN cached_metrics JSONB,
ADD COLUMN cached_group_data JSONB,
ADD COLUMN cached_meta_data JSONB;

-- Comentários para documentação
COMMENT ON COLUMN public.lives.last_synced_at IS 'Timestamp da última sincronização de dados Meta para esta live';
COMMENT ON COLUMN public.lives.cached_metrics IS 'Cache das métricas calculadas (CPL Líquido, CPL Meta, etc.)';
COMMENT ON COLUMN public.lives.cached_group_data IS 'Cache dos dados de grupos WhatsApp';
COMMENT ON COLUMN public.lives.cached_meta_data IS 'Cache dos dados Meta (campanhas, gastos, leads)';

-- Atualizar registros existentes com timestamp atual
UPDATE public.lives 
SET last_synced_at = NOW() 
WHERE last_synced_at IS NULL;

-- Criar índice para performance em consultas de cache
CREATE INDEX idx_lives_last_synced_at ON public.lives(last_synced_at);

-- Criar índice composto para consultas por usuário e sincronização
CREATE INDEX idx_lives_user_sync ON public.lives(user_id, last_synced_at);

-- Criar índice para consultas de cache válido
CREATE INDEX idx_lives_cache_valid ON public.lives(last_synced_at) 
WHERE last_synced_at IS NOT NULL;
