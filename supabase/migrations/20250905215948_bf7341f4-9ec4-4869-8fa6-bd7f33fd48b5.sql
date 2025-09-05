-- Create whatsapp_groups_log table
CREATE TABLE public.whatsapp_groups_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  id_grupo text NULL,
  nome_grupo text NULL,
  telefone text NULL,
  evento text NULL, -- 'joined' ou 'left'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_groups_log_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_groups_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);