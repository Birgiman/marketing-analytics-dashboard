import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { LiveGroup } from '@/types/live'

interface LiveData {
  name: string
  live_date?: string
  captacao_start?: string
  ta_rolando_start?: string
  ta_rolando_end?: string
  sales_goal?: number
  leads_goal?: number
  ad_budget?: number
  insights_date_since?: string
  insights_date_until?: string
  campaign_search_term?: string
}

interface LiveGroupInput {
  group_id: string
  group_name: string
  group_size: number
}

interface LiveCampaign {
  id: string
  name: string
  status: string
  objective?: string
  account_id?: string
  account_name?: string
  daily_budget?: string
  lifetime_budget?: string
  created_time: string
}

export function useLives() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const createLiveWithGroups = async (liveData: LiveData, groups: LiveGroupInput[], campaigns: LiveCampaign[] = []) => {
    try {
      setIsLoading(true)

      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.user) {
        throw new Error('Usuário não autenticado')
      }

      // Create the live first
      const { data: liveResult, error: liveError } = await supabase
        .from('lives')
        .insert({
          user_id: session.session.user.id,
          name: liveData.name,
          live_date: liveData.live_date || null,
          captacao_start: liveData.captacao_start || null,
          ta_rolando_start: liveData.ta_rolando_start || null,
          ta_rolando_end: liveData.ta_rolando_end || null,
          sales_goal: liveData.sales_goal || 0,
          leads_goal: liveData.leads_goal || 0,
          ad_budget: liveData.ad_budget || 0,
          insights_date_since: liveData.insights_date_since || null,
          insights_date_until: liveData.insights_date_until || null,
          campaign_search_term: liveData.campaign_search_term || null
        })
        .select()
        .single()

      if (liveError) {
        console.error('Error creating live:', liveError)
        throw new Error(`Erro ao criar live: ${liveError.message}`)
      }

      // Create live_groups entries
      if (groups.length > 0) {
        const liveGroups = groups.map(group => ({
          live_id: liveResult.id,
          user_id: session.session.user.id,
          group_id: group.group_id,
          group_name: group.group_name,
          group_size: group.group_size,
          monitoring: true
        }))

        const { error: groupsError } = await supabase
          .from('live_groups')
          .insert(liveGroups)

        if (groupsError) {
          console.error('Error creating live groups:', groupsError)
          // Optionally delete the created live if groups fail
          await supabase.from('lives').delete().eq('id', liveResult.id)
          throw new Error(`Erro ao vincular grupos: ${groupsError.message}`)
        }
      }

      // Create live_campaigns entries (with duplicate prevention)
      if (campaigns.length > 0) {
        // Since this is a new live, we shouldn't have duplicates, but let's be safe
        const uniqueCampaigns = campaigns.filter((campaign, index, self) =>
          index === self.findIndex(c => c.id === campaign.id)
        )

        console.log(`[useLives] Criando ${uniqueCampaigns.length} campanhas para nova live`)

        const liveCampaigns = uniqueCampaigns.map(campaign => ({
          live_id: liveResult.id,
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          account_id: campaign.account_id || null,
          account_name: campaign.account_name || null,
          objective: campaign.objective || null,
          status: campaign.status,
          daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) : null,
          lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : null
        }))

        const { error: campaignsError } = await supabase
          .from('live_campaigns')
          .insert(liveCampaigns)

        if (campaignsError) {
          console.error('Error creating live campaigns:', campaignsError)
          // Optionally delete the created live if campaigns fail
          await supabase.from('lives').delete().eq('id', liveResult.id)
          throw new Error(`Erro ao vincular campanhas: ${campaignsError.message}`)
        }
      }

      const groupText = groups.length === 0 ? 'nenhum grupo' : groups.length === 1 ? '1 grupo' : `${groups.length} grupos`;
      const campaignText = campaigns.length === 0 ? 'nenhuma campanha' : campaigns.length === 1 ? '1 campanha' : `${campaigns.length} campanhas`;

      toast({
        title: "✅ Live criada com sucesso!",
        description: `Live "${liveData.name}" criada com ${groupText} e ${campaignText} vinculados.`
      })

      return { live: liveResult, groups, campaigns }

    } catch (error) {
      console.error('Error in createLiveWithGroups:', error)
      toast({
        title: "❌ Erro ao criar live",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserLives = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.user) return []

      const { data, error } = await supabase
        .from('lives')
        .select(`
          *,
          live_groups (
            id,
            group_id,
            group_name,
            group_size,
            monitoring
          ),
          live_campaigns (
            id,
            campaign_id,
            campaign_name,
            account_id,
            account_name,
            objective,
            status,
            daily_budget,
            lifetime_budget
          )
        `)
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching lives:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in fetchUserLives:', error)
      return []
    }
  }

  const updateLiveWithGroups = async (liveId: string, liveData: LiveData, groups: LiveGroupInput[], campaigns: LiveCampaign[] = []) => {
    try {
      setIsLoading(true)

      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.user) {
        throw new Error('Usuário não autenticado')
      }

      // 🔍 PRIMEIRO: Buscar dados atuais da live para comparação
      const { data: currentLive, error: fetchError } = await supabase
        .from('lives')
        .select('*')
        .eq('id', liveId)
        .eq('user_id', session.session.user.id)
        .single()

      if (fetchError || !currentLive) {
        throw new Error('Live não encontrada')
      }

      // 🔍 SEGUNDO: Comparar dados e criar update parcial
      const updateFields: Partial<LiveData> = {}
      const changes: string[] = []

      // 🔍 DEBUG: Log dos dados para investigação
      console.log('🔍 [DEBUG] Dados atuais do banco:', {
        sales_goal: currentLive.sales_goal,
        ad_budget: currentLive.ad_budget,
        leads_goal: currentLive.leads_goal,
        campaign_search_term: currentLive.campaign_search_term
      });
      console.log('🔍 [DEBUG] Dados novos do formulário:', {
        sales_goal: liveData.sales_goal,
        ad_budget: liveData.ad_budget,
        leads_goal: liveData.leads_goal,
        campaign_search_term: liveData.campaign_search_term
      });

      // Comparar cada campo e adicionar apenas os que mudaram
      if (currentLive.name !== liveData.name) {
        updateFields.name = liveData.name
        changes.push(`Nome: "${currentLive.name}" → "${liveData.name}"`)
      }

      // 🔧 CORREÇÃO: Comparar datas normalizando formato
      const normalizeDate = (date: string | null | undefined) => {
        if (!date) return null;
        return new Date(date).toISOString().split('T')[0]; // YYYY-MM-DD
      };

      if (normalizeDate(currentLive.live_date) !== normalizeDate(liveData.live_date)) {
        updateFields.live_date = liveData.live_date
        changes.push(`Data da Live: ${currentLive.live_date || 'não definida'} → ${liveData.live_date || 'não definida'}`)
      }

      if (normalizeDate(currentLive.captacao_start) !== normalizeDate(liveData.captacao_start)) {
        updateFields.captacao_start = liveData.captacao_start
        changes.push(`Início da Captação: ${currentLive.captacao_start || 'não definido'} → ${liveData.captacao_start || 'não definido'}`)
      }

      if (normalizeDate(currentLive.ta_rolando_start) !== normalizeDate(liveData.ta_rolando_start)) {
        updateFields.ta_rolando_start = liveData.ta_rolando_start
        changes.push(`Início "Tá Rolando": ${currentLive.ta_rolando_start || 'não definido'} → ${liveData.ta_rolando_start || 'não definido'}`)
      }

      if (normalizeDate(currentLive.ta_rolando_end) !== normalizeDate(liveData.ta_rolando_end)) {
        updateFields.ta_rolando_end = liveData.ta_rolando_end
        changes.push(`Fim "Tá Rolando": ${currentLive.ta_rolando_end || 'não definido'} → ${liveData.ta_rolando_end || 'não definido'}`)
      }

      // 🔧 CORREÇÃO: Comparar valores numéricos corretamente
      if (Number(currentLive.sales_goal) !== Number(liveData.sales_goal || 0)) {
        updateFields.sales_goal = liveData.sales_goal || 0
        changes.push(`Meta de Vendas: ${currentLive.sales_goal} → ${liveData.sales_goal || 0}`)
      }

      if (Number(currentLive.leads_goal) !== Number(liveData.leads_goal || 0)) {
        updateFields.leads_goal = liveData.leads_goal || 0
        changes.push(`Meta de Leads: ${currentLive.leads_goal} → ${liveData.leads_goal || 0}`)
      }

      if (Number(currentLive.ad_budget) !== Number(liveData.ad_budget || 0)) {
        updateFields.ad_budget = liveData.ad_budget || 0
        changes.push(`Orçamento de Anúncios: R$ ${currentLive.ad_budget} → R$ ${liveData.ad_budget || 0}`)
      }

      if (normalizeDate(currentLive.insights_date_since) !== normalizeDate(liveData.insights_date_since)) {
        updateFields.insights_date_since = liveData.insights_date_since
        changes.push(`Data Início Insights: ${currentLive.insights_date_since || 'não definida'} → ${liveData.insights_date_since || 'não definida'}`)
      }

      if (normalizeDate(currentLive.insights_date_until) !== normalizeDate(liveData.insights_date_until)) {
        updateFields.insights_date_until = liveData.insights_date_until
        changes.push(`Data Fim Insights: ${currentLive.insights_date_until || 'não definida'} → ${liveData.insights_date_until || 'não definida'}`)
      }

      // 🔧 CORREÇÃO: Não alterar campaign_search_term se não foi fornecido
      if (liveData.campaign_search_term !== undefined && currentLive.campaign_search_term !== liveData.campaign_search_term) {
        updateFields.campaign_search_term = liveData.campaign_search_term
        changes.push(`Termo de Busca: "${currentLive.campaign_search_term || 'não definido'}" → "${liveData.campaign_search_term || 'não definido'}"`)
      }

      // 🔍 TERCEIRO: Fazer update apenas se houver mudanças
      if (Object.keys(updateFields).length > 0) {
        console.log('🔄 [updateLiveWithGroups] Mudanças detectadas:', changes)
        
        const { error: liveError } = await supabase
          .from('lives')
          .update(updateFields)
          .eq('id', liveId)
          .eq('user_id', session.session.user.id)

        if (liveError) {
          console.error('Error updating live:', liveError)
          throw new Error(`Erro ao atualizar live: ${liveError.message}`)
        }

        console.log('✅ [updateLiveWithGroups] Live atualizada com sucesso')
      } else {
        console.log('ℹ️ [updateLiveWithGroups] Nenhuma mudança detectada nos dados da live')
      }

      // Delete existing live_groups, then recreate them
      const { error: deleteGroupsError } = await supabase
        .from('live_groups')
        .delete()
        .eq('live_id', liveId)

      if (deleteGroupsError) {
        console.error('Error deleting existing live groups:', deleteGroupsError)
        throw new Error(`Erro ao atualizar grupos: ${deleteGroupsError.message}`)
      }

      // Create new live_groups entries
      if (groups.length > 0) {
        const liveGroups = groups.map(group => ({
          live_id: liveId,
          user_id: session.session.user.id,
          group_id: group.group_id,
          group_name: group.group_name,
          group_size: group.group_size,
          monitoring: true
        }))

        const { error: groupsError } = await supabase
          .from('live_groups')
          .insert(liveGroups)

        if (groupsError) {
          console.error('Error creating updated live groups:', groupsError)
          throw new Error(`Erro ao atualizar grupos: ${groupsError.message}`)
        }
      }

      // Add new live_campaigns entries (only new ones, don't replace existing)
      if (campaigns.length > 0) {
        // First, check which campaigns already exist for this live
        const { data: existingCampaigns, error: fetchError } = await supabase
          .from('live_campaigns')
          .select('campaign_id')
          .eq('live_id', liveId)

        if (fetchError) {
          console.error('Error fetching existing campaigns:', fetchError)
          throw new Error(`Erro ao verificar campanhas existentes: ${fetchError.message}`)
        }

        // Get existing campaign IDs
        const existingCampaignIds = existingCampaigns?.map(c => c.campaign_id) || []

        // Filter only new campaigns that don't exist yet
        const newCampaigns = campaigns.filter(campaign =>
          !existingCampaignIds.includes(campaign.id)
        )

        console.log(`[useLives] Campanhas para adicionar: ${campaigns.length} total, ${existingCampaignIds.length} já existem, ${newCampaigns.length} novas`)

        // Only insert truly new campaigns
        if (newCampaigns.length > 0) {
          const liveCampaigns = newCampaigns.map(campaign => ({
            live_id: liveId,
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            account_id: campaign.account_id || null,
            account_name: campaign.account_name || null,
            objective: campaign.objective || null,
            status: campaign.status,
            daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) : null,
            lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : null
          }))

          const { error: campaignsError } = await supabase
            .from('live_campaigns')
            .insert(liveCampaigns)

          if (campaignsError) {
            console.error('Error adding new live campaigns:', campaignsError)
            throw new Error(`Erro ao adicionar campanhas: ${campaignsError.message}`)
          }
        }
      }

      const groupText = groups.length === 0 ? 'nenhum grupo' : groups.length === 1 ? '1 grupo' : `${groups.length} grupos`;
      const campaignText = campaigns.length === 0 ? 'nenhuma campanha' : campaigns.length === 1 ? '1 campanha' : `${campaigns.length} campanhas`;

      toast({
        title: "✅ Live atualizada com sucesso!",
        description: `Live "${liveData.name}" foi atualizada com ${groupText} e ${campaignText}.`
      })

      return true

    } catch (error) {
      console.error('Error in updateLiveWithGroups:', error)
      toast({
        title: "❌ Erro ao atualizar live",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const softDeleteLive = async (liveId: string) => {
    try {
      setIsLoading(true)

      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.user) {
        throw new Error('Usuário não autenticado')
      }

      // Get the live and its groups before moving to deleted tables
      const { data: liveData, error: fetchLiveError } = await supabase
        .from('lives')
        .select(`
          *,
          live_groups (*)
        `)
        .eq('id', liveId)
        .eq('user_id', session.session.user.id)
        .single()

      if (fetchLiveError || !liveData) {
        throw new Error('Live não encontrada')
      }

      // Insert into deleted_lives table
      const { error: insertDeletedLiveError } = await supabase
        .from('deleted_lives')
        .insert({
          original_live_id: liveData.id,
          user_id: liveData.user_id,
          name: liveData.name,
          live_date: liveData.live_date,
          captacao_start: liveData.captacao_start,
          ta_rolando_start: liveData.ta_rolando_start,
          ta_rolando_end: liveData.ta_rolando_end,
          sales_goal: liveData.sales_goal,
          leads_goal: liveData.leads_goal,
          ad_budget: liveData.ad_budget,
          participants: liveData.participants,
          sales: liveData.sales,
          revenue: liveData.revenue,
          current_viewers: liveData.current_viewers,
          peak_viewers: liveData.peak_viewers,
          created_at: liveData.created_at,
          updated_at: liveData.updated_at
        })

      if (insertDeletedLiveError) {
        throw new Error('Erro ao mover live para lixeira')
      }

      // Insert live groups into deleted_live_groups table
      if (liveData.live_groups && liveData.live_groups.length > 0) {
        const deletedGroups = liveData.live_groups.map((group: any) => ({
          original_live_group_id: group.id,
          original_live_id: liveData.id,
          user_id: session.session.user.id,
          group_id: group.group_id,
          group_name: group.group_name,
          group_size: group.group_size,
          monitoring: group.monitoring || true,
          created_at: group.created_at,
          updated_at: group.updated_at
        }))

        const { error: insertDeletedGroupsError } = await supabase
          .from('deleted_live_groups')
          .insert(deletedGroups)

        if (insertDeletedGroupsError) {
          throw new Error('Erro ao mover grupos para lixeira')
        }

        // Delete live groups from live_groups table
        const { error: deleteGroupsError } = await supabase
          .from('live_groups')
          .delete()
          .eq('live_id', liveId)

        if (deleteGroupsError) {
          throw new Error('Erro ao remover grupos da live')
        }
      }

      // Finally, delete the live from lives table
      const { error: deleteLiveError } = await supabase
        .from('lives')
        .delete()
        .eq('id', liveId)
        .eq('user_id', session.session.user.id)

      if (deleteLiveError) {
        throw new Error('Erro ao excluir live')
      }

      toast({
        title: "✅ Live excluída com sucesso!",
        description: `Live "${liveData.name}" foi movida para a lixeira.`
      })

      return true

    } catch (error) {
      console.error('Error in softDeleteLive:', error)
      toast({
        title: "❌ Erro ao excluir live",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createLiveWithGroups,
    updateLiveWithGroups,
    softDeleteLive,
    fetchUserLives,
    isLoading
  }
}