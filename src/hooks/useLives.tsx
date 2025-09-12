import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface LiveData {
  name: string
  live_date?: string
  captacao_start?: string
  ta_rolando_start?: string
  ta_rolando_end?: string
  sales_goal?: number
  leads_goal?: number
  ad_budget?: number
}

interface LiveGroup {
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

  const createLiveWithGroups = async (liveData: LiveData, groups: LiveGroup[], campaigns: LiveCampaign[] = []) => {
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
          ad_budget: liveData.ad_budget || 0
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

      // Create live_campaigns entries
      if (campaigns.length > 0) {
        const liveCampaigns = campaigns.map(campaign => ({
          live_id: liveResult.id,
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          account_id: (campaign as any).account_id || null,
          account_name: (campaign as any).account_name || null,
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

      toast({
        title: "✅ Live criada com sucesso!",
        description: `Live "${liveData.name}" criada com ${groups.length} grupo(s) e ${campaigns.length} campanha(s) vinculado(s).`
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

  const updateLiveWithGroups = async (liveId: string, liveData: LiveData, groups: LiveGroup[], campaigns: LiveCampaign[] = []) => {
    try {
      setIsLoading(true)

      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.user) {
        throw new Error('Usuário não autenticado')
      }

      // Update the live
      const { error: liveError } = await supabase
        .from('lives')
        .update({
          name: liveData.name,
          live_date: liveData.live_date || null,
          captacao_start: liveData.captacao_start || null,
          ta_rolando_start: liveData.ta_rolando_start || null,
          ta_rolando_end: liveData.ta_rolando_end || null,
          sales_goal: liveData.sales_goal || 0,
          leads_goal: liveData.leads_goal || 0,
          ad_budget: liveData.ad_budget || 0
        })
        .eq('id', liveId)
        .eq('user_id', session.session.user.id)

      if (liveError) {
        console.error('Error updating live:', liveError)
        throw new Error(`Erro ao atualizar live: ${liveError.message}`)
      }

      // Delete existing live_groups and live_campaigns, then recreate them
      const { error: deleteGroupsError } = await supabase
        .from('live_groups')
        .delete()
        .eq('live_id', liveId)

      if (deleteGroupsError) {
        console.error('Error deleting existing live groups:', deleteGroupsError)
        throw new Error(`Erro ao atualizar grupos: ${deleteGroupsError.message}`)
      }

      const { error: deleteCampaignsError } = await supabase
        .from('live_campaigns')
        .delete()
        .eq('live_id', liveId)

      if (deleteCampaignsError) {
        console.error('Error deleting existing live campaigns:', deleteCampaignsError)
        throw new Error(`Erro ao atualizar campanhas: ${deleteCampaignsError.message}`)
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

      // Create new live_campaigns entries
      if (campaigns.length > 0) {
        const liveCampaigns = campaigns.map(campaign => ({
          live_id: liveId,
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          account_id: (campaign as any).account_id || null,
          account_name: (campaign as any).account_name || null,
          objective: campaign.objective || null,
          status: campaign.status,
          daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) : null,
          lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : null
        }))

        const { error: campaignsError } = await supabase
          .from('live_campaigns')
          .insert(liveCampaigns)

        if (campaignsError) {
          console.error('Error creating updated live campaigns:', campaignsError)
          throw new Error(`Erro ao atualizar campanhas: ${campaignsError.message}`)
        }
      }

      toast({
        title: "✅ Live atualizada com sucesso!",
        description: `Live "${liveData.name}" foi atualizada com ${groups.length} grupo(s) e ${campaigns.length} campanha(s).`
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
          monitoring: group.monitoring,
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