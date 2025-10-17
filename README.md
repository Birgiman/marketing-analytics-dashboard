# Marketing Analytics Dashboard

Sistema de analytics para marketing digital com foco em métricas de desempenho e análise de dados de WhatsApp e Meta Ads.

## Arquitetura do Projeto

### Frontend
- **Framework:** Vite + React 18 com TypeScript
- **Styling:** Tailwind CSS
- **Estado:** React Hooks + Supabase Client

### Backend
- **Database:** Dados mocados para versão demo (projeto original usava Supabase PostgreSQL com RLS)
- **Auth:** Sistema de autenticação simulado
- **APIs:** Meta Marketing API + WhatsApp Evolution API
- **Edge Functions:** Mantidas na pasta `supabase/functions/` para referência (caso desenvolvedores queiram implementar backend real)

### Estrutura de Pastas

```
src/
├── components/          # Componentes React reutilizáveis
│   ├── ui/             # Componentes base de UI
│   └── QRCodeDisplay.tsx
├── hooks/              # Custom hooks
│   ├── useToast.ts
│   └── useWhatsAppConnection.tsx
├── lib/                # Configurações e utilitários
│   └── supabase.ts
├── pages/              # Páginas React
│   ├── auth/           # Páginas de autenticação
│   ├── integrations/   # Páginas de integrações
│   └── dashboard/      # Dashboard principal
├── services/           # Serviços de API
│   └── whatsappService.ts
├── styles/             # Estilos globais
├── types/              # Definições TypeScript
└── utils/              # Funções utilitárias
```

## Funcionalidades Implementadas

### ✅ Autenticação e Perfis
- Sistema de login/cadastro com Supabase Auth
- Perfis de usuário com nome, email e telefone
- Sistema de aprovação manual (pending → active → blocked)

### ✅ Integração WhatsApp (Completa)
- **Hooks avançados**: `useWhatsAppConnection` e `useWhatsAppQR`
- **Evolution API Integration**: Edge Functions completas no Supabase
- **QR Code automático**: Geração baseada no perfil do usuário
- **Polling inteligente**: Verificação automática de status a cada 10s
- **Auto-refresh QR**: Renovação automática com countdown de 50s
- **Gerenciamento completo**: Conectar, desconectar, deletar instâncias
- **Logging avançado**: Todas as operações são logadas no Supabase
- **Error handling**: Tratamento robusto de erros e timeouts

### ✅ Dashboard Principal
- Métricas básicas (visualizações, vendas, receita)
- Cards de navegação rápida
- **Captações navegáveis**: Nomes das captações clicáveis para detalhes
- Estatísticas de integrações conectadas

### ✅ Sistema de Tipos
- Interfaces TypeScript completas para todas as entidades
- Tipos para WhatsApp, Analytics, Captações, etc.

## Configuração e Instalação

### 🚀 **Teste Rápido (Modo Demo)**

Para testar a interface imediatamente **SEM configurar banco de dados**:

```bash
cd marketing-analytics-dashboard
npm install
npm run dev
```

Acesse `http://localhost:3000` - O modo demo está **ATIVO** por padrão!

- ✅ **Login automático** - Pula autenticação
- ✅ **Dados simulados** - Dashboard com métricas de exemplo
- ✅ **WhatsApp demo** - QR Code simulado funcional
- ✅ **Interface completa** - Todas as telas navegáveis

### 📋 **Configuração Completa (Produção)**

Para usar com banco de dados real:

1. **Desativar modo demo** em `src/lib/demo-mode.ts`:
   ```typescript
   export const DEMO_MODE = false; // Mudar para false
   ```

2. **Configurar variáveis de ambiente** (`.env.local`):
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY
   ```

3. **Configurar banco de dados**:
   Execute o script SQL `schema_atualizado_supabase.sql` no Supabase

4. **Executar aplicação**:
   ```bash
   npm run dev
   ```

### 🛠️ **Comandos Disponíveis**

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build
npm start

# Verificações
npm run type-check
npm run lint
```

## Nota sobre Migrations

A pasta `supabase/migrations/` foi removida pois este projeto demo não utiliza banco de dados real. As Edge Functions foram mantidas na pasta `supabase/functions/` para referência caso desenvolvedores queiram implementar um backend completo.

## Próximos Passos

### 🚧 Em Desenvolvimento
1. **Meta Ads Integration** - Conectar com Meta Marketing API
2. **Analytics Avançado** - Relatórios detalhados e gráficos
3. **Live Management** - Interface para gerenciar transmissões
4. **Grupo Monitoring** - Monitoramento de grupos WhatsApp
5. **Creative Analysis** - Análise de performance de criativos

### 📋 Melhorias Futuras
- Sistema de notificações em tempo real
- Exportação de relatórios em PDF/Excel
- Dashboard customizável
- Sistema de alertas automáticos
- API pública para integrações

## 🚀 Desenvolvimento Local


## Notas Técnicas

### Dependências Principais
- Vite + React 18 com TypeScript
- Supabase para backend e autenticação
- Tailwind CSS para styling
- Lucide React para ícones
- React Hook Form para formulários

### Integrações Externas
- **Evolution API** - WhatsApp Business integration
- **Supabase** - Database, Auth, Edge Functions
- **Meta Marketing API** - Facebook/Instagram Ads

## Suporte e Desenvolvimento

Para suporte ou contribuições, consulte a documentação do projeto original ou entre em contato com a equipe de desenvolvimento.