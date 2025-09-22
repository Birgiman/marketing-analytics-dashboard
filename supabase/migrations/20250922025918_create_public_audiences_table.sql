-- Migration: Create public_audiences table
-- Description: Tabela para armazenar públicos criados pelos usuários com correlação de campanhas e grupos

CREATE TABLE public.public_audiences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  live_id uuid NOT NULL,
  title text NOT NULL,
  campaign_term text NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT public_audiences_pkey PRIMARY KEY (id),
  CONSTRAINT public_audiences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT public_audiences_live_id_fkey FOREIGN KEY (live_id) REFERENCES public.lives(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_public_audiences_user_id ON public.public_audiences(user_id);
CREATE INDEX idx_public_audiences_live_id ON public.public_audiences(live_id);
CREATE INDEX idx_public_audiences_campaign_term ON public.public_audiences(campaign_term);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.public_audiences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own audiences
CREATE POLICY "Users can view own audiences" ON public.public_audiences
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own audiences
CREATE POLICY "Users can insert own audiences" ON public.public_audiences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own audiences
CREATE POLICY "Users can update own audiences" ON public.public_audiences
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own audiences
CREATE POLICY "Users can delete own audiences" ON public.public_audiences
  FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.public_audiences IS 'Tabela para armazenar públicos criados pelos usuários com correlação de campanhas e grupos';
COMMENT ON COLUMN public.public_audiences.title IS 'Título do público definido pelo usuário (ex: "Público 100 reais")';
COMMENT ON COLUMN public.public_audiences.campaign_term IS 'Termo de campanha para filtrar campanhas do Meta (ex: "NOVOS_MACEIO_14-08-25")';
COMMENT ON COLUMN public.public_audiences.emoji IS 'Emoji do grupo do WhatsApp para correlacionar grupos (ex: "🚀")';
