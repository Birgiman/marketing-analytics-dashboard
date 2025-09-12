# Regras de Negócio da Aplicação - Dashboard de Marketing Digital

## Visão Geral

Esta aplicação é um dashboard de análise de marketing digital que integra dados do Google Sheets para visualizar métricas de campanhas publicitárias (Meta Ads), grupos de WhatsApp/Telegram e pesquisas de mercado. O sistema calcula métricas avançadas de performance como CPL Meta, CPL Líquido, taxa de retenção e correlação entre tráfego e conversões.

## 1. Arquitetura de Dados

### 1.1 Fontes de Dados

A aplicação obtém dados de 3 planilhas do Google Sheets:

- **Planilha "Criativos"**: Dados de campanhas do Meta Ads
- **Planilha "Grupos"**: Eventos de entrada/saída em grupos do WhatsApp/Telegram  
- **Planilha "Pesquisa"**: Respostas de formulários de pesquisa de mercado

### 1.2 URLs e Endpoints

```typescript
const CRIATIVOS_URL = "https://docs.google.com/spreadsheets/d/[ID]/gviz/tq?tqx=out:json&sheet=Criativos";
const GRUPOS_URL = "https://docs.google.com/spreadsheets/d/[ID]/gviz/tq?tqx=out:json&sheet=Grupos";
const PESQUISA_URL = "https://docs.google.com/spreadsheets/d/[ID]/gviz/tq?tqx=out:json&sheet=Pesquisa";
```

### 1.3 Estruturas de Dados

#### CriativosData (Dados de Campanhas)
```typescript
interface CriativosData {
  day: string;                 // Data no formato DD/MM ou DD/MM/YYYY
  campaign_name: string;       // Nome da campanha
  ad_set_name: string;         // Nome do conjunto de anúncios
  ad_name: string;             // Nome do anúncio
  amount_spent: number;        // Valor gasto (número)
  leads: number;               // Número de leads gerados
  cost_per_lead: string;       // CPL calculado (string formatada)
  creative_link?: string;      // Link do criativo (opcional)
}
```

#### GruposData (Dados de Grupos)
```typescript
interface GruposData {
  data: string;                // Data no formato DD/MM/YYYY
  nome_grupo: string;          // Nome do grupo
  id_grupo: string;            // ID do grupo
  evento: 'ENTROU' | 'SAIU';   // Tipo de evento
  publico?: string;            // Público associado (OF, NO, etc.)
}
```

#### PesquisaData (Dados de Pesquisa)
```typescript
interface PesquisaData {
  [key: string]: any;          // Estrutura dinâmica baseada nas colunas da planilha
}
```

## 2. Regras de Negócio e Cálculos

### 2.1 CPL Meta (Custo por Lead do Meta)

**Definição**: Custo por lead baseado nos dados diretamente do Meta Ads.

**Fórmula**:
```typescript
CPL_Meta = Total_Investido / Total_Cadastros_Meta
```

**Implementação**:
```typescript
const calculateCPLMeta = () => {
  const totalSpent = calculateTotalSpent();
  const totalsData = calculateTotals();
  return totalsData.totalLeads > 0 ? totalSpent / totalsData.totalLeads : 0;
};
```

### 2.2 CPL Líquido (Custo por Lead Líquido)

**Definição**: Custo por lead baseado apenas nas pessoas que efetivamente entraram nos grupos.

**Fórmula**:
```typescript
CPL_Liquido = Total_Investido / Total_Pessoas_Entraram_Grupo
```

**Implementação**:
```typescript
const calculateCPLLiquido = () => {
  const totalSpent = calculateTotalSpent();
  const totalsData = calculateTotals();
  return totalsData.totalGroup > 0 ? totalSpent / totalsData.totalGroup : 0;
};
```

### 2.3 Taxa de Retenção

**Definição**: Percentual de leads do Meta que efetivamente entraram nos grupos.

**Fórmula**:
```typescript
Taxa_Retencao = (Pessoas_Entraram_Grupo / Cadastros_Meta) × 100
```

**Implementação**:
```typescript
day.retention = day.cadastros > 0 ? Math.round(day.group / day.cadastros * 100) : 0;
```

### 2.4 Leads Ativos

**Definição**: Número de pessoas atualmente ativas nos grupos.

**Fórmula**:
```typescript
Leads_Ativos = Total_Entradas - Total_Saidas
```

**Implementação**:
```typescript
const totalGroup = filteredGruposData.filter(grupo => grupo.evento === 'ENTROU').length;
const totalGroupExit = filteredGruposData.filter(grupo => grupo.evento === 'SAIU').length;
const leadsAtivos = totalGroup - totalGroupExit;
```

### 2.5 Metas de Performance

**CPL Líquido Meta**: R$ 3,00 (valor configurado como referência)

**Análise de Performance**:
- ✅ **Excelente**: CPL Líquido < R$ 3,00
- ❌ **Acima da Meta**: CPL Líquido >= R$ 3,00

```typescript
{cplLiquido < 3.00 ? (
  <div className="p-4 border-l-4 border-green-500 bg-green-50">
    <h5>✅ Performance Excelente</h5>
    <p>CPL Líquido está {((1 - cplLiquido / 3.00) * 100).toFixed(0)}% abaixo da meta</p>
  </div>
) : (
  <div className="p-4 border-l-4 border-red-500 bg-red-50">
    <h5>❌ CPL Acima da Meta</h5>
    <p>CPL Líquido está {((cplLiquido / 3.00 - 1) * 100).toFixed(0)}% acima da meta</p>
  </div>
)}
```

## 3. Processamento de Dados

### 3.1 Parsing do Google Sheets

**Função Principal**:
```typescript
const parseGoogleSheetsResponse = (responseText: string) => {
  const jsonMatch = responseText.match(/google\.visualization\.Query\.setResponse\((.*)\);/);
  if (!jsonMatch) throw new Error('Formato de resposta inválido');
  
  const jsonData = JSON.parse(jsonMatch[1]);
  return jsonData.table;
};
```

### 3.2 Conversão de Dados

**Para Criativos**:
```typescript
const convertGoogleSheetsData = (data: any, type: 'criativos') => {
  const headers = data.cols.map((col: any) => col.label || col.id);
  return data.rows.map((row: any) => {
    const values = row.c.map((cell: any) => cell?.v || '');
    return {
      day: values[0],
      campaign_name: values[1],
      ad_set_name: values[2],
      ad_name: values[3],
      amount_spent: parseFloat(values[4]) || 0,
      leads: parseInt(values[5]) || 0,
      cost_per_lead: values[6],
      creative_link: values[7]
    };
  });
};
```

### 3.3 Sincronização de Datas

**Problema**: Criativos usam formato "DD/MM", Grupos usam "DD/MM/YYYY"

**Solução**:
```typescript
// Converter data do grupo para formato compatível com criativos
let fullDateKey = '';
if (grupo.data.includes('/2025') || grupo.data.includes('/2024')) {
  const parts = grupo.data.split('/');
  fullDateKey = `${parts[0]}/${parts[1]}`;  // Extrair apenas DD/MM
} else {
  fullDateKey = grupo.data;  // Já está no formato DD/MM
}
```

## 4. Funcionalidades por Página

### 4.1 Dashboard Principal (`/`)

**Componentes**:
- `CriativosTable`: Tabela com dados de campanhas
- `PerformanceAnalysis`: Análise de metas vs executado
- Cards de resumo com totalizadores

**Métricas Exibidas**:
- Total Investido
- Total Leads
- CPL Médio
- Projeções baseadas em metas

### 4.2 Análise de Tráfego (`/traffic-analysis`)

**Funcionalidades**:
- Tabela diária com métricas calculadas
- Filtros por data e público
- Análise de conjuntos de anúncios
- Gráficos de performance temporal

**Cálculos Diários**:
```typescript
const calculateDailyData = () => {
  const dailyData = {};
  
  // Agrupar investimento e cadastros por data
  criativosData.forEach(item => {
    const dateKey = item.day;
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {
        investment: 0,
        cadastros: 0,
        group: 0,
        groupExit: 0
      };
    }
    dailyData[dateKey].investment += item.amount_spent;
    dailyData[dateKey].cadastros += item.leads;
  });
  
  // Adicionar dados de grupos
  gruposData.forEach(grupo => {
    const dateKey = convertDateFormat(grupo.data);
    if (grupo.evento === 'ENTROU') {
      dailyData[dateKey].group += 1;
    } else if (grupo.evento === 'SAIU') {
      dailyData[dateKey].groupExit += 1;
    }
  });
  
  // Calcular métricas
  Object.values(dailyData).forEach(day => {
    day.cplMeta = day.cadastros > 0 ? day.investment / day.cadastros : 0;
    day.cplLiquido = day.group > 0 ? day.investment / day.group : 0;
    day.retention = day.cadastros > 0 ? (day.group / day.cadastros * 100) : 0;
  });
  
  return Object.values(dailyData);
};
```

### 4.3 Insights de Pesquisa (`/research-insights`)

**Análises Automáticas**:

1. **Perfil de Compra**: Categoriza respostas em "Já compraram" vs "Nunca compraram"
2. **Distribuição Geográfica**: Analisa localização dos leads
3. **Receios e Objeções**: Categoriza medos em:
   - Golpe/Fraude
   - Produto não original/falso
   - Efeitos colaterais
   - Outros receios

4. **Interesse em Produtos**: Categoriza produtos desejados:
   - Emagrecimento
   - Colágeno
   - Suplementos
   - Laranja Moro
   - O Shot Matinal

**Processamento Inteligente**:
```typescript
const analisarReceio = (resposta: string): string | null => {
  const respostaLimpa = resposta.toLowerCase().trim();
  
  // Filtrar respostas irrelevantes
  if (respostaLimpa.length < 3 || /^[^\w\s]+$/.test(respostaLimpa)) {
    return null;
  }
  
  // Categorizar por palavras-chave
  if (respostaLimpa.match(/(golpe|fraude|enganar|calote|roubo)/)) {
    return "Golpe";
  }
  
  if (respostaLimpa.match(/(não.*original|falso|falsificado|pirata)/)) {
    return "Não ser original / falso";
  }
  
  if (respostaLimpa.match(/(efeito.*colateral|reação.*adversa|fazer.*mal)/)) {
    return "Efeitos colaterais";
  }
  
  return "Outros receios";
};
```

### 4.4 Vendas por Grupo (`/sales-by-group`)

**Sistema de Correlação de Públicos**:

```typescript
const audiences = [
  {
    id: 1,
    name: "Público Quente",
    campaignTerm: "quente",     // Busca em nomes de campanhas
    groupEmoji: "⭐"            // Busca em nomes de grupos
  },
  {
    id: 2,
    name: "Público Frio",
    campaignTerm: "frio",
    groupEmoji: "❤️"
  }
];
```

**Correlação Automática**:
```typescript
const getAudienceForCampaign = (campaignName: string) => {
  const campaign = campaignName.toLowerCase();
  return audiences.find(audience => 
    campaign.includes(audience.campaignTerm.toLowerCase())
  );
};

const getAudienceForGroup = (groupName: string) => {
  return audiences.find(audience => 
    groupName.includes(audience.groupEmoji)
  );
};
```

**Métricas Calculadas por Público**:
- Leads de Tráfego
- Investimento Total
- CPL Meta
- Entradas no Grupo
- Saídas do Grupo
- Membros Ativos

## 5. Estados de Carregamento e Erros

### 5.1 Hook useGoogleSheets

**Estados Gerenciados**:
```typescript
const [criativosData, setCriativosData] = useState<CriativosData[]>([]);
const [gruposData, setGruposData] = useState<GruposData[]>([]);
const [pesquisaData, setPesquisaData] = useState<PesquisaData[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

**Timeout de Requisições**: 30 segundos por planilha

**Tratamento de Erros**:
```typescript
const fetchWithTimeout = async (url: string, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Tempo limite da requisição excedido');
    }
    throw error;
  }
};
```

## 6. Migração para Supabase - Estrutura Recomendada

### 6.1 Tabelas Principais

#### Tabela `campanhas`
```sql
CREATE TABLE campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  nome_campanha TEXT NOT NULL,
  nome_conjunto_anuncios TEXT NOT NULL,
  nome_anuncio TEXT NOT NULL,
  valor_gasto DECIMAL(10,2) NOT NULL,
  leads INTEGER NOT NULL DEFAULT 0,
  cpl_meta DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE WHEN leads > 0 THEN valor_gasto / leads ELSE 0 END
  ) STORED,
  link_criativo TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabela `eventos_grupos`
```sql
CREATE TABLE eventos_grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  nome_grupo TEXT NOT NULL,
  id_grupo TEXT NOT NULL,
  evento evento_tipo NOT NULL,
  publico TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE evento_tipo AS ENUM ('ENTROU', 'SAIU');
```

#### Tabela `pesquisas`
```sql
CREATE TABLE pesquisas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_resposta TIMESTAMP DEFAULT NOW(),
  dados JSONB NOT NULL,  -- Armazenar respostas de forma flexível
  processado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabela `publicos`
```sql
CREATE TABLE publicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  termo_campanha TEXT NOT NULL,
  emoji_grupo TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 6.2 Views Calculadas

#### View `metricas_diarias`
```sql
CREATE VIEW metricas_diarias AS
SELECT 
  c.data,
  SUM(c.valor_gasto) as investimento,
  SUM(c.leads) as cadastros_meta,
  COUNT(eg_entrou.id) as entradas_grupo,
  COUNT(eg_saiu.id) as saidas_grupo,
  COUNT(eg_entrou.id) - COUNT(eg_saiu.id) as ativos_grupo,
  CASE 
    WHEN SUM(c.leads) > 0 THEN SUM(c.valor_gasto) / SUM(c.leads)
    ELSE 0 
  END as cpl_meta,
  CASE 
    WHEN COUNT(eg_entrou.id) > 0 THEN SUM(c.valor_gasto) / COUNT(eg_entrou.id)
    ELSE 0 
  END as cpl_liquido,
  CASE 
    WHEN SUM(c.leads) > 0 THEN (COUNT(eg_entrou.id)::float / SUM(c.leads) * 100)
    ELSE 0 
  END as taxa_retencao
FROM campanhas c
LEFT JOIN eventos_grupos eg_entrou ON c.data = eg_entrou.data AND eg_entrou.evento = 'ENTROU'
LEFT JOIN eventos_grupos eg_saiu ON c.data = eg_saiu.data AND eg_saiu.evento = 'SAIU'
GROUP BY c.data
ORDER BY c.data;
```

### 6.3 Functions para Correlação de Públicos

```sql
CREATE OR REPLACE FUNCTION correlacionar_publicos()
RETURNS TABLE (
  publico_nome TEXT,
  termo_campanha TEXT,
  emoji_grupo TEXT,
  leads_trafego BIGINT,
  investimento_total DECIMAL,
  cpl_meta DECIMAL,
  entradas_grupo BIGINT,
  saidas_grupo BIGINT,
  ativos_grupo BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.nome,
    p.termo_campanha,
    p.emoji_grupo,
    SUM(c.leads) as leads_trafego,
    SUM(c.valor_gasto) as investimento_total,
    CASE 
      WHEN SUM(c.leads) > 0 THEN SUM(c.valor_gasto) / SUM(c.leads)
      ELSE 0 
    END as cpl_meta,
    COUNT(eg_entrou.id) as entradas_grupo,
    COUNT(eg_saiu.id) as saidas_grupo,
    COUNT(eg_entrou.id) - COUNT(eg_saiu.id) as ativos_grupo
  FROM publicos p
  LEFT JOIN campanhas c ON LOWER(c.nome_campanha) LIKE '%' || LOWER(p.termo_campanha) || '%'
  LEFT JOIN eventos_grupos eg_entrou ON eg_entrou.nome_grupo LIKE '%' || p.emoji_grupo || '%' 
    AND eg_entrou.evento = 'ENTROU'
  LEFT JOIN eventos_grupos eg_saiu ON eg_saiu.nome_grupo LIKE '%' || p.emoji_grupo || '%' 
    AND eg_saiu.evento = 'SAIU'
  WHERE p.ativo = TRUE
  GROUP BY p.id, p.nome, p.termo_campanha, p.emoji_grupo;
END;
$$ LANGUAGE plpgsql;
```

## 7. Adaptações Necessárias no Frontend

### 7.1 Substituir useGoogleSheets por Supabase Queries

**Antes (Google Sheets)**:
```typescript
const { criativosData, gruposData, pesquisaData } = useGoogleSheets();
```

**Depois (Supabase)**:
```typescript
const { data: campanhas } = useSupabaseQuery('campanhas');
const { data: eventosGrupos } = useSupabaseQuery('eventos_grupos');
const { data: pesquisas } = useSupabaseQuery('pesquisas');
```

### 7.2 Usar Views e Functions

```typescript
// Para métricas diárias
const { data: metricasDiarias } = useSupabaseQuery('metricas_diarias');

// Para correlação de públicos
const { data: correlacaoPublicos } = supabase.rpc('correlacionar_publicos');
```

### 7.3 Real-time Updates

```typescript
useEffect(() => {
  const subscription = supabase
    .channel('dashboard-updates')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'campanhas' },
      (payload) => {
        // Atualizar dados em tempo real
        refreshData();
      }
    )
    .subscribe();

  return () => supabase.removeChannel(subscription);
}, []);
```

## 8. Benefícios da Migração

### 8.1 Performance
- Consultas SQL otimizadas vs parsing de JSON
- Índices em colunas críticas
- Views pré-calculadas

### 8.2 Escalabilidade
- Suporte a grandes volumes de dados
- Queries complexas com JOINs
- Agregações eficientes

### 8.3 Integridade
- Constraints de dados
- Validações no banco
- Transações ACID

### 8.4 Real-time
- Updates automáticos via WebSocket
- Sincronização em tempo real
- Notificações de mudanças

## 9. Considerações Finais

Esta documentação serve como guia completo para replicar a lógica de negócio da aplicação atual em um novo repositório que utilizará:

1. **Meta Marketing API** para obter dados de campanhas diretamente
2. **Supabase** como banco de dados para armazenamento e consultas
3. **Mesma lógica de cálculos** mantendo compatibilidade com dashboards existentes
4. **Real-time updates** para melhor experiência do usuário

O importante é manter **exatamente as mesmas fórmulas e regras de negócio** documentadas aqui, apenas mudando a fonte dos dados de Google Sheets para Supabase.