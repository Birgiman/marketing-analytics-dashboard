-- Rename grupos table to whatsapp_groups_log
ALTER TABLE public.grupos RENAME TO whatsapp_groups_log;

-- Drop the specified columns
ALTER TABLE public.whatsapp_groups_log
  DROP COLUMN IF EXISTS data_hora,
  DROP COLUMN IF EXISTS data,
  DROP COLUMN IF EXISTS hora;