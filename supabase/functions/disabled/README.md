# Edge Functions Desabilitadas

Esta pasta contém Edge Functions que foram temporariamente desabilitadas por não estarem sendo utilizadas no frontend.

## 📁 Functions Desabilitadas

### **whatsapp-fetch-groups**
- **Status**: Comentada e desabilitada
- **Motivo**: Não utilizada no frontend, substituída por outras implementações
- **Última atividade**: Sem logs nos últimos 5 dias

### **whatsapp-fetch-groups-v2**
- **Status**: Comentada e desabilitada
- **Motivo**: Versão otimizada não utilizada no frontend
- **Última atividade**: Sem logs nos últimos 5 dias

### **fetch-groups-chunked**
- **Status**: Comentada e desabilitada
- **Motivo**: Implementação paginada não utilizada no frontend
- **Última atividade**: Sem logs nos últimos 5 dias

### **whatsapp-search-groups**
- **Status**: Comentada e desabilitada
- **Motivo**: Funcionalidade de busca não utilizada no frontend
- **Última atividade**: Sem logs nos últimos 5 dias

### **apply-migration**
- **Status**: Já estava desabilitada
- **Motivo**: Migration temporária, não mais necessária
- **Última atividade**: Função administrativa pontual

## 🔄 Como Reativar

Para reativar qualquer Edge Function:

1. **Descomente o código** no arquivo `index.ts` da function
2. **Mova a pasta** de volta para `supabase/functions/`
3. **Faça deploy**: `npx supabase functions deploy [nome-da-function]`

## 🗑️ Limpeza

Estas functions podem ser:
- **Excluídas do painel Supabase** com segurança
- **Mantidas aqui** para possível reutilização futura
- **Removidas completamente** se confirmado que não serão mais necessárias

---
*Última atualização: 2025-09-26*