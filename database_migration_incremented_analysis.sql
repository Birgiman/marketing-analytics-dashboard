-- ===============================================
-- MIGRAÇÃO PARA ANÁLISE INCREMENTADA DE CAMPANHAS
-- ===============================================
-- Data: 2025-01-16
-- Objetivo: Adicionar suporte para análise de campanhas com time_increment=1
-- Arquivo: database_migration_incremented_analysis.sql

-- ===============================================
-- 1. ADICIONAR NOVA COLUNA PARA DADOS INCREMENTADOS
-- ===============================================

-- Adicionar coluna para cache dos dados incrementados
ALTER TABLE lives ADD COLUMN IF NOT EXISTS cached_traffic_data_incremented JSONB;

-- Documentar a coluna
COMMENT ON COLUMN lives.cached_traffic_data_incremented IS
'Cache dos dados incrementados de análise de campanhas organizados por data.
Estrutura: { "campaignsByDate": { "2025-01-15": [campaigns], "2025-01-16": [campaigns] } }
Usado pela função getDeepCampaignAnalysisIncremented com time_increment=1';

-- Criar índice GIN para consultas eficientes em JSONB
CREATE INDEX IF NOT EXISTS idx_lives_cached_traffic_data_incremented
ON lives USING gin (cached_traffic_data_incremented);

-- ===============================================
-- 2. VERIFICAR COLUNAS EXISTENTES PARA LIMPEZA
-- ===============================================

-- Query para listar todas as colunas e seus status
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'lives'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===============================================
-- 3. IDENTIFICAR COLUNAS VAZIAS PARA REMOÇÃO
-- ===============================================

-- Query dinâmica para identificar colunas com zero registros
WITH column_stats AS (
    SELECT
        c.column_name,
        c.data_type,
        c.is_nullable,
        (
            CASE
                WHEN c.data_type IN ('text', 'character varying') THEN
                    FORMAT('SELECT COUNT(*) FROM lives WHERE %I IS NOT NULL AND %I != ''''', c.column_name, c.column_name)
                WHEN c.data_type = 'jsonb' THEN
                    FORMAT('SELECT COUNT(*) FROM lives WHERE %I IS NOT NULL', c.column_name)
                WHEN c.data_type LIKE 'timestamp%' THEN
                    FORMAT('SELECT COUNT(*) FROM lives WHERE %I IS NOT NULL', c.column_name)
                WHEN c.data_type IN ('integer', 'bigint', 'numeric', 'real', 'double precision') THEN
                    FORMAT('SELECT COUNT(*) FROM lives WHERE %I IS NOT NULL', c.column_name)
                WHEN c.data_type = 'boolean' THEN
                    FORMAT('SELECT COUNT(*) FROM lives WHERE %I IS NOT NULL', c.column_name)
                ELSE
                    FORMAT('SELECT COUNT(*) FROM lives WHERE %I IS NOT NULL', c.column_name)
            END
        ) as count_query
    FROM information_schema.columns c
    WHERE c.table_name = 'lives'
        AND c.table_schema = 'public'
        -- Excluir colunas essenciais que nunca devem ser removidas
        AND c.column_name NOT IN (
            'id', 'created_at', 'updated_at', 'user_id', 'name',
            'campaign_search_term', 'insights_date_since', 'insights_date_until',
            'ad_budget', 'cached_traffic_data', 'cached_traffic_data_incremented',
            'cached_traffic_metrics', 'traffic_last_synced_at'
        )
)
SELECT
    column_name,
    data_type,
    is_nullable,
    count_query,
    FORMAT('-- Para dropar %s (se estiver vazia): ALTER TABLE lives DROP COLUMN IF EXISTS %I;',
           column_name, column_name) as drop_command
FROM column_stats
ORDER BY column_name;

-- ===============================================
-- 4. COMANDOS DE LIMPEZA SEGUROS
-- ===============================================

-- ATENÇÃO: Execute APENAS após verificar que as colunas estão realmente vazias!
-- Descomente apenas as colunas que você confirmar estarem nulas:

-- Exemplos de colunas que podem estar vazias (verificar antes de usar):
-- ALTER TABLE lives DROP COLUMN IF EXISTS unused_field_1;
-- ALTER TABLE lives DROP COLUMN IF EXISTS deprecated_column;
-- ALTER TABLE lives DROP COLUMN IF EXISTS temp_data;
-- ALTER TABLE lives DROP COLUMN IF EXISTS old_cache_field;
-- ALTER TABLE lives DROP COLUMN IF EXISTS legacy_integration_data;

-- ===============================================
-- 5. VERIFICAÇÃO MANUAL DE COLUNAS ESPECÍFICAS
-- ===============================================

-- Template para verificar se uma coluna específica está vazia:
-- SELECT
--     '%%COLUMN_NAME%%' as column_name,
--     COUNT(*) as total_rows,
--     COUNT(%%COLUMN_NAME%%) as non_null_count,
--     COUNT(*) - COUNT(%%COLUMN_NAME%%) as null_count,
--     ROUND(100.0 * COUNT(%%COLUMN_NAME%%) / COUNT(*), 2) as usage_percentage
-- FROM lives;

-- Exemplo de uso:
-- SELECT
--     'some_column' as column_name,
--     COUNT(*) as total_rows,
--     COUNT(some_column) as non_null_count,
--     COUNT(*) - COUNT(some_column) as null_count,
--     ROUND(100.0 * COUNT(some_column) / COUNT(*), 2) as usage_percentage
-- FROM lives;

-- ===============================================
-- 6. OTIMIZAÇÃO PÓS-MIGRAÇÃO
-- ===============================================

-- Após realizar as alterações, execute para otimizar:
-- VACUUM ANALYZE lives;

-- Para otimização completa (pode demorar, fazer fora do horário de pico):
-- VACUUM FULL lives;
-- ANALYZE lives;

-- ===============================================
-- 7. VERIFICAÇÃO FINAL
-- ===============================================

-- Verificar se a nova coluna foi criada corretamente
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lives'
    AND column_name = 'cached_traffic_data_incremented';

-- Verificar se o índice foi criado
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'lives'
    AND indexname = 'idx_lives_cached_traffic_data_incremented';

-- Verificar tamanho da tabela após otimização
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename = 'lives'
    AND attname = 'cached_traffic_data_incremented';

-- ===============================================
-- FIM DA MIGRAÇÃO
-- ===============================================