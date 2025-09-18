# Conversa: Implementação de Função getCPLFromMeta para Meta Marketing API

**Data:** 18 de Setembro de 2025  
**Duração:** Sessão completa  
**Objetivo:** Implementar função utilitária para requisições HTTP diretas ao Meta Marketing API

## 🎯 **Objetivo Principal**

Implementar uma função genérica `getCPLFromMeta` que:
- Faz requisições HTTP diretas ao Meta Marketing API
- Calcula CPL automaticamente
- Recebe parâmetros de account_id, access_token, filtros
- Retorna dados estruturados para uso em qualquer lugar da aplicação

## 📋 **Problemas Identificados e Soluções**

### **1. Campo `results` vazio**
- **Problema:** Campo `results` retornando `indicator: "mixed"` sem valor
- **Causa:** Formato incorreto na leitura do campo
- **Solução:** Implementar leitura correta: `insight.results[0].values[0].value`

### **2. Filtro de nome da campanha não aplicado**
- **Problema:** Filtro `campaign.name` não sendo enviado na requisição
- **Causa:** Dados não sendo buscados do banco de dados
- **Solução:** Criar função `getLiveMetaData` para buscar dados do banco

### **3. Account ID duplicado**
- **Problema:** URL com `act_act_123456789` (duplicado)
- **Causa:** Account ID já tinha prefixo `act_` mas função adicionava outro
- **Solução:** Verificar se já tem prefixo antes de adicionar

### **4. Dados não sendo passados corretamente**
- **Problema:** Função não recebendo parâmetros necessários
- **Causa:** Falta de integração entre banco de dados e função
- **Solução:** Implementar JOIN entre tabelas `lives` e `live_campaigns`

## 🔧 **Implementações Realizadas**

### **1. Função `getCPLFromMeta`**
```typescript
// src/utils/meta-requests/getCPLFromMeta.ts
export async function getCPLFromMeta(request: MetaCPLRequest): Promise<MetaCPLResponse>
```

**Características:**
- Requisição HTTP direta ao Meta API
- Cálculo automático do CPL
- Tratamento de erros integrado
- Logs agrupados para debug
- Suporte a filtros (status, nome, período)

### **2. Função `getLiveMetaData`**
```typescript
// src/utils/meta-requests/getLiveMetaData.ts
export async function getLiveMetaData(liveId: string): Promise<LiveMetaDataResponse>
```

**Características:**
- JOIN entre tabelas `lives` e `live_campaigns`
- Busca termo de busca, período e dados da conta
- Fallbacks para valores padrão
- Retorna dados estruturados

### **3. Integração na Details.tsx**
- Import das novas funções
- Modificação de `handleTestMetaApiDirect`
- Fluxo completo: banco → Meta API → resultados
- Logs detalhados para debug

## 📊 **Resultados Obtidos**

### **Dados Corretos:**
- **CPL**: R$ 3,68 (2524,65 ÷ 686 leads)
- **Total Leads**: 686 (campo `results`)
- **Gasto Total**: R$ 2.524,65
- **Período**: 01/09/2025 até 18/09/2025

### **Filtros Aplicados:**
- **Status**: ACTIVE, PAUSED
- **Nome**: CAMPANHA_CAPTACAO_LEADS_LIVESHOPTURBO_DIADOCLIENTE_RMKT
- **Período**: 2025-09-01 até 2025-09-18

## 🚨 **Problemas Pendentes**

### **1. Campaign Count zerado**
- **Problema:** `campaignCount: 0` mesmo com 2 campanhas no banco
- **Causa:** Campo `campaign_id` não sendo retornado pelo Meta API
- **Status:** Debug adicionado para investigar

### **2. Access Token hardcoded**
- **Problema:** Token fixo no código
- **Solução:** Buscar do banco de dados ou variáveis de ambiente

## 📚 **Documentação Criada**

### **1. Meta Marketing API - Cálculos**
```markdown
// docs/calculations/META_MARKETING_API_CALCULATIONS.md
```

**Conteúdo:**
- Como usar Meta Marketing API v23
- Campos necessários para CPL
- Parâmetros de requisição
- Fórmulas de cálculo do LiveShop
- Exemplo de requisição

### **2. Descoberta Importante**
- Campo `results` já traz valor correto calculado pelo Meta
- Não precisa somar `actions` manualmente
- Mais preciso e consistente

## 🎯 **Próximos Passos**

### **1. Corrigir Campaign Count**
- Investigar por que `campaign_id` não está sendo retornado
- Verificar se precisa adicionar campo na requisição

### **2. Implementar outras funções**
- `getTotalSpendFromMeta()`
- `getLeadsFromMeta()`
- `getAccountInsights()`

### **3. Integrar com sistema atual**
- Substituir cálculos antigos pelos novos
- Testar em produção

## 💡 **Lições Aprendidas**

1. **Meta API retorna dados agregados** quando usa nível `account`
2. **Campo `results` é mais confiável** que somar `actions` manualmente
3. **JOIN entre tabelas** é necessário para dados completos
4. **Logs detalhados** são essenciais para debug
5. **Fallbacks** são importantes para robustez

## 🔗 **Arquivos Modificados**

- `src/utils/meta-requests/getCPLFromMeta.ts` (criado)
- `src/utils/meta-requests/getLiveMetaData.ts` (criado)
- `src/utils/meta-requests/test-getCPLFromMeta.ts` (criado)
- `src/pages/Details.tsx` (modificado)
- `docs/calculations/META_MARKETING_API_CALCULATIONS.md` (criado)

## ✅ **Status Final**

- ✅ Função `getCPLFromMeta` funcionando
- ✅ Integração com banco de dados
- ✅ Cálculos corretos
- ⚠️ Campaign count pendente
- ⚠️ Access token hardcoded

**Próxima sessão:** Corrigir campaign count e implementar outras funções.
