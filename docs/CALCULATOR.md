# LiveShop Calculator

## Visão Geral

A Calculadora de LiveShop é uma ferramenta que permite calcular projeções de campanhas de marketing digital para lives de vendas. Ela recebe inputs do usuário e gera projeções detalhadas de leads, vendas, faturamento e ROES.

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
- **Faturamento Projetado**: `vendas previstas * ticket médio`
- **ROES**: `(faturamento / orçamento) * 100`

## Layout e Interface

### Design Horizontal
A calculadora utiliza um layout horizontal responsivo com:
- **Lado Esquerdo**: Formulário de dados da campanha
- **Centro**: Ícone Shuffle animado (aparece após cálculo)
- **Lado Direito**: Card de resultados com animação de entrada

### Animações
- **Ícone Shuffle**: Animação `animate-pulse` (opacidade 0-100%)
- **Card de Resultados**: Animação `slide-in-from-left` + `fade-in` (1 segundo)
- **Transições**: Efeitos suaves para melhor UX

### Responsividade
- **Desktop**: Layout em 3 colunas (formulário | ícone | resultados)
- **Mobile**: Layout vertical com ícone centralizado acima dos cards

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
  faturamento: number;
  roes: number; // em porcentagem
}
```

#### Funções Principais
- `calculateLiveShopProjection(inputs)`: Função principal que calcula todos os resultados
- `validateCalculatorInputs(inputs)`: Valida se os inputs são válidos
- `formatCurrency(value)`: Formata valores monetários
- `formatPercentage(value)`: Formata porcentagens
- `formatNumber(value)`: Formata números inteiros

### 2. Banco de Dados (Supabase)

#### Tabela `calculator_history`
```sql
CREATE TABLE public.calculator_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text,
  ticket_medio numeric NOT NULL,
  total_dias integer NOT NULL,
  orcamento numeric NOT NULL,
  cpl_liquido numeric NOT NULL,
  comparecimento numeric NOT NULL,
  conversao numeric NOT NULL,
  leads_previstos integer,
  participantes integer,
  vendas_previstas integer,
  faturamento numeric,
  roes numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT calculator_history_pkey PRIMARY KEY (id),
  CONSTRAINT calculator_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

#### Campos
- **id**: Identificador único da simulação
- **user_id**: Referência ao usuário que criou a simulação
- **name**: Nome da simulação (definido pelo usuário)
- **ticket_medio**: Valor médio por venda
- **total_dias**: Duração da campanha em dias
- **orcamento**: Valor total investido
- **cpl_liquido**: Custo por lead líquido
- **comparecimento**: Taxa de comparecimento (%)
- **conversao**: Taxa de conversão (%)
- **leads_previstos**: Número de leads calculados
- **participantes**: Número de participantes calculados
- **vendas_previstas**: Número de vendas calculadas
- **faturamento**: Faturamento projetado
- **roes**: Retorno sobre o investimento (%)
- **created_at**: Data de criação
- **updated_at**: Data da última atualização

### 3. Frontend (`src/pages/Calculator.tsx`)

#### Componentes Principais
- **Card de Dados da Campanha**: Formulário com inputs e botões de ação
- **Ícone Shuffle Animado**: Indicador visual entre formulário e resultados
- **Card de Resultados**: Exibição dos dados inseridos e valores calculados
- **Tabela de Cálculos Salvos**: Histórico com todas as colunas de dados

#### Estados
- `formData`: Dados do formulário
- `currentResults`: Resultados da simulação atual
- `savedCalculations`: Lista de simulações salvas
- `isLoading`: Estado de carregamento
- `isCalculating`: Estado de cálculo
- `isSaving`: Estado de salvamento
- `saveDialogOpen`: Modal para nomear cálculo
- `editDialogOpen`: Modal para editar nome
- `deleteDialogOpen`: Modal de confirmação de exclusão

#### Funcionalidades
- **Calcular**: Executa cálculos e exibe resultados
- **Limpar**: Limpa formulário e resultados
- **Salvar Cálculo**: Salva com nome personalizado via modal
- **Exibir**: Carrega cálculo salvo no formulário
- **Editar**: Altera nome do cálculo salvo
- **Excluir**: Remove cálculo com confirmação

### 4. Animações CSS (`src/index.css`)

#### Animação Customizada
```css
@keyframes slideInFromLeft {
  0% {
    transform: translateX(-100px);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slideInFromLeft 1s ease-out;
}
```

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
Faturamento Projetado: R$ 1.350,00
ROES: 67,5%
```

### 3. Dados Salvos no Banco
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Campanha Janeiro 2025",
  "ticket_medio": 150,
  "total_dias": 7,
  "orcamento": 2000,
  "cpl_liquido": 30,
  "comparecimento": 75,
  "conversao": 20,
  "leads_previstos": 66,
  "participantes": 49,
  "vendas_previstas": 9,
  "faturamento": 1350,
  "roes": 67.5,
  "created_at": "2025-01-16T19:00:00Z",
  "updated_at": "2025-01-16T19:00:00Z"
}
```

## Validações

### Inputs Obrigatórios
- **Orçamento**: > 0
- **CPL Líquido**: > 0
- Outros campos podem ser vazios (valores padrão aplicados)

### Validações Específicas
- **Ticket Médio**: ≥ 0
- **Dias de Captação**: ≥ 0
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
- Animações CSS otimizadas

## Manutenção

### Logs
- Erros logados no console para debugging
- Toasts para feedback do usuário

### Monitoramento
- Validação de dados em múltiplas camadas
- Estados de loading para melhor UX

### Escalabilidade
- Estrutura preparada para múltiplos usuários
- Índices no banco para performance
- Funções utilitárias reutilizáveis
- Animações CSS reutilizáveis

## Histórico de Mudanças

### Versão 2.0 (Janeiro 2025)
- **Layout Horizontal**: Implementado layout em 3 colunas
- **Animações**: Adicionado ícone Shuffle e animação de entrada do card de resultados
- **Nomes Personalizados**: Campo `name` adicionado para nomes customizados
- **Modais**: Implementados modais para salvar, editar e confirmar exclusão
- **Tabela Expandida**: Todas as colunas de dados exibidas na tabela de cálculos salvos
- **UX Melhorada**: Botões centralizados, máscara de porcentagem corrigida
- **Cálculos Atualizados**: Removido lucro e margem de lucro, foco em faturamento e ROES

### Versão 1.0 (Setembro 2024)
- **Versão Inicial**: Layout vertical básico
- **Cálculos Básicos**: Leads, participantes, vendas, receita, ROI
- **Persistência**: Salvamento no banco de dados
- **Validações**: Validação de inputs obrigatórios