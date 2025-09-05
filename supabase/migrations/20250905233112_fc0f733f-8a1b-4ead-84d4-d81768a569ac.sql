-- Create whatsapp_groups table for caching group information
CREATE TABLE public.whatsapp_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id) -- Same group can exist for different users
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own groups" 
ON public.whatsapp_groups 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own groups" 
ON public.whatsapp_groups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own groups" 
ON public.whatsapp_groups 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own groups" 
ON public.whatsapp_groups 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_whatsapp_groups_updated_at
BEFORE UPDATE ON public.whatsapp_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();