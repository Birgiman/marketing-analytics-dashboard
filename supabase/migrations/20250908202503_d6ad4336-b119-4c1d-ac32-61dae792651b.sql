-- Create table for deleted lives (soft delete)
CREATE TABLE public.deleted_lives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_live_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  live_date TIMESTAMP WITH TIME ZONE,
  captacao_start TIMESTAMP WITH TIME ZONE,
  ta_rolando_start TIMESTAMP WITH TIME ZONE,
  ta_rolando_end TIMESTAMP WITH TIME ZONE,
  sales_goal INTEGER DEFAULT 0,
  leads_goal INTEGER DEFAULT 0,
  ad_budget NUMERIC DEFAULT 0,
  participants INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  current_viewers INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS
ALTER TABLE public.deleted_lives ENABLE ROW LEVEL SECURITY;

-- Create policies for deleted_lives
CREATE POLICY "Users can view their own deleted lives" 
ON public.deleted_lives 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deleted lives" 
ON public.deleted_lives 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create table for deleted live groups
CREATE TABLE public.deleted_live_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_live_group_id UUID NOT NULL,
  original_live_id UUID NOT NULL,
  user_id UUID NOT NULL,
  group_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  group_size INTEGER DEFAULT 0,
  monitoring BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS
ALTER TABLE public.deleted_live_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for deleted_live_groups
CREATE POLICY "Users can view their own deleted live groups" 
ON public.deleted_live_groups 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deleted live groups" 
ON public.deleted_live_groups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);