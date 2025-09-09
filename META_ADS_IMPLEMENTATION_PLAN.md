# 🎯 Plano de Implementação - Meta Ads Integration

## 📊 **Situação Atual vs. Roadmap**

### ✅ **O que já existia no roadmap:**
- **Tabela `criativos`**: Estrutura básica para campanhas/ads
- **Página Analytics**: Interface para visualizar dados
- **Sistema de autenticação**: Supabase integrado
- **Padrão de integração**: WhatsApp como referência

### 🆕 **Adaptações necessárias (conforme pedido do Arthur):**
- **Foco apenas em dados de campanhas**: Sem relação com grupos WhatsApp
- **Token de acesso direto**: Cliente fornece token, não OAuth flow
- **Estrutura de dados mais robusta**: Separar Campaigns, Ad Sets, Ads e Insights
- **Sincronização automática**: Sistema de refresh periódico

---

## 🏗️ **1. ESTRUTURA DE BANCO DE DADOS**

### 📋 **Tabelas Criadas:**

#### `meta_ad_accounts` - Contas Meta do usuário
```sql
- ad_account_id (Meta ID)
- access_token (fornecido pelo cliente)  
- account_name, currency, timezone
- last_sync_at, is_active
```

#### `meta_campaigns` - Campanhas publicitárias
```sql
- campaign_id, name, status, objective
- daily_budget, lifetime_budget
- start_time, stop_time, created_time
```

#### `meta_ad_sets` - Conjuntos de anúncios
```sql  
- adset_id, name, status
- budget, bid_strategy, targeting
- age, gender, interests, locations
```

#### `meta_ads` - Anúncios individuais
```sql
- ad_id, name, status
- creative_id, creative_name
- creative_object_story_spec (JSON)
- creative_link_url
```

#### `meta_insights` - Métricas e resultados
```sql
- impressions, clicks, spend, reach
- leads, conversions, cost_per_lead
- cpm, ctr, frequency
- date_start, date_stop
```

#### `meta_sync_logs` - Logs de sincronização
```sql
- sync_type, status, records_processed
- error_message, started_at, completed_at
```

### 🔄 **Migração da tabela `criativos`:**
- ✅ **Manter compatibilidade**: Dados existentes preservados
- ✅ **Nova estrutura**: Sistema mais robusto em paralelo
- ✅ **Gradual**: Migração opcional dos dados antigos

---

## 💻 **2. IMPLEMENTAÇÃO DE CÓDIGO**

### 🛠️ **Arquivos Criados:**

#### `/src/services/metaAdsService.ts`
- **Cliente da API Meta**: Integração com Facebook Marketing API v18.0
- **Validação de tokens**: Verificar acesso e buscar contas
- **Sync completo**: Campanhas → Ad Sets → Ads → Insights
- **Error handling**: Logs detalhados e recuperação de erros

#### `/src/hooks/useMetaAds.tsx`
- **State management**: React hook para gerenciar estado
- **Auto-refresh**: Atualização automática a cada 5 minutos
- **Demo mode**: Dados fictícios para desenvolvimento
- **Actions**: connect, disconnect, sync, refresh

#### `/src/components/MetaAdsConnection.tsx`
- **UI de conexão**: Interface para inserir token
- **Dashboard de contas**: Visualizar contas conectadas
- **Quick stats**: Métricas resumidas
- **Logs de sync**: Histórico de sincronizações

### 📁 **Integração com arquivos existentes:**

#### Atualizar `/src/pages/Integrations.tsx`:
```tsx
import { MetaAdsConnection } from '@/components/MetaAdsConnection';

// Adicionar botão e modal
const [showMetaAds, setShowMetaAds] = useState(false);

<Button onClick={() => setShowMetaAds(true)}>
  Conectar Meta Ads
</Button>

<MetaAdsConnection 
  isOpen={showMetaAds} 
  onOpenChange={setShowMetaAds} 
/>
```

#### Atualizar `/src/pages/Analytics.tsx`:
```tsx
import { useMetaAds } from '@/hooks/useMetaAds';

// Usar dados reais do Meta Ads
const { data: metaData } = useMetaAds();
const campaigns = metaData.campaigns;
const insights = metaData.insights;
```

---

## ⚡ **3. PASSO A PASSO DE IMPLEMENTAÇÃO**

### **FASE 1: Setup do Banco (1-2 horas)**
```bash
# 1. Executar script SQL no Supabase
cat meta_ads_schema.sql | supabase db push

# 2. Verificar tabelas criadas
supabase db status
```

### **FASE 2: Implementar serviços (3-4 horas)**
```bash
# 1. Adicionar arquivos criados ao projeto
cp metaAdsService.ts src/services/
cp useMetaAds.tsx src/hooks/
cp MetaAdsConnection.tsx src/components/

# 2. Instalar dependências (se necessário)
npm install # Usa fetch nativo, sem deps extras
```

### **FASE 3: Integrar na UI (2-3 horas)**
```tsx
// 1. Adicionar na página de Integrações
// 2. Atualizar Analytics para usar dados reais
// 3. Testar fluxo completo
```

### **FASE 4: Testes e validação (2-3 horas)**
```bash
# 1. Testar com token real do Meta
# 2. Verificar dados no banco
# 3. Validar métricas na dashboard
```

---

## 🔐 **4. AUTENTICAÇÃO E SEGURANÇA**

### **Token Management:**
- **Armazenamento**: Banco Supabase (criptografar em produção)
- **Validação**: Verificar acesso antes de salvar
- **Refresh**: Auto-renovação quando possível
- **Revogação**: Desconectar contas facilmente

### **Segurança:**
```typescript
// TODO: Implementar criptografia de tokens
const encryptedToken = encrypt(accessToken);
await supabase.from('meta_ad_accounts').insert({
  access_token: encryptedToken
});
```

### **Rate Limiting:**
- **Respeitar limites da API**: 200 calls/hour por token
- **Throttling**: Delay entre requests
- **Error recovery**: Retry com backoff exponencial

---

## 📈 **5. MÉTRICAS E DADOS COLETADOS**

### **Campaigns:**
- Nome, status, objetivo
- Budget (diário/total)
- Datas (início, fim, criação)

### **Ad Sets:**  
- Targeting (idade, gênero, interesses, localização)
- Budget e estratégia de lances
- Status e configurações

### **Ads:**
- Creativos (imagens, vídeos, textos)
- Links e tracking
- Performance individual

### **Insights (Métricas):**
- **Alcance**: Impressões, reach, frequência
- **Engajamento**: Clicks, CTR
- **Custos**: Spend, CPM, CPC
- **Conversões**: Leads, cost per lead
- **Períodos**: Dados diários/semanais/mensais

---

## 🎯 **6. INTEGRAÇÃO COM DASHBOARD EXISTENTE**

### **Analytics.tsx updates:**
```tsx
// Substituir dados mockados por dados reais
const { data } = useMetaAds();

// Combinar com dados de WhatsApp se necessário
const combinedData = {
  campaigns: data.campaigns,
  whatsappGroups: whatsappData.groups,
  // Cross-reference quando houver relação
};
```

### **Dashboard cards:**
```tsx
// Card de investimento total
<Card>
  <CardTitle>Investimento Meta Ads</CardTitle>
  <CardContent>
    {formatCurrency(totalSpend)}
  </CardContent>
</Card>

// Card de leads gerados  
<Card>
  <CardTitle>Leads Gerados</CardTitle>
  <CardContent>
    {totalLeads}
  </CardContent>
</Card>
```

---

## 🚀 **7. DEPLOYMENT E GO-LIVE**

### **Pré-requisitos:**
1. **Token de acesso Meta**: Cliente deve fornecer
2. **Permissões necessárias**: `ads_read`, `ads_management`
3. **App de desenvolvimento**: Facebook Developer App configurado

### **Go-Live Checklist:**
- [ ] Schema aplicado no Supabase production
- [ ] Código deployado e testado
- [ ] Token de produção configurado
- [ ] Primeira sincronização executada
- [ ] Dashboard exibindo dados reais
- [ ] Logs de sincronização funcionando

### **Monitoramento:**
```sql
-- Verificar sincronizações recentes
SELECT * FROM meta_sync_logs 
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Contar dados importados
SELECT 
  COUNT(*) as campaigns,
  SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_campaigns
FROM meta_campaigns 
WHERE user_id = 'user-id';
```

---

## 📋 **8. DIFERENÇAS DO ROADMAP ORIGINAL**

### **Mudanças implementadas:**
1. **Foco específico**: Apenas Meta Ads, sem cruzar com WhatsApp
2. **Token direto**: Cliente fornece token, não OAuth
3. **Estrutura robusta**: 6 tabelas especializadas vs 1 genérica
4. **Sync automático**: Sistema de refresh periódico
5. **Logs detalhados**: Auditoria de todas as sincronizações

### **Mantido do roadmap:**
- **Integração Supabase**: Mesmo padrão de auth/dados
- **UI/UX consistente**: Segue padrão do WhatsApp
- **Dashboard analytics**: Aproveita estrutura existente
- **Demo mode**: Para desenvolvimento sem token real

---

## 🎁 **9. EXTRAS IMPLEMENTADOS**

### **Beyond the requirements:**
- **Multi-account support**: Usuário pode ter várias contas Meta
- **Granular sync**: Sync individual por conta ou geral
- **Error recovery**: Sistema robusto de tratamento de erros  
- **Performance optimized**: Indexes e queries otimizadas
- **Extensible**: Estrutura preparada para Ad Sets e Ads individuais

### **Future enhancements:**
- **Real-time sync**: Webhooks da Meta API
- **Advanced filtering**: Filtros por período, status, objetivo
- **Export capabilities**: CSV/Excel de dados
- **Automated reporting**: Relatórios agendados
- **Budget alerts**: Notificações de budget/performance

---

## ✅ **RESUMO EXECUTIVO**

### **Entregável completo:**
1. **✅ Schema robusto**: 6 tabelas especializadas com RLS
2. **✅ Service layer**: `metaAdsService` completo com API Meta
3. **✅ React hook**: `useMetaAds` para state management  
4. **✅ UI componente**: `MetaAdsConnection` para interface
5. **✅ Integração**: Updates para Integrations e Analytics
6. **✅ Documentation**: Plano completo de implementação

### **Tempo estimado total:** 8-12 horas de desenvolvimento

### **Próximos passos imediatos:**
1. **Aplicar schema SQL** no Supabase
2. **Adicionar arquivos** ao projeto
3. **Configurar UI** nas páginas existentes  
4. **Obter token** do cliente para teste
5. **Executar primeira sincronização**

---

**🎯 Resultado:** Sistema completo de integração Meta Ads, seguindo as necessidades do Arthur, mantendo compatibilidade com a arquitetura existente e preparado para escalar conforme a demanda do negócio.