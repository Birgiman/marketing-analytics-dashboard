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
    const url = `${baseURL}/act_${request.accountId}/insights`;
    
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
    
    // 5. Fazer requisição HTTP
    logs.push(`🌐 [META-CPL] Fazendo requisição HTTP...`);
    const response = await fetch(`${url}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    logs.push(`✅ [META-CPL] Resposta recebida com ${responseData.data?.length || 0} registros`);
    
    // 6. Processar dados e calcular CPL
    const processedData = processMetaInsightsData(responseData.data || []);
    logs.push(`🧮 [META-CPL] CPL calculado: R$ ${processedData.cpl.toFixed(2)}`);
    
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
function processMetaInsightsData(insights: any[]): {
  cpl: number;
  totalSpend: number;
  totalLeads: number;
  campaignCount: number;
  rawData: any;
} {
  let totalSpend = 0;
  let totalLeads = 0;
  const campaignIds = new Set();
  
  // Processar cada insight
  insights.forEach((insight, index) => {
    // Somar gastos
    if (insight.spend) {
      totalSpend += parseFloat(insight.spend);
    }
    
    // Contar campanhas únicas
    if (insight.campaign_id) {
      campaignIds.add(insight.campaign_id);
    }
    
    // Usar campo 'results' diretamente (já calculado pelo Meta)
    if (insight.results) {
      totalLeads += parseInt(insight.results) || 0;
    }
  });
  
  // Calcular CPL
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  
  return {
    cpl,
    totalSpend,
    totalLeads,
    campaignCount: campaignIds.size,
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
          since: '2025-09-01',
          until: '2025-09-18'
        }
      }
    });
    
    return result.success;
  } catch {
    return false;
  }
}
