# Conversa - Refatoração da Calculadora e Erro RLS
**Data**: 17 de Janeiro de 2025  
**Tópico**: Refatoração da calculadora LiveShop e correção de erro RLS

## 📋 Resumo da Sessão

### **Objetivo Principal**
Refatorar completamente a calculadora LiveShop removendo a Edge Function desnecessária e implementando uma solução mais simples e confiável.

### **Problema Identificado**
A Edge Function `calculator-history` estava causando erros 500 e complexidade desnecessária. O ChatGPT sugeriu uma abordagem mais simples usando inserts diretos na tabela.

## 🔧 Implementações Realizadas

### **1. Remoção da Edge Function**
- ✅ **Edge Function `calculator-history`** completamente removida
- ✅ **Arquivos deletados**:
  - `supabase/functions/calculator-history/index.ts`
  - `supabase/functions/calculator-history/deno.json`
  - `supabase/migrations/20250917233858_test_calculator_table.sql`
  - `create_calculator_table.sql`

### **2. Nova Estrutura da Tabela**
**Schema SQL aplicado no Supabase:**
```sql
CREATE TABLE calculator_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_medio numeric NOT NULL,
  total_dias int NOT NULL,
  orcamento numeric NOT NULL,
  cpl_liquido numeric NOT NULL,
  comparecimento numeric NOT NULL,
  conversao numeric NOT NULL,
  leads_previstos int,
  participantes int,
  vendas_previstas int,
  receita_prevista numeric,
  roi numeric,
  lucro numeric,
  margem_lucro numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### **3. Frontend Atualizado**
**Arquivo**: `src/pages/Calculator.tsx`

#### **Interface Atualizada:**
```typescript
interface SavedCalculation {
  id: string;
  user_id: string;
  ticket_medio: number;
  total_dias: number;
  orcamento: number;
  cpl_liquido: number;
  comparecimento: number;
  conversao: number;
  leads_previstos: number;
  participantes: number;
  vendas_previstas: number;
  receita_prevista: number;
  roi: number;
  lucro: number;
  margem_lucro: number;
  created_at: string;
  updated_at: string;
}
```

#### **Funções Simplificadas:**
- ✅ **`loadSavedCalculations()`** - Usa `supabase.from('calculator_history').select()`
- ✅ **`saveCalculation()`** - Usa `supabase.from('calculator_history').insert()`
- ✅ **`handleDeleteCalculation()`** - Usa `supabase.from('calculator_history').delete()`

### **4. Remoção da Rota de Usuários**
- ✅ **Item "Usuários"** removido do menu lateral (`AppSidebar.tsx`)
- ✅ **Import `UserCheck`** removido (não utilizado)

## ❌ Problema Atual: Erro RLS 403

### **Erro Encontrado:**
```
Request URL: https://gsdmasbgrglbvlpuhidv.supabase.co/rest/v1/calculator_history?select=*
Status Code: 403 Forbidden
Message: "new row violates row-level security policy for table \"calculator_history\""
```

### **Tentativas de Correção:**
1. **SQL de correção aplicado** (políticas RLS)
2. **Warning sobre operações destrutivas** - confirmado e executado
3. **Erro 403 persiste** após correção

### **SQL de Correção Aplicado:**
```sql
-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view their own calculator history" ON calculator_history;
DROP POLICY IF EXISTS "Users can insert their own calculator history" ON calculator_history;
DROP POLICY IF EXISTS "Users can update their own calculator history" ON calculator_history;
DROP POLICY IF EXISTS "Users can delete their own calculator history" ON calculator_history;

-- Criar políticas RLS corretas
CREATE POLICY "Users can view their own calculator history" ON calculator_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calculator history" ON calculator_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calculator history" ON calculator_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calculator history" ON calculator_history
  FOR DELETE USING (auth.uid() = user_id);

-- Verificar se RLS está habilitado
ALTER TABLE calculator_history ENABLE ROW LEVEL SECURITY;
```

## 🔍 Possíveis Causas do Erro RLS

### **1. Autenticação**
- Usuário pode não estar autenticado corretamente
- Token JWT pode estar inválido ou expirado
- Sessão pode ter expirado

### **2. Estrutura da Tabela**
- Tabela pode não ter sido criada corretamente
- Campos podem estar faltando ou com tipos incorretos
- Constraints podem estar incorretos

### **3. Políticas RLS**
- Políticas podem não estar sendo aplicadas corretamente
- `auth.uid()` pode não estar retornando o ID correto
- Pode haver conflito com outras políticas

### **4. Permissões do Usuário**
- Usuário pode não ter permissões adequadas
- RLS pode estar muito restritivo
- Pode haver problema com o contexto de autenticação

## 📊 Status Atual

### **✅ Concluído:**
- Edge Function removida
- Tabela criada no Supabase
- Frontend atualizado
- Rota de usuários removida
- Commit e push realizados

### **❌ Pendente:**
- **Erro RLS 403** ainda não resolvido
- Calculadora não consegue salvar dados
- Necessário investigar causa raiz do problema

## 🎯 Próximos Passos Sugeridos

### **1. Verificar Autenticação**
- Confirmar se usuário está logado
- Verificar se token JWT é válido
- Testar com usuário diferente

### **2. Verificar Estrutura da Tabela**
- Confirmar se tabela foi criada corretamente
- Verificar se todos os campos existem
- Validar tipos de dados

### **3. Testar Políticas RLS**
- Verificar se políticas estão ativas
- Testar com RLS temporariamente desabilitado
- Validar se `auth.uid()` retorna valor correto

### **4. Debug Avançado**
- Adicionar logs no frontend para verificar dados
- Verificar se `user_id` está sendo passado corretamente
- Testar insert manual no SQL Editor

## 📝 Commits Realizados

### **Commit 1**: `26f74fa`
```
fix: corrigir calculadora e remover rota de usuários
- Criar script SQL para tabela calculator_history
- Remover item 'Usuários' do menu lateral
- Corrigir precisão decimal nos cálculos
- Melhorar tratamento de erros na Edge Function
```

### **Commit 2**: `336a8d1`
```
refactor: simplificar calculadora removendo Edge Function
- Remover Edge Function calculator-history completamente
- Implementar inserts diretos na tabela calculator_history
- Atualizar interface SavedCalculation para nova estrutura
- Simplificar funções de save/load/delete usando supabase.from()
- Remover complexidade desnecessária e erros 500
```

## 🔧 Arquivos Modificados

### **Removidos:**
- `supabase/functions/calculator-history/index.ts`
- `supabase/functions/calculator-history/deno.json`
- `supabase/migrations/20250917233858_test_calculator_table.sql`
- `create_calculator_table.sql`

### **Modificados:**
- `src/pages/Calculator.tsx` - Interface e funções atualizadas
- `src/components/AppSidebar.tsx` - Rota de usuários removida
- `src/utils/calculations.ts` - Precisão decimal corrigida

## 📋 Conclusão

A refatoração da calculadora foi implementada com sucesso, removendo a complexidade desnecessária da Edge Function. No entanto, um erro RLS 403 está impedindo o salvamento de dados. O problema parece estar relacionado às políticas de segurança da tabela ou à autenticação do usuário.

**Status**: ⚠️ **Pendente resolução do erro RLS 403**
