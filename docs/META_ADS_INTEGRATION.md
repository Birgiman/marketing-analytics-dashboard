# 📊 Integração Meta Ads - LiveShop Analytics

## 🎯 Visão Geral

A integração Meta Ads permite conectar contas do Facebook Business Manager para importar dados de campanhas publicitárias, proporcionando análises unificadas de desempenho e métricas de conversão.

## 🔧 Configuração e Setup

### Pré-requisitos

1. **Conta Facebook Developer**
   - Conta Facebook ativa
   - Acesso ao Facebook Developer Portal
   - Business Manager configurado (opcional para testes)

2. **Token de Acesso Meta**
   - Permissões: `ads_read`, `ads_management`
   - Escopo: Acesso às contas de anúncios
   - Duração: Long-lived token recomendado

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

## 🏗️ Arquitetura Técnica

### Componentes Principais

```typescript
src/services/metaAdsService.ts     // Cliente API Facebook Marketing
src/hooks/useMetaAds.tsx          // Hook React para estado
src/components/MetaAdsConnection.tsx // Interface conexão
```

### Estrutura de Dados

#### Tabelas Supabase

1. **`meta_ad_accounts`** - Contas Meta conectadas
2. **`meta_campaigns`** - Campanhas publicitárias
3. **`meta_ad_sets`** - Conjuntos de anúncios
4. **`meta_ads`** - Anúncios individuais
5. **`meta_insights`** - Métricas e resultados
6. **`meta_sync_logs`** - Logs de sincronização

```sql
-- Aplicar schema completo
-- Execute o arquivo: meta_ads_schema.sql no Supabase Dashboard
```

### Fluxo de Integração

```mermaid
graph TD
    A[Token Input] → B[Validar Token]
    B → C[Buscar Contas]
    C → D[Salvar no Supabase]
    D → E[Sync Campanhas]
    E → F[Sync Insights]
    F → G[Exibir Dashboard]
```

## 🚀 Como Usar

### 1. Conectar Conta Meta

1. Acesse página "Integrações"
2. Clique "Conectar Meta Ads"
3. Cole seu access token
4. Sistema validará e importará contas

### 2. Sincronização de Dados

```typescript
// Automática a cada 5 minutos
const { syncData } = useMetaAds();

// Manual por conta específica
await syncData('act_1234567890');

// Sync completo de todas as contas
await syncData();
```

### 3. Visualização no Dashboard

- **Métricas gerais**: Investimento, impressões, leads
- **Performance por campanha**: ROI, CPL, CTR
- **Histórico temporal**: Gráficos de evolução

## 📊 Dados Coletados

### Campanhas
- Nome, status, objetivo
- Budget diário/total
- Datas de início/fim
- Performance geral

### Ad Sets
- Segmentação (idade, gênero, localização)
- Interesses e comportamentos
- Estratégias de lance

### Anúncios
- Criativos (imagens, vídeos, textos)
- Links de destino
- Performance individual

### Insights/Métricas
- **Alcance**: Impressões, reach, frequência
- **Engajamento**: Cliques, CTR
- **Investimento**: Spend, CPM, CPC
- **Conversões**: Leads, cost per lead
- **Vídeo**: Views, completion rate

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

## 🛠️ API Reference

### MetaAdsService

```typescript
class MetaAdsService {
  // Validar e salvar token
  async validateAndSaveToken(token: string, userId: string)
  
  // Buscar campanhas
  async fetchCampaigns(accountId: string, token: string, userId: string)
  
  // Buscar insights
  async fetchInsights(campaignIds: string[], token: string, userId: string)
  
  // Sincronização completa
  async fullSync(userId: string, accountId?: string)
  
  // Dados do usuário
  async getUserData(userId: string)
}
```

### useMetaAds Hook

```typescript
const {
  data,           // Dados das contas, campanhas, insights
  isLoading,      // Estado de carregamento
  isConnected,    // Status da conexão
  isSyncing,      // Estado de sincronização
  error,          // Mensagens de erro
  lastSyncAt,     // Timestamp da última sync
  connectAccount, // Conectar nova conta
  disconnectAccount, // Desconectar conta
  syncData,       // Sincronizar dados
  refreshData     // Atualizar dados locais
} = useMetaAds();
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Token Inválido**
   ```
   Erro: "Token inválido ou expirado"
   Solução: Gerar novo token no Facebook Developer
   ```

2. **Sem Contas de Anúncios**
   ```
   Erro: "Nenhuma conta encontrada"
   Solução: Verificar permissões ads_read no token
   ```

3. **Rate Limit Excedido**
   ```
   Erro: "API rate limit exceeded"
   Solução: Aguardar ou implementar delay maior
   ```

4. **Dados Não Sincronizam**
   ```
   Verificar: Logs na tabela meta_sync_logs
   Debug: Console do navegador para erros
   ```

### Logs de Debug

```sql
-- Verificar sincronizações recentes
SELECT * FROM meta_sync_logs 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC 
LIMIT 10;

-- Status das contas
SELECT account_name, is_active, last_sync_at 
FROM meta_ad_accounts 
WHERE user_id = 'your-user-id';
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

## 🔄 Atualizações Futuras

### Próximas Funcionalidades
- [ ] Webhooks para sync em tempo real
- [ ] Filtros avançados por período/status
- [ ] Exportação de dados (CSV/Excel)
- [ ] Alertas de performance
- [ ] Análise de criativos por IA
- [ ] Comparação com dados WhatsApp

### Melhorias Técnicas
- [ ] Criptografia de tokens em produção
- [ ] Cache inteligente de dados
- [ ] Compressão de dados históricos
- [ ] Monitoramento de saúde da API

---

**Status**: ✅ Implementado e Funcional  
**Última Atualização**: Janeiro 2025  
**Responsável**: Sistema LiveShop Analytics