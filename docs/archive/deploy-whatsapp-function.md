# Deploy da Edge Function WhatsApp

## Comando para executar no seu terminal local:

```bash
cd C:\dev\bridge-to-git
supabase functions deploy whatsapp-api
```

## Alterações feitas:

1. **Logs de variáveis de ambiente** - Verificar se EVOLUTION_API_URL e EVOLUTION_API_KEY estão configuradas
2. **Debug completo** - Mostrar todos os dados recebidos
3. **Tratamento de erro aprimorado** - Stack trace e detalhes

## Próximos passos:

1. Execute o deploy da função
2. Teste novamente o fluxo de reconexão
3. Verifique os logs do Supabase para ver:
   - Se as variáveis de ambiente estão configuradas
   - Qual action está sendo processada
   - Onde exatamente está falhando

## Possível Problema Identificado:

Baseado nos logs parciais, suspeito que:
- As variáveis `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` não estão configuradas no Supabase
- Por isso a função retorna erro 400 "Evolution API não configurada" imediatamente
- O frontend recebe esse erro como "Ação não suportada"

## Como configurar as variáveis no Supabase:

1. Vá no painel do Supabase
2. Settings > Edge Functions
3. Adicione as variáveis:
   - `EVOLUTION_API_URL`: sua URL da Evolution API
   - `EVOLUTION_API_KEY`: sua chave da Evolution API