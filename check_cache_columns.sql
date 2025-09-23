-- Verificar se as colunas de cache existem na tabela lives
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'lives' 
AND table_schema = 'public'
AND column_name IN ('last_synced_at', 'cached_metrics', 'cached_group_data', 'cached_meta_data')
ORDER BY column_name;
