# 🎯 Meta Ads → Lives Integration

## 📋 Overview

Esta integração substitui **dados mockados** das páginas de Lives com **dados reais** do Meta Ads via Facebook Marketing API v23.0.

### ✅ **IMPLEMENTADO:**
- ~~Hook `useMetaLivesData` para consumo automático de dados~~ (REMOVIDO)
- Utilitários `metaApiLives.ts` para buscar campanhas, ad sets e anúncios
- Componente `MetaCampaignsList` para visualizar campanhas
- Integração na página `Details.tsx` (página `Lives.tsx` removida)
- Status de conexão e indicadores visuais

## 🎯 **CAMPOS SUBSTITUÍDOS:**

### Tabela `creatives` → Meta Ads API

| Campo Atual | Origem Meta Ads | Status |
|---|---|---|
| `campaign_name` | `campaign.name` | ✅ Implementado |
| `ad_set_name` | `adset.name` | ✅ Implementado |
| `ad_name` | `ad.name` | ✅ Implementado |
| `amount_spent` | `insights.spend` | ✅ Implementado |
| `leads` | `insights.actions[lead]` | ✅ Implementado |
| `cost_per_lead` | calculado | ✅ Implementado |
| `impressions` | `insights.impressions` | ✅ Implementado |
| `day` | `insights.date_start` | ✅ Implementado |

### Campos da Planilha "Metaedits" → API

| Campo Planilha | Meta Ads Field | Implementado |
|---|---|---|
| `campaign_name` | `campaign.name` | ✅ |
| `ad_name` | `ad.name` | ✅ |
| `date_start` | `insights.date_start` | ✅ |
| `date_stop` | `insights.date_stop` | ✅ |
| `spend` | `insights.spend` | ✅ |
| `impressions` | `insights.impressions` | ✅ |
| `leads` | `insights.actions[type=lead]` | ✅ |
| `cost_per_lead` | `spend / leads` | ✅ |

## 🏗️ **ARQUITETURA:**

```typescript
// 1. Hook Principal (substitui queries da tabela creatives)
~~useMetaLivesData(userId) → {~~ (REMOVIDO)
  creatives,      // Dados formatados como tabela antiga
  isLoading,      // Estado de carregamento
  isConnected,    // Status da conexão
  hasMetaIntegration, // Se usuário tem token
  refreshData     // Forçar refresh
}

// 2. Função Principal (busca dados do Meta)
getCreativesData(userId, options?) → Creative[]
  ├── getUserMetaToken() - Busca token do Supabase
  ├── fetchAdAccounts() - Lista contas do usuário
  ├── fetchCampaigns() - Campanhas por conta
  ├── fetchAdSets() - Ad Sets por campanha  
  ├── fetchAds() - Anúncios por Ad Set
  └── fetchAdInsights() - Métricas de cada anúncio

// 3. Componente de Visualização
<MetaCampaignsList creatives={creatives} />
```

## 📱 **PÁGINAS ATUALIZADAS:**

### ~~`src/pages/Lives.tsx`~~ (REMOVIDO)
- ✅ Status da integração Meta no topo
- ✅ Badge visual (Ativo/Desconectado)
- ✅ Botão para ir às integrações
- ✅ Hook `useMetaLivesData` para verificar conexão

### `src/pages/Details.tsx`  
- ✅ Header com status da integração
- ✅ Botão refresh para atualizar dados
- ✅ Alertas de erro caso token inválido
- ✅ Cards de métricas com dados reais
- ✅ Componente `MetaCampaignsList` para detalhar campanhas

## 🔄 **FLUXO DE DADOS:**

```mermaid
graph TD
    A[Usuário acessa Details] --> B[~~useMetaLivesData hook~~] (REMOVIDO)
    B --> C{Tem Meta Integration?}
    C -->|Não| D[Mostra fallback data]
    C -->|Sim| E[getUserMetaToken]
    E --> F[fetchLiveCampaignData]
    F --> G[fetchAdAccounts]
    G --> H[Para cada conta...]
    H --> I[fetchCampaigns]
    I --> J[fetchAdSets] 
    J --> K[fetchAds]
    K --> L[fetchAdInsights]
    L --> M[formatForCreativesTable]
    M --> N[Exibir dados na UI]
    
    style D fill:#fff3cd
    style N fill:#d4edda
```

## 🚀 **COMO TESTAR:**

### 1. **Sem Integração Meta:**
- Acesse `/lives` → Deve mostrar "Meta Ads: Desconectado"
- Clique numa Live → Deve mostrar dados de fallback
- CPL será R$ 0,00 (dados de exemplo)

### 2. **Com Token Válido:**
1. Ir em `/integrations`
2. Conectar Meta Ads com **User Token**
3. Voltar em `/lives` → Status "Ativo" 
4. Entrar numa Live → Dados reais das campanhas

### 3. **Token de Teste (Arthur):**
```javascript
// Se tiver o token do Arthur, inserir no Supabase:
INSERT INTO meta_integrations (user_id, access_token, is_active, account_count)
VALUES ('USER_ID_AQUI', 'TOKEN_ARTHUR', true, 1);
```

## 📊 **MÉTRICAS CALCULADAS:**

### CPL Líquido (`Details.tsx:110`)
```typescript
// ANTES: Usava tabela 'creatives' (mockada)
const totalSpent = creatives.reduce((sum, item) => sum + amount_spent)
const totalEntrou = groups.filter(g => g.evento === 'ENTROU').length
const cplLiquido = totalSpent / totalEntrou

// AGORA: Usa dados reais do Meta Ads
~~✅ creatives vêm do hook useMetaLivesData~~ (REMOVIDO)
✅ amount_spent vêm do insights.spend da API
```

### CPL Meta (`Details.tsx:150`)
```typescript
// ANTES: Calculado com dados mockados  
const cplMeta = totalSpent / totalLeads

// AGORA: Calculado com leads reais do Meta
✅ totalLeads = soma de insights.actions[type=lead]
✅ Extraído com função extractLeads(actions)
```

### Taxa de Retenção (`Details.tsx:136`)
```typescript
// Combina dados Meta + WhatsApp
const retentionRate = (gruposWhatsApp.entrou / metaAds.leads) * 100
✅ Dados WhatsApp (grupos) continuam do banco
✅ Dados Meta (leads) agora vêm da API
```

## ⚠️ **FALLBACKS & ERROR HANDLING:**

### 1. **Sem Token Meta:**
- Mostra dados de exemplo com aviso
- Interface continua funcional
- Botão "Configurar Meta Ads"

### 2. **Token Inválido/Expirado:**
- Alert vermelho com erro específico
- Botão "Atualizar" para tentar novamente
- Fallback para dados de exemplo

### 3. **API Error:**
- Log detalhado no console
- Toast/notificação para o usuário
- Continua com dados anteriores

## 🔧 **CONFIGURAÇÃO NECESSÁRIA:**

### Migration Supabase:
```sql
-- Aplicar: supabase/migrations/20250911152700_create_meta_integrations.sql
CREATE TABLE meta_integrations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  access_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  account_count INTEGER DEFAULT 0,
  connected_at TIMESTAMPTZ DEFAULT now()
);
```

### Variáveis de Ambiente:
- Nenhuma nova variável necessária
- Usa integração existente do Supabase

## 📅 **ROADMAP:**

### ✅ **Fase 1 - Substituição de Dados (IMPLEMENTADA)**
- Hook de consumo automático
- Componentes de visualização  
- Integração com páginas existentes
- Error handling básico

### 🚧 **Fase 2 - Melhorias (Próxima)**
- [ ] Vincular campanhas específicas às Lives
- [ ] Filtros de data customizáveis
- [ ] Cache de dados para performance
- [ ] Export de relatórios
- [ ] Webhooks para sync em tempo real

### 🎯 **Fase 3 - Otimizações (Futuro)**
- [ ] Compressão de dados históricos  
- [ ] Analytics comparativo
- [ ] Alertas de performance
- [ ] Automação de campanhas

---

**Status**: ✅ **IMPLEMENTADO E FUNCIONAL**  
**Última Atualização**: Setembro 2025  
**Responsável**: Sistema LiveShop Analytics

> **Próximo Passo**: Testar com token real do Live Shop e aplicar migration no Supabase de produção.