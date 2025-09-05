-- Enable Row Level Security on whatsapp_groups_log
ALTER TABLE public.whatsapp_groups_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_groups_log
CREATE POLICY "Users can view their own whatsapp groups log" 
ON public.whatsapp_groups_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own whatsapp groups log" 
ON public.whatsapp_groups_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own whatsapp groups log" 
ON public.whatsapp_groups_log 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own whatsapp groups log" 
ON public.whatsapp_groups_log 
FOR DELETE 
USING (auth.uid() = user_id);