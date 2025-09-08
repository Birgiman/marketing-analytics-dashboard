import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchGroupsRequest {
  instanceName: string;
  userId: string;
  searchTerm: string;
}

interface GroupResult {
  id: string;
  group_id: string;
  group_name: string;
  group_size: number;
  group_owner?: string;
  group_created_at?: string;
  group_created_formatted: string;
  group_owner_formatted?: string;
  selectable: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { instanceName, userId, searchTerm }: SearchGroupsRequest = await req.json()
    
    if (!instanceName || !userId || !searchTerm) {
      return new Response(
        JSON.stringify({ success: false, error: 'instanceName, userId and searchTerm are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (searchTerm.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Search term must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Searching groups for term: "${searchTerm}" (instance: ${instanceName})`)

    // Get Evolution API credentials from user's stored instance
    const { data: instanceData, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('api_token')
      .eq('user_id', userId)
      .eq('instance_name', instanceName)
      .single()

    if (instanceError || !instanceData?.api_token) {
      console.error('❌ Instance or API token not found:', instanceError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Instance not found or API token missing. Please reconnect your WhatsApp instance.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = instanceData.api_token

    // Get Evolution API URL from environment variable
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://evolution-api-2-3-0-production-6d75.up.railway.app'
    const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '')
    
    // Get ALL groups first (we'll filter after)
    const evolutionUrl = `${cleanApiUrl}/group/fetchAllGroups/${instanceName}?getParticipants=false`
    console.log(`🌐 Calling Evolution API: ${evolutionUrl}`)

    const response = await fetch(evolutionUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey
      }
    })

    if (!response.ok) {
      console.error(`❌ Evolution API error: ${response.status} ${response.statusText}`)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Evolution API error: ${response.status} ${response.statusText}` 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const groupsData = await response.json()
    console.log(`📊 Received ${groupsData?.length || 0} groups from Evolution API`)

    if (!Array.isArray(groupsData)) {
      console.error('❌ Invalid response format from Evolution API')
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid response format from Evolution API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter and process groups
    const searchLower = searchTerm.toLowerCase().trim()
    const matchedGroups: GroupResult[] = []
    
    for (const group of groupsData) {
      try {
        const groupId = group.id
        const groupName = group.subject || 'Sem nome'
        const groupSize = group.size || 0
        const groupOwner = group.owner
        
        // Skip invalid groups
        if (!groupId || groupSize === 0 || !group.subject || group.subject.trim() === '') {
          continue
        }

        // Apply search filter
        const groupNameLower = groupName.toLowerCase()
        if (!groupNameLower.includes(searchLower)) {
          continue
        }

        // Convert Unix timestamp to ISO string  
        const groupCreatedAt = group.creation 
          ? new Date(group.creation * 1000).toISOString()
          : null

        const result: GroupResult = {
          id: `temp_${groupId}`, // Temporary ID for selection
          group_id: groupId,
          group_name: groupName,
          group_size: groupSize,
          group_owner: groupOwner,
          group_created_at: groupCreatedAt,
          group_created_formatted: groupCreatedAt 
            ? new Date(groupCreatedAt).toLocaleDateString('pt-BR')
            : 'N/A',
          group_owner_formatted: groupOwner 
            ? groupOwner.replace('@s.whatsapp.net', '').replace(/\d+/g, match => 
                match.replace(/(\d{2})(\d{2})(\d{4,5})(\d{4})/, '($1) $2 $3-$4')
              )
            : 'N/A',
          selectable: true
        }

        matchedGroups.push(result)
        console.log(`✅ Matched group: ${groupName} (${groupSize} participants)`)

      } catch (error) {
        console.error('❌ Error processing group:', error)
      }
    }

    // Sort by group name
    matchedGroups.sort((a, b) => a.group_name.localeCompare(b.group_name))

    console.log(`🎯 Found ${matchedGroups.length} groups matching "${searchTerm}"`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Found ${matchedGroups.length} groups matching "${searchTerm}"`,
        searchTerm: searchTerm,
        totalFound: matchedGroups.length,
        groups: matchedGroups,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})