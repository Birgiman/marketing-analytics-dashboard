-- Migration: Criar tabela para Job Queue de fetch de grupos WhatsApp
-- Data: 2025-09-25
-- Autor: Claude Code - Job Queue Assíncrono

CREATE TABLE IF NOT EXISTS public.whatsapp_group_fetch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  instance_name text NOT NULL,
  search_term text,
  status text NOT NULL DEFAULT 'pending',  -- pending | running | failed | completed
  current_page integer DEFAULT 0,
  total_pages integer,
  chunk_size integer NOT NULL DEFAULT 10,
  page_delay integer NOT NULL DEFAULT 500,
  result_count integer DEFAULT 0,
  last_error text,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_group_fetch_jobs_user_id
ON public.whatsapp_group_fetch_jobs (user_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_group_fetch_jobs_status
ON public.whatsapp_group_fetch_jobs (status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_group_fetch_jobs_created_at
ON public.whatsapp_group_fetch_jobs (created_at);

-- Constraint para garantir status válidos
ALTER TABLE public.whatsapp_group_fetch_jobs
ADD CONSTRAINT check_status
CHECK (status IN ('pending', 'running', 'failed', 'completed'));

-- RLS (Row Level Security) para usuários só verem seus próprios jobs
ALTER TABLE public.whatsapp_group_fetch_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
ON public.whatsapp_group_fetch_jobs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
ON public.whatsapp_group_fetch_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger para auto-update do updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_group_fetch_jobs_updated_at
    BEFORE UPDATE ON public.whatsapp_group_fetch_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.whatsapp_group_fetch_jobs IS 'Job Queue para processamento assíncrono de busca de grupos WhatsApp';
COMMENT ON COLUMN public.whatsapp_group_fetch_jobs.status IS 'Status do job: pending, running, failed, completed';
COMMENT ON COLUMN public.whatsapp_group_fetch_jobs.current_page IS 'Página atual sendo processada (0 = não iniciado)';
COMMENT ON COLUMN public.whatsapp_group_fetch_jobs.result_count IS 'Total de grupos encontrados até agora';
COMMENT ON COLUMN public.whatsapp_group_fetch_jobs.chunk_size IS 'Quantidade de grupos por página';
COMMENT ON COLUMN public.whatsapp_group_fetch_jobs.page_delay IS 'Delay em ms entre páginas';