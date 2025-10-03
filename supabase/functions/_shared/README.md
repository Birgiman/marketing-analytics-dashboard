# Módulos Compartilhados - Edge Functions

Esta pasta contém utilitários compartilhados entre as Edge Functions do Supabase.

## token-crypto.ts

Utilitário de criptografia AES-256-GCM para tokens sensíveis (WhatsApp API, Meta API, etc).

### Uso

```typescript
import { TokenCrypto } from '../_shared/token-crypto.ts';

// Verificar e descriptografar token
let apiKey = instanceData.api_token;

if (TokenCrypto.isEncrypted(apiKey)) {
  apiKey = await TokenCrypto.decryptToken(apiKey);
}

// Criptografar token antes de salvar
const encryptedToken = await TokenCrypto.encryptToken(plainToken);
```

### Requisitos

- Variável de ambiente `AES_SECRET_KEY` deve estar configurada no Supabase
- Tokens criptografados são armazenados como JSON string com formato:
  ```json
  {
    "encrypted": "base64_data",
    "iv": "base64_iv",
    "tag": "base64_tag"
  }
  ```

### Segurança

- ✅ AES-256-GCM (autenticação + criptografia)
- ✅ IV aleatório para cada criptografia
- ✅ Chave derivada de SECRET via SHA-256
- ✅ Execução apenas em ambiente seguro (Edge Functions)

### Edge Functions que usam TokenCrypto

- `process-fetch-groups-job` - Descriptografa api_token do WhatsApp
- `whatsapp-secure` - Criptografa/descriptografa tokens do WhatsApp
- `meta-secure` - Criptografa/descriptografa access_token do Meta
- `sync-live-meta-data` - Descriptografa tokens do Meta

### Troubleshooting

**Erro 401 Unauthorized ao fazer requisições externas:**
- Verifique se o token está sendo descriptografado antes do uso
- Use `TokenCrypto.isEncrypted()` para verificar o formato
- Adicione logs para debug: `console.log('Token criptografado:', TokenCrypto.isEncrypted(token))`

**Erro "Chave de criptografia não encontrada":**
- Verifique se `AES_SECRET_KEY` está configurado nas environment variables do Supabase
- A chave deve ter no mínimo 32 caracteres para segurança adequada

