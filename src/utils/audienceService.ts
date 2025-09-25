// Service for managing Public Audiences
import { supabase } from "@/integrations/supabase/client";
import { PublicAudience, PublicAudienceCreate, PublicAudienceCorrelation, CampaignData, GroupData } from "@/types/audience";
import { fetchAdSetInsights } from "./metaApi";
import { extractAdSetDataFromInsights } from "./data-extractors-v2";
import { calculateCPLMeta, calculateCPLLiquido } from "./calculations-v2";

/**
 * Buscar todos os públicos de uma Live
 */
export async function fetchPublicAudiences(liveId: string): Promise<PublicAudience[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('public_audiences')
    .select('*')
    .eq('live_id', liveId)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar públicos: ${error.message}`);
  }

  return data || [];
}

/**
 * Criar um novo público
 */
export async function createPublicAudience(
  liveId: string, 
  audienceData: PublicAudienceCreate
): Promise<PublicAudience> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('public_audiences')
    .insert({
      user_id: session.user.id,
      live_id: liveId,
      title: audienceData.title,
      campaign_term: audienceData.campaign_term,
      emoji: audienceData.emoji
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar público: ${error.message}`);
  }

  return data;
}

/**
 * Atualizar um público existente
 */
export async function updatePublicAudience(
  audienceId: string, 
  audienceData: Partial<PublicAudienceCreate>
): Promise<PublicAudience> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('public_audiences')
    .update({
      ...audienceData,
      updated_at: new Date().toISOString()
    })
    .eq('id', audienceId)
    .eq('user_id', session.user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar público: ${error.message}`);
  }

  return data;
}

/**
 * Deletar um público
 */
export async function deletePublicAudience(audienceId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('Usuário não autenticado');
  }

  const { error } = await supabase
    .from('public_audiences')
    .delete()
    .eq('id', audienceId)
    .eq('user_id', session.user.id);

  if (error) {
    throw new Error(`Erro ao deletar público: ${error.message}`);
  }
}

/**
 * Buscar campanhas correlacionadas com um termo
 */
export async function fetchCorrelatedCampaigns(
  accountId: string,
  accessToken: string,
  campaignTerm: string,
  dateRange?: { since: string; until: string }
): Promise<CampaignData[]> {
  try {
    // Buscar insights de conjuntos de anúncios que contenham o termo
    const adSetInsights = await fetchAdSetInsights(accountId, accessToken, {
      dateRange,
      searchTerm: campaignTerm
    });

    // Extrair dados dos conjuntos de anúncios
    const adSetData = extractAdSetDataFromInsights(adSetInsights);

    // Converter para formato de campanhas
    const campaigns: CampaignData[] = adSetData.map(adSet => ({
      id: adSet.ad_set_id,
      name: adSet.ad_set_name,
      spend: adSet.totalSpend,
      leads: adSet.totalResults,
      cpl: adSet.cpl
    }));

    return campaigns;
  } catch (error) {
    return [];
  }
}

/**
 * Buscar grupos correlacionados com um emoji
 */
export async function fetchCorrelatedGroups(
  liveId: string,
  emoji: string
): Promise<GroupData[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('live_groups')
      .select('id, group_name, group_size')
      .eq('live_id', liveId)
      .eq('user_id', session.user.id)
      .ilike('group_name', `%${emoji}%`);

    if (error) {
      return [];
    }

    return (data || []).map(group => ({
      id: group.id,
      name: group.group_name,
      size: group.group_size
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Gerar correlação completa de um público
 */
export async function generateAudienceCorrelation(
  audience: PublicAudience,
  accountId: string,
  accessToken: string,
  dateRange?: { since: string; until: string }
): Promise<PublicAudienceCorrelation> {
  try {
    // Buscar campanhas correlacionadas
    const campaigns = await fetchCorrelatedCampaigns(
      accountId,
      accessToken,
      audience.campaign_term,
      dateRange
    );

    // Buscar grupos correlacionados
    const groups = await fetchCorrelatedGroups(audience.live_id, audience.emoji);

    // Calcular métricas agregadas
    const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
    const totalLeads = campaigns.reduce((sum, campaign) => sum + campaign.leads, 0);
    const totalGroupMembers = groups.reduce((sum, group) => sum + group.size, 0);

    const cplMeta = calculateCPLMeta(totalSpend, totalLeads);
    const cplLiquido = calculateCPLLiquido(totalSpend, totalGroupMembers);

    return {
      id: audience.id,
      title: audience.title,
      campaign_term: audience.campaign_term,
      emoji: audience.emoji,
      campaigns,
      groups,
      metrics: {
        totalSpend,
        totalLeads,
        totalGroupMembers,
        cplMeta,
        cplLiquido,
        groupEntradas: totalGroupMembers, // TODO: Implementar tracking de saídas
        groupSaidas: 0, // TODO: Implementar tracking de saídas
        groupAtivos: totalGroupMembers
      }
    };
  } catch (error) {
    throw error;
  }
}
