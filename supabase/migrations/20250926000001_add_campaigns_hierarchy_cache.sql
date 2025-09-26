-- Adicionar campo para cache da tabela hierárquica de campanhas
ALTER TABLE lives 
ADD COLUMN campaigns_hierarchy_last_synced_at TIMESTAMPTZ DEFAULT NOW();

-- Comentário explicativo
COMMENT ON COLUMN lives.campaigns_hierarchy_last_synced_at IS 'Timestamp da última sincronização da tabela hierárquica de campanhas (cache independente de 60 minutos)';
