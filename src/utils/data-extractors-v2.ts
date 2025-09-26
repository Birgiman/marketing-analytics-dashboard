/**
 * Data Extractors V2 - Funções para extrair dados corretos das APIs
 * 
 * Este arquivo contém funções para extrair e processar dados das APIs
 * Meta (Marketing API) e Evolution (WhatsApp) de forma consistente
 */

import { MetaAction } from '@/types/live';
import { MetaInsight } from './metaApi';
import { getWhatsAppGroupsLogData } from './whatsappGroupsLog';

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

  // Verificar se campaignInsights existe e não está vazio
  if (!campaignInsights || campaignInsights.length === 0) {
    return {
      totalSpend: 0,
      totalResults: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalReach: 0,
      campaignCount: 0,
      insightsCount: 0
    };
  }

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
 * CORREÇÃO: Prioriza action_type=lead que é o valor agregado (Pixel + Onsite)
 * @param actions - Array de ações do Meta
 * @returns Número total de leads/results
 */
export function extractLeadsFromActions(actions: MetaAction[]): number {
  if (!actions || actions.length === 0) return 0;

  // CORREÇÃO: PRIORIDADE 1 - action_type=lead (valor agregado do Meta Ads Manager)
  const leadAction = actions.find(action => action.action_type === 'lead');
  if (leadAction) {
    const leads = parseInt(leadAction.value) || 0;
    return leads;
  }

  // PRIORIDADE 2: Outros tipos de leads específicos
  const otherLeadAction = actions.find(action =>
    action.action_type === 'submit_application' ||
    action.action_type === 'complete_registration' ||
    action.action_type === 'offsite_conversion.fb_pixel_lead' ||
    action.action_type === 'omni_complete_registration'
  );

  if (otherLeadAction) {
    const leads = parseInt(otherLeadAction.value) || 0;
    return leads;
  }

  // Se nenhum lead for encontrado, retornar 0 silenciosamente

  return 0;
}

// ============================================================================
// EXTRATORES DE DADOS DOS GRUPOS (EVOLUTION API)
// ============================================================================

/**
 * Extrai dados consolidados dos grupos do WhatsApp
 * @param groups - Array de grupos vinculados à Live
 * @param dateFrom - Data de início do período (OBRIGATÓRIO)
 * @param dateTo - Data de fim do período (OBRIGATÓRIO)
 * @param userId - ID do usuário logado (OBRIGATÓRIO)
 * @returns Dados consolidados dos grupos
 */
export async function extractGroupData(
  groups: Array<{
    id: string;
    group_id: string;
    group_name: string;
    group_size: number;
    monitoring: boolean;
    created_at: string;
    updated_at: string;
  }>,
  dateFrom: string,
  dateTo: string,
  userId: string
): Promise<ExtractedGroupData> {
  // Validar parâmetros obrigatórios
  if (!dateFrom || !dateTo || !userId) {
    throw new Error(`[extractGroupData] Parâmetros obrigatórios ausentes: dateFrom=${dateFrom}, dateTo=${dateTo}, userId=${userId}`);
  }

  const totalMembers = groups.reduce((sum, group) => sum + (group.group_size || 0), 0);
  const totalGroups = groups.length;
  try {
    const groupIds = groups.map(group => group.group_id);
    const logData = await getWhatsAppGroupsLogData(groupIds, dateFrom, dateTo, userId);
    return {
      totalMembers,
      totalGroups,
      entries: logData.totalEntries,
      exits: logData.totalExits,
      activeMembers: logData.totalActiveMembers
    };
  } catch (error) {
    throw new Error(`[extractGroupData] Falha ao obter dados reais do WhatsApp: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// ============================================================================
// EXTRATOR PRINCIPAL
// ============================================================================

/**
 * Extrai todos os dados necessários para os cálculos
 * @param liveData - Dados completos da Live
 * @param dateFrom - Data de início do período (OBRIGATÓRIO)
 * @param dateTo - Data de fim do período (OBRIGATÓRIO)
 * @param userId - ID do usuário logado (OBRIGATÓRIO)
 * @returns Dados extraídos e processados
 */
export async function extractLiveDataForCalculations(
  liveData: {
    live: {
      id: string;
      name: string;
      ad_budget?: number;
    };
    groups: Array<{
      id: string;
      group_id: string;
      group_name: string;
      group_size: number;
      monitoring: boolean;
      created_at: string;
      updated_at: string;
    }>;
    campaignInsights: Array<{
      campaign_id: string;
      insights: MetaInsight[];
    }>;
  },
  dateFrom: string,
  dateTo: string,
  userId: string
): Promise<ExtractedLiveData> {
  // Validar parâmetros obrigatórios
  if (!dateFrom || !dateTo || !userId) {
    throw new Error(`[extractLiveDataForCalculations] Parâmetros obrigatórios ausentes: dateFrom=${dateFrom}, dateTo=${dateTo}, userId=${userId}`);
  }

  const metaData = extractMetaData(liveData.campaignInsights);
  const groupData = await extractGroupData(liveData.groups, dateFrom, dateTo, userId);

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

  // Validações de estrutura básica
  if (!extractedData) {
    errors.push('Dados extraídos não estão disponíveis');
    return { isValid: false, warnings, errors };
  }

  if (!extractedData.metaData) {
    errors.push('Dados do Meta não estão disponíveis');
    return { isValid: false, warnings, errors };
  }

  if (!extractedData.groupData) {
    errors.push('Dados dos grupos não estão disponíveis');
    return { isValid: false, warnings, errors };
  }

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
  // Verificar se os dados existem antes de logar
  if (!extractedData) {
    return;
  }
  if (extractedData.metaData) {
  } else {
  }
  if (extractedData.groupData) {
  } else {
  }
  if (extractedData.liveInfo) {
  } else {
  }
}

// ============================================================================
// EXTRATORES DE DADOS POR CAMPANHA (NÍVEL CAMPANHA)
// ============================================================================

/**
 * Interface para dados individuais de cada campanha
 */
export interface CampaignData {
  campaign_id: string;
  campaign_name: string;
  ad_set_name?: string;
  totalSpend: number;
  totalResults: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  insightsCount: number;
  cpl: number;
}

export interface AdSetData {
  ad_set_id: string;
  ad_set_name: string;
  ad_set_status: string;
  campaign_id: string;
  campaign_name: string;
  totalSpend: number;
  totalResults: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  cpl: number;
  insightsCount: number;
}

/**
 * Extrai dados individuais de cada campanha
 * @param campaignInsights - Array de insights das campanhas
 * @returns Array com dados individuais de cada campanha
 */
export function extractCampaignData(
  campaignInsights: Array<{
    campaign_id: string;
    campaign_name?: string;
    insights: MetaInsight[];
  }>,
  allUserCampaigns?: Array<{
    id: string;
    name: string;
    status: string;
  }>
): CampaignData[] {
  return campaignInsights.map(({ campaign_id, campaign_name, insights }) => {
    let totalSpend = 0;
    let totalResults = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalReach = 0;
    let insightsCount = 0;
    let actualCampaignName = campaign_name;

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
      
      // Tentar obter o nome da campanha do insight se não tiver
      if (!actualCampaignName && insight.campaign_name) {
        actualCampaignName = insight.campaign_name;
      }
      
      insightsCount++;
    });

    // Se ainda não tem nome, tentar buscar nas campanhas do usuário
    if (!actualCampaignName && allUserCampaigns) {
      const campaignFromUser = allUserCampaigns.find(c => c.id === campaign_id);
      if (campaignFromUser) {
        actualCampaignName = campaignFromUser.name;
      }
    }

    // Calcular CPL individual da campanha
    const cpl = totalResults > 0 ? totalSpend / totalResults : 0;

    return {
      campaign_id,
      campaign_name: actualCampaignName || `Campanha ${campaign_id}`,
      ad_set_name: actualCampaignName || `Conjunto ${campaign_id}`,
      totalSpend,
      totalResults,
      totalImpressions,
      totalClicks,
      totalReach,
      insightsCount,
      cpl
    };
  });
}

/**
 * Extrai dados individuais de cada conjunto de anúncios (Ad Set)
 * Versão refatorada que usa dados diretos da Marketing API
 * @param adSets - Array de conjuntos de anúncios da API
 * @param campaignInsights - Array de insights das campanhas (para cálculos)
 * @returns Array com dados individuais de cada conjunto de anúncios
 */
export function extractAdSetDataFromInsights(
  adSetInsights: MetaInsight[]
): AdSetData[] {
  const adSetMap = new Map<string, AdSetData>();

  adSetInsights.forEach((insight, index) => {
    const adSetId = insight.adset_id;

    if (!adSetId) {
      return;
    }

    if (!adSetMap.has(adSetId)) {
      adSetMap.set(adSetId, {
        ad_set_id: adSetId,
        ad_set_name: insight.adset_name || 'Nome não disponível',
        ad_set_status: 'ACTIVE', // Status não vem nos insights, assumir ativo
        campaign_id: insight.campaign_id || '',
        campaign_name: insight.campaign_name || 'Campanha não disponível',
        totalSpend: 0,
        totalResults: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalReach: 0,
        cpl: 0,
        insightsCount: 0
      });
    }

    const adSet = adSetMap.get(adSetId)!;
    adSet.totalSpend += parseFloat(insight.spend || '0');
    adSet.totalImpressions += parseInt(insight.impressions || '0');
    adSet.totalClicks += parseInt(insight.clicks || '0');
    adSet.totalReach += parseInt(insight.reach || '0');
    adSet.totalResults += extractLeadsFromActions(insight.actions || []);
    adSet.insightsCount++;
  });

  // Calcular CPL para cada ad set
  adSetMap.forEach(adSet => {
    adSet.cpl = adSet.totalResults > 0 ? adSet.totalSpend / adSet.totalResults : 0;
  });

  return Array.from(adSetMap.values());
}

/**
 * Calcula CPL médio correto (soma dos investimentos / soma dos leads)
 * @param campaignData - Array com dados das campanhas
 * @returns CPL médio correto
 */
export function calculateCorrectAverageCPL(campaignData: CampaignData[]): number;
export function calculateCorrectAverageCPL(adSetData: AdSetData[]): number;
export function calculateCorrectAverageCPL(data: CampaignData[] | AdSetData[]): number {
  if (data.length === 0) return 0;
  
  let totalSpend = 0;
  let totalResults = 0;
  
  for (const item of data) {
    totalSpend += item.totalSpend;
    totalResults += item.totalResults;
  }

  return totalResults > 0 ? totalSpend / totalResults : 0;
}
