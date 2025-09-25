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
    if (!groupIds || groupIds.length === 0) {
      return {
        totalEntries: 0,
        totalExits: 0,
        totalActiveMembers: 0,
        groupsData: []
      };
    }

    // Consulta otimizada: buscar apenas os dados necessários com filtros específicos
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
      throw error;
    }
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
    return result;

  } catch (error) {
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
      throw error;
    }
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
    return result;

  } catch (error) {
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
  logData.groupsData.forEach((group, index) => {
  });
}
