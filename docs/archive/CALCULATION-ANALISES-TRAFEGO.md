# Documentação dos Cálculos - Análise de Tráfego

## Fonte dos Dados
Os dados são obtidos através do hook `useGoogleSheets()` que consome duas planilhas principais:
- **criativosData**: Dados de performance dos criativos do Meta Ads
- **gruposData**: Dados de entrada/saída do grupo

## 1. Análise Profunda de Conjunto de Anúncios

### Dados Base por Nível

#### Por Campanhas (`viewLevel = 'campaigns'`)
```javascript
// Agrupa por campaign_name
campaignData[campaignKey] = {
  name: campaign_name,
  total_spent: soma de amount_spent,
  total_leads: soma de leads,
  cpl: total_spent / total_leads,
  adsets_count: quantidade única de ad_set_name,
  creatives_count: quantidade única de ad_name
}
```

#### Por Conjuntos (`viewLevel = 'adsets'`)
```javascript
// Agrupa por ad_set_name
adSetData[adSetKey] = {
  name: ad_set_name,
  total_spent: soma de amount_spent,
  total_leads: soma de leads,
  cpl: total_spent / total_leads,
  creatives_count: quantidade única de ad_name
}
```

#### Por Criativos (`viewLevel = 'creatives'`)
```javascript
// Agrupa por ad_name
creativeData[creativeKey] = {
  name: ad_name,
  total_spent: soma de amount_spent,
  total_leads: soma de leads,
  cpl: total_spent / total_leads,
  link: (se disponível)
}
```

### Cálculos dos Totais no Cabeçalho

```javascript
// Total de Investimento
totalInvestment = analysisData.reduce((sum, item) => sum + item.total_spent, 0)

// Total de Leads
totalLeads = analysisData.reduce((sum, item) => sum + item.total_leads, 0)

// CPL Médio (baseado nos totais, não média aritmética)
avgCPL = totalLeads > 0 ? totalInvestment / totalLeads : 0
```

## 2. Tabela de Dados Diários de Captação

### Processamento dos Dados Diários

#### Estrutura Base por Data
```javascript
dailyData[fullDateKey] = {
  date: fullDateKey,           // Formato DD/MM
  originalDate: item.day,      // Data original da planilha
  investment: 0,               // Soma de amount_spent do dia
  cadastros: 0,               // Soma de leads do dia
  group: 0,                   // Pessoas que entraram no grupo
  groupExit: 0,               // Pessoas que saíram do grupo
  cplMeta: 0,                 // Calculado posteriormente
  cplLiquido: 0,              // Calculado posteriormente
  retention: 0                // Calculado posteriormente
}
```

#### Cálculo de Investimento e Cadastros (Meta)
```javascript
criativosData.forEach(item => {
  const fullDateKey = item.day; // Usa data da planilha como chave
  
  // Converte amount_spent para número
  const amount = typeof item.amount_spent === 'string' ? 
    parseFloat(item.amount_spent) || 0 : 
    item.amount_spent !== null && item.amount_spent !== undefined ? 
    item.amount_spent : 0;
  
  // Converte leads para número  
  const leads = item.leads !== null && item.leads !== undefined ? 
    typeof item.leads === 'string' ? 
    parseInt(item.leads) || 0 : 
    item.leads : 0;
    
  dailyData[fullDateKey].investment += amount;
  dailyData[fullDateKey].cadastros += leads;
});
```

#### Cálculo de Entrada no Grupo
```javascript
gruposData.forEach(grupo => {
  if (grupo.evento === 'ENTROU' && grupo.data) {
    // Converte data do formato DD/MM/YYYY ou DD/MM/YY para DD/MM
    let fullDateKey = '';
    if (grupo.data.includes('/2025') || grupo.data.includes('/2024') || grupo.data.includes('/2023')) {
      const parts = grupo.data.split('/');
      if (parts.length >= 3) {
        fullDateKey = `${parts[0]}/${parts[1]}`; // Apenas DD/MM
      }
    } else {
      fullDateKey = grupo.data; // Se já está no formato DD/MM
    }
    
    dailyData[fullDateKey].group += 1;
  }
});
```

#### Cálculo de Saída do Grupo
```javascript
gruposData.forEach(grupo => {
  if (grupo.evento === 'SAIU' && grupo.data) {
    // Mesmo processo de conversão de data
    dailyData[fullDateKey].groupExit += 1;
  }
});
```

### Fórmulas dos Indicadores Diários

#### CPL Meta
```javascript
day.cplMeta = day.cadastros > 0 ? day.investment / day.cadastros : 0
```
**Definição**: Custo por lead gerado no Meta Ads
**Fórmula**: Investimento do Dia ÷ Cadastros do Meta do Dia

#### CPL Líquido
```javascript
day.cplLiquido = day.group > 0 ? day.investment / day.group : 0
```
**Definição**: Custo por pessoa que efetivamente entrou no grupo
**Fórmula**: Investimento do Dia ÷ Pessoas que Entraram no Grupo do Dia

#### Taxa de Retenção
```javascript
day.retention = day.cadastros > 0 ? Math.round(day.group / day.cadastros * 100) : 0
```
**Definição**: Percentual de leads que se converteram em membros do grupo
**Fórmula**: (Pessoas que Entraram no Grupo ÷ Cadastros do Meta) × 100

### Cálculos dos Totais do Cabeçalho (Dados Diários)

```javascript
// Soma todos os valores da tabela filtrada
const totalInvestment = filteredTableData.reduce((sum, day) => sum + day.investment, 0);
const totalLeads = filteredTableData.reduce((sum, day) => sum + day.cadastros, 0);
const totalGroup = filteredTableData.reduce((sum, day) => sum + day.group, 0);
const totalGroupExit = filteredTableData.reduce((sum, day) => sum + day.groupExit, 0);

// CPL Meta Total
const cplMeta = totalLeads > 0 ? totalInvestment / totalLeads : 0;

// CPL Líquido Total  
const cplLiquido = totalGroup > 0 ? totalInvestment / totalGroup : 0;

// Taxa de Retenção Média
const avgRetention = totalLeads > 0 ? (totalGroup / totalLeads) * 100 : 0;
```

## Filtros Aplicados

### Por Público/Praça
```javascript
// Filtra dados antes de qualquer cálculo
const filteredCriativosData = selectedPublico.includes('todos') ? 
  criativosData : 
  criativosData.filter(item => selectedPublico.includes(item.praca));
```

### Por Data
```javascript
// Converte data DD/MM para YYYY-MM-DD e compara
const [dayStr, monthStr, yearStr] = day.date.split('/');
const dayNum = parseInt(dayStr);
const monthNum = parseInt(monthStr);
const yearNum = parseInt(yearStr || '2025');
const dayDateStr = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;

return dayDateStr >= startDate && dayDateStr <= endDate;
```

## Observações Importantes

1. **Conversão de Tipos**: Todos os valores numéricos são convertidos explicitamente para evitar inconsistências
2. **Tratamento de Nulos**: Valores null/undefined são tratados como 0
3. **Formato de Datas**: O sistema trabalha com dois formatos - DD/MM da planilha e YYYY-MM-DD para filtros
4. **Agrupamento**: Os cálculos sempre agrupam primeiro, depois calculam os indicadores
5. **Precisão**: CPL é calculado com base nos totais, não como média aritmética dos CPLs individuais

## Estrutura dos Dados na Planilha

### criativosData (esperado)
```javascript
{
  day: "15/07",              // Data no formato DD/MM
  campaign_name: "Nome da Campanha",
  ad_set_name: "Nome do Conjunto",
  ad_name: "Nome do Criativo",
  amount_spent: 100.50,      // Valor investido (número ou string)
  leads: 5,                  // Leads gerados (número ou string)
  praca: "SP"                // Público/Praça
}
```

### gruposData (esperado)
```javascript
{
  data: "15/07/2025",        // Data no formato DD/MM/YYYY
  evento: "ENTROU",          // "ENTROU" ou "SAIU"
  praca: "SP"                // Público/Praça
}
```