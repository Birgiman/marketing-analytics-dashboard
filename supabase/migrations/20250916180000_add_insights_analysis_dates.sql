-- Adicionar colunas para separar datas de análise Meta das datas da Live
-- Datas da Live: captation_start, captation_end (já existem)
-- Datas de Análise: insights_date_since, insights_date_until (novas)

ALTER TABLE public.lives
ADD COLUMN IF NOT EXISTS insights_date_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS insights_date_until TIMESTAMPTZ;

-- Comentários para documentar a separação
COMMENT ON COLUMN public.lives.insights_date_since IS 'Data inicial do período para análise de insights Meta (independente das datas da Live)';
COMMENT ON COLUMN public.lives.insights_date_until IS 'Data final do período para análise de insights Meta (independente das datas da Live)';

-- Índices para performance nas consultas por período de análise
CREATE INDEX IF NOT EXISTS idx_lives_insights_date_range
ON public.lives (insights_date_since, insights_date_until);