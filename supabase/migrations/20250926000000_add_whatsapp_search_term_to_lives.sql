-- Add whatsapp search term column to lives table
-- Data: 2025-09-26
-- Descrição: Adiciona campo para termo de busca de grupos WhatsApp, similar ao campaign_search_term

ALTER TABLE public.lives ADD COLUMN IF NOT EXISTS whatsapp_search_term TEXT;

-- Add comment to explain the purpose
COMMENT ON COLUMN public.lives.whatsapp_search_term IS 'Termo de busca usado para filtrar grupos WhatsApp durante a criação da Live (ex: BLACK_FRIDAY, NATAL_2024). Permite busca dinâmica de novos grupos que correspondam ao termo.';

-- Create index for performance on searches
CREATE INDEX IF NOT EXISTS idx_lives_whatsapp_search_term ON public.lives(whatsapp_search_term);
