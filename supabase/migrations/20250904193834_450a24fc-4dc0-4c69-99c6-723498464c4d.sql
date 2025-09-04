-- Create missing enums
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create pesquisa table
CREATE TABLE public.pesquisa (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT pesquisa_pkey PRIMARY KEY (id)
);

-- Enable RLS on pesquisa
ALTER TABLE public.pesquisa ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pesquisa
CREATE POLICY "Users can view their own pesquisa" 
ON public.pesquisa 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pesquisa" 
ON public.pesquisa 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pesquisa" 
ON public.pesquisa 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pesquisa" 
ON public.pesquisa 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create whatsapp_deletion_logs table
CREATE TABLE public.whatsapp_deletion_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  instance_name text NOT NULL,
  action text NOT NULL,
  validation_passed boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  error text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_deletion_logs_pkey PRIMARY KEY (id)
);

-- Enable RLS on whatsapp_deletion_logs
ALTER TABLE public.whatsapp_deletion_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_deletion_logs
CREATE POLICY "Users can view their own deletion logs" 
ON public.whatsapp_deletion_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deletion logs" 
ON public.whatsapp_deletion_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create whatsapp_logs table
CREATE TABLE public.whatsapp_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  instance_name text NOT NULL,
  user_name text,
  action text NOT NULL,
  data jsonb,
  error text,
  user_agent text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_logs_pkey PRIMARY KEY (id)
);

-- Enable RLS on whatsapp_logs
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_logs
CREATE POLICY "Users can view their own whatsapp logs" 
ON public.whatsapp_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own whatsapp logs" 
ON public.whatsapp_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add missing user_id column to lives table
ALTER TABLE public.lives ADD COLUMN user_id uuid;

-- Update lives RLS policies to include user_id constraint
DROP POLICY IF EXISTS "Users can view their own lives" ON public.lives;
DROP POLICY IF EXISTS "Users can insert their own lives" ON public.lives;
DROP POLICY IF EXISTS "Users can update their own lives" ON public.lives;
DROP POLICY IF EXISTS "Users can delete their own lives" ON public.lives;

CREATE POLICY "Users can view their own lives" 
ON public.lives 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lives" 
ON public.lives 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lives" 
ON public.lives 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lives" 
ON public.lives 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_pesquisa_updated_at
BEFORE UPDATE ON public.pesquisa
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_logs_updated_at
BEFORE UPDATE ON public.whatsapp_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();