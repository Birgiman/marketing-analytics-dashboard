# Painel Administrativo

## Visão Geral

O Painel Administrativo é uma ferramenta de gestão de usuários que permite aos administradores gerenciar permissões, aprovar/rejeitar usuários e controlar o acesso ao sistema.

## Funcionalidades

### 1. Gestão de Status de Usuários

#### Status Disponíveis
- **Pendente**: Usuários aguardando aprovação
- **Aprovado**: Usuários com acesso liberado
- **Rejeitado**: Usuários que foram recusados
- **Desabilitado**: Usuários temporariamente bloqueados

#### Ações por Status
- **Pendentes**: Aprovar ou Rejeitar
- **Aprovados**: Desabilitar
- **Desabilitados**: Habilitar novamente
- **Rejeitados**: Sem ações disponíveis

### 2. Interface de Usuário

#### Layout em Tabela
- **Nome**: Nome completo do usuário
- **E-mail**: Endereço de e-mail
- **Telefone**: Número formatado com máscara brasileira
- **Status**: Badge colorido indicando o status atual
- **Data de Cadastro**: Data e hora de criação da conta
- **Ações**: Botões contextuais baseados no status
- **Animação**: Entrada da esquerda para direita com delay escalonado (máximo 0.5s)

#### Filtros e Busca
- **Filtros por Status**: Cards clicáveis para filtrar usuários
- **Busca por Nome/E-mail**: Campo de busca em tempo real
- **Contadores**: Número de usuários por status

### 3. Formatação de Telefone

#### Máscara Aplicada
- **Formato**: `(21) 9 8848-7643`
- **Suporte**: DDD + 9 + 8 dígitos
- **Código do País**: Removido automaticamente (55)
- **Fallback**: Exibe "Não informado" se vazio

#### Exemplos de Conversão
```
21988487643 → (21) 9 8848-7643
5521988487643 → (21) 9 8848-7643
2188487643 → (21) 8848-7643
```

## Estrutura Técnica

### 1. Componente Principal (`src/pages/Admin.tsx`)

#### Estados
```typescript
interface ProfileWithAuth {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  status: 'pending' | 'approved' | 'rejected' | 'disabled';
  created_at: string;
  email?: string;
}

interface UserStats {
  pending: number;
  approved: number;
  rejected: number;
  disabled: number;
}
```

#### Estados do Componente
- `profiles`: Lista de usuários
- `activeFilter`: Filtro ativo (pending/approved/rejected/disabled)
- `searchTerm`: Termo de busca
- `stats`: Contadores por status
- `loading`: Estado de carregamento

### 2. Funções Principais

#### Carregamento de Dados
```typescript
const loadProfiles = useCallback(async () => {
  // Busca dados do Supabase
  // Calcula estatísticas
  // Atualiza estados
}, [toast]);
```

#### Ações de Usuário
- `handleApprove()`: Aprova usuário pendente
- `handleReject()`: Rejeita usuário pendente
- `handleDisable()`: Desabilita usuário aprovado
- `handleEnable()`: Habilita usuário desabilitado

#### Formatação
- `formatPhone()`: Aplica máscara de telefone
- `formatPhoneNumber()`: Lógica de formatação

### 3. Banco de Dados (Supabase)

#### Tabela `profiles`
```sql
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  email text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

#### Políticas de Segurança (RLS)
- Apenas administradores podem acessar
- Usuários só veem seus próprios dados
- Operações CRUD protegidas

## Fluxo de Trabalho

### 1. Aprovação de Usuário
1. Usuário se cadastra → Status: `pending`
2. Administrador visualiza na lista de pendentes
3. Administrador clica em "Aprovar"
4. Status muda para `approved`
5. Usuário ganha acesso ao sistema

### 2. Desabilitação de Usuário
1. Usuário aprovado está ativo
2. Administrador clica em "Desabilitar"
3. Status muda para `disabled`
4. Usuário perde acesso temporariamente

### 3. Reabilitação de Usuário
1. Usuário desabilitado aparece na lista
2. Administrador clica em "Habilitar"
3. Status muda para `approved`
4. Usuário recupera acesso

## Segurança

### Autenticação
- Verificação de sessão ativa
- Redirecionamento para login se não autenticado
- Validação de JWT token

### Autorização
- Apenas administradores podem acessar
- RLS no banco de dados
- Validação de permissões

### Validação de Dados
- Sanitização de inputs
- Validação de tipos
- Tratamento de erros

## Performance

### Otimizações
- `useCallback` para funções
- Filtros client-side para busca
- Carregamento único por sessão
- Estados de loading

### Escalabilidade
- Busca eficiente com filtros
- Paginação preparada para futuras implementações
- Índices no banco de dados

## Responsividade

### Layout Adaptativo
- **Desktop**: Tabela completa com todas as colunas
- **Tablet**: Tabela com scroll horizontal
- **Mobile**: Layout otimizado para telas pequenas

### Componentes Responsivos
- Cards de estatísticas em grid
- Campo de busca adaptável
- Botões de ação com tamanhos apropriados

## Manutenção

### Logs
- Erros logados no console
- Toasts para feedback do usuário
- Validação de operações

### Monitoramento
- Estados de loading
- Tratamento de erros
- Validação de dados

### Escalabilidade
- Estrutura preparada para crescimento
- Funções reutilizáveis
- Componentes modulares

## Histórico de Mudanças

### Versão 2.0 (Janeiro 2025)
- **Layout em Tabela**: Substituição de cards por tabela
- **Busca por Nome/E-mail**: Campo de busca em tempo real
- **Máscara de Telefone**: Formatação automática brasileira
- **Ações Contextuais**: Botões baseados no status do usuário
- **Desabilitar/Habilitar**: Funcionalidade para controle de acesso
- **Animação de Entrada**: Efeito slide-in da esquerda para direita com delay limitado (máximo 0.5s)
- **UX Melhorada**: Interface mais limpa e organizada

### Versão 1.0 (Setembro 2024)
- **Versão Inicial**: Layout em cards
- **Aprovação/Rejeição**: Funcionalidades básicas
- **Filtros por Status**: Cards clicáveis
- **Estatísticas**: Contadores por status

## Próximas Implementações

### Planejadas
1. **Paginação**: Para listas grandes de usuários
2. **Exportação**: Relatórios em CSV/PDF
3. **Logs de Ação**: Histórico de mudanças de status
4. **Notificações**: E-mail para usuários sobre mudanças
5. **Bulk Actions**: Ações em lote para múltiplos usuários

### Melhorias Futuras
1. **Filtros Avançados**: Por data, status, etc.
2. **Busca Global**: Em todos os campos
3. **Ordenação**: Por colunas clicáveis
4. **Refresh Automático**: Atualização em tempo real
5. **Modo Escuro**: Tema alternativo
6. **Link WhatsApp**: Telefone clicável para abrir conversa
