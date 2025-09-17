# Conversa do Dia 16/09/2025 - Correções no Modal de Testes da API Meta

## Resumo Executivo
Correção de bugs críticos no sistema de testes da API Meta relacionados a filtros hardcoded, limite fixo de 100, campos não respeitando seleção do usuário e falta de interface para seleção de status das campanhas.

## 🚫 Problemas Identificados e Corrigidos

### 1. Filtros Hardcoded (Crítico)
**Problema**: Filtros de status e termo de busca estavam hardcoded no código
**Impacto**:
- Status sempre "ACTIVE" e "PAUSED" independente da seleção
- Termo de busca não aparecia na requisição
- Interface não refletia comportamento real

**Solução Implementada**:
- Filtros agora são **dinâmicos** baseados na seleção do usuário
- Filtro de status só inclui valores selecionados pelo usuário
- Filtro de termo só é adicionado se preenchido

### 2. Limite Fixo de 100 (Performance)
**Problema**: `limit=100` aparecia em todas as requisições mesmo sem ser solicitado
**Localização**: Funções `fetchAccountLevelInsights` e `fetchMultipleCampaignInsights`
**Solução**:
- Removido `limit = 100` padrão das funções
- Limite só é adicionado na URL se explicitamente fornecido
- API Meta determina limites apropriados automaticamente

### 3. Fields Não Respeitavam Seleção
**Problema**: Requisições usavam campos fixos (`MetaApiFields.CAMPAIGN_INSIGHTS`) independente da seleção
**Solução**:
- `fetchLiveCampaignsInsights` refatorada para usar `fields: selectedFields`
- Uma única requisição baseada no level escolhido
- Campos enviados correspondem exatamente à seleção do usuário

### 4. Falta de Interface para Status
**Problema**: Usuário não podia escolher entre campanhas ativas/pausadas
**Solução**:
- Adicionado seletor com checkboxes: ✅ Ativas e ⏸️ Pausadas
- Ambos selecionados por padrão
- Filtro dinâmico baseado na seleção

## 🎯 Implementações Realizadas

### 1. Sistema de Filtros Dinâmicos
```javascript
// Criar filtros dinâmicos baseados na seleção do usuário
const filters = [];

// Filtro de status (sempre presente, baseado na seleção)
if (campaignStatus.length > 0) {
  filters.push({
    "field": "campaign.effective_status",
    "operator": "IN",
    "value": campaignStatus
  });
}

// Filtro de nome (só se termo for fornecido)
if (searchTerm.trim()) {
  filters.push({
    "field": "campaign.name",
    "operator": "CONTAIN",
    "value": searchTerm.trim()
  });
}
```

### 2. Interface de Seleção de Status
```jsx
{/* Status das Campanhas */}
<div className="space-y-2">
  <Label className="text-sm font-medium">Status das Campanhas</Label>
  <div className="flex gap-4">
    <Checkbox
      checked={campaignStatus.includes('ACTIVE')}
      onCheckedChange={...}
    />
    <Label>✅ Ativas</Label>

    <Checkbox
      checked={campaignStatus.includes('PAUSED')}
      onCheckedChange={...}
    />
    <Label>⏸️ Pausadas</Label>
  </div>
</div>
```

### 3. Validação Aprimorada
- **Termo de busca**: Mínimo 2 caracteres obrigatório
- **Botão desabilitado**: Se campos < 1 ou termo < 2 caracteres
- **Status**: Pelo menos um status deve estar selecionado

## 📊 Arquivos Modificados

### 1. **MetaApiTestModal.tsx**
- ✅ Adicionado estado `campaignStatus` com checkboxes
- ✅ Filtros dinâmicos baseados na seleção
- ✅ Validação de termo de busca (min 2 chars)
- ✅ Interface para seleção de status

### 2. **metaApi.ts**
- ✅ `fetchAccountLevelInsights`: Removido `limit = 100`
- ✅ `fetchMultipleCampaignInsights`: Removido `limit = 100`
- ✅ `fetchLiveCampaignsInsights`: Refatorada para usar opções do usuário
- ✅ Limite só adicionado se fornecido explicitamente

### 3. **Migrations**
- ✅ `20250916180000_add_insights_analysis_dates.sql`: Colunas de datas de análise
- ✅ Separação entre datas da Live e datas de análise Meta

### 4. **useLives.tsx**
- ✅ Interface `LiveData` atualizada com `insights_date_since/until`
- ✅ `createLiveWithGroups` salva datas de análise
- ✅ `updateLiveWithGroups` atualiza datas de análise

## 🔧 Comportamento Anterior vs Atual

### ❌ **Antes (Bugado)**
```bash
# Requisição com problemas
GET /insights?fields=campaign_id,campaign_name,impressions,ctr,cpc,spend,date_start,date_stop,actions,cost_per_action_type
&level=campaign
&limit=100  # ← Limite fixo não solicitado
&filtering=[{"field":"campaign.effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]
# ← Faltando filtro de termo de busca
```

### ✅ **Agora (Correto)**
```bash
# Requisição corrigida
GET /insights?fields=spend  # ← Só campo selecionado
&level=campaign
# ← Sem limite fixo
&filtering=[
  {"field":"campaign.effective_status","operator":"IN","value":["ACTIVE"]},  # ← Baseado na seleção
  {"field":"campaign.name","operator":"CONTAIN","value":"Post Do Instagram"}  # ← Termo dinâmico
]
```

## 📋 SQL Executado

### Colunas de Análise Meta
```sql
ALTER TABLE public.lives
ADD COLUMN IF NOT EXISTS insights_date_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS insights_date_until TIMESTAMPTZ;

COMMENT ON COLUMN public.lives.insights_date_since IS 'Data inicial do período para análise de insights Meta';
COMMENT ON COLUMN public.lives.insights_date_until IS 'Data final do período para análise de insights Meta';
```

### Campo de Termo de Busca
```sql
ALTER TABLE public.lives
ADD COLUMN IF NOT EXISTS campaign_search_term TEXT;

COMMENT ON COLUMN public.lives.campaign_search_term IS 'Termo de busca usado para filtrar campanhas Meta Ads durante a criação da Live';
```

## 🧪 Teste Realizado

### Configuração do Teste
- **Campos selecionados**: Apenas `spend`
- **Level**: Campaign
- **Período**: 2022-08-16 até 2025-09-20
- **Termo de busca**: "Post Do Instagram"
- **Status**: Apenas "ACTIVE"

### Resultado Esperado
```javascript
// Requisição correta
{
  fields: ["spend"],
  level: "campaign",
  dateRange: { since: "2022-08-16", until: "2025-09-20" },
  filtering: [
    { field: "campaign.effective_status", operator: "IN", value: ["ACTIVE"] },
    { field: "campaign.name", operator: "CONTAIN", value: "Post Do Instagram" }
  ]
}
```

## 📝 Comandos Git Executados

```bash
# Commit das correções
git add .
git commit -m "Fix Meta API test modal filtering and limit issues

- Fix dynamic filtering: status and search term now respect user selection
- Remove hardcoded limit=100 from API requests
- Add campaign status selector (Active/Paused) in modal interface
- Ensure search term filter appears in API request when provided
- Fix single request instead of duplicate requests
- Respect user field selection in API calls

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## 🎯 Status Atual

- ✅ **Filtros dinâmicos**: Baseados na seleção do usuário
- ✅ **Sem limite fixo**: API Meta determina limites
- ✅ **Campos corretos**: Respeitam seleção do modal
- ✅ **Interface completa**: Seleção de status e termo
- ✅ **Validação robusta**: Termo mínimo e campos obrigatórios
- ✅ **Uma requisição**: Não mais duplicatas
- ✅ **Datas separadas**: Live vs Análise Meta

## 💡 Lições Aprendidas

### Erros Evitados
1. **Nunca hardcodar filtros** - sempre tornar dinâmicos
2. **Remover limites fixos** - deixar API decidir
3. **Validar interface vs comportamento** - garantir que UI reflete realidade
4. **Testar requisições reais** - verificar URLs geradas

### Boas Práticas Implementadas
1. **Filtros condicionais** - só adicionar se necessário
2. **Validação front-end** - evitar requisições inválidas
3. **Logging detalhado** - facilitar debug futuro
4. **Commit descritivo** - documentar todas as mudanças

---

**Data**: 16/09/2025
**Status**: Concluído - Modal de testes Meta totalmente funcional
**Próxima sessão**: Testes de validação e possíveis melhorias de UX