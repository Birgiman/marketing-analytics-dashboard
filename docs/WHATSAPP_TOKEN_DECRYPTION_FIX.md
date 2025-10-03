# Fix: Erro 401 Unauthorized na Sincronização de Grupos WhatsApp

## 🐛 Problema Identificado

Usuários relataram erro ao sincronizar grupos do WhatsApp:

**Sintomas:**
- Logs mostravam "success" mas com `Grupos: 0 (0ms) | Processados: 0`
- Tabela `whatsapp_group_fetch_jobs` registrava `status: "failed"` com erro `"HTTP 401: Unauthorized"`
- Requisição manual à Evolution API funcionava normalmente

**Causa Raiz:**
A Edge Function `process-fetch-groups-job` estava usando o `api_token` **criptografado** diretamente do banco de dados sem descriptografar antes de fazer requisições à Evolution API.

## 🔍 Diagnóstico

### Fluxo do Problema

1. ✅ Token é **criptografado** com AES-256-GCM ao ser salvo no banco (via `whatsapp-secure`)
2. ✅ Token criptografado é armazenado em `whatsapp_instances.api_token`
3. ❌ `process-fetch-groups-job` busca o token do banco
4. ❌ Token criptografado é usado diretamente no header `apikey` da requisição
5. ❌ Evolution API recebe token criptografado (formato JSON) em vez do token real
6. ❌ Evolution API retorna 401 Unauthorized

### Exemplo do Token Criptografado

```json
{
  "encrypted": "eW91cl9lbmNyeXB0ZWRfZGF0YQ==",
  "iv": "cmFuZG9tX2l2",
  "tag": "YXV0aF90YWc="
}
```

Esse JSON estava sendo enviado no header `apikey` em vez do token real.

## ✅ Solução Implementada

### 1. Criado Módulo Compartilhado

**Arquivo:** `supabase/functions/_shared/token-crypto.ts`

- Classe `TokenCrypto` com métodos:
  - `encryptToken(plaintext)` - Criptografa tokens
  - `decryptToken(encrypted)` - Descriptografa tokens
  - `isEncrypted(value)` - Verifica se valor está criptografado

### 2. Atualizado `process-fetch-groups-job`

**Mudanças:**

```typescript
// ANTES (❌ Erro 401)
const apiKey = instanceData.api_token; // Token criptografado
const response = await fetch(url, {
  headers: { 'apikey': apiKey } // JSON criptografado no header
});

// DEPOIS (✅ Funciona)
import { TokenCrypto } from '../_shared/token-crypto.ts';

let apiKey = instanceData.api_token;

// Descriptografar se necessário
if (TokenCrypto.isEncrypted(apiKey)) {
  apiKey = await TokenCrypto.decryptToken(apiKey);
}

const response = await fetch(url, {
  headers: { 'apikey': apiKey } // Token real no header
});
```

### 3. Logs de Debug Adicionados

```typescript
console.log(`🔐 [process-fetch-groups-job] Token criptografado detectado, descriptografando...`);
console.log(`✅ [process-fetch-groups-job] Token descriptografado com sucesso`);
console.log(`⚠️ [process-fetch-groups-job] Token não está criptografado (formato legacy)`);
```

## 🧪 Como Testar

### 1. Verificar Token no Banco

```sql
SELECT 
  instance_name,
  user_id,
  LEFT(api_token, 50) as token_preview,
  CASE 
    WHEN api_token LIKE '{%' THEN '🔐 Criptografado'
    ELSE '⚠️ Plaintext'
  END as status
FROM whatsapp_instances
WHERE user_id = 'user_id_aqui';
```

### 2. Testar Sincronização

```typescript
// 1. Iniciar sincronização
const response = await fetch('/functions/v1/start-fetch-groups', {
  method: 'POST',
  body: JSON.stringify({
    instanceName: 'liveshop_nome_usuario',
    userId: 'user-id',
    searchTerm: '' // opcional
  })
});

// 2. Verificar logs da Edge Function
// Procurar por:
// - "🔐 Token criptografado detectado"
// - "✅ Token descriptografado com sucesso"
// - "📊 RESUMO: ... | Grupos: X" (X > 0)

// 3. Verificar job no banco
const { data } = await supabase
  .from('whatsapp_group_fetch_jobs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(1);

// Deve mostrar:
// - status: "completed"
// - result_count > 0
// - last_error: null
```

## 🔒 Segurança

### Criptografia Implementada

- **Algoritmo:** AES-256-GCM
- **IV:** Aleatório de 12 bytes por criptografia
- **Tag de Autenticação:** 128 bits
- **Derivação de Chave:** SHA-256 do `AES_SECRET_KEY`

### Boas Práticas

✅ Tokens **sempre criptografados** ao serem salvos
✅ Descriptografia **apenas nas Edge Functions** (backend seguro)
✅ Tokens **nunca expostos** ao frontend
✅ Suporta migração gradual (detecta tokens legacy em plaintext)

## 📝 Outras Edge Functions Afetadas

Todas as Edge Functions que usam `api_token` devem descriptografar:

- ✅ `process-fetch-groups-job` - **CORRIGIDO**
- ✅ `whatsapp-secure` - Já usa descriptografia
- ✅ `sync-live-meta-data` - Já usa descriptografia (Meta tokens)
- ✅ `meta-secure` - Já usa descriptografia

## 🚀 Deploy

```bash
# Deploy das funções atualizadas
supabase functions deploy process-fetch-groups-job

# Verificar logs
supabase functions logs process-fetch-groups-job --tail
```

## 📊 Métricas de Sucesso

**Antes do Fix:**
- ❌ Jobs falhando com 401 Unauthorized
- ❌ `result_count: 0` nos jobs
- ❌ Grupos não sincronizados

**Depois do Fix:**
- ✅ Jobs completados com sucesso
- ✅ `result_count > 0` (número de grupos encontrados)
- ✅ Grupos sincronizados corretamente na tabela `whatsapp_groups`

## 📚 Referências

- [Documentação TokenCrypto](../supabase/functions/_shared/README.md)
- [Web Crypto API - AES-GCM](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt)
- [Evolution API Docs](https://doc.evolution-api.com/)

---

**Data da Correção:** 2025-10-03  
**Versão:** 1.0  
**Autor:** AI Assistant

