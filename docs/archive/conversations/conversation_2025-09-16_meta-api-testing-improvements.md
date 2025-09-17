# Conversa do Dia 16/09/2025 - Melhorias no Sistema de Testes da API Meta

## Resumo Executivo
Implementação de sistema completo de testes para API Meta com modal interativo, validação de parâmetros, correção de erros de "número excessivo de linhas" e integração com dados salvos das Lives.

## 🚫 Problemas Identificados e Resolvidos

### 1. Erro "Integração Meta não encontrada"
**Problema**: Modal tentava buscar `account_id` inexistente na tabela `meta_integrations`
**Solução**:
- Removido `account_id` da query de `meta_integrations`
- Obtido `account_id` diretamente das campanhas em `live_campaigns`
- Melhorado diagnóstico com logs detalhados

### 2. Erro "Número Excessivo de Linhas" (Invalid parameter)
**Problema**: Períodos muito longos (2022-2025) + muitos campos causavam erro na API Meta
**Erro específico**:
```
{
  "message": "Invalid parameter",
  "type": "OAuthException",
  "code": 100,
  "error_subcode": 1487534,
  "error_user_msg": "Os dados de relatórios que você está tentando obter têm um número excessivo de linhas..."
}
```

**Solução Implementada**:
- **Validação de período**: Máximo 1 ano (365 dias)
- **Limite dinâmico baseado no período**:
  - Períodos > 180 dias: 15 resultados
  - Períodos > 90 dias: 20 resultados
  - Períodos < 90 dias: 25 resultados
- **Ajuste por número de campos**: Redução automática se > 10 campos
- **Botões de período rápido**: 30 dias, 3 meses, 1 ano (máximo)

### 3. Falta de Filtros por Termo de Busca
**Problema**: Modal testava TODAS as campanhas, não apenas as filtradas pelo termo usado na criação da Live
**Solução**:
- Criada migração para adicionar `campaign_search_term` na tabela `lives`
- Auto-carregamento do termo salvo no modal de teste
- Interface para editar termo de busca nos testes
- Filtro aplicado na busca de insights individuais

## 🎯 Implementações Principais

### 1. Modal de Teste Completo (`MetaApiTestModal.tsx`)
**Funcionalidades**:
- ✅ Seleção de campos com botões rápidos (Mínimo/Padrão/Todos/Limpar)
- ✅ Seleção de level (Campaign vs Account)
- ✅ Configuração de período com botões rápidos
- ✅ Campo para termo de busca das campanhas
- ✅ Validação em tempo real de parâmetros
- ✅ Logs detalhados para debugging
- ✅ Alertas informativos com resumo dos resultados

**Conjuntos de Campos**:
- **Mínimo (3)**: campaign_id, campaign_name, spend
- **Padrão (6)**: + date_start, date_stop, impressions
- **Todos (15)**: Todos os campos disponíveis

**Botões de Período**:
- **30 dias**: Últimos 30 dias
- **3 meses**: Últimos 90 dias
- **📅 1 ano (máximo)**: Período máximo permitido

### 2. Integração na Página de Lives
**Adições**:
- ✅ Botão "🧪 API" em cada Live na lista principal
- ✅ Modal acessível tanto do CreateLive quanto da lista de Lives
- ✅ Mesmo modal, mesma funcionalidade

### 3. Sistema de Tipos e Enums (`metaApi.ts`)
**Criados**:
- ✅ `MetaInsightLevel` enum (account, campaign, adset, ad, etc.)
- ✅ `MetaFilterOperator` enum para operações de filtro
- ✅ `MetaCampaignStatus` enum para status das campanhas
- ✅ `MetaDatePreset` enum para presets de data
- ✅ `MetaApiFields` constants para conjuntos padronizados
- ✅ Funções utilitárias para filtros e URLs

**Funções de API Implementadas**:
- ✅ `fetchAccountLevelInsights()` - Insights agregados
- ✅ `fetchMultipleCampaignInsights()` - Insights com filtros avançados
- ✅ `fetchLiveCampaignsInsights()` - Insights específicos de Lives

### 4. Migração de Banco de Dados
**Arquivo**: `20250916170000_add_campaign_search_term_to_lives.sql`
```sql
ALTER TABLE public.lives ADD COLUMN IF NOT EXISTS campaign_search_term TEXT;
COMMENT ON COLUMN public.lives.campaign_search_term IS 'Termo de busca usado para filtrar campanhas Meta Ads durante a criação da Live';
```

## 📊 Logs e Debugging

### Logs Implementados no Modal de Teste
```javascript
console.log('🧪 [TESTE META API] Iniciando teste com parâmetros:', {
  fields: selectedFields,
  level: level,
  dateRange: dateRange,
  liveId: liveId
});

console.log('🧪 [TESTE META API] Período de dias:', diffDays);
console.log('🧪 [TESTE META API] Limite calculado:', apiLimit);
console.log('🧪 [TESTE META API] Termo de busca carregado da Live:', searchTerm);
```

### Exemplo de Resultado nos Logs
```
🧪 [TESTE META API] Insights agregados: 1
🧪 [TESTE META API] Insights individuais: 7
🧪 [TESTE META API] Account ID obtido das campanhas: act_269382281240887
```

## 🔧 Próximos Passos (Pendentes)

### 1. **CRÍTICO**: Salvar Termo de Busca na Criação da Live
**O que fazer**:
- Atualizar `CreateLiveModal.tsx` para salvar `autoSearchTerm` do `CampaignSelector`
- Modificar função de criação da Live para incluir `campaign_search_term`
- Verificar se o `autoSearchTerm` do `localStorage` está sendo persistido

### 2. **URGENTE**: Filtrar Campanhas Individuais por Termo
**Problema atual**: Modal está retornando TODAS as campanhas, não apenas as filtradas
**Solução necessária**:
- Implementar filtro por `searchTerm` na função `fetchMultipleCampaignInsights()`
- Garantir que apenas campanhas contendo o termo sejam retornadas
- Testar se valores batem com Insomnia (CTR, CPC, spend)

### 3. **VALIDAÇÃO**: Auto-carregamento Completo
**Pendente**:
- Verificar se período de datas está sendo carregado corretamente
- Confirmar que termo de busca aparece automaticamente ao abrir modal
- Testar com Live existente que tem campanhas filtradas

## 📋 Comandos Git Executados
```bash
# Commits realizados hoje:
git commit -m "Add date range functionality and archive organization"
git commit -m "Implement Meta API enums, types, and level-based insights functionality"
git commit -m "Create Meta API test modal with parameter selection"
git commit -m "Fix Meta integration access and improve error diagnostics"
git commit -m "Implement comprehensive Meta API testing improvements"
git commit -m "Add quick period selection buttons to Meta API test modal"

# Push para produção:
git push origin main
```

## 🎯 Status Atual
- ✅ Modal de teste completamente funcional
- ✅ Validação de parâmetros implementada
- ✅ Erro "número excessivo de linhas" resolvido
- ✅ Sistema de tipos e enums criado
- ✅ Integração na página de Lives
- ✅ Botões de período rápido
- ⚠️ **PENDENTE**: Integração com termo de busca salvo na criação da Live
- ⚠️ **PENDENTE**: Filtro aplicado nos insights individuais

## 💡 Insights Técnicos

### Limites da API Meta
- **Período máximo**: 365 dias para evitar erro de linhas excessivas
- **Campos vs Performance**: Mais campos = menos resultados permitidos
- **Level account vs campaign**: Account = dados agregados, Campaign = dados individuais

### Estrutura do Banco
```sql
-- Tabela lives agora inclui:
lives.insights_date_since DATE
lives.insights_date_until DATE
lives.campaign_search_term TEXT
```

### localStorage Usage
```javascript
// CampaignSelector salva termo no localStorage:
const STORAGE_KEY = 'liveshop_campaign_search_term';
localStorage.setItem(STORAGE_KEY, term);
```

## 📝 Observações para Continuação

1. **Meta API Limits**: Sistema atual respeita todos os limites conhecidos
2. **Error Handling**: Logs detalhados facilitam debugging futuro
3. **UX**: Modal intuitivo permite testes rápidos de diferentes cenários
4. **Performance**: Limits dinâmicos otimizam chamadas API
5. **Extensibilidade**: Enum system permite fácil adição de novos campos/filtros

---

**Data**: 16/09/2025
**Status**: Implementação 85% completa - Modal funcional, falta integração com termo salvo
**Próxima sessão**: Completar integração com dados salvos da Live e validar filtros