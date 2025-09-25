/**
 * Live Metrics V2 - Integração completa para cálculos de métricas
 * 
 * Este arquivo combina os extratores de dados com as funções de cálculo
 * para fornecer uma interface simples e consistente para calcular métricas
 */

import {
  calculateLiveMetricsV2,
  formatCurrencyV2,
  formatPercentageV2,
  GroupData,
  LiveMetricsV2,
  logCalculationsV2,
  MetaCampaignData
} from './calculations-v2';

import {
  ExtractedLiveData,
  extractLiveDataForCalculations,
  logExtractedData,
  validateExtractedData
} from './data-extractors-v2';

// ============================================================================
// INTERFACES
// ============================================================================

export interface LiveMetricsResult {
  metrics: LiveMetricsV2;
  extractedData: ExtractedLiveData;
  validation: {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  };
  summary: {
    cplLiquidoFormatted: string;
    cplMetaFormatted: string;
    retentionRateFormatted: string;
    cplLiquidoPlanejamentoFormatted: string;
  };
}

export interface LiveMetricsOptions {
  enableLogging?: boolean;
  enableValidation?: boolean;
  orcamentoGasto?: number;
  dateFrom: string;
  dateTo: string;
  userId: string;
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Calcula todas as métricas de uma Live de forma completa
 * @param liveData - Dados completos da Live
 * @param options - Opções de configuração
 * @returns Resultado completo com métricas, dados e validação
 */
export async function calculateCompleteLiveMetrics(
  liveData: {
    live: any;
    groups: any[];
    campaignInsights: Array<{
      campaign_id: string;
      insights: any[];
    }>;
  },
  options: LiveMetricsOptions
): Promise<LiveMetricsResult> {
  const {
    enableLogging = true,
    enableValidation = true,
    orcamentoGasto,
    dateFrom,
    dateTo,
    userId
  } = options;

  // Validar parâmetros obrigatórios
  if (!dateFrom || !dateTo || !userId) {
    throw new Error(`[calculateCompleteLiveMetrics] Parâmetros obrigatórios ausentes: dateFrom=${dateFrom}, dateTo=${dateTo}, userId=${userId}`);
  }

  // 1. Extrair dados das APIs
  const extractedData = await extractLiveDataForCalculations(liveData, dateFrom, dateTo, userId);
  
  // 2. Validar dados (se habilitado)
  const validation = enableValidation ? validateExtractedData(extractedData) : {
    isValid: true,
    warnings: [],
    errors: []
  };

  // 3. Log dos dados extraídos (se habilitado)
  if (enableLogging) {
    logExtractedData(extractedData);
  }

  // 4. Preparar dados para cálculo
  const groupData: GroupData = {
    totalMembers: extractedData.groupData.totalMembers,
    entries: extractedData.groupData.entries,
    exits: extractedData.groupData.exits
  };

  const metaData: MetaCampaignData = {
    spend: extractedData.metaData.totalSpend,
    results: extractedData.metaData.totalResults,
    impressions: extractedData.metaData.totalImpressions,
    clicks: extractedData.metaData.totalClicks,
    reach: extractedData.metaData.totalReach
  };

  // 5. Calcular métricas
  const metrics = calculateLiveMetricsV2(
    groupData, 
    metaData, 
    orcamentoGasto || extractedData.liveInfo.orcamentoGasto
  );

  // 6. Log dos cálculos (se habilitado)
  if (enableLogging) {
    logCalculationsV2(groupData, metaData, metrics);
  }

  // 7. Formatar resultados
  const summary = {
    cplLiquidoFormatted: formatCurrencyV2(metrics.cplLiquido),
    cplMetaFormatted: formatCurrencyV2(metrics.cplMeta),
    retentionRateFormatted: formatPercentageV2(metrics.retentionRate),
    cplLiquidoPlanejamentoFormatted: formatCurrencyV2(metrics.cplLiquidoPlanejamento)
  };

  return {
    metrics,
    extractedData,
    validation,
    summary
  };
}

// ============================================================================
// FUNÇÕES DE CONVENIÊNCIA
// ============================================================================

/**
 * Calcula apenas as métricas principais (sem validação e logs)
 * @param liveData - Dados completos da Live
 * @param dateFrom - Data de início do período (OBRIGATÓRIO)
 * @param dateTo - Data de fim do período (OBRIGATÓRIO)
 * @param userId - ID do usuário logado (OBRIGATÓRIO)
 * @returns Métricas calculadas
 */
export async function calculateSimpleMetrics(
  liveData: {
    live: any;
    groups: any[];
    campaignInsights: Array<{
      campaign_id: string;
      insights: any[];
    }>;
  },
  dateFrom: string,
  dateTo: string,
  userId: string
): Promise<LiveMetricsV2> {
  const result = calculateCompleteLiveMetrics(liveData, {
    enableLogging: false,
    enableValidation: false,
    dateFrom,
    dateTo,
    userId
  });

  const resolved = await result;
  return resolved.metrics;
}

/**
 * Calcula métricas com validação (sem logs)
 * @param liveData - Dados completos da Live
 * @param dateFrom - Data de início do período (OBRIGATÓRIO)
 * @param dateTo - Data de fim do período (OBRIGATÓRIO)
 * @param userId - ID do usuário logado (OBRIGATÓRIO)
 * @returns Resultado com métricas e validação
 */
export async function calculateMetricsWithValidation(
  liveData: {
    live: any;
    groups: any[];
    campaignInsights: Array<{
      campaign_id: string;
      insights: any[];
    }>;
  },
  dateFrom: string,
  dateTo: string,
  userId: string
): Promise<Omit<LiveMetricsResult, 'extractedData' | 'summary'>> {
  const result = calculateCompleteLiveMetrics(liveData, {
    enableLogging: false,
    enableValidation: true,
    dateFrom,
    dateTo,
    userId
  });
  
  const resolved = await result;
  return {
    metrics: resolved.metrics,
    validation: resolved.validation
  };
}

// ============================================================================
// FUNÇÕES DE COMPARAÇÃO
// ============================================================================

/**
 * Compara métricas entre duas Lives
 * @param live1Data - Dados da primeira Live
 * @param live2Data - Dados da segunda Live
 * @param dateFrom - Data de início do período (OBRIGATÓRIO)
 * @param dateTo - Data de fim do período (OBRIGATÓRIO)
 * @param userId - ID do usuário logado (OBRIGATÓRIO)
 * @returns Comparação das métricas
 */
export async function compareLiveMetrics(
  live1Data: any,
  live2Data: any,
  dateFrom: string,
  dateTo: string,
  userId: string
): Promise<{
  live1: LiveMetricsV2;
  live2: LiveMetricsV2;
  comparison: {
    cplLiquidoDiff: number;
    cplMetaDiff: number;
    retentionRateDiff: number;
    cplLiquidoPlanejamentoDiff: number;
  };
}> {
  const metrics1 = await calculateSimpleMetrics(live1Data, dateFrom, dateTo, userId);
  const metrics2 = await calculateSimpleMetrics(live2Data, dateFrom, dateTo, userId);

  const comparison = {
    cplLiquidoDiff: metrics2.cplLiquido - metrics1.cplLiquido,
    cplMetaDiff: metrics2.cplMeta - metrics1.cplMeta,
    retentionRateDiff: metrics2.retentionRate - metrics1.retentionRate,
    cplLiquidoPlanejamentoDiff: metrics2.cplLiquidoPlanejamento - metrics1.cplLiquidoPlanejamento
  };

  return {
    live1: metrics1,
    live2: metrics2,
    comparison
  };
}

// ============================================================================
// FUNÇÕES DE EXPORTAÇÃO
// ============================================================================

/**
 * Exporta métricas para formato CSV
 * @param result - Resultado das métricas
 * @returns String CSV
 */
export function exportMetricsToCSV(result: LiveMetricsResult): string {
  const { metrics, extractedData } = result;
  
  const headers = [
    'Live ID',
    'Live Name',
    'CPL Líquido',
    'CPL Meta',
    'Taxa de Retenção (%)',
    'CPL Líquido Planejamento',
    'Total Gasto',
    'Total Leads',
    'Total Membros',
    'Total Grupos',
    'Total Campanhas'
  ];

  const values = [
    extractedData.liveInfo.id,
    extractedData.liveInfo.name,
    metrics.cplLiquido.toFixed(2),
    metrics.cplMeta.toFixed(2),
    metrics.retentionRate.toFixed(2),
    metrics.cplLiquidoPlanejamento.toFixed(2),
    extractedData.metaData.totalSpend.toFixed(2),
    extractedData.metaData.totalResults.toString(),
    extractedData.groupData.totalMembers.toString(),
    extractedData.groupData.totalGroups.toString(),
    extractedData.metaData.campaignCount.toString()
  ];

  return [headers.join(','), values.join(',')].join('\n');
}

