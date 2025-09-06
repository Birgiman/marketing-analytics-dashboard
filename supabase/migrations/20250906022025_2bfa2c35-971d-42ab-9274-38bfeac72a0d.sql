-- Update existing instance with API token from secrets
UPDATE public.whatsapp_instances 
SET api_token = (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'EVOLUTION_API_TOKEN_INSTANCE')
WHERE instance_name = 'liveshop_admin_liveshop';