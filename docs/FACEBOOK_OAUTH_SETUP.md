# Facebook OAuth Integration - LiveShop

## Configuração do Facebook App para Produção

Atualmente o sistema está usando um App ID de teste. Para uso em produção, siga estes passos:

### 1. Criar Facebook App

1. Acesse [Facebook for Developers](https://developers.facebook.com/)
2. Clique em "My Apps" → "Create App"
3. Selecione "Business" como tipo de app
4. Preencha:
   - App Name: "LiveShop Analytics"
   - App Contact Email: seu email
   - Business Use Case: "Marketing APIs and tools"

### 2. Configurar OAuth Web

1. No painel do app, vá em "App Settings" → "Basic"
2. Adicione domínios em "App Domains":
   - `lovableproject.com`
   - `localhost` (para desenvolvimento)
3. Em "Website", adicione:
   - Site URL: `https://seu-dominio.lovableproject.com`

### 3. Configurar Marketing API

1. Vá em "Products" → "Marketing API"
2. Clique em "Set Up"
3. Configure as permissões necessárias:
   - `ads_read`: Ler dados de campanhas
   - `ads_management`: Gerenciar campanhas
   - `public_profile`: Informações básicas do usuário
   - `email`: Email do usuário

### 4. Obter App ID e Secret

1. Em "App Settings" → "Basic"
2. Copie o **App ID**
3. Clique em "Show" no **App Secret** (guarde em local seguro)

### 5. Atualizar Código

No arquivo `src/services/facebookOAuthService.ts`, altere:

```typescript
constructor() {
  // Substitua pelo seu App ID real
  this.APP_ID = 'SEU_APP_ID_AQUI';
}
```

### 6. Configurar Webhooks (Opcional)

Para receber notificações de mudanças:
1. Vá em "Products" → "Webhooks"
2. Configure endpoint para receber eventos
3. Subscreva aos eventos relevantes

### 7. Solicitar Revisão (Para Produção)

Para usar em produção com usuários reais:
1. Complete todas as informações do app
2. Adicione política de privacidade
3. Envie para revisão do Facebook
4. Aguarde aprovação (pode levar alguns dias)

## Teste Atual

O sistema está configurado com App ID de teste que permite:
- ✅ Login básico com Facebook
- ✅ Obter perfil do usuário (nome, email)
- ❌ Acesso à Marketing API (limitado)

Para testes completos da Marketing API, é necessário configurar um app próprio.

## Troubleshooting

### Erro: PLATFORM__INVALID_APP_ID
- Verifique se o App ID está correto
- Confirme que o domínio está configurado no Facebook App

### Erro: Invalid Scope
- Verifique se as permissões estão ativadas no Facebook App
- Algumas permissões requerem revisão do Facebook

### Login funciona mas API falha
- Confirme que o token tem as permissões corretas
- Verifique se a Marketing API está ativada no app