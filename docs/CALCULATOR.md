# LiveShop Calculator

## Visão Geral

A Calculadora de LiveShop é uma ferramenta que permite calcular projeções de campanhas de marketing digital para lives de vendas. Ela recebe inputs do usuário e gera projeções detalhadas de leads, vendas, receita e ROI.

## Funcionalidades

### Inputs Disponíveis
- **Ticket Médio (R$)**: Valor médio por venda
- **Total de Dias de Captação**: Duração da campanha em dias
- **Orçamento (R$)**: Valor total a ser investido
- **CPL Líquido (R$)**: Custo por lead líquido
- **Comparecimento (%)**: Taxa de comparecimento à live
- **Conversão (%)**: Taxa de conversão de participantes em vendas

### Cálculos Realizados
- **Leads Previstos**: `orçamento / CPL líquido`
- **Participantes Previstos**: `leads previstos * (comparecimento / 100)`
- **Vendas Previstas**: `participantes previstos * (conversão / 100)`
- **Receita Prevista**: `vendas previstas * ticket médio`
- **ROI**: `((receita prevista - orçamento) / orçamento) * 100`
- **Lucro**: `receita prevista - orçamento`
- **Margem de Lucro**: `((receita prevista - orçamento) / receita prevista) * 100`

## Estrutura Técnica

### 1. Funções Utilitárias (`src/utils/calculations.ts`)

#### Interfaces
```typescript
interface CalculatorInputs {
  ticketMedio: number;
  diasCaptacao: number;
  orcamento: number;
  cplLiquido: number;
  comparecimento: number; // em porcentagem
  conversao: number; // em porcentagem
}

interface CalculatorResults {
  leadsPrevistos: number;
  participantesPrevistos: number;
  vendasPrevistas: number;
  receitaPrevista: number;
  roi: number; // em porcentagem
  lucro: number;
  margemLucro: number; // em porcentagem
}
```

#### Funções Principais
- `calculateLiveShopProjection(inputs)`: Função principal que calcula todos os resultados
- `validateCalculatorInputs(inputs)`: Valida se os inputs são válidos
- `formatCurrency(value)`: Formata valores monetários
- `formatPercentage(value)`: Formata porcentagens
- `formatNumber(value)`: Formata números inteiros
- `generateSimulationName(inputs)`: Gera nome automático para simulação

### 2. Banco de Dados (Supabase)

#### Tabela `calculator_history`
```sql
CREATE TABLE public.calculator_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  inputs jsonb NOT NULL,
  results jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT calculator_history_pkey PRIMARY KEY (id),
  CONSTRAINT calculator_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
```

#### Campos
- **id**: Identificador único da simulação
- **user_id**: Referência ao usuário que criou a simulação
- **name**: Nome da simulação (definido pelo usuário ou gerado automaticamente)
- **inputs**: JSON com parâmetros de entrada
- **results**: JSON com resultados calculados
- **created_at**: Data de criação
- **updated_at**: Data da última atualização

#### Políticas de Segurança (RLS)
- Usuários só podem acessar suas próprias simulações
- Operações CRUD (Create, Read, Update, Delete) protegidas por RLS

### 3. API Edge Function (`/api/calculator/history`)

#### Endpoints Disponíveis

##### GET - Listar Histórico
```typescript
// Request
GET /api/calculator/history

// Response
{
  "data": [
    {
      "id": "uuid",
      "name": "Simulação 16/01/2025 - R$ 1.000,00",
      "inputs": { ... },
      "results": { ... },
      "created_at": "2025-01-16T19:00:00Z",
      "updated_at": "2025-01-16T19:00:00Z"
    }
  ]
}
```

##### POST - Salvar Nova Simulação
```typescript
// Request
POST /api/calculator/history
{
  "name": "Minha Simulação",
  "inputs": {
    "ticketMedio": 100,
    "diasCaptacao": 7,
    "orcamento": 1000,
    "cplLiquido": 25,
    "comparecimento": 80,
    "conversao": 15
  },
  "results": {
    "leadsPrevistos": 40,
    "participantesPrevistos": 32,
    "vendasPrevistas": 4,
    "receitaPrevista": 400,
    "roi": -60,
    "lucro": -600,
    "margemLucro": -150
  }
}

// Response
{
  "data": {
    "id": "uuid",
    "name": "Minha Simulação",
    "inputs": { ... },
    "results": { ... },
    "created_at": "2025-01-16T19:00:00Z",
    "updated_at": "2025-01-16T19:00:00Z"
  }
}
```

##### DELETE - Remover Simulação
```typescript
// Request
DELETE /api/calculator/history?id=uuid

// Response
{
  "success": true
}
```

### 4. Frontend (`src/pages/Calculator.tsx`)

#### Componentes
- **Formulário de Inputs**: Campos para inserir dados da campanha
- **Seção de Resultados**: Cards com projeções calculadas
- **Tabela de Histórico**: Lista de simulações salvas
- **Botões de Ação**: Calcular, Novo, Deletar

#### Estados
- `formData`: Dados do formulário
- `currentResults`: Resultados da simulação atual
- `savedCalculations`: Lista de simulações salvas
- `isLoading`: Estado de carregamento
- `isCalculating`: Estado de cálculo

## Exemplo de Uso

### 1. Preencher Dados
```
Ticket Médio: R$ 150,00
Dias de Captação: 7
Orçamento: R$ 2.000,00
CPL Líquido: R$ 30,00
Comparecimento: 75%
Conversão: 20%
```

### 2. Resultados Calculados
```
Leads Previstos: 66
Participantes Previstos: 49
Vendas Previstas: 9
Receita Prevista: R$ 1.350,00
ROI: -32,5%
Lucro: -R$ 650,00
Margem de Lucro: -48,1%
```

### 3. JSON Salvo no Banco
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Simulação 16/01/2025 - R$ 2.000,00",
  "inputs": {
    "ticketMedio": 150,
    "diasCaptacao": 7,
    "orcamento": 2000,
    "cplLiquido": 30,
    "comparecimento": 75,
    "conversao": 20
  },
  "results": {
    "leadsPrevistos": 66,
    "participantesPrevistos": 49,
    "vendasPrevistas": 9,
    "receitaPrevista": 1350,
    "roi": -32.5,
    "lucro": -650,
    "margemLucro": -48.1
  },
  "created_at": "2025-01-16T19:00:00Z",
  "updated_at": "2025-01-16T19:00:00Z"
}
```

## Validações

### Inputs Obrigatórios
- Todos os campos devem ser preenchidos
- Valores numéricos devem ser maiores que zero
- Porcentagens devem estar entre 0% e 100%

### Validações Específicas
- **Ticket Médio**: > 0
- **Dias de Captação**: > 0
- **Orçamento**: > 0
- **CPL Líquido**: > 0
- **Comparecimento**: 0% ≤ valor ≤ 100%
- **Conversão**: 0% ≤ valor ≤ 100%

## Formatação

### Valores Monetários
- Formato brasileiro: `R$ 1.234,56`
- Usa `Intl.NumberFormat` com locale `pt-BR`

### Porcentagens
- Formato brasileiro: `15,5%`
- Usa `Intl.NumberFormat` com style `percent`

### Números Inteiros
- Formato brasileiro: `1.234`
- Usa `Intl.NumberFormat` com locale `pt-BR`

## Segurança

### Autenticação
- Todas as operações requerem usuário autenticado
- JWT token validado em cada requisição

### Autorização
- Usuários só podem acessar suas próprias simulações
- RLS (Row Level Security) implementado no Supabase

### Validação de Dados
- Validação de tipos e ranges nos inputs
- Sanitização de dados antes do processamento

## Performance

### Cache
- Dados carregados uma vez por sessão
- Atualização automática após operações CRUD

### Otimizações
- Funções puras para cálculos
- Validação client-side antes de enviar para API
- Estados de loading para melhor UX

## Manutenção

### Logs
- Erros logados no console para debugging
- Toasts para feedback do usuário

### Monitoramento
- Edge Functions com logs de erro
- Validação de dados em múltiplas camadas

### Escalabilidade
- Estrutura preparada para múltiplos usuários
- Índices no banco para performance
- Funções utilitárias reutilizáveis
