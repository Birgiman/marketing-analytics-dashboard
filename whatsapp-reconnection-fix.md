# WhatsApp Reconnection Fix - Prompt para Lovable

## Problema Identificado
O usuário relatou erro 403 "This name 'liveshop_admin_liveshop' is already in use" ao tentar reconectar WhatsApp após desconexão.

## Solução Implementada
Correção da lógica de reconexão para usar o método correto da Evolution API v2:

### 1. Arquivo: `src/services/whatsappService.ts`
**Função modificada:** `createWhatsAppInstance`

Adicionar verificação de instância existente no banco antes de chamar a API:

```typescript
// Verificar se já existe uma instância no banco
const { data: existingInstance } = await supabase
  .from('whatsapp_instances')
  .select('*')
  .eq('user_id', userId)
  .eq('instance_name', instanceName)
  .single();

let result;

if (existingInstance) {
  // Instância já existe - usar connect para reconectar
  console.log('2. Instância existente encontrada - reconectando...');
  result = await this.callEvolutionAPI('reconnect_instance', {
    instanceName,
    userId,
    profileData: { fullName }
  });
} else {
  // Primeira conexão - criar nova instância
  console.log('2. Primeira conexão - criando nova instância...');
  result = await this.callEvolutionAPI('create_instance', {
    instanceName,
    userId,
    profileData: { fullName }
  });
}
```

### 2. Arquivo: `supabase/functions/whatsapp-api/index.ts`
**Adicionar novo case no switch:** `reconnect_instance`

```typescript
case 'reconnect_instance': {
  console.log('1. Reconectando instância existente...');
  await logWhatsAppAction('reconnect_instance_start', { instanceName });

  const response = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
    method: 'GET',
    headers
  });

  console.log('2. Reconnect response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('3. Reconnect API Error:', errorText);
    await logWhatsAppAction('reconnect_instance_error', null, `HTTP ${response.status}: ${errorText}`);
    throw new Error(`Erro na Evolution API: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('3. Reconnect response data:', data);
  console.log('4. QR Code presente:', !!(data.qrcode?.base64 || data.base64));

  const qrCode = data.qrcode?.base64 || data.base64;
  
  await logWhatsAppAction('reconnect_instance_success', { 
    instanceId: data.instance?.instanceId,
    status: data.instance?.status,
    qrCodeLength: qrCode?.length
  });

  return new Response(
    JSON.stringify({
      success: true,
      instance: data.instance,
      qrCode: qrCode,
      instanceName: instanceName
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

## Explicação Técnica
- **Problema**: A função `create_instance` estava sendo usada sempre, causando conflito quando instância já existia
- **Solução**: Verificar no banco se instância já existe e usar `/instance/connect/{instance}` para reconexão
- **API Evolution v2**: Método correto para reconectar instâncias existentes sem criar duplicatas

## Resultado Esperado
Após a implementação, o usuário poderá:
1. Conectar WhatsApp pela primeira vez (criar instância)
2. Desconectar quando necessário
3. Reconectar usando a mesma instância sem erro 403
4. Manter o mesmo nome de instância (`liveshop_admin_liveshop`)

## Deploy Necessário
Fazer deploy apenas da Edge Function atualizada:
```bash
supabase functions deploy whatsapp-api
```