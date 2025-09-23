import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppGroup {
  id: string;
  group_id: string;
  group_name: string;
  user_id: string;
  group_size: number;
  group_owner: string;
  group_created_at: string | null;
  participants_count: number;
  monitor: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Busca grupos WhatsApp do usuário na tabela whatsapp_groups
 * @param userId - ID do usuário
 * @param searchTerm - Termo de busca (opcional)
 * @returns Array de grupos WhatsApp
 */
export async function fetchWhatsAppGroups(
  userId: string, 
  searchTerm?: string
): Promise<WhatsAppGroup[]> {
  try {
    let query = supabase
      .from('whatsapp_groups')
      .select('*')
      .eq('user_id', userId)
      .order('group_name', { ascending: true });

    // Aplicar filtro de busca se fornecido
    if (searchTerm && searchTerm.trim() !== '') {
      query = query.ilike('group_name', `%${searchTerm.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];

  } catch (error) {
    throw error;
  }
}

/**
 * Verifica se existem grupos para o usuário (para mostrar loading)
 * @param userId - ID do usuário
 * @returns true se existem grupos, false caso contrário
 */
export async function hasWhatsAppGroups(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_groups')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('❌ [WhatsAppGroups] Erro ao verificar grupos:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('❌ [WhatsAppGroups] Erro ao verificar grupos:', error);
    return false;
  }
}

/**
 * Conta o total de grupos do usuário
 * @param userId - ID do usuário
 * @returns Número total de grupos
 */
export async function countWhatsAppGroups(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('whatsapp_groups')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ [WhatsAppGroups] Erro ao contar grupos:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('❌ [WhatsAppGroups] Erro ao contar grupos:', error);
    return 0;
  }
}
