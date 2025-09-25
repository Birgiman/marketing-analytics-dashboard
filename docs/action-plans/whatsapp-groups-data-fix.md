# Plano de Ação: Correção dos Dados WhatsApp Groups

**Data**: 24/09/2025
**Status**: Em Investigação
**Problema**: Dados dos grupos não aparecem nos dias recentes (22, 23, 24)

## 🔍 Problema Identificado

### Sintomas
- ✅ Dias 20 e 21: Dados corretos (groupJoin, groupExit, retenção)
- ❌ Dias 22, 23, 24: Sem dados dos grupos (groupJoin/groupExit = 0)
- ✅ Dados existem no Supabase para todos os dias
- ❌ Mapeamento incorreto: dados dos dias 23/24 foram associados aos dias 20/21

### Descoberta Principal
**Hipótese Confirmada**: "Ele pegou os resultados do dia 24 e do dia 23 e colocou no dia errado"

- **dailyInsights do Meta**: 5 dias (20, 21, 22, 23, 24)
- **Consulta WhatsApp**: Retorna apenas 2 dias (23, 24)
- **Mapeamento Incorreto**:
  ```
  Dados WhatsApp dia 23 → Insight Meta dia 20 ❌
  Dados WhatsApp dia 24 → Insight Meta dia 21 ❌
  Dias 22, 23, 24 → Ficaram zerados ❌
  ```

### Inconsistências nos Dados
- **Supabase**: 507 registros no dia 24
- **Planilha Externa**: 1.050 registros no dia 24
- **Add Function**: ~119 registros de atraso
- **Timestamps**: Corretos e sincronizados

## 💡 Soluções Propostas

### Solução A: Cache Inteligente "2 Dias Fresh"
```javascript
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0];

// Estratégia:
├─ HOJE (sempre fresh)     → Buscar do WhatsApp Groups Log
├─ ONTEM (sempre fresh)    → Buscar do WhatsApp Groups Log
└─ ANTERIORES (cache)      → Usar dados salvos consolidados
```

**Vantagens**:
- Elimina problemas de timezone
- Performance otimizada
- Dados recentes sempre atualizados
- Margem de 2 dias para capturar registros tardios

### Solução B: Corrigir Mapeamento por Data
- Garantir match exato por data no `whatsappDataMap.get(insight.date)`
- Não associar dados de dias diferentes
- Debug detalhado do range da consulta

## 🔧 Implementações Realizadas

### ✅ Correções Já Implementadas
1. **Semântica dos Campos**:
   - `group` → `groupJoin` (entradas no dia)
   - `groupExit` (saídas no dia)
   - **CPL Líquido** = `spend ÷ (groupJoin - groupExit)`
   - **Taxa de Retenção** = `((groupJoin - groupExit) ÷ leads) × 100`

2. **Calendário Automático**:
   - Preenchimento automático com datas dos dados disponíveis
   - Range: 20/09 a 24/09

3. **Consulta Otimizada**:
   - Consulta direta sem dependência de RPC
   - Múltiplos grupos simultâneos (8 grupos)
   - Logs detalhados para troubleshooting

4. **Cache Inteligente Base**:
   - Separação dias anteriores vs dia atual
   - Performance otimizada

5. **Debug Detalhado**:
   - Logs estruturados em cada etapa
   - Resumo final dos dados
   - Facilita investigação

## 🎯 Próximos Passos

### Investigação Necessária
1. **Confirmar quais dias têm registros reais** no WhatsApp Groups Log
2. **Verificar mapeamento por data** - debug do `whatsappDataMap`
3. **Testar range da consulta** - garantir que retorna dados corretos
4. **Analisar discrepância** entre Supabase (507) vs Planilha Externa (1.050)

### Implementação Futura
- [ ] Implementar estratégia "2 dias fresh + resto cached"
- [ ] Corrigir mapeamento por data
- [ ] Adicionar validação de consistência dos dados
- [ ] Otimizar Add Function para reduzir atraso

## 📊 Estrutura de Dados Corrigida

```json
{
  "date": "2025-09-22",
  "spend": 725.49,
  "leads": 1063,
  "cplMeta": 0.68,
  "groupJoin": 845,          // Entradas do dia (todos os grupos)
  "groupExit": 23,           // Saídas do dia (todos os grupos)
  "cplLiquido": 0.86,        // spend ÷ (groupJoin - groupExit)
  "retention": 79            // ((groupJoin - groupExit) ÷ leads) × 100
}
```

---

**Arquivos Modificados**:
- `src/utils/LiveData/getLiveData.ts`
- `src/utils/whatsappGroupsLog.ts`
- `src/pages/TrafficAnalysis.tsx`