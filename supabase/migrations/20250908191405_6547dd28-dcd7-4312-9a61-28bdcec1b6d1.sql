-- Add new columns to lives table for campaign details
ALTER TABLE public.lives ADD COLUMN IF NOT EXISTS captacao_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.lives ADD COLUMN IF NOT EXISTS ta_rolando_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.lives ADD COLUMN IF NOT EXISTS ta_rolando_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.lives ADD COLUMN IF NOT EXISTS sales_goal INTEGER DEFAULT 0;
ALTER TABLE public.lives ADD COLUMN IF NOT EXISTS leads_goal INTEGER DEFAULT 0; 
ALTER TABLE public.lives ADD COLUMN IF NOT EXISTS ad_budget NUMERIC DEFAULT 0;

-- Create live_groups table to link groups to lives
CREATE TABLE IF NOT EXISTS public.live_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id UUID NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  group_size INTEGER DEFAULT 0,
  monitoring BOOLEAN DEFAULT true,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(live_id, group_id)
);

-- Enable RLS on live_groups
ALTER TABLE public.live_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for live_groups
CREATE POLICY "Users can view their own live groups" 
ON public.live_groups 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own live groups" 
ON public.live_groups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own live groups" 
ON public.live_groups 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own live groups" 
ON public.live_groups 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on live_groups
CREATE TRIGGER update_live_groups_updated_at
BEFORE UPDATE ON public.live_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();