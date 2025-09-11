# 📊 Integração Meta Ads - LiveShop Analytics

## 🎯 Visão Geral

A integração Meta Ads permite conectar contas do Facebook Business Manager de forma simplificada, validando tokens e preparando o sistema para futuras vinculações de campanhas com Lives. Esta versão refatorada foca em **validação de token** e **conexão básica**, deixando as operações pesadas de dados para quando realmente necessário.

## 🔧 Configuração e Setup

### Pré-requisitos

1. **Conta Facebook Developer**
   - Conta Facebook ativa
   - Acesso ao Facebook Developer Portal
   - Business Manager configurado (opcional para testes)

2. **Token de Acesso Meta**
   - **Tipo**: User Token (não Page Token)
   - **Permissões**: `ads_read`, `ads_management`
   - **Escopo**: Acesso às contas de anúncios do Business Manager
   - **API Version**: v23.0 (auto-upgrade de v18.0)

### Como Obter Token de Acesso

#### Para Testes (Recomendado)

1. **Acesse Facebook for Developers**
   ```
   URL: https://developers.facebook.com/
   ```

2. **Crie um App de Desenvolvimento**
   - Vá em "My Apps" → "Create App"
   - Tipo: "Business"
   - Nome: "LiveShop Analytics Test"
   - Email: seu email de contato

3. **Configure Marketing API**
   - No app, adicione produto "Marketing API"
   - Isso liberará acesso às campanhas

4. **Gere Access Token**
   ```
   URL: https://developers.facebook.com/tools/explorer/
   ```
   - Selecione seu app
   - Escolha "User Token" 
   - Permissões: `ads_read`, `ads_management`
   - Clique "Generate Access Token"

#### Para Produção

- Use Facebook Business Manager da empresa
- Configure permissões para todas as contas necessárias
- Implemente sistema de refresh automático

## 🏗️ Arquitetura Técnica (Refatorada)

### Componentes Principais

```typescript
// NOVA ARQUITETURA MODULAR
src/services/metaTokenService.ts   // Validação e gestão de tokens
src/utils/metaApi.ts              // Funções reutilizáveis da API
src/hooks/useMetaIntegration.tsx  // Hook simplificado de conexão
src/components/MetaAdsConnection.tsx // Interface minimalista

// DEPRECATED (mantido para referência)
src/services/metaAdsService.ts    // Sistema antigo complexo
src/hooks/useMetaAds.tsx         // Hook antigo pesado
```

### Estrutura de Dados (Simplificada)

#### Tabela Principal

**`meta_integrations`** - Conexões Meta simplificadas
```sql
CREATE TABLE meta_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  access_token TEXT NOT NULL,           -- Token de acesso (criptografar em produção)
  is_active BOOLEAN DEFAULT true,       -- Status da conexão
  account_count INTEGER DEFAULT 0,      -- Número de contas acessíveis
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_validated_at TIMESTAMPTZ,        -- Última validação do token
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Dados de Campanhas (Sob Demanda)
As tabelas `meta_campaigns`, `meta_insights`, etc. serão populadas apenas quando:
- Usuario vincular campanha específica a uma Live
- Sistema executar sincronização programada
- Usuário solicitar dados específicos

> **Benefício**: Sem erro UUID, performance melhor, dados organizados

### Fluxo de Integração (Novo)

```mermaid
graph TD
    A[Token Input] → B[Validar Token]
    B → C[Verificar Acesso]
    C → D[Salvar Integração]
    D → E[Mostrar Status Conectado]
    E → F[Usar em Lives/Campanhas]
    
    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style F fill:#fff3e0
```

**Diferenças do Fluxo Antigo:**
- ❌ Não salva campanhas automaticamente
- ❌ Não faz sync pesado na conexão inicial  
- ✅ Apenas valida token + conta contas
- ✅ Armazena conexão simples
- ✅ Deixa dados pesados para quando necessário

## 🚀 Como Usar (Novo Fluxo)

### 1. Conectar Conta Meta

1. Acesse página "Integrações"
2. Clique "Conectar Meta Ads"
3. Cole seu **User Token** (não Page Token)
4. Sistema valida e mostra status "Conectado"

### 2. Uso das Funções da API

```typescript
// NOVA FORMA: Usar utilitários modulares
import { fetchCampaigns, fetchAdAccounts } from '@/utils/metaApi';

// Buscar campanhas quando necessário (ex: ao vincular Live)
const campaigns = await fetchCampaigns('act_123456', userToken);

// Buscar contas quando necessário
const accounts = await fetchAdAccounts(userToken);

// Validação simples de conexão
const { validateConnection } = useMetaIntegration();
await validateConnection();
```

### 3. Próximos Passos Após Conexão

- **Vincular Campanhas**: Use em "Lives" para conectar campanhas específicas
- **Analytics Sob Demanda**: Dados carregados apenas quando solicitado
- **Performance Otimizada**: Sem dados desnecessários na memória

## 📊 Dados Disponíveis (Sob Demanda)

Com a nova arquitetura, os dados são buscados apenas quando necessário:

### Via `metaApi.ts`
```typescript
// Campanhas
interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  // ... outros campos
}

// Insights
interface MetaInsight {
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  frequency: string;
  // ... métricas completas
}
```

### Benefícios
- **Performance**: Apenas dados necessários
- **Flexibilidade**: Reutilizável em diferentes contextos
- **Manutenibilidade**: Funções isoladas e testáveis

## 🔐 Segurança

### Token Management
- Armazenamento criptografado (TODO: produção)
- Validação antes do salvamento
- Rotação automática quando possível
- Revogação fácil de acesso

### Rate Limiting
- Respeita limites da API Meta (200 calls/hour)
- Implementação de throttling
- Retry com backoff exponencial
- Logs detalhados de erros

## 🛠️ API Reference (Nova Arquitetura)

### MetaTokenService

```typescript
class MetaTokenService {
  // Validar token sem salvar dados pesados
  async validateToken(accessToken: string): Promise<MetaTokenValidation>
  
  // Salvar integração simples
  async saveIntegration(userId: string, accessToken: string, validation: MetaTokenValidation)
  
  // Buscar integração do usuário
  async getUserIntegration(userId: string): Promise<MetaIntegration | null>
  
  // Desconectar
  async disconnectIntegration(userId: string): Promise<void>
  
  // Re-validar token existente
  async revalidateIntegration(integration: MetaIntegration): Promise<boolean>
}
```

### Funções Utilitárias (metaApi.ts)

```typescript
// Buscar contas de anúncios
export async function fetchAdAccounts(accessToken: string): Promise<MetaAdAccount[]>

// Buscar campanhas
export async function fetchCampaigns(adAccountId: string, accessToken: string, options?): Promise<MetaCampaign[]>

// Buscar insights
export async function fetchCampaignInsights(campaignIds: string[], accessToken: string, options?): Promise<MetaInsight[]>

// Helpers
export function extractLeads(actions): number
export function extractConversions(actions): number
export function formatMetaCurrency(cents): number
```

### useMetaIntegration Hook (Novo)

```typescript
const {
  integration,        // Integração ativa ou null
  isLoading,         // Estado de carregamento
  isConnected,       // Status da conexão
  isValidating,      // Estado de validação
  error,             // Mensagens de erro
  connectWithToken,  // Conectar com token
  disconnect,        // Desconectar
  validateConnection, // Re-validar token
  clearError         // Limpar erros
} = useMetaIntegration();
```

**Diferenças:**
- ❌ Sem dados pesados (`campaigns`, `insights`)
- ❌ Sem sync automática
- ✅ Foco apenas na conexão
- ✅ Validação de token
- ✅ Status simples e claro

## 🚨 Troubleshooting

### Problemas Comuns (Atualizados)

1. **Token é Page Token (não User Token)**
   ```
   Erro: "(#100) Tried accessing nonexisting field (adaccounts) on node type (Page)"
   Solução: Solicitar User Token do Facebook Business Manager
   ```

2. **Token Sem Permissões**
   ```
   Erro: "Não foi possível acessar contas de anúncios"
   Solução: Token deve ter `ads_read` e `ads_management`
   ```

3. **API Version Deprecated**
   ```
   Warning: "auto-upgraded to v23.0 as v18.0 has been deprecated"
   Status: ✅ Já corrigido - usando v23.0
   ```

4. **Erro UUID em Campanhas**
   ```
   Erro: "22P02: invalid input syntax for type uuid"
   Status: ✅ Corrigido - IDs do Meta ficam apenas em funções utilitárias
   ```

### Logs de Debug (Simplificados)

```sql
-- Verificar integração do usuário
SELECT * FROM meta_integrations 
WHERE user_id = 'your-user-id' 
AND is_active = true;

-- Verificar última validação
SELECT 
  account_count,
  connected_at,
  last_validated_at,
  is_active
FROM meta_integrations 
WHERE user_id = 'your-user-id';
```

**Debug no Console:**
```javascript
// Testar token diretamente
fetch('https://graph.facebook.com/v23.0/me?access_token=SEU_TOKEN')
  .then(r => r.json())
  .then(console.log);

// Testar acesso a contas
fetch('https://graph.facebook.com/v23.0/me/adaccounts?fields=id,name&access_token=SEU_TOKEN')
  .then(r => r.json())
  .then(console.log);
```

## 📈 Métricas de Performance

### Indicadores Principais
- **ROAS** (Return on Ad Spend)
- **CPL** (Cost Per Lead)
- **CTR** (Click Through Rate)
- **CPC** (Cost Per Click)
- **Frequency** (Frequência)

### Benchmarks
- CTR médio: 1-2%
- CPL variável por nicho
- Frequência ideal: 1-3x

## 🔄 Atualizações Implementadas (Janeiro 2025)

### ✅ Melhorias da Refatoração
- [x] **Arquitetura Simplificada**: Token-only integration
- [x] **API v23.0**: Upgrade automático para versão mais recente
- [x] **Funções Modulares**: `metaApi.ts` reutilizável
- [x] **Performance**: Sem dados desnecessários na inicialização
- [x] **Fix UUID**: Correção do erro 22P02 com IDs do Meta
- [x] **UX Melhor**: Interface focada em conexão simples

### 🚧 Próximas Funcionalidades
- [ ] Vincular campanhas específicas às Lives
- [ ] Dashboard de métricas sob demanda
- [ ] Exportação de dados (CSV/Excel)
- [ ] Alertas de performance
- [ ] Análise de criativos
- [ ] Relatórios automatizados

### 🔧 Melhorias Técnicas Planejadas
- [ ] Criptografia de tokens em produção
- [ ] Cache inteligente com Redis
- [ ] Rate limiting inteligente
- [ ] Health checks automáticos

---

---

## 📋 Resumo da Refatoração

### Antes (Problemático)
```typescript
// Sistema pesado que salvava tudo na conexão inicial
const { connectAccount } = useMetaAds();
await connectAccount(token); // Salvava campanhas, insights, etc.
```

### Depois (Otimizado)
```typescript
// Conexão simples + funções sob demanda
const { connectWithToken } = useMetaIntegration();
await connectWithToken(token); // Apenas valida e salva token

// Usar dados quando necessário
import { fetchCampaigns } from '@/utils/metaApi';
const campaigns = await fetchCampaigns(accountId, token);
```

### Benefícios
- ✅ **Sem erros UUID**: IDs do Meta ficam apenas em utilitários
- ✅ **Performance**: Conexão rápida sem dados pesados
- ✅ **Modularidade**: Funções reutilizáveis em Lives, Analytics, etc.
- ✅ **UX**: Interface simples focada na conexão
- ✅ **Manutenibilidade**: Código organizado e testável

---

**Status**: ✅ Refatorado e Otimizado  
**Última Atualização**: Janeiro 2025  
**API Version**: v23.0  
**Arquitetura**: Token-only + Modular Utilities