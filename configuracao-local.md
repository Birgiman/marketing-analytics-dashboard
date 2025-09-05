# Configuração para Desenvolvimento Local

## Visão Geral

Este guia explica como configurar o projeto para rodar localmente **conectando ao mesmo Supabase do Lovable**, permitindo desenvolvimento paralelo sem conflitos.

## ✅ Vantagens desta Configuração

- **Dados compartilhados**: Mesmo banco de dados do Lovable
- **Desenvolvimento em tempo real**: Mudanças instantâneas com hot-reload
- **Sem conflitos**: Ambos os ambientes podem rodar simultaneamente
- **Flexibilidade**: Alternancia entre Lovable e local conforme necessidade

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Git

## 🚀 Configuração Passo a Passo

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

O projeto já está configurado com as credenciais corretas do Supabase:

**Arquivo: `.env`** (já configurado)
```env
VITE_SUPABASE_PROJECT_ID="gsdmasbgrglbvlpuhidv"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZG1hc2JncmdsYnZscHVoaWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDkwMTMsImV4cCI6MjA3MjU4NTAxM30.hrL3tWvdZKrsDwNf_yG2kawqYcA6nnV89CW9nEkH93s"
VITE_SUPABASE_URL="https://gsdmasbgrglbvlpuhidv.supabase.co"
```

### 3. Executar o Projeto Local

```bash
npm run dev
```

O projeto será executado em `http://localhost:3000` (ou porta disponível).

## 🔄 Funcionamento Paralelo

### Cenário de Uso:
1. **Lovable**: Produção/testes gerais rodando no ambiente Lovable
2. **Local**: Desenvolvimento ativo na sua máquina

### Como Funciona:
- **Mesmo Database**: Ambos conectam ao Supabase `gsdmasbgrglbvlpuhidv.supabase.co`
- **Dados Sincronizados**: Mudanças feitas em qualquer ambiente são refletidas instantaneamente
- **Autenticação Compartilhada**: Usuários criados em um ambiente funcionam no outro

## 📁 Estrutura de Configuração

```
├── .env                    # Variáveis principais (Supabase)
├── .env.local              # Template para outras configs opcionais
├── src/
│   └── integrations/
│       └── supabase/
│           └── client.ts   # Cliente Supabase configurado
```

## ⚠️ Considerações Importantes

### 1. **Dados Compartilhados**
- Cuidado ao fazer testes que alterem dados críticos
- Use dados de teste quando possível
- Mudanças são refletidas em ambos os ambientes

### 2. **Rate Limits**
- O Supabase tem limites de requisições
- Múltiplos ambientes consomem do mesmo pool
- Monitore uso na dashboard do Supabase

### 3. **Desenvolvimento Seguro**
- Faça commits frequentes
- Use branches para features experimentais
- Teste localmente antes de subir para Lovable

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento local
npm run dev

# Build para produção
npm run build

# Build para desenvolvimento
npm run build:dev

# Preview do build
npm run preview

# Lint do código
npm run lint

# Type checking
npm run type-check
```

## 🔧 Troubleshooting

### Erro de Conexão com Supabase
```bash
# Verificar se as variáveis estão corretas
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_PUBLISHABLE_KEY
```

### Porta em Uso
```bash
# Vite automatically finds available port
# Default: 3000, but will use 3001, 3002, etc if occupied
```

### Dependências Desatualizadas
```bash
npm install
# ou
npm ci  # para instalação limpa
```

## 🔗 URLs de Acesso

- **Local**: `http://localhost:3000` (ou porta mostrada no terminal)
- **Lovable**: URL fornecida pelo Lovable
- **Supabase Dashboard**: `https://supabase.com/dashboard/project/gsdmasbgrglbvlpuhidv`

## 📊 Monitoramento

### Dashboard Supabase
- Acesse: https://supabase.com/dashboard/project/gsdmasbgrglbvlpuhidv
- Monitore: Requisições, usuários, tabelas, logs
- Verifique: Rate limits e performance

### Logs Locais
```bash
# Logs do Vite dev server
npm run dev

# Logs no browser
# F12 > Console (erros de Supabase aparecerão aqui)
```

## ✨ Workflow Recomendado

1. **Desenvolvimento Local**: Alterações e testes rápidos
2. **Commit**: Salvar mudanças no Git
3. **Push**: Enviar para repositório
4. **Deploy Lovable**: Sincronizar com ambiente Lovable
5. **Validação**: Testar em ambos os ambientes

---

**🎯 Resultado**: Ambiente de desenvolvimento local funcionando em paralelo com o Lovable, ambos conectados ao mesmo Supabase, permitindo flexibilidade total no desenvolvimento!