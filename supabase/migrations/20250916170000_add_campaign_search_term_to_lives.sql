-- Add campaign search term column to lives table
ALTER TABLE public.lives ADD COLUMN IF NOT EXISTS campaign_search_term TEXT;

-- Add comment to explain the purpose
COMMENT ON COLUMN public.lives.campaign_search_term IS 'Termo de busca usado para filtrar campanhas Meta Ads durante a criação da Live (ex: BLACK_FRIDAY_2025, NATAL_2024)';