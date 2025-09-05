-- Add foreign key constraint to whatsapp_groups_log
ALTER TABLE public.whatsapp_groups_log 
ADD CONSTRAINT whatsapp_groups_log_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;