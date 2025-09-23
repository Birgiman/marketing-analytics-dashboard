-- Migration: Adicionar cache para dados de públicos na tela SalesByGroup
-- Data: 2025-01-23
-- Descrição: Adiciona colunas para cache de métricas e dados de públicos

-- Verificar se as colunas já existem antes de adicionar
DO $$ 
BEGIN
    -- Adicionar coluna cached_public_metrics se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lives' AND column_name = 'cached_public_metrics'
    ) THEN
        ALTER TABLE public.lives ADD COLUMN cached_public_metrics JSONB;
    END IF;

    -- Adicionar coluna cached_public_insights se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lives' AND column_name = 'cached_public_insights'
    ) THEN
        ALTER TABLE public.lives ADD COLUMN cached_public_insights JSONB;
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN public.lives.cached_public_metrics IS 'Cache das métricas calculadas para tela de públicos (CPL, retenção, etc.)';
COMMENT ON COLUMN public.lives.cached_public_insights IS 'Cache dos insights e metadados para tela de públicos';

-- Criar índices para performance (apenas se não existirem)
CREATE INDEX IF NOT EXISTS idx_lives_public_cache ON public.lives(cached_public_metrics) 
WHERE cached_public_metrics IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lives_public_insights ON public.lives(cached_public_insights) 
WHERE cached_public_insights IS NOT NULL;
