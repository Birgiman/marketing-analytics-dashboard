import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface WhatsAppInstance {
  id: string
  instance_name: string
  status: string
  phone_number?: string
  api_token?: string
}

export function useWhatsAppInstances() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [currentInstance, setCurrentInstance] = useState<WhatsAppInstance | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchInstances = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.user) return

      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching instances:', error)
        return
      }

      setInstances(data || [])
      
      // Set the first connected instance as current
      const connectedInstance = data?.find(instance => 
        instance.status === 'connected' && instance.api_token
      )
      
      if (connectedInstance) {
        setCurrentInstance(connectedInstance)
      } else if (data && data.length > 0) {
        setCurrentInstance(data[0])
      }

    } catch (error) {
      console.error('Error in fetchInstances:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInstances()
  }, [])

  return {
    instances,
    currentInstance,
    isLoading,
    refetch: fetchInstances
  }
}