-- Execute este SQL no dashboard do Supabase (SQL Editor)
-- Para criar a tabela calculator_history

-- Create calculator_history table for storing LiveShop calculator simulations
CREATE TABLE IF NOT EXISTS public.calculator_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  inputs jsonb NOT NULL,
  results jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT calculator_history_pkey PRIMARY KEY (id),
  CONSTRAINT calculator_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_calculator_history_user_id ON public.calculator_history(user_id);

-- Create index for faster queries by creation date
CREATE INDEX IF NOT EXISTS idx_calculator_history_created_at ON public.calculator_history(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.calculator_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own calculator history" ON public.calculator_history;
DROP POLICY IF EXISTS "Users can insert their own calculator history" ON public.calculator_history;
DROP POLICY IF EXISTS "Users can update their own calculator history" ON public.calculator_history;
DROP POLICY IF EXISTS "Users can delete their own calculator history" ON public.calculator_history;

-- Create RLS policy: users can only access their own calculations
CREATE POLICY "Users can view their own calculator history" ON public.calculator_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calculator history" ON public.calculator_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calculator history" ON public.calculator_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calculator history" ON public.calculator_history
  FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.calculator_history IS 'Stores LiveShop calculator simulation history for each user';
COMMENT ON COLUMN public.calculator_history.id IS 'Unique identifier for the calculation record';
COMMENT ON COLUMN public.calculator_history.user_id IS 'Reference to the user who created this calculation';
COMMENT ON COLUMN public.calculator_history.name IS 'User-defined name for the simulation';
COMMENT ON COLUMN public.calculator_history.inputs IS 'JSON object containing input parameters (ticketMedio, orcamento, cplLiquido, etc.)';
COMMENT ON COLUMN public.calculator_history.results IS 'JSON object containing calculated results (leadsPrevistos, receitaPrevista, roi, etc.)';
COMMENT ON COLUMN public.calculator_history.created_at IS 'Timestamp when the calculation was created';
COMMENT ON COLUMN public.calculator_history.updated_at IS 'Timestamp when the calculation was last updated';
