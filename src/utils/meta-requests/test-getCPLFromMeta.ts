/**
 * 🧪 Teste da Função getCPLFromMeta
 * 
 * Este arquivo demonstra como usar a função getCPLFromMeta
 * com dados reais do Meta Marketing API.
 */

import { getCPLFromMeta, testMetaCPLConnection } from './getCPLFromMeta';

// ============================================================================
// EXEMPLO DE USO
// ============================================================================

/**
 * 📝 Exemplo de como usar a função getCPLFromMeta
 */
export async function exemploUsoGetCPL() {
  console.log('🧪 [TESTE] Iniciando exemplo de uso da função getCPLFromMeta...');
  
  // Dados de exemplo (substitua pelos dados reais)
  const request = {
    accountId: '269382281240887', // Seu account ID
    accessToken: 'SEU_TOKEN_AQUI', // Seu access token
    filters: {
      campaignStatus: ['ACTIVE', 'PAUSED'],
      campaignName: 'Post Do Instagram',
      dateRange: {
        since: '2025-09-01',
        until: '2025-09-18'
      }
    }
  };
  
  try {
    // Chamar a função
    const result = await getCPLFromMeta(request);
    
    if (result.success && result.data) {
      console.log('✅ [TESTE] Sucesso! Dados obtidos:');
      console.log(`💰 CPL: R$ ${result.data.cpl.toFixed(2)}`);
      console.log(`💸 Total Gasto: R$ ${result.data.totalSpend.toFixed(2)}`);
      console.log(`👥 Total Leads: ${result.data.totalLeads}`);
      console.log(`📊 Campanhas: ${result.data.campaignCount}`);
      
      // Mostrar logs se disponíveis
      if (result.logs) {
        console.log('📋 Logs da requisição:');
        result.logs.forEach(log => console.log(log));
      }
      
      return result.data;
    } else {
      console.error('❌ [TESTE] Erro:', result.error);
      return null;
    }
    
  } catch (error) {
    console.error('❌ [TESTE] Erro inesperado:', error);
    return null;
  }
}

// ============================================================================
// TESTE DE CONEXÃO
// ============================================================================

/**
 * 🔗 Testa se a conexão com Meta API está funcionando
 */
export async function testarConexaoMeta() {
  console.log('🔗 [TESTE] Testando conexão com Meta API...');
  
  const accountId = '269382281240887'; // Seu account ID
  const accessToken = 'SEU_TOKEN_AQUI'; // Seu access token
  
  const isConnected = await testMetaCPLConnection(accountId, accessToken);
  
  if (isConnected) {
    console.log('✅ [TESTE] Conexão com Meta API funcionando!');
  } else {
    console.log('❌ [TESTE] Falha na conexão com Meta API');
  }
  
  return isConnected;
}

// ============================================================================
// INTEGRAÇÃO COM DETAILS.TSX
// ============================================================================

/**
 * 🔧 Função para integrar com a página Details.tsx
 * 
 * Esta função pode ser chamada na página Details para obter
 * dados atualizados diretamente do Meta API.
 */
export async function obterCPLAtualizado(
  accountId: string,
  accessToken: string,
  filtros?: {
    nomeCampanha?: string;
    statusCampanha?: string[];
    periodo?: { inicio: string; fim: string };
  }
) {
  console.log('🔄 [DETAILS] Obtendo CPL atualizado do Meta API...');
  
  const request = {
    accountId,
    accessToken,
    filters: {
      campaignStatus: filtros?.statusCampanha || ['ACTIVE', 'PAUSED'],
      campaignName: filtros?.nomeCampanha,
      dateRange: filtros?.periodo ? {
        since: filtros.periodo.inicio,
        until: filtros.periodo.fim
      } : undefined
    }
  };
  
  const result = await getCPLFromMeta(request);
  
  if (result.success && result.data) {
    console.log('✅ [DETAILS] CPL atualizado obtido com sucesso!');
    return {
      cplMeta: result.data.cpl,
      totalSpend: result.data.totalSpend,
      totalLeads: result.data.totalLeads,
      campaignCount: result.data.campaignCount
    };
  } else {
    console.error('❌ [DETAILS] Erro ao obter CPL atualizado:', result.error);
    return null;
  }
}
