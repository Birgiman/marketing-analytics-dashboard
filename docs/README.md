# Live Shop Analytics - Documentação

Esta documentação descreve o funcionamento de cada tela da aplicação Live Shop Analytics.

## Visão Geral do Sistema

Live Shop Analytics é uma plataforma completa para análise de performance em live commerce, integrando dados de WhatsApp, Meta Ads, lives e grupos de engajamento.

### Arquitetura

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (banco de dados PostgreSQL + autenticação + edge functions)
- **Integrações**: WhatsApp Business API, Meta Ads API (em desenvolvimento)

### Fluxo de Autenticação

1. Usuário acessa `/auth/signin` ou `/auth/signup`
2. Supabase valida credenciais
3. Sistema cria perfil automaticamente via trigger
4. Redirecionamento para dashboard principal

---

## Telas da Aplicação

### 1. Página de Login (`/auth/signin`)

**Arquivo**: `src/pages/auth/SignIn.tsx`

**Funcionalidades**:
- Login com email e senha
- Validação de campos obrigatórios
- Tratamento de erros (credenciais inválidas, conta inexistente, etc.)
- Redirecionamento automático após login

**Componentes utilizados**:
- Button (interface)
- Input fields personalizados
- Error display

**Fluxo**:
1. Usuário insere email/senha
2. Sistema chama `supabase.auth.signInWithPassword()`
3. Em caso de sucesso, navega para `/`
4. Em caso de erro, exibe mensagem específica

### 2. Página de Cadastro (`/auth/signup`)

**Arquivo**: `src/pages/auth/SignUp.tsx`

**Funcionalidades**:
- Cadastro com dados completos (nome, sobrenome, email, telefone, senha)
- Validação de senhas coincidentes
- Validação de força da senha (mínimo 6 caracteres)
- Criação automática de perfil na tabela `profiles`

**Fluxo**:
1. Usuário preenche formulário
2. Sistema valida dados localmente
3. Chama `supabase.auth.signUp()` com metadata
4. Cria perfil na tabela `profiles`
5. Redireciona para login com mensagem de sucesso

### 3. Dashboard Principal (`/`)

**Arquivo**: `src/App.tsx` (roteamento principal)

**Funcionalidades**:
- Sidebar de navegação (`AppSidebar`)
- Roteamento condicional (auth vs app)
- Layout responsivo

**Componentes principais**:
- AppSidebar: navegação lateral
- Área de conteúdo principal
- Sistema de rotas React Router

### 4. Página de Analytics (`/analytics`)

**Arquivo**: `src/pages/Analytics.tsx`

**Funcionalidades**:
- Visualização de dados de criativos/campanhas
- Cards de estatísticas (gasto total, leads, CPL médio)
- Tabela detalhada de criativos
- Filtros e ordenação

**Dados utilizados**:
- Tabela `criativos` do Supabase
- Campos: campaign_name, ad_set_name, amount_spent, leads, cost_per_lead, etc.

**Métricas calculadas**:
- Gasto total (soma amount_spent)
- Total de leads (soma leads)
- CPL médio (gasto total / total leads)

### 5. Página de Lives (`/lives`)

**Arquivo**: `src/pages/Lives.tsx`

**Funcionalidades**:
- Gerenciamento de transmissões ao vivo
- Status das lives (Agendada, Ao Vivo, Finalizada, Rascunho)
- Métricas de performance (participantes, vendas, receita)
- Cards de estatísticas consolidadas

**Dados utilizados**:
- Tabela `lives` do Supabase
- Campos: name, captacao_start, ta_rolando_end, participants, sales, revenue

**Status calculado**:
- Compara timestamps com horário atual
- Determina se live está agendada, ao vivo ou finalizada

### 6. Página de Grupos (`/groups`)

**Arquivo**: `src/pages/Groups.tsx`

**Funcionalidades**:
- Monitoramento de atividades em grupos WhatsApp
- Agrupamento por nome do grupo
- Tracking de eventos (entrada, saída, mensagens)
- Análise de engajamento

**Dados utilizados**:
- Tabela `grupos` do Supabase
- Campos: nome_grupo, telefone, evento, data_hora, id_grupo

**Agrupamento**:
- Atividades organizadas por nome do grupo
- Contadores de atividades únicas
- Identificação de números únicos

### 7. Página de Integrações (`/integrations`)

**Arquivo**: `src/pages/Integrations.tsx`

**Funcionalidades**:
- Conexão com WhatsApp Business
- Modal de QR Code para pareamento
- Status da conexão em tempo real
- Configurações de integrações futuras (Meta Ads)

**Integrações ativas**:
- WhatsApp Business API via Evolution API
- QR Code para conexão
- Monitoramento de status da instância

**Integrações futuras**:
- Meta Ads API
- Analytics avançado
- Configurações gerais

---

## Hooks Personalizados

### useAnalytics

**Arquivo**: `src/hooks/useAnalytics.tsx`

**Funcionalidades**:
- Carregamento de dados de analytics (criativos, grupos, lives)
- Modo demo com dados fictícios
- Funções CRUD para lives
- Cache e gerenciamento de estado

### useWhatsAppConnection

**Arquivo**: `src/hooks/useWhatsAppConnection.tsx`

**Funcionalidades**:
- Gerenciamento de conexão WhatsApp
- Estados de conexão (connecting, connected, error, etc.)
- Geração e refresh de QR codes
- Integração com Evolution API

### useWhatsAppQR

**Arquivo**: `src/hooks/useWhatsAppQR.tsx`

**Funcionalidades**:
- Controle específico de QR codes
- Status de QR (generating, active, connected, error)
- Timeout e refresh automático
- Integração com modal de exibição

---

## Componentes de Interface

### AppSidebar

**Arquivo**: `src/components/AppSidebar.tsx`

**Funcionalidades**:
- Navegação principal da aplicação
- Menu colapsível
- Indicadores de página ativa
- Links para todas as seções

### QRCodeDisplay

**Arquivo**: `src/components/QRCodeDisplay.tsx`

**Funcionalidades**:
- Exibição de QR codes para WhatsApp
- Contador regressivo
- Estados visuais (loading, error, success)
- Botões de ação (refresh, cancel)

### DemoBanner

**Arquivo**: `src/components/DemoBanner.tsx`

**Funcionalidades**:
- Banner informativo para modo demo
- Alertas sobre dados fictícios
- Controle de visibilidade

---

## Integração com Supabase

### Tabelas principais

1. **profiles**: dados dos usuários
2. **criativos**: dados de campanhas/ads
3. **grupos**: atividades de grupos WhatsApp
4. **lives**: dados de transmissões
5. **whatsapp_instances**: instâncias de WhatsApp conectadas
6. **whatsapp_logs**: logs de atividades WhatsApp

### RLS (Row Level Security)

- Todas as tabelas têm políticas RLS ativas
- Usuários só acessam seus próprios dados
- Políticas baseadas em `auth.uid()`

### Edge Functions

- **whatsapp-api**: integração com Evolution API
- **get-evolution-config**: configuração de instâncias

---

## Modo Demo

O sistema possui um modo demo ativado via `DEMO_MODE` em `src/lib/demo-mode.ts`:

**Funcionalidades**:
- Dados fictícios para todas as telas
- Bypass de autenticação
- QR codes simulados
- Estatísticas de exemplo

**Utilização**:
- Ideal para demonstrações
- Teste de interface sem dados reais
- Desenvolvimento e debugging

---

## Fluxo de Dados

### 1. Autenticação
```
Login → Supabase Auth → Session → Profile Creation → Dashboard
```

### 2. Analytics
```
User ID → Supabase Query → Data Processing → UI Rendering
```

### 3. WhatsApp Integration
```
Connect → QR Generation → Device Scan → Instance Creation → Data Sync
```

### 4. Real-time Updates
```
Supabase Changes → Hook Updates → Component Re-render → UI Update
```

---

## Próximos Passos

1. **Meta Ads Integration**: completar integração com Facebook/Instagram Ads
2. **Real-time Analytics**: implementar updates em tempo real
3. **Advanced Filtering**: filtros avançados para dados
4. **Export Features**: exportação de relatórios
5. **Mobile Responsiveness**: otimização mobile completa