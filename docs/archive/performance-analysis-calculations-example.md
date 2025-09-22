# Cálculos Matemáticos - Análise de Performance

Este documento detalha todos os cálculos matemáticos utilizados nos dois cards da **Análise de Performance**, para que possam ser replicados em outros projetos independente da fonte de dados.

## 📊 Card 1: Planejado vs Executado

Este card exibe três métricas principais com suas respectivas metas e indicadores visuais.

### 1. CPL Líquido

**Definição**: Custo por Lead Líquido - representa o custo para cada pessoa que efetivamente entrou no grupo.

**Fórmula**:
```
CPL Líquido = Total Investido ÷ Total de Pessoas que Entraram no Grupo
```

**Fonte dos Dados**:
- **Total Investido**: Soma do campo `amount_spent` de todos os registros da planilha de criativos
- **Total de Pessoas no Grupo**: Contagem de registros da planilha de grupos onde `evento = 'ENTROU'`

**Meta**: R$ 3,00 por lead

**Cálculo do Desvio da Meta**:
```
Percentual de Desvio = ((CPL Líquido Atual - Meta) ÷ Meta) × 100
Desvio = ((CPL Líquido - 3.00) × 100)%
```

**Indicadores**:
- ✅ **Verde**: CPL ≤ R$ 3,00 (Dentro da meta)
- ❌ **Vermelho**: CPL > R$ 3,00 (Acima da meta)

### 2. Pessoas no Grupo

**Definição**: Total de pessoas que entraram no grupo vs. meta estabelecida.

**Fórmula**:
```
Total de Pessoas = COUNT(registros onde evento = 'ENTROU')
```

**Meta**: 8.330 pessoas

**Cálculo do Progresso**:
```
Percentual de Progresso = (Pessoas Atuais ÷ Meta) × 100
Progresso = (Total de Pessoas ÷ 8.330) × 100
```

**Barra de Progresso**: Limitada a 100% mesmo se ultrapassar a meta

### 3. Investimento

**Definição**: Total investido vs. orçamento disponível.

**Fórmula**:
```
Total Investido = SUM(amount_spent de todos os registros)
```

**Orçamento**: R$ 25.000,00

**Cálculo do Progresso**:
```
Percentual do Orçamento = (Total Investido ÷ Orçamento) × 100
Progresso = (Total Investido ÷ 25.000) × 100
```

**Indicadores**:
- ✅ **Verde**: Investimento ≤ R$ 25.000,00
- ❌ **Vermelho**: Investimento > R$ 25.000,00

## 🎯 Card 2: Projeção com Verba Restante

Este card projeta o desempenho final baseado na verba restante e CPL atual.

### 1. Verba Restante

**Fórmula**:
```
Verba Restante = |Orçamento Total - Total Investido|
Verba Restante = |25.000 - Total Investido|
```

**Nota**: Usa valor absoluto para mostrar sempre positivo, mesmo se estourar o orçamento.

### 2. CPL Atual

**Fórmula**:
```
CPL Atual = CPL Líquido (mesmo cálculo do Card 1)
```

### 3. Leads Adicionais Estimados

**Fórmula**:
```
Leads Adicionais = Verba Restante ÷ CPL Atual
Leads Adicionais = (25.000 - Total Investido) ÷ CPL Líquido
```

**Condição**: Se CPL Líquido = 0, então Leads Adicionais = 0

### 4. Total Final Estimado

**Fórmula**:
```
Total Final = Pessoas Atuais no Grupo + Leads Adicionais Estimados
```

### 5. Déficit/Superávit

**Fórmula**:
```
Déficit/Superávit = Total Final Estimado - Meta de Pessoas
Déficit/Superávit = Total Final Estimado - 8.330
```

**Indicadores**:
- ✅ **Verde**: Resultado ≥ 0 (Superávit - meta será atingida)
- ❌ **Vermelho**: Resultado < 0 (Déficit - meta não será atingida)

**Formatação**:
- Valores positivos: exibidos com "+" na frente
- Valores negativos: exibidos normalmente (já têm o sinal "-")

## 📋 Resumo das Constantes

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| **Meta CPL** | R$ 3,00 | CPL líquido máximo desejado |
| **Meta Pessoas** | 8.330 | Número de pessoas alvo no grupo |
| **Orçamento Total** | R$ 25.000,00 | Verba total disponível |

## 🔄 Fluxo de Cálculo Completo

1. **Coleta de Dados**: Buscar dados das planilhas de criativos e grupos
2. **Cálculos Base**:
   - Total Investido (soma amount_spent)
   - Total de Pessoas no Grupo (count eventos 'ENTROU')
   - CPL Líquido (Total Investido ÷ Pessoas no Grupo)
3. **Métricas vs Metas**:
   - Comparar CPL com R$ 3,00
   - Comparar Pessoas com 8.330
   - Comparar Investimento com R$ 25.000,00
4. **Projeções**:
   - Calcular verba restante
   - Estimar leads adicionais possíveis
   - Calcular total final estimado
   - Determinar déficit/superávit

## 💡 Adaptação para Outras Fontes de Dados

Para replicar em outros projetos:

1. **Substitua as fontes de dados** mantendo a mesma estrutura:
   - `amount_spent`: valor gasto por registro
   - `evento`: campo para identificar entradas no grupo
   
2. **Ajuste as constantes** conforme o projeto:
   - Meta de CPL
   - Meta de pessoas/leads
   - Orçamento total

3. **Mantenha as fórmulas matemáticas** exatamente iguais

4. **Adapte os indicadores visuais** (cores, barras de progresso) conforme necessário

## 🚧 Funcionalidades Pendentes

### Filtro de Públicos por Estado

**Status**: ⏳ **PENDENTE** - Implementação futura

**Descrição**: Filtro dinâmico para análise de tráfego por estados/regiões específicas.

**Funcionalidade Planejada**:
- Extrair estados únicos dos nomes das campanhas
- Criar dropdown com opções de estados (ex: Espírito Santo, Maceió, Brasília, Nacional)
- Filtrar dados de conjuntos de anúncios por estado selecionado
- Concatenar termo de busca base com termo do estado para requisições à API Meta

**Implementação Técnica**:
- Utilizar `extractAndFormatCampaignTerm` para extrair estados das campanhas
- Modificar `getSearchTermForRequest` para concatenar termos
- Atualizar requisições à API Meta com filtro dinâmico
- Manter compatibilidade com filtro "Todos os Públicos"

**Arquivos Envolvidos**:
- `src/pages/TrafficAnalysis.tsx` - Interface do filtro
- `src/utils/campaignTermExtractor.ts` - Extração de termos
- `src/utils/metaApi.ts` - Requisições filtradas

**Nota**: Implementação foi revertida devido a problemas de loop infinito. Será reimplementada com melhor controle de dependências.

---

*Este documento serve como referência técnica para implementação dos mesmos cálculos em diferentes sistemas e fontes de dados.*