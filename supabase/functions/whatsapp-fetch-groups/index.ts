import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchGroupsRequest {
  instanceName: string;
  userId: string;
  searchTerm?: string; // NEW: Optional search term for filtering
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

    const { instanceName, userId, searchTerm }: FetchGroupsRequest = await req.json()
    
    if (!instanceName || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'instanceName and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Fetching groups for instance: ${instanceName}, userId: ${userId}${searchTerm ? `, searchTerm: "${searchTerm}"` : ''}`)

    // First, let's check what instances exist for this user
    const { data: userInstances, error: userInstancesError } = await supabase
      .from('whatsapp_instances')
      .select('instance_name, api_token')
      .eq('user_id', userId)

    console.log(`👤 Found ${userInstances?.length || 0} instances for user ${userId}:`, 
      userInstances?.map(i => ({ name: i.instance_name, hasToken: !!i.api_token })))

    // Get Evolution API credentials from user's stored instance
    const { data: instanceData, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('api_token')
      .eq('user_id', userId)
      .eq('instance_name', instanceName)
      .single()

    console.log(`🔍 Query result for instance ${instanceName}:`, {
      found: !!instanceData,
      hasToken: !!instanceData?.api_token,
      error: instanceError
    })

    if (instanceError || !instanceData?.api_token) {
      console.error('❌ Instance or API token not found:', {
        instanceError,
        instanceData,
        requestedInstance: instanceName,
        requestedUserId: userId
      })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Instance not found or API token missing. Please reconnect your WhatsApp instance.',
          debug: {
            instanceName,
            userId,
            availableInstances: userInstances?.map(i => i.instance_name) || [],
            instanceError: instanceError?.message || 'No error'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = instanceData.api_token
    const instancePhone = null // Column doesn't exist yet, will be added later

    // Get Evolution API URL from environment variable
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://evolution-api-2-3-0-production-6d75.up.railway.app'
    const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '')
    
    // Use getParticipants=false to avoid polluting the interface
    const evolutionUrl = `${cleanApiUrl}/group/fetchAllGroups/${instanceName}?getParticipants=false`
    console.log(`🌐 Calling Evolution API: ${evolutionUrl}`)

    console.log(`🔄 Fetching groups from Evolution API: ${evolutionUrl}`)
    
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

    // Add detailed logging for debugging Arthur's issue
    console.log(`📊 API Response Analysis:`)
    console.log(`- Total groups from API: ${groupsData.length}`)
    console.log(`- Groups with size > 0: ${groupsData.filter(g => (g.size || 0) > 0).length}`)
    console.log(`- Groups with size = 0: ${groupsData.filter(g => (g.size || 0) === 0).length}`)
    console.log(`- Groups without subject: ${groupsData.filter(g => !g.subject).length}`)
    console.log(`- Groups created in last 30 days: ${groupsData.filter(g => g.creation && (Date.now() - (g.creation * 1000)) < (30 * 24 * 60 * 60 * 1000)).length}`)

    // Process and save groups to database
    const processedGroups = []
    const filteredOutGroups = []
    
    for (const group of groupsData) {
      try {
        const groupId = group.id
        const groupName = group.subject || 'Sem nome'
        const groupSize = group.size || 0
        const groupOwner = group.owner
        
        // Convert Unix timestamp to ISO string
        const groupCreatedAt = group.creation 
          ? new Date(group.creation * 1000).toISOString()
          : null

        if (!groupId) {
          console.warn('⚠️ Skipping group without ID:', group)
          continue
        }

        // NEW: Apply filters to reduce "phantom" groups
        const shouldFilterOut = (
          groupSize === 0 || // Groups with no participants
          !group.subject || // Groups without names
          group.subject.trim() === '' // Groups with empty names
        );

        if (shouldFilterOut) {
          filteredOutGroups.push({
            id: groupId,
            name: groupName,
            size: groupSize,
            reason: groupSize === 0 ? 'zero_participants' : !group.subject ? 'no_name' : 'empty_name'
          });
          console.log(`🚫 Filtered out group: ${groupName} (${groupId}) - Reason: ${shouldFilterOut}`)
          continue;
        }

        // NEW: Apply search term filter if provided
        if (searchTerm && searchTerm.trim() !== '') {
          const searchLower = searchTerm.toLowerCase().trim();
          const groupNameLower = (group.subject || '').toLowerCase();
          
          if (!groupNameLower.includes(searchLower)) {
            console.log(`🔍 Search filtered out group: ${groupName} (doesn't match "${searchTerm}")`)
            continue; // Skip groups that don't match the search term
          }
        }

        console.log(`💾 Processing group: ${groupName} (${groupId}) - ${groupSize} participants`)

        // Smart upsert: only update changed fields
        const { data: existingGroup } = await supabase
          .from('whatsapp_groups')
          .select('group_name, group_size, group_owner, group_created_at, monitoring')
          .eq('user_id', userId)
          .eq('group_id', groupId)
          .single()

        const groupData = {
          user_id: userId,
          group_id: groupId,
          group_name: groupName,
          group_size: groupSize,
          group_owner: groupOwner,
          group_created_at: groupCreatedAt,
          updated_at: new Date().toISOString()
        }

        // If group is new, set monitoring to true by default
        if (!existingGroup) {
          groupData.monitoring = true
          console.log(`📝 New group - will be monitored by default: ${groupName}`)
        } else {
          // For existing groups, preserve monitoring setting and only update if values changed
          const hasChanges = 
            existingGroup.group_name !== groupName ||
            existingGroup.group_size !== groupSize ||
            existingGroup.group_owner !== groupOwner ||
            (existingGroup.group_created_at ? new Date(existingGroup.group_created_at).toISOString() : null) !== groupCreatedAt

          if (!hasChanges) {
            console.log(`✨ No changes detected for group: ${groupName} - skipping update`)
            processedGroups.push({ ...existingGroup, id: 'existing', group_id: groupId, group_name: groupName })
            continue
          }
          console.log(`🔄 Changes detected for group: ${groupName} - updating`)
        }

        // Upsert with optimized data
        const { data: upsertedGroup, error: upsertError } = await supabase
          .from('whatsapp_groups')
          .upsert(groupData, {
            onConflict: 'user_id,group_id',
            ignoreDuplicates: false
          })
          .select()
          .single()

        if (upsertError) {
          console.error(`❌ Error upserting group ${groupId}:`, upsertError)
        } else {
          console.log(`✅ Group processed: ${groupName}`)
          // Add additional data for frontend selection
          const enrichedGroup = {
            ...upsertedGroup,
            group_participants: groupSize,
            group_created_formatted: groupCreatedAt ? new Date(groupCreatedAt).toLocaleDateString('pt-BR') : null,
            group_owner_formatted: groupOwner ? groupOwner.replace('@s.whatsapp.net', '') : null,
            selectable: true // Flag for frontend checkbox logic
          }
          processedGroups.push(enrichedGroup)
        }

      } catch (error) {
        console.error('❌ Error processing individual group:', error)
      }
    }

    console.log(`🎯 Successfully processed ${processedGroups.length} groups`)
    console.log(`🚫 Filtered out ${filteredOutGroups.length} groups:`, 
      filteredOutGroups.map(g => `${g.name} (${g.reason})`).slice(0, 10))

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${processedGroups.length} groups`,
        groups: processedGroups,
        totalFromAPI: groupsData.length,
        totalProcessed: processedGroups.length,
        totalFilteredOut: filteredOutGroups.length,
        debug: {
          filteredOut: filteredOutGroups.slice(0, 5), // Sample of filtered groups
          analysis: {
            totalGroups: groupsData.length,
            activeGroups: groupsData.filter(g => (g.size || 0) > 0).length,
            emptyGroups: groupsData.filter(g => (g.size || 0) === 0).length,
            namedGroups: groupsData.filter(g => g.subject).length
          }
        }
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