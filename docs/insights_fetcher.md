# 📊 Função Centralizada de Insights - Meta Marketing API

## 🎯 Objetivo

A função `fetchMetaInsights` é a **função centralizada e reutilizável** para buscar insights de campanhas, contas, ad sets e anúncios da API Meta Marketing. Esta função substitui todas as funções duplicadas existentes no projeto, garantindo consistência e modularidade.

## 📋 Parâmetros

### Obrigatórios

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `targetId` | `string` | ID do recurso (campaign_id, ad_account_id, ad_id, etc.) |
| `accessToken` | `string` | Token de acesso da API Meta |
| `options.level` | `'campaign' \| 'account' \| 'adset' \| 'ad'` | Nível de agregação dos insights |

### Opcionais (com valores padrão)

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `fields` | `string[]` | `['campaign_name', 'impressions', 'spend']` | Campos a serem retornados |
| `timeRange` | `{ since: string; until: string }` | - | Período personalizado (obrigatório se não usar datePreset) |
| `datePreset` | `string` | `'last_30_days'` | Período pré-definido (obrigatório se não usar timeRange) |
| `filtering` | `Array<Filter>` | `[]` | Filtros para a requisição |
| `limit` | `number` | - | Limite de resultados |
| `timeIncrement` | `number \| '1' \| '7' \| '30'` | `'1'` | Incremento de tempo para agregação |

## 🔧 Campos Mínimos Obrigatórios

A função sempre inclui estes campos por padrão:
- `campaign_name` - Nome da campanha
- `impressions` - Número de impressões
- `spend` - Valor gasto

## 📅 Períodos de Tempo

### Date Presets Disponíveis
- `today`, `yesterday`
- `this_week`, `last_week`
- `this_month`, `last_month`
- `this_quarter`, `last_quarter`
- `this_year`, `last_year`
- `last_3_months`, `last_6_months`, `last_12_months`
- `last_7_days`, `last_14_days`, `last_30_days`, `last_90_days`
- `this_week_mon_today`, `this_week_sun_today`
- `last_2_weeks`, `last_28_days`

### Time Range Personalizado
- **Limite máximo**: 1 ano a partir da data atual
- **Validação automática**: A função valida se o período não excede o limite da API Meta

## 🔍 Filtros

### Estrutura do Filtro
```typescript
{
  field: string;           // Campo a ser filtrado
  operator: 'IN' | 'NOT_IN' | 'EQUAL' | 'NOT_EQUAL' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAIN' | 'NOT_CONTAIN';
  value: string | string[] | number;  // Valor do filtro
}
```

### Exemplos de Filtros
```typescript
// Filtrar por status da campanha
{ field: 'campaign.status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }

// Filtrar por nome da campanha
{ field: 'campaign.name', operator: 'CONTAIN', value: 'Black Friday' }

// Filtrar por valor gasto
{ field: 'spend', operator: 'GREATER_THAN', value: 100 }
```

## 💡 Exemplos de Uso

### 1. Buscar Insights de uma Campanha Específica
```typescript
import { fetchMetaInsights } from '@/utils/metaApi';

const insights = await fetchMetaInsights('123456789', accessToken, {
  level: 'campaign',
  fields: ['impressions', 'spend', 'clicks', 'ctr'],
  timeRange: { since: '2024-01-01', until: '2024-01-31' }
});
```

### 2. Buscar Insights de uma Conta (Múltiplas Campanhas)
```typescript
const accountInsights = await fetchMetaInsights('act_123456789', accessToken, {
  level: 'account',
  fields: ['campaign_name', 'impressions', 'spend', 'clicks'],
  datePreset: 'last_30_days',
  filtering: [
    { field: 'campaign.status', operator: 'IN', value: ['ACTIVE'] }
  ],
  limit: 100
});
```

### 3. Buscar Insights com Filtro por Nome
```typescript
const filteredInsights = await fetchMetaInsights('act_123456789', accessToken, {
  level: 'account',
  fields: ['campaign_name', 'impressions', 'spend'],
  datePreset: 'last_7_days',
  filtering: [
    { field: 'campaign.name', operator: 'CONTAIN', value: 'Live' }
  ]
});
```

### 4. Buscar Insights de Ad Set
```typescript
const adSetInsights = await fetchMetaInsights('1203456789', accessToken, {
  level: 'adset',
  fields: ['adset_name', 'impressions', 'spend', 'reach'],
  timeRange: { since: '2024-01-15', until: '2024-01-22' },
  timeIncrement: '7'  // Agregação semanal
});
```

## ⚠️ Validações e Limitações

### Validações Automáticas
1. **Período de tempo**: Valida se não excede 1 ano
2. **Campos obrigatórios**: Sempre inclui campos mínimos
3. **Parâmetros obrigatórios**: Valida se timeRange ou datePreset foi fornecido

### Limitações da API Meta
- **Limite de 1 ano**: Períodos maiores que 1 ano resultam em erro 3018
- **Rate limiting**: Respeita os limites de requisições da API
- **Campos disponíveis**: Dependem do nível (campaign, account, adset, ad)

## 🔄 Migração das Funções Antigas

### Funções Substituídas
- ❌ `fetchCampaignInsightsById`
- ❌ `fetchCampaignInsights` (código morto)
- ❌ `fetchAccountLevelInsights`
- ❌ `fetchMultipleCampaignInsights`
- ❌ `MetaAdsService.fetchInsights` (código morto)

### Como Migrar
```typescript
// ANTES (função antiga)
const insights = await fetchCampaignInsightsById(campaignId, token, options);

// AGORA (função centralizada)
const insights = await fetchMetaInsights(campaignId, token, {
  level: 'campaign',
  ...options
});
```

## 🐛 Tratamento de Erros

A função trata automaticamente:
- **Erro 3018**: Período de tempo inválido
- **Erro 400**: Parâmetros inválidos
- **Erro 401**: Token inválido
- **Erro 403**: Permissões insuficientes
- **Rate limiting**: Limites de requisição

## 📝 Logs

A função gera logs detalhados para debug:
- **Requisição**: Parâmetros enviados
- **Sucesso**: Número de resultados
- **Erro**: Detalhes do erro

## 🚀 Benefícios

1. **Centralização**: Uma única função para todos os tipos de insights
2. **Modularidade**: Campos e filtros configuráveis
3. **Validação**: Validações automáticas de parâmetros
4. **Consistência**: Comportamento padronizado
5. **Manutenibilidade**: Código mais fácil de manter
6. **Documentação**: Bem documentada com exemplos
