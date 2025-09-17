# 📊 Métricas de Live em Tempo Real

## 🎯 Objetivo

Este documento descreve as fórmulas e cálculos utilizados para gerar métricas em tempo real das Lives no LiveShop Analytics.

## 🔗 Endpoint

```
POST /functions/v1/live-metrics
```

**Parâmetros obrigatórios:**
- `liveId`: ID da Live
- `since`: Data inicial (YYYY-MM-DD)
- `until`: Data final (YYYY-MM-DD)

## 📈 Fórmulas de Cálculo

### 1. **Total Spend (Investimento Total)**
```javascript
total_spend = soma(spend) de todas as campanhas vinculadas no período
```

**Fonte**: Meta Marketing API - campo `spend` dos insights das campanhas

### 2. **Total Leads (Leads Totais)**
```javascript
total_leads = soma(values) de actions onde action_type = 'lead'
```

**Fonte**: Meta Marketing API - campo `actions` dos insights das campanhas

### 3. **Qualified Leads (Leads Qualificados)**
```javascript
qualified_leads = contagem_distinta(phone_number) de eventos WhatsApp
```

**Fonte**: Tabela `whatsapp_events` - eventos `member_joined` nos grupos vinculados à Live

### 4. **CPL Bruto (Custo por Lead Bruto)**
```javascript
cpl_bruto = total_leads > 0 ? total_spend / total_leads : null
```

**Interpretação**: Custo médio por lead gerado pelo Meta Ads

### 5. **CPL Líquido (Custo por Lead Líquido)**
```javascript
cpl_liquido = qualified_leads > 0 ? total_spend / qualified_leads : cpl_bruto
```

**Interpretação**: Custo médio por lead que efetivamente entrou nos grupos WhatsApp

### 6. **CPL Meta (Custo por Lead Meta)**
```javascript
cpl_meta = (ad_budget && leads_goal && leads_goal > 0) ? ad_budget / leads_goal : null
```

**Interpretação**: Meta de custo por lead baseada no orçamento e objetivo da Live

## 🔄 Fluxo de Coleta de Dados

### 1. **Dados da Live**
```sql
SELECT id, name, ad_budget, leads_goal, user_id 
FROM lives 
WHERE id = :liveId
```

### 2. **Campanhas Vinculadas**
```sql
SELECT campaign_id, account_id 
FROM live_campaigns 
WHERE live_id = :liveId
```

### 3. **Token de Acesso Meta**
```sql
SELECT access_token 
FROM meta_integrations 
WHERE user_id = :userId AND is_active = true
```

### 4. **Insights do Meta**
```javascript
GET https://graph.facebook.com/v23.0/{account_id}/insights
?fields=campaign_id,campaign_name,spend,actions,date_start,date_stop
&level=campaign
&time_range={"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}
&filtering=[{"field":"campaign.id","operator":"IN","value":["campaign_ids"]}]
```

### 5. **Leads do WhatsApp**
```sql
SELECT DISTINCT phone_number 
FROM whatsapp_events 
WHERE group_id IN (SELECT group_id FROM live_groups WHERE live_id = :liveId)
AND event_type = 'member_joined'
AND created_at >= :since 
AND created_at <= :until
```

## 📊 Formato de Resposta

```json
{
  "liveId": "uuid",
  "since": "2025-08-01",
  "until": "2025-09-15",
  "total_spend": 271.82,
  "total_leads": 50,
  "qualified_leads": 45,
  "cpl_bruto": 5.4364,
  "cpl_liquido": 6.04,
  "cpl_meta": 20.0
}
```

## ⚠️ Tratamento de Erros

### Valores Nulos
- **total_spend**: `null` se nenhuma campanha vinculada
- **total_leads**: `null` se nenhum lead encontrado
- **qualified_leads**: `0` se nenhum evento WhatsApp
- **cpl_bruto**: `null` se total_leads = 0
- **cpl_liquido**: `cpl_bruto` se qualified_leads = 0
- **cpl_meta**: `null` se ad_budget ou leads_goal não definidos

### Casos Especiais
- **Divisão por zero**: Retorna `null` para CPLs
- **Token inválido**: Erro 404 "Token de acesso do Meta não encontrado"
- **Live não encontrada**: Erro 404 "Live não encontrada"
- **Período inválido**: Erro 400 "Formato de data inválido"

## 🔍 Logs e Debug

A função gera logs detalhados para facilitar o debug:

```javascript
console.log('📊 [LIVE_METRICS] Iniciando coleta de métricas para Live', { liveId, since, until });
console.log('✅ [LIVE_METRICS] Live encontrada:', { name, ad_budget, leads_goal });
console.log('✅ [LIVE_METRICS] X campanhas encontradas');
console.log('✅ [LIVE_METRICS] X insights coletados do Meta');
console.log('✅ [LIVE_METRICS] X leads qualificados encontrados');
console.log('🎯 [LIVE_METRICS] Métricas finais calculadas:', finalMetrics);
```

## 🚀 Performance

### Otimizações Implementadas
- **Uma única requisição** ao Meta API por conta publicitária
- **Filtro de campanhas** aplicado na API (não no código)
- **Contagem distinta** de telefones no banco
- **Validação de parâmetros** antes de processar

### Limitações
- **Rate limiting** do Meta API (respeitado)
- **Período máximo** de 1 ano (validação implementada)
- **Dependência** de dados do WhatsApp (pode ser 0 se não houver eventos)

## 🧪 Testes

### Casos de Teste
1. **Live sem campanhas**: Retorna valores nulos exceto cpl_meta
2. **Live sem token Meta**: Erro 404
3. **Período sem dados**: Valores 0 ou nulos
4. **Período com dados**: Valores calculados corretamente
5. **Divisão por zero**: CPLs retornam null

### Validação Manual
```bash
# Teste no Insomnia
POST /functions/v1/live-metrics
{
  "liveId": "uuid-da-live",
  "since": "2025-08-01",
  "until": "2025-09-15"
}
```

## 📝 Notas de Implementação

- **Não persiste dados**: Cálculo on-demand
- **Reutiliza serviços**: metaAdsService, supabase client
- **Trata rate limiting**: Implementa retry/backoff
- **Logs seguros**: Não vaza tokens nos logs
- **Validação robusta**: Parâmetros obrigatórios e formatos
