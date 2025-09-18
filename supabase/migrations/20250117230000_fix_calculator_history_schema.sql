-- Fix calculator_history table schema to match frontend implementation
-- This migration alters the table to use individual columns instead of JSON fields

-- First, drop existing table if it exists with old schema
DROP TABLE IF EXISTS public.calculator_history CASCADE;

-- Create calculator_history table with individual columns
CREATE TABLE public.calculator_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_medio numeric NOT NULL,
  total_dias int NOT NULL,
  orcamento numeric NOT NULL,
  cpl_liquido numeric NOT NULL,
  comparecimento numeric NOT NULL,
  conversao numeric NOT NULL,
  leads_previstos int,
  participantes int,
  vendas_previstas int,
  receita_prevista numeric,
  roi numeric,
  lucro numeric,
  margem_lucro numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT calculator_history_pkey PRIMARY KEY (id)
);

-- Create indexes for better performance
CREATE INDEX idx_calculator_history_user_id ON public.calculator_history(user_id);
CREATE INDEX idx_calculator_history_created_at ON public.calculator_history(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.calculator_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies: users can only access their own calculations
CREATE POLICY "Users can view their own calculator history" ON public.calculator_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calculator history" ON public.calculator_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calculator history" ON public.calculator_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calculator history" ON public.calculator_history
  FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.calculator_history IS 'Stores LiveShop calculator simulation history for each user with individual columns';
COMMENT ON COLUMN public.calculator_history.id IS 'Unique identifier for the calculation record';
COMMENT ON COLUMN public.calculator_history.user_id IS 'Reference to the user who created this calculation';
COMMENT ON COLUMN public.calculator_history.ticket_medio IS 'Average ticket value in currency';
COMMENT ON COLUMN public.calculator_history.total_dias IS 'Total days for the campaign';
COMMENT ON COLUMN public.calculator_history.orcamento IS 'Total budget for the campaign';
COMMENT ON COLUMN public.calculator_history.cpl_liquido IS 'Net cost per lead';
COMMENT ON COLUMN public.calculator_history.comparecimento IS 'Attendance rate percentage';
COMMENT ON COLUMN public.calculator_history.conversao IS 'Conversion rate percentage';
COMMENT ON COLUMN public.calculator_history.leads_previstos IS 'Predicted number of leads';
COMMENT ON COLUMN public.calculator_history.participantes IS 'Predicted number of participants';
COMMENT ON COLUMN public.calculator_history.vendas_previstas IS 'Predicted number of sales';
COMMENT ON COLUMN public.calculator_history.receita_prevista IS 'Predicted revenue';
COMMENT ON COLUMN public.calculator_history.roi IS 'Return on investment percentage';
COMMENT ON COLUMN public.calculator_history.lucro IS 'Predicted profit';
COMMENT ON COLUMN public.calculator_history.margem_lucro IS 'Profit margin percentage';
COMMENT ON COLUMN public.calculator_history.created_at IS 'Timestamp when the calculation was created';
COMMENT ON COLUMN public.calculator_history.updated_at IS 'Timestamp when the calculation was last updated';