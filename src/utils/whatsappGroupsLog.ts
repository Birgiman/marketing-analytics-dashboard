/**
 * WhatsApp Groups Log - Utilitário para consultar dados reais de grupos
 * 
 * Este arquivo contém funções para consultar a tabela whatsapp_groups_log
 * e substituir as simulações por dados reais de entradas/saídas dos grupos
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// INTERFACES
// ============================================================================

export interface GroupLogData {
  id_grupo: string;
  group_name: string;
  entries: number;
  exits: number;
  activeMembers: number;
}

export interface GroupLogSummary {
  totalEntries: number;
  totalExits: number;
  totalActiveMembers: number;
  groupsData: GroupLogData[];
}

// ============================================================================
// FUNÇÕES DE CONSULTA
// ============================================================================

/**
 * Consulta dados reais de entradas/saídas dos grupos WhatsApp
 * @param groupIds - Array de IDs dos grupos da Live
 * @param dateFrom - Data de início do período
 * @param dateTo - Data de fim do período
 * @param userId - ID do usuário logado
 * @returns Dados consolidados de entradas/saídas
 */
export async function getWhatsAppGroupsLogData(
  groupIds: string[],
  dateFrom: string,
  dateTo: string,
  userId: string
): Promise<GroupLogSummary> {
  try {
    console.log('🔍 [WhatsAppGroupsLog] Consultando dados reais dos grupos:', {
      groupIds: groupIds.length,
      groupIdsArray: groupIds,
      dateFrom,
      dateTo,
      userId
    });

    if (!groupIds || groupIds.length === 0) {
      console.warn('⚠️ [WhatsAppGroupsLog] Nenhum grupo fornecido');
      return {
        totalEntries: 0,
        totalExits: 0,
        totalActiveMembers: 0,
        groupsData: []
      };
    }

    // Consulta otimizada: buscar apenas os dados necessários com filtros específicos
    console.log('🔍 [WhatsAppGroupsLog] Fazendo consulta otimizada na tabela...');
    console.log('🔍 [WhatsAppGroupsLog] Parâmetros da consulta:', {
      totalGroupIds: groupIds.length,
      groupIds: groupIds.slice(0, 3), // Primeiros 3 IDs para debug
      dateFrom,
      dateTo,
      userId: userId.substring(0, 8) + '...' // Primeiros 8 chars do user_id
    });

    const { data, error } = await supabase
      .from('whatsapp_groups_log')
      .select('id_grupo, group_name, event, created_at')
      .in('id_grupo', groupIds)
      .eq('user_id', userId)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)
      .in('event', ['join', 'leave'])
      .order('created_at', { ascending: true })
      .limit(10000); // Limite para evitar timeout

    if (error) {
      console.error('❌ [WhatsAppGroupsLog] Erro na consulta:', error);
      throw error;
    }

    console.log('📊 [WhatsAppGroupsLog] Dados brutos da consulta:', {
      totalRows: data?.length || 0,
      sampleData: data?.slice(0, 3)
    });

    // Processar dados e agrupar por grupo
    const groupMap = new Map<string, GroupLogData>();

    // Inicializar todos os grupos com valores zerados
    groupIds.forEach(groupId => {
      groupMap.set(groupId, {
        id_grupo: groupId,
        group_name: `Grupo ${groupId}`,
        entries: 0,
        exits: 0,
        activeMembers: 0
      });
    });

    // Processar resultados da consulta
    if (data && data.length > 0) {
      data.forEach((row: any) => {
        const groupId = row.id_grupo;
        const event = row.event;
        const count = row.count || 0;

        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, {
            id_grupo: groupId,
            group_name: row.group_name || `Grupo ${groupId}`,
            entries: 0,
            exits: 0,
            activeMembers: 0
          });
        }

        const groupData = groupMap.get(groupId)!;
        
        if (event === 'join') {
          groupData.entries = count;
        } else if (event === 'leave') {
          groupData.exits = count;
        }

        // Atualizar nome do grupo se disponível
        if (row.group_name) {
          groupData.group_name = row.group_name;
        }
      });
    }

    // Calcular membros ativos para cada grupo
    groupMap.forEach(groupData => {
      groupData.activeMembers = Math.max(0, groupData.entries - groupData.exits);
    });

    // Calcular totais
    const groupsData = Array.from(groupMap.values());
    const totalEntries = groupsData.reduce((sum, group) => sum + group.entries, 0);
    const totalExits = groupsData.reduce((sum, group) => sum + group.exits, 0);
    const totalActiveMembers = groupsData.reduce((sum, group) => sum + group.activeMembers, 0);

    const result = {
      totalEntries,
      totalExits,
      totalActiveMembers,
      groupsData
    };

    console.log('✅ [WhatsAppGroupsLog] Dados processados:', result);

    return result;

  } catch (error) {
    console.error('❌ [WhatsAppGroupsLog] Erro ao consultar dados:', error);
    
    // Retornar dados zerados em caso de erro
    return {
      totalEntries: 0,
      totalExits: 0,
      totalActiveMembers: 0,
      groupsData: groupIds.map(groupId => ({
        id_grupo: groupId,
        group_name: `Grupo ${groupId}`,
        entries: 0,
        exits: 0,
        activeMembers: 0
      }))
    };
  }
}

/**
 * Consulta dados de um grupo específico
 * @param groupId - ID do grupo
 * @param dateFrom - Data de início do período
 * @param dateTo - Data de fim do período
 * @param userId - ID do usuário logado
 * @returns Dados do grupo específico
 */
export async function getGroupLogData(
  groupId: string,
  dateFrom: string,
  dateTo: string,
  userId: string
): Promise<GroupLogData> {
  const result = await getWhatsAppGroupsLogData([groupId], dateFrom, dateTo, userId);
  return result.groupsData[0] || {
    id_grupo: groupId,
    group_name: `Grupo ${groupId}`,
    entries: 0,
    exits: 0,
    activeMembers: 0
  };
}

/**
 * Consulta dados de entradas/saídas por período (para gráficos)
 * @param groupIds - Array de IDs dos grupos
 * @param dateFrom - Data de início
 * @param dateTo - Data de fim
 * @param userId - ID do usuário
 * @param groupBy - Agrupar por 'day', 'week' ou 'month'
 * @returns Dados agrupados por período
 */
export async function getWhatsAppGroupsLogByPeriod(
  groupIds: string[],
  dateFrom: string,
  dateTo: string,
  userId: string,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<Array<{
  date: string;
  entries: number;
  exits: number;
  activeMembers: number;
}>> {
  try {
    console.log('📈 [WhatsAppGroupsLog] Consultando dados por período:', {
      groupIds: groupIds.length,
      dateFrom,
      dateTo,
      groupBy
    });

    if (!groupIds || groupIds.length === 0) {
      return [];
    }

    // Determinar a função de agrupamento baseada no parâmetro
    let dateFunction: string;
    switch (groupBy) {
      case 'day':
        dateFunction = 'DATE(created_at)';
        break;
      case 'week':
        dateFunction = 'DATE_TRUNC(\'week\', created_at)';
        break;
      case 'month':
        dateFunction = 'DATE_TRUNC(\'month\', created_at)';
        break;
      default:
        dateFunction = 'DATE(created_at)';
    }

    // Consulta direta otimizada (sem RPC)
    console.log('🔍 [WhatsAppGroupsLog] Fazendo consulta direta otimizada por período...');

    const { data: rawData, error } = await supabase
      .from('whatsapp_groups_log')
      .select('created_at, event, id_grupo')
      .in('id_grupo', groupIds)
      .eq('user_id', userId)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)
      .in('event', ['join', 'leave'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ [WhatsAppGroupsLog] Erro na consulta por período:', error);
      throw error;
    }

    console.log('📊 [WhatsAppGroupsLog] Dados brutos obtidos:', {
      totalRecords: rawData?.length || 0,
      dateRange: {
        from: dateFrom,
        to: dateTo
      },
      groupBy,
      sampleRecords: rawData?.slice(0, 3).map(r => ({
        date: new Date(r.created_at).toISOString().split('T')[0],
        event: r.event,
        group: r.id_grupo?.substring(0, 10) + '...'
      }))
    });

    // Processar dados manualmente com agrupamento por período
    const periodData = new Map<string, { entries: number; exits: number }>();

    rawData?.forEach((row: any) => {
      let dateKey: string;

      // Determinar a chave de agrupamento baseada no parâmetro groupBy
      const recordDate = new Date(row.created_at);
      switch (groupBy) {
        case 'day':
          dateKey = recordDate.toISOString().split('T')[0];
          break;
        case 'week':
          // Primeiro dia da semana (domingo)
          const weekStart = new Date(recordDate);
          weekStart.setDate(recordDate.getDate() - recordDate.getDay());
          dateKey = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          dateKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        default:
          dateKey = recordDate.toISOString().split('T')[0];
      }

      if (!periodData.has(dateKey)) {
        periodData.set(dateKey, { entries: 0, exits: 0 });
      }

      const dayData = periodData.get(dateKey)!;
      if (row.event === 'join') {
        dayData.entries++;
      } else if (row.event === 'leave') {
        dayData.exits++;
      }
    });

    const result = Array.from(periodData.entries()).map(([date, data]) => ({
      date,
      entries: data.entries,
      exits: data.exits,
      activeMembers: Math.max(0, data.entries - data.exits)
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log('✅ [WhatsAppGroupsLog] Dados processados por período:', {
      totalPeriods: result.length,
      totalEntries: result.reduce((sum, p) => sum + p.entries, 0),
      totalExits: result.reduce((sum, p) => sum + p.exits, 0),
      samplePeriods: result.slice(0, 3)
    });

    return result;

  } catch (error) {
    console.error('❌ [WhatsAppGroupsLog] Erro ao consultar dados por período:', error);
    return [];
  }
}

// ============================================================================
// FUNÇÕES DE UTILIDADE
// ============================================================================

/**
 * Valida se os dados de log são consistentes
 * @param logData - Dados do log
 * @returns Status de validação
 */
export function validateGroupLogData(logData: GroupLogSummary): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validações de erro
  if (logData.totalEntries < 0) {
    errors.push('Total de entradas não pode ser negativo');
  }

  if (logData.totalExits < 0) {
    errors.push('Total de saídas não pode ser negativo');
  }

  if (logData.totalActiveMembers < 0) {
    errors.push('Total de membros ativos não pode ser negativo');
  }

  // Validações de warning
  if (logData.totalExits > logData.totalEntries) {
    warnings.push('Mais saídas que entradas detectadas - possível inconsistência nos dados');
  }

  if (logData.groupsData.length === 0) {
    warnings.push('Nenhum dado de grupo encontrado');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Gera log detalhado dos dados do WhatsApp Groups Log
 * @param logData - Dados do log
 */
export function logGroupLogData(logData: GroupLogSummary): void {
  console.log('📱 [WhatsAppGroupsLog] Dados dos grupos WhatsApp:');
  console.log('==========================================');
  console.log(`📊 RESUMO GERAL:`);
  console.log(`  • Total de entradas: ${logData.totalEntries}`);
  console.log(`  • Total de saídas: ${logData.totalExits}`);
  console.log(`  • Total de membros ativos: ${logData.totalActiveMembers}`);
  console.log(`  • Grupos analisados: ${logData.groupsData.length}`);
  console.log('');
  console.log('👥 DADOS POR GRUPO:');
  logData.groupsData.forEach((group, index) => {
    console.log(`  ${index + 1}. ${group.group_name} (${group.id_grupo}):`);
    console.log(`     • Entradas: ${group.entries}`);
    console.log(`     • Saídas: ${group.exits}`);
    console.log(`     • Membros ativos: ${group.activeMembers}`);
  });
  console.log('==========================================');
}
