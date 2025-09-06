-- Add api_token field to whatsapp_instances table
ALTER TABLE public.whatsapp_instances 
ADD COLUMN IF NOT EXISTS api_token text;

-- Add comment explaining the field
COMMENT ON COLUMN public.whatsapp_instances.api_token IS 'Token único da Evolution API para esta instância específica';