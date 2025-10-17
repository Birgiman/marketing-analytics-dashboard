# 🏗️ Arquitetura do Projeto Demo

## 🎯 Visão Geral

Este projeto é uma versão demo de um sistema de analytics para marketing digital, focado em métricas de desempenho e análise de dados de WhatsApp e Meta Ads.

## 📁 Estrutura de Dados

### Dados Mocados

O projeto utiliza dados simulados armazenados na pasta `src/mocks/` para demonstrar funcionalidades sem necessidade de backend real.

#### Exemplo de Estrutura de Live:

```typescript
interface Live {
  id: string;
  name: string;
  date: string;
  status: 'active' | 'completed' | 'scheduled';
  metrics: {
    views: number;
    sales: number;
    revenue: number;
    conversion_rate: number;
  };
  whatsapp_groups: string[];
  meta_campaigns: string[];
}
```

### Como os Dados São Obtidos

#### 1. Criação de Live
```typescript
// Exemplo de como uma live é criada
const createLive = (liveData: Partial<Live>) => {
  // No projeto real: salvaria no banco de dados
  // No demo: adiciona ao array de mocks
  const newLive = {
    id: generateId(),
    ...liveData,
    metrics: generateMockMetrics()
  };
  return newLive;
};
```

#### 2. Obtenção de Dados
```typescript
// Exemplo de como os dados são buscados
const getLiveById = (liveId: string) => {
  // No projeto real: consulta ao Supabase
  // const { data } = await supabase
  //   .from('captações')
  //   .select('*')
  //   .eq('id', liveId)
  //   .single();
  
  // No demo: busca nos mocks
  return mockLives.find(live => live.id === liveId);
};
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Meta Marketing API
VITE_META_GRAPH_API_URL=https://graph.facebook.com/v23.0

# Supabase (para versão com backend)
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY
```

### Modo Demo

O projeto possui um sistema de modo demo que pode ser ativado/desativado:

```typescript
// src/lib/demo-mode.ts
export const DEMO_MODE = true; // true = dados mocados, false = dados reais
```

## 🚀 Funcionalidades

### ✅ Implementadas (Demo)
- Dashboard com métricas simuladas
- Sistema de autenticação mock
- Integração WhatsApp (QR code demo)
- Visualização de captações e campanhas
- Cálculos de métricas de marketing

### 🔄 Para Implementação Real
- Conexão com banco de dados real
- Autenticação via Supabase Auth
- Integração real com Meta Marketing API
- Integração real com WhatsApp Business API
- Edge Functions para processamento em background

## 📊 Métricas Calculadas

### Métricas de Live
- **Visualizações**: Número de pessoas que assistiram
- **Vendas**: Quantidade de produtos vendidos
- **Receita**: Valor total arrecadado
- **Taxa de Conversão**: (Vendas / Visualizações) × 100

### Métricas de Campanha
- **CPL (Custo por Lead)**: Investimento / Número de leads
- **ROAS (Return on Ad Spend)**: Receita / Investimento
- **CTR (Click Through Rate)**: (Cliques / Impressões) × 100

## 🔗 Integrações

### Meta Marketing API
- Busca de contas de anúncios
- Obtenção de insights de campanhas
- Cálculo de métricas de performance

### WhatsApp Business API
- Conexão via QR Code
- Monitoramento de grupos
- Análise de engajamento

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Estado**: React Hooks
- **Build**: Vite
- **Deploy**: Vercel/Netlify (demo)

## 📝 Notas de Desenvolvimento

### Para Versão com Backend
1. Desativar modo demo (`DEMO_MODE = false`)
2. Configurar variáveis de ambiente do Supabase
3. Implementar Edge Functions necessárias
4. Configurar autenticação real
5. Conectar APIs reais (Meta, WhatsApp)

### Para Versão Demo
1. Manter `DEMO_MODE = true`
2. Usar dados da pasta `src/mocks/`
3. Deploy estático (Vercel/Netlify)
4. Sem necessidade de backend
