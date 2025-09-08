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

export function useLives() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const createLiveWithGroups = async (liveData: LiveData, groups: LiveGroup[]) => {
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

      toast({
        title: "✅ Live criada com sucesso!",
        description: `Live "${liveData.name}" criada com ${groups.length} grupo(s) vinculado(s).`
      })

      return { live: liveResult, groups }

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

  return {
    createLiveWithGroups,
    fetchUserLives,
    isLoading
  }
}