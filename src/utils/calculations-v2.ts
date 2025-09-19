/**
 * Cálculos V2 - Funções Corretas para LiveShop
 * Baseado nas especificações da empresa
 * 
 * CPL Líquido: Total de pessoas que entrou no grupo / Total gasto (Meta)
 * CPL Meta: Amount spend / Results ou leads
 * Taxa de Retenção: Pessoas que entrou no grupo / Leads que o Meta entregou * 100
 * CPL Líquido do Planejamento: Valor investido / Número de pessoas que entrou no grupo
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface MetaCampaignData {
  spend: number; // Amount spend do Meta
  results: number; // Results ou leads do Meta
  impressions?: number;
  clicks?: number;
  reach?: number;
}

export interface GroupData {
  totalMembers: number; // Total de pessoas que entrou no grupo
  entries?: number; // Entradas (se disponível)
  exits?: number; // Saídas (se disponível)
}

export interface LiveMetricsV2 {
  cplLiquido: number;
  cplMeta: number;
  retentionRate: number;
  cplLiquidoPlanejamento: number;
}

export interface ProjectionData {
  orcamentoTotal: number;
  orcamentoGasto: number;
  cplLiquidoAtual: number;
  metaLeads: number;
}

// ============================================================================
// FUNÇÕES PRINCIPAIS DE CÁLCULO
// ============================================================================

/**
 * Calcula CPL Líquido
 * Fórmula: Total de pessoas que entrou no grupo / Total gasto (Meta)
 * 
 * @param totalGroupMembers - Total de pessoas que entrou no grupo
 * @param totalSpend - Total gasto no Meta (amount spend)
 * @returns CPL Líquido em reais
 */
export function calculateCPLLiquido(totalGroupMembers: number, totalSpend: number): number {
  if (totalGroupMembers <= 0) return 0;
  if (totalSpend <= 0) return 0;
  
  return totalSpend / totalGroupMembers;
}

/**
 * Calcula CPL Meta
 * Fórmula: Amount spend / Results ou leads
 * 
 * @param totalSpend - Total gasto no Meta (amount spend)
 * @param totalLeads - Total de leads/results do Meta
 * @returns CPL Meta em reais
 */
export function calculateCPLMeta(totalSpend: number, totalLeads: number): number {
  if (totalLeads <= 0) return 0;
  if (totalSpend <= 0) return 0;
  
  return totalSpend / totalLeads;
}

/**
 * Calcula Taxa de Retenção
 * Fórmula: Pessoas que entrou no grupo / Leads que o Meta entregou * 100
 * 
 * @param totalGroupMembers - Total de pessoas que entrou no grupo
 * @param totalMetaLeads - Total de leads que o Meta entregou
 * @returns Taxa de retenção em porcentagem
 */
export function calculateRetentionRate(totalGroupMembers: number, totalMetaLeads: number): number {
  if (totalMetaLeads <= 0) return 0;
  if (totalGroupMembers <= 0) return 0;
  
  return (totalGroupMembers / totalMetaLeads) * 100;
}

/**
 * Calcula CPL Líquido do Planejamento
 * Fórmula: Valor investido / Número de pessoas que entrou no grupo
 * 
 * @param valorInvestido - Valor investido em reais
 * @param totalGroupMembers - Número de pessoas que entrou no grupo
 * @returns CPL Líquido do planejamento em reais
 */
export function calculateCPLLiquidoPlanejamento(valorInvestido: number, totalGroupMembers: number): number {
  if (totalGroupMembers <= 0) return 0;
  if (valorInvestido <= 0) return 0;
  
  return valorInvestido / totalGroupMembers;
}

// ============================================================================
// FUNÇÃO PRINCIPAL - CALCULA TODAS AS MÉTRICAS
// ============================================================================

/**
 * Calcula todas as métricas de uma Live
 * 
 * @param groupData - Dados dos grupos (Evolution API)
 * @param metaData - Dados das campanhas (Meta API)
 * @param orcamentoGasto - Orçamento já gasto (opcional)
 * @returns Objeto com todas as métricas calculadas
 */
export function calculateLiveMetricsV2(
  groupData: GroupData,
  metaData: MetaCampaignData,
  orcamentoGasto?: number
): LiveMetricsV2 {
  const cplLiquido = calculateCPLLiquido(groupData.totalMembers, metaData.spend);
  const cplMeta = calculateCPLMeta(metaData.spend, metaData.results);
  const retentionRate = calculateRetentionRate(groupData.totalMembers, metaData.results);
  
  // CPL Líquido do planejamento usa o orçamento gasto ou o spend do Meta
  const valorInvestido = orcamentoGasto || metaData.spend;
  const cplLiquidoPlanejamento = calculateCPLLiquidoPlanejamento(valorInvestido, groupData.totalMembers);

  return {
    cplLiquido,
    cplMeta,
    retentionRate,
    cplLiquidoPlanejamento
  };
}

// ============================================================================
// FUNÇÕES DE PROJEÇÃO
// ============================================================================

/**
 * Calcula projeção de leads com verba restante
 * Baseado no exemplo: 5000/2000=2.50, sobrou 15000, se manter CPL 2.5 = +6000 leads
 * 
 * @param projectionData - Dados para projeção
 * @returns Objeto com projeções calculadas
 */
export function calculateProjection(projectionData: ProjectionData): {
  verbaRestante: number;
  leadsEstimados: number;
  totalFinalEstimado: number;
  deficit: number;
} {
  const { orcamentoTotal, orcamentoGasto, cplLiquidoAtual, metaLeads } = projectionData;
  
  const verbaRestante = orcamentoTotal - orcamentoGasto;
  const leadsEstimados = cplLiquidoAtual > 0 ? Math.floor(verbaRestante / cplLiquidoAtual) : 0;
  const totalFinalEstimado = metaLeads + leadsEstimados;
  const deficit = orcamentoTotal - totalFinalEstimado;

  return {
    verbaRestante,
    leadsEstimados,
    totalFinalEstimado,
    deficit
  };
}

// ============================================================================
// FUNÇÕES DE FORMATAÇÃO
// ============================================================================

/**
 * Formata valor monetário para exibição
 * @param value - Valor em reais
 * @returns String formatada (ex: "R$ 1.234,56")
 */
export function formatCurrencyV2(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata porcentagem para exibição
 * @param value - Valor em porcentagem
 * @param decimals - Número de casas decimais (padrão: 1)
 * @returns String formatada (ex: "85,0%")
 */
export function formatPercentageV2(value: number, decimals: number = 1): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}

/**
 * Formata número inteiro para exibição
 * @param value - Valor numérico
 * @returns String formatada (ex: "1.234")
 */
export function formatNumberV2(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.floor(value));
}

// ============================================================================
// FUNÇÕES DE VALIDAÇÃO
// ============================================================================

/**
 * Valida se os dados para cálculo são válidos
 * @param groupData - Dados dos grupos
 * @param metaData - Dados do Meta
 * @returns Objeto com status de validação
 */
export function validateCalculationData(
  groupData: GroupData,
  metaData: MetaCampaignData
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (groupData.totalMembers < 0) {
    errors.push('Total de membros do grupo não pode ser negativo');
  }

  if (metaData.spend < 0) {
    errors.push('Gasto do Meta não pode ser negativo');
  }

  if (metaData.results < 0) {
    errors.push('Results do Meta não podem ser negativos');
  }

  if (groupData.totalMembers === 0 && metaData.spend > 0) {
    errors.push('Não é possível calcular CPL Líquido: nenhum membro no grupo mas há gastos');
  }

  if (metaData.results === 0 && metaData.spend > 0) {
    errors.push('Não é possível calcular CPL Meta: nenhum lead mas há gastos');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// FUNÇÕES DE DEBUG/LOG
// ============================================================================

/**
 * Gera log detalhado dos cálculos para debug
 * @param groupData - Dados dos grupos
 * @param metaData - Dados do Meta
 * @param metrics - Métricas calculadas
 */
export function logCalculationsV2(
  groupData: GroupData,
  metaData: MetaCampaignData,
  metrics: LiveMetricsV2
): void {
  console.log('🧮 [CALCULATIONS-V2] Cálculos detalhados:');
  console.log('==========================================');
  console.log('📊 DADOS DE ENTRADA:');
  console.log(`  • Total de membros no grupo: ${formatNumberV2(groupData.totalMembers)}`);
  console.log(`  • Gasto total (Meta): ${formatCurrencyV2(metaData.spend)}`);
  console.log(`  • Leads do Meta: ${formatNumberV2(metaData.results)}`);
  console.log('');
  console.log('🧮 CÁLCULOS:');
  console.log(`  • CPL Líquido: ${formatCurrencyV2(metaData.spend)} ÷ ${formatNumberV2(groupData.totalMembers)} = ${formatCurrencyV2(metrics.cplLiquido)}`);
  console.log(`  • CPL Meta: ${formatCurrencyV2(metaData.spend)} ÷ ${formatNumberV2(metaData.results)} = ${formatCurrencyV2(metrics.cplMeta)}`);
  console.log(`  • Taxa de Retenção: ${formatNumberV2(groupData.totalMembers)} ÷ ${formatNumberV2(metaData.results)} × 100 = ${formatPercentageV2(metrics.retentionRate)}`);
  console.log('==========================================');
}

// ============================================================================
// EXEMPLO DE USO
// ============================================================================

/**
 * Exemplo de uso das funções
 * 
 * const groupData = {
 *   totalMembers: 850, // Pessoas que entraram no grupo
 *   entries: 850,
 *   exits: 0
 * };
 * 
 * const metaData = {
 *   spend: 5000, // R$ 5.000 gastos
 *   results: 1000, // 1000 leads do Meta
 *   impressions: 50000,
 *   clicks: 2500
 * };
 * 
 * const metrics = calculateLiveMetricsV2(groupData, metaData);
 * 
 * console.log('CPL Líquido:', formatCurrencyV2(metrics.cplLiquido)); // R$ 5,88
 * console.log('CPL Meta:', formatCurrencyV2(metrics.cplMeta)); // R$ 5,00
 * console.log('Taxa de Retenção:', formatPercentageV2(metrics.retentionRate)); // 85,0%
 */
