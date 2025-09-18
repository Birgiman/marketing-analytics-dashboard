# 📊 Meta Marketing API - Cálculos LiveShop

## 🎯 **Visão Geral**

Este documento define como usar a Meta Marketing API v23 para obter dados específicos e realizar cálculos necessários para o LiveShop.

## 🔗 **API Base**

- **URL Base**: `https://graph.facebook.com/v23.0`
- **Endpoint**: `/act_{account_id}/insights`
- **Método**: `GET`

## 📋 **Campos Necessários**

### **Campos Obrigatórios para CPL:**
- `spend` - Valor gasto total
- `results` - **RECOMENDADO**: Já traz o valor correto de leads/actions (soma automática)
- `actions` - Ações detalhadas (opcional, para análise)
- `cost_per_action_type` - Custo por tipo de ação (opcional, para análise)

### **⚠️ IMPORTANTE - Diferença entre Campos:**
- **`results`**: Campo agregado que já soma todas as ações relevantes (RECOMENDADO)
- **`actions`**: Array detalhado com cada tipo de ação individual
- **`link_click`**: Apenas cliques em links (mais específico)
- **`cost_per_action_type`**: Custo por cada tipo de ação

**Para LiveShop (tráfego pago)**: Use `results` - mais preciso e já calculado pelo Meta.

### **Campos Adicionais Úteis:**
- `campaign_id` - ID da campanha
- `campaign_name` - Nome da campanha
- `impressions` - Impressões
- `clicks` - Cliques
- `date_start` - Data início
- `date_stop` - Data fim

## ⚙️ **Parâmetros de Requisição**

### **Level (Nível de Agregação):**
- `account` - Dados agregados da conta (RECOMENDADO)
- `campaign` - Dados por campanha individual

### **Filtros (Filtering):**
```json
[
  {
    "field": "campaign.effective_status",
    "operator": "IN",
    "value": ["ACTIVE", "PAUSED"]
  },
  {
    "field": "campaign.name",
    "operator": "CONTAIN",
    "value": "Post Do Instagram"
  }
]
```

### **Período (Time Range):**
```json
{
  "since": "2025-09-01",
  "until": "2025-09-18"
}
```

## 🧮 **Cálculos LiveShop**

### **1. CPL Líquido**
```
CPL Líquido = Total de pessoas que entrou no grupo ÷ Total gasto (Meta)
```

### **2. CPL Meta**
```
CPL Meta = Amount spend ÷ Results (leads)
```

### **3. Taxa de Retenção**
```
Taxa de Retenção = (Pessoas que entrou no grupo ÷ Leads que o Meta entregou) × 100
```

### **4. CPL Líquido do Planejamento**
```
CPL Líquido do Planejamento = Valor investido ÷ Número de pessoas que entrou no grupo
```

## 📝 **Exemplo de Requisição**

```javascript
const url = `https://graph.facebook.com/v23.0/act_269382281240887/insights`;
const params = {
  fields: 'campaign_id,campaign_name,spend,results,actions,cost_per_action_type',
  access_token: 'SEU_TOKEN',
  level: 'account',
  filtering: JSON.stringify([
    {
      "field": "campaign.effective_status",
      "operator": "IN", 
      "value": ["ACTIVE", "PAUSED"]
    },
    {
      "field": "campaign.name",
      "operator": "CONTAIN",
      "value": "Post Do Instagram"
    }
  ]),
  time_range: JSON.stringify({
    "since": "2025-09-01",
    "until": "2025-09-18"
  })
};
```

## 🎯 **Descoberta Importante - Campo `results`**

**✅ DESCOBERTO**: O campo `results` já traz o valor correto de leads/actions calculado pelo Meta!

- **Antes**: Somávamos `actions` manualmente (link_click, etc.)
- **Agora**: Usamos `results` diretamente (mais preciso)
- **Vantagem**: Meta já faz o cálculo correto internamente
- **Resultado**: Dados mais precisos e consistentes

## ⚠️ **Observações Importantes**

1. **Level Account vs Campaign**: Use `account` para dados agregados (mais performático)
2. **Filtros**: Sempre filtrar por status e nome da campanha quando necessário
3. **Período**: Definir período específico para dados precisos
4. **Actions**: Campo `actions` contém array com diferentes tipos de ações
5. **Cost Per Action**: Campo `cost_per_action_type` já calcula CPL por tipo de ação

## 🔧 **Implementação**

As funções utilitárias estão em `src/utils/meta-requests/` e seguem o padrão:
- Uma função por cálculo específico
- Tratamento de erros integrado
- Retorno padronizado com dados calculados
- Logs agrupados para debug
