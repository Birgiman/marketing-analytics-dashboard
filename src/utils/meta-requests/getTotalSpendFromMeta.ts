/**
 * 🎯 Meta Marketing API - Função para obter Gasto Total
 * 
 * Esta função faz requisição HTTP direta ao Meta Marketing API
 * e retorna o gasto total das campanhas.
 * 
 * @author LiveShop Analytics
 * @version 1.0.0
 */

import { getLiveMetaDataWithFallback } from './getLiveMetaData';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface MetaTotalSpendRequest {
  liveId: string;
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

export interface MetaTotalSpendResponse {
  success: boolean;
  data?: {
    totalSpend: number;
    campaignCount: number;
    rawData: any;
  };
  error?: string;
  logs?: string[];
}

// ============================================================================
// FUNÇÃO PRINCIPAL - getTotalSpendFromMeta
// ============================================================================

/**
 * 🚀 Obtém gasto total diretamente do Meta Marketing API
 * 
 * @param request - Parâmetros da requisição
 * @returns Promise com gasto total calculado
 */
export async function getTotalSpendFromMeta(request: MetaTotalSpendRequest): Promise<MetaTotalSpendResponse> {
  const logs: string[] = [];
  
  try {
    logs.push(`💰 [META-TOTAL-SPEND] Iniciando busca de gasto total para live: ${request.liveId}`);
    
    // 1. Buscar dados da live no banco
    const liveDataResult = await getLiveMetaDataWithFallback(request.liveId);
    
    if (!liveDataResult.success || !liveDataResult.data) {
      throw new Error(`Erro ao buscar dados da live: ${liveDataResult.error}`);
    }
    
    const liveData = liveDataResult.data;
    logs.push(`✅ [META-TOTAL-SPEND] Dados da live obtidos: ${liveData.campaignSearchTerm}`);
    
    // 2. Construir URL da requisição
    const baseURL = 'https://graph.facebook.com/v23.0';
    const accountId = liveData.accountId;
    
    if (!accountId) {
      throw new Error('Account ID não disponível');
    }
    const url = `${baseURL}/${accountId}/insights`;
    
    logs.push(`📡 [META-TOTAL-SPEND] URL construída: ${url}`);
    
    // 3. Preparar parâmetros da requisição
    const params = new URLSearchParams({
      fields: 'campaign_id,campaign_name,spend',
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
        logs.push(`🔍 [META-TOTAL-SPEND] Filtros aplicados: ${JSON.stringify(filtering)}`);
      }
      
      // Filtro de período
      if (request.filters.dateRange) {
        params.append('time_range', JSON.stringify(request.filters.dateRange));
        logs.push(`📅 [META-TOTAL-SPEND] Período: ${request.filters.dateRange.since} até ${request.filters.dateRange.until}`);
      }
    }
    
    // 5. Fazer requisição HTTP
    logs.push(`🌐 [META-TOTAL-SPEND] Fazendo requisição HTTP...`);
    const response = await fetch(`${url}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    logs.push(`✅ [META-TOTAL-SPEND] Resposta recebida com ${responseData.data?.length || 0} registros`);
    
    // 6. Processar dados e calcular gasto total
    const processedData = processMetaSpendData(responseData.data || []);
    logs.push(`💰 [META-TOTAL-SPEND] Gasto total calculado: R$ ${processedData.totalSpend.toFixed(2)}`);
    
    return {
      success: true,
      data: processedData,
      logs
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logs.push(`❌ [META-TOTAL-SPEND] Erro: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      logs
    };
  }
}

// ============================================================================
// FUNÇÃO AUXILIAR - processMetaSpendData
// ============================================================================

/**
 * 🔧 Processa dados do Meta Insights e calcula gasto total
 */
function processMetaSpendData(insights: any[]): {
  totalSpend: number;
  campaignCount: number;
  rawData: any;
} {
  let totalSpend = 0;
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
    
    // Debug: mostrar campaign_id se disponível
    if (insight.campaign_id) {
      console.log(`💰 [META-TOTAL-SPEND] Campaign ID encontrado: ${insight.campaign_id}`);
    }
  });
  
  return {
    totalSpend,
    campaignCount: campaignIds.size,
    rawData: insights
  };
}

// ============================================================================
// FUNÇÃO DE TESTE - testMetaTotalSpendConnection
// ============================================================================

/**
 * 🧪 Função para testar conexão com Meta API para gasto total
 */
export async function testMetaTotalSpendConnection(liveId: string, accessToken: string): Promise<boolean> {
  try {
    const result = await getTotalSpendFromMeta({
      liveId,
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
