-- Add insights date range columns to lives table
ALTER TABLE public.lives ADD COLUMN IF NOT EXISTS insights_date_since DATE;
ALTER TABLE public.lives ADD COLUMN IF NOT EXISTS insights_date_until DATE;

-- Add comment to explain the purpose
COMMENT ON COLUMN public.lives.insights_date_since IS 'Data inicial para busca de insights das campanhas Meta Ads vinculadas à Live';
COMMENT ON COLUMN public.lives.insights_date_until IS 'Data final para busca de insights das campanhas Meta Ads vinculadas à Live';