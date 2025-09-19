/**
 * 🎯 Meta Marketing API - Função para obter CPL
 * 
 * Esta função faz requisição HTTP direta ao Meta Marketing API
 * e calcula o CPL (Cost Per Lead) automaticamente.
 * 
 * @author LiveShop Analytics
 * @version 1.0.0
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface MetaCPLRequest {
  accountId: string;
  accessToken: string;
  filters?: {
    campaignStatus?: string[];
    campaignName?: string;
    dateRange?: {
      since: string;
      until: string;
    };
  };
}

export interface MetaCPLResponse {
  success: boolean;
  data?: {
    cpl: number;
    totalSpend: number;
    totalLeads: number;
    campaignCount: number;
    rawData: any;
  };
  error?: string;
  logs?: string[];
}

// ============================================================================
// FUNÇÃO PRINCIPAL - getCPLFromMeta
// ============================================================================

/**
 * 🚀 Obtém CPL diretamente do Meta Marketing API
 * 
 * @param request - Parâmetros da requisição
 * @returns Promise com dados calculados do CPL
 */
export async function getCPLFromMeta(request: MetaCPLRequest): Promise<MetaCPLResponse> {
  const logs: string[] = [];
  
  try {
    logs.push(`🔄 [META-CPL] Iniciando busca de CPL para conta: ${request.accountId}`);
    
    // 1. Validar parâmetros obrigatórios
    if (!request.accountId || !request.accessToken) {
      throw new Error('accountId e accessToken são obrigatórios');
    }
    
    // 2. Construir URL da requisição
    const baseURL = 'https://graph.facebook.com/v23.0';
    // Verificar se accountId já tem o prefixo 'act_'
    const accountId = request.accountId.startsWith('act_') 
      ? request.accountId 
      : `act_${request.accountId}`;
    const url = `${baseURL}/${accountId}/insights`;
    
    logs.push(`📡 [META-CPL] URL construída: ${url}`);
    
    // 3. Preparar parâmetros da requisição
    const params = new URLSearchParams({
      fields: 'campaign_id,campaign_name,spend,results,actions,cost_per_action_type',
      access_token: request.accessToken,
      level: 'account'
    });
    
    // 4. Adicionar filtros se fornecidos
    if (request.filters) {
      const filtering: any[] = [];
      
      // Filtro de status das campanhas
      if (request.filters.campaignStatus && request.filters.campaignStatus.length > 0) {
        filtering.push({
          field: 'campaign.effective_status',
          operator: 'IN',
          value: request.filters.campaignStatus
        });
      }
      
      // Filtro de nome da campanha
      if (request.filters.campaignName) {
        filtering.push({
          field: 'campaign.name',
          operator: 'CONTAIN',
          value: request.filters.campaignName
        });
      }
      
      if (filtering.length > 0) {
        params.append('filtering', JSON.stringify(filtering));
        logs.push(`🔍 [META-CPL] Filtros aplicados: ${JSON.stringify(filtering)}`);
      }
      
      // Filtro de período
      if (request.filters.dateRange) {
        params.append('time_range', JSON.stringify(request.filters.dateRange));
        logs.push(`📅 [META-CPL] Período: ${request.filters.dateRange.since} até ${request.filters.dateRange.until}`);
      }
    }
    
    // 5. PRIMEIRA REQUISIÇÃO - Contar campanhas (nível campaign)
    logs.push(`🔢 [META-CPL] Primeira requisição: contando campanhas...`);
    const countParams = new URLSearchParams({
      fields: 'campaign_id,results', // Incluir 'results' para pegar campanhas pausadas/zeradas
      access_token: request.accessToken,
      level: 'campaign'
    });
    
    // Aplicar os mesmos filtros para contar
    if (request.filters) {
      const filtering: any[] = [];
      
      if (request.filters.campaignStatus && request.filters.campaignStatus.length > 0) {
        filtering.push({
          field: 'campaign.effective_status',
          operator: 'IN',
          value: request.filters.campaignStatus
        });
      }
      
      if (request.filters.campaignName) {
        filtering.push({
          field: 'campaign.name',
          operator: 'CONTAIN',
          value: request.filters.campaignName
        });
      }
      
      if (filtering.length > 0) {
        countParams.append('filtering', JSON.stringify(filtering));
      }
      
      if (request.filters.dateRange) {
        countParams.append('time_range', JSON.stringify(request.filters.dateRange));
      }
    }
    
    const countResponse = await fetch(`${url}?${countParams.toString()}`);
    if (!countResponse.ok) {
      throw new Error(`Erro HTTP ${countResponse.status}: ${countResponse.statusText}`);
    }
    
    const countData = await countResponse.json();
    const campaignCount = countData.data?.length || 0;
    logs.push(`📊 [META-CPL] Campanhas encontradas: ${campaignCount}`);
    
    // 6. SEGUNDA REQUISIÇÃO - Dados completos (nível account)
    logs.push(`🌐 [META-CPL] Segunda requisição: buscando dados completos...`);
    const response = await fetch(`${url}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    logs.push(`✅ [META-CPL] Resposta recebida com ${responseData.data?.length || 0} registros`);
    
    // 7. Processar dados e calcular CPL
    const processedData = processMetaInsightsData(responseData.data || [], campaignCount);
    logs.push(`🧮 [META-CPL] CPL calculado: R$ ${processedData.cpl.toFixed(2)}`);
    logs.push(`📊 [META-CPL] Dados processados: ${processedData.totalLeads} leads, R$ ${processedData.totalSpend} gasto`);
    
    return {
      success: true,
      data: processedData,
      logs
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logs.push(`❌ [META-CPL] Erro: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      logs
    };
  }
}

// ============================================================================
// FUNÇÃO AUXILIAR - processMetaInsightsData
// ============================================================================

/**
 * 🔧 Processa dados do Meta Insights e calcula métricas
 * 
 * IMPORTANTE: Usa o campo 'results' que já traz o valor correto
 * de leads/actions calculado pelo Meta (mais preciso que somar actions manualmente)
 */
function processMetaInsightsData(insights: any[], campaignCount: number): {
  cpl: number;
  totalSpend: number;
  totalLeads: number;
  campaignCount: number;
  rawData: any;
} {
  let totalSpend = 0;
  let totalLeads = 0;
  
  // Processar cada insight
  insights.forEach((insight, index) => {
    // Somar gastos
    if (insight.spend) {
      totalSpend += parseFloat(insight.spend);
    }
    
    // Usar campo 'results' se disponível, senão calcular manualmente
    if (insight.results && Array.isArray(insight.results) && insight.results.length > 0) {
      // Formato correto: insight.results[0].values[0].value
      if (insight.results[0] && insight.results[0].values && Array.isArray(insight.results[0].values)) {
        const resultValue = insight.results[0].values[0];
        if (resultValue && resultValue.value) {
          const leadsFromResults = parseInt(resultValue.value) || 0;
          totalLeads += leadsFromResults;
          console.log(`📊 [META-CPL] Leads do results: ${leadsFromResults} (${insight.results[0].indicator})`);
        }
      }
      // Formato alternativo: insight.results[0].value (fallback)
      else if (insight.results[0] && insight.results[0].value) {
        const leadsFromResults = parseInt(insight.results[0].value) || 0;
        totalLeads += leadsFromResults;
        console.log(`📊 [META-CPL] Leads do results (formato alternativo): ${leadsFromResults}`);
      }
      // Formato numérico direto (fallback)
      else if (typeof insight.results === 'number') {
        totalLeads += insight.results;
        console.log(`📊 [META-CPL] Leads do results (numérico): ${insight.results}`);
      }
    } else {
      // Fallback: calcular manualmente usando actions
      console.log(`⚠️ [META-CPL] Results vazio, usando actions como fallback`);
      if (insight.actions && Array.isArray(insight.actions)) {
        let leadsFromActions = 0;
        insight.actions.forEach((action: any) => {
          if (action.action_type === 'lead' || action.action_type === 'link_click') {
            leadsFromActions += parseInt(action.value) || 0;
          }
        });
        totalLeads += leadsFromActions;
        console.log(`📊 [META-CPL] Leads do actions: ${leadsFromActions}`);
      }
    }
  });
  
  // Calcular CPL
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  
  return {
    cpl,
    totalSpend,
    totalLeads,
    campaignCount: campaignCount, // Usar o count da primeira requisição
    rawData: insights
  };
}

// ============================================================================
// FUNÇÃO DE TESTE - testMetaCPLConnection
// ============================================================================

/**
 * 🧪 Função para testar conexão com Meta API
 */
export async function testMetaCPLConnection(accountId: string, accessToken: string): Promise<boolean> {
  try {
    const result = await getCPLFromMeta({
      accountId,
      accessToken,
      filters: {
        campaignStatus: ['ACTIVE'],
        dateRange: {
          since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          until: new Date().toISOString().split('T')[0]
        }
      }
    });
    
    return result.success;
  } catch {
    return false;
  }
}
