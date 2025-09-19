/**
 * Data Extractors V2 - Funções para extrair dados corretos das APIs
 * 
 * Este arquivo contém funções para extrair e processar dados das APIs
 * Meta (Marketing API) e Evolution (WhatsApp) de forma consistente
 */

import { MetaAction } from '@/types/live';
import { MetaInsight } from './metaApi';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ExtractedMetaData {
  totalSpend: number;
  totalResults: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  campaignCount: number;
  insightsCount: number;
}

export interface ExtractedGroupData {
  totalMembers: number;
  totalGroups: number;
  entries: number;
  exits: number;
  activeMembers: number;
}

export interface ExtractedLiveData {
  metaData: ExtractedMetaData;
  groupData: ExtractedGroupData;
  liveInfo: {
    id: string;
    name: string;
    orcamentoGasto?: number;
    orcamentoTotal?: number;
  };
}

// ============================================================================
// EXTRATORES DE DADOS DO META
// ============================================================================

/**
 * Extrai dados consolidados das campanhas do Meta
 * @param campaignInsights - Array de insights das campanhas
 * @returns Dados consolidados do Meta
 */
export function extractMetaData(campaignInsights: Array<{
  campaign_id: string;
  insights: MetaInsight[];
}>): ExtractedMetaData {
  let totalSpend = 0;
  let totalResults = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalReach = 0;
  let insightsCount = 0;

  campaignInsights.forEach(({ campaign_id, insights }) => {
    insights.forEach(insight => {
      // Soma dos gastos
      totalSpend += parseFloat(insight.spend || '0');
      
      // Soma das impressões
      totalImpressions += parseInt(insight.impressions || '0');
      
      // Soma dos cliques
      totalClicks += parseInt(insight.clicks || '0');
      
      // Soma do reach
      totalReach += parseInt(insight.reach || '0');
      
      // Soma dos results/leads
      totalResults += extractLeadsFromActions(insight.actions || []);
      
      insightsCount++;
    });
  });

  return {
    totalSpend,
    totalResults,
    totalImpressions,
    totalClicks,
    totalReach,
    campaignCount: campaignInsights.length,
    insightsCount
  };
}

/**
 * Extrai leads/results das ações do Meta
 * Prioriza leads reais, depois engajamento como proxy
 * @param actions - Array de ações do Meta
 * @returns Número total de leads/results
 */
export function extractLeadsFromActions(actions: MetaAction[]): number {
  if (!actions || actions.length === 0) return 0;

  // PRIORIDADE 1: Leads específicos (conversões reais)
  const trueLeads = actions.find(action =>
    action.action_type === 'lead' ||
    action.action_type === 'submit_application' ||
    action.action_type === 'complete_registration' ||
    action.action_type === 'offsite_conversion.fb_pixel_lead' ||
    action.action_type === 'omni_complete_registration' ||
    action.action_type === 'offsite_conversion' ||
    action.action_type === 'offsite_conversion.custom'
  );

  if (trueLeads) {
    return parseInt(trueLeads.value) || 0;
  }

  // PRIORIDADE 2: Engajamento como proxy (com peso reduzido)
  const engagementAction = actions.find(action =>
    action.action_type === 'landing_page_view' ||
    action.action_type === 'link_click'
  );

  if (engagementAction) {
    const rawValue = parseInt(engagementAction.value) || 0;
    return Math.round(rawValue * 0.3); // 30% de conversão estimada
  }

  // PRIORIDADE 3: Engajamento social (peso muito baixo)
  const socialAction = actions.find(action =>
    action.action_type === 'post_engagement' ||
    action.action_type === 'comment' ||
    action.action_type === 'like' ||
    action.action_type === 'page_engagement'
  );

  if (socialAction) {
    const rawValue = parseInt(socialAction.value) || 0;
    return Math.round(rawValue * 0.05); // 5% de conversão estimada
  }

  return 0;
}

// ============================================================================
// EXTRATORES DE DADOS DOS GRUPOS (EVOLUTION API)
// ============================================================================

/**
 * Extrai dados consolidados dos grupos do WhatsApp
 * @param groups - Array de grupos vinculados à Live
 * @returns Dados consolidados dos grupos
 */
export function extractGroupData(groups: Array<{
  id: string;
  group_id: string;
  group_name: string;
  group_size: number;
  monitoring: boolean;
  created_at: string;
  updated_at: string;
}>): ExtractedGroupData {
  const totalMembers = groups.reduce((sum, group) => sum + (group.group_size || 0), 0);
  const totalGroups = groups.length;
  
  // Por enquanto, assumimos que todos os membros são "entradas"
  // TODO: Implementar tracking de entradas/saídas quando disponível
  const entries = totalMembers;
  const exits = 0; // TODO: Implementar quando Evolution API fornecer esses dados
  const activeMembers = totalMembers; // Assumindo que todos estão ativos

  return {
    totalMembers,
    totalGroups,
    entries,
    exits,
    activeMembers
  };
}

// ============================================================================
// EXTRATOR PRINCIPAL
// ============================================================================

/**
 * Extrai todos os dados necessários para os cálculos
 * @param liveData - Dados completos da Live
 * @returns Dados extraídos e processados
 */
export function extractLiveDataForCalculations(liveData: {
  live: any;
  groups: any[];
  campaignInsights: Array<{
    campaign_id: string;
    insights: MetaInsight[];
  }>;
}): ExtractedLiveData {
  const metaData = extractMetaData(liveData.campaignInsights);
  const groupData = extractGroupData(liveData.groups);

  return {
    metaData,
    groupData,
    liveInfo: {
      id: liveData.live.id,
      name: liveData.live.name,
      orcamentoGasto: liveData.live.ad_budget || undefined,
      orcamentoTotal: liveData.live.ad_budget || undefined
    }
  };
}

// ============================================================================
// FUNÇÕES DE VALIDAÇÃO DE DADOS
// ============================================================================

/**
 * Valida se os dados extraídos são consistentes
 * @param extractedData - Dados extraídos
 * @returns Status de validação
 */
export function validateExtractedData(extractedData: ExtractedLiveData): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validações de erro (impedem cálculo)
  if (extractedData.metaData.totalSpend < 0) {
    errors.push('Gasto total do Meta não pode ser negativo');
  }

  if (extractedData.groupData.totalMembers < 0) {
    errors.push('Total de membros dos grupos não pode ser negativo');
  }

  if (extractedData.metaData.totalResults < 0) {
    errors.push('Total de results do Meta não pode ser negativo');
  }

  // Validações de warning (permitem cálculo mas alertam)
  if (extractedData.metaData.totalSpend > 0 && extractedData.metaData.totalResults === 0) {
    warnings.push('Há gastos no Meta mas nenhum lead/result foi encontrado');
  }

  if (extractedData.groupData.totalMembers === 0 && extractedData.metaData.totalSpend > 0) {
    warnings.push('Há gastos no Meta mas nenhum membro nos grupos');
  }

  if (extractedData.metaData.campaignCount === 0) {
    warnings.push('Nenhuma campanha encontrada para análise');
  }

  if (extractedData.groupData.totalGroups === 0) {
    warnings.push('Nenhum grupo vinculado à Live');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

// ============================================================================
// FUNÇÕES DE DEBUG/LOG
// ============================================================================

/**
 * Gera log detalhado dos dados extraídos
 * @param extractedData - Dados extraídos
 */
export function logExtractedData(extractedData: ExtractedLiveData): void {
  console.log('📊 [DATA-EXTRACTORS-V2] Dados extraídos:');
  console.log('==========================================');
  console.log('🎯 META DATA:');
  console.log(`  • Total gasto: R$ ${extractedData.metaData.totalSpend.toFixed(2)}`);
  console.log(`  • Total results/leads: ${extractedData.metaData.totalResults}`);
  console.log(`  • Total impressões: ${extractedData.metaData.totalImpressions.toLocaleString()}`);
  console.log(`  • Total cliques: ${extractedData.metaData.totalClicks.toLocaleString()}`);
  console.log(`  • Campanhas analisadas: ${extractedData.metaData.campaignCount}`);
  console.log(`  • Insights processados: ${extractedData.metaData.insightsCount}`);
  console.log('');
  console.log('👥 GROUP DATA:');
  console.log(`  • Total de membros: ${extractedData.groupData.totalMembers}`);
  console.log(`  • Total de grupos: ${extractedData.groupData.totalGroups}`);
  console.log(`  • Entradas: ${extractedData.groupData.entries}`);
  console.log(`  • Saídas: ${extractedData.groupData.exits}`);
  console.log(`  • Membros ativos: ${extractedData.groupData.activeMembers}`);
  console.log('');
  console.log('📋 LIVE INFO:');
  console.log(`  • ID: ${extractedData.liveInfo.id}`);
  console.log(`  • Nome: ${extractedData.liveInfo.name}`);
  console.log(`  • Orçamento gasto: ${extractedData.liveInfo.orcamentoGasto ? `R$ ${extractedData.liveInfo.orcamentoGasto.toFixed(2)}` : 'Não definido'}`);
  console.log('==========================================');
}

// ============================================================================
// EXEMPLO DE USO
// ============================================================================

/**
 * Exemplo de uso das funções
 * 
 * const liveData = {
 *   live: { id: '123', name: 'Live Teste', ad_budget: 10000 },
 *   groups: [
 *     { group_size: 500, group_name: 'Grupo 1' },
 *     { group_size: 350, group_name: 'Grupo 2' }
 *   ],
 *   campaignInsights: [
 *     {
 *       campaign_id: '123456',
 *       insights: [
 *         { spend: '5000', actions: [{ action_type: 'lead', value: '1000' }] }
 *       ]
 *     }
 *   ]
 * };
 * 
 * const extractedData = extractLiveDataForCalculations(liveData);
 * const validation = validateExtractedData(extractedData);
 * 
 * if (validation.isValid) {
 *   logExtractedData(extractedData);
 *   // Prosseguir com cálculos
 * } else {
 *   console.error('Erros encontrados:', validation.errors);
 * }
 */
