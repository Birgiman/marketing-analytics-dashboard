import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchGroupsRequest {
  instanceName: string;
  userId: string;
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

    const { instanceName, userId }: FetchGroupsRequest = await req.json()
    
    if (!instanceName || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'instanceName and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Fetching groups for instance: ${instanceName}`)

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

    // Use the correct Evolution API URL from your successful test
    const evolutionUrl = `https://evolution-api-2-3-0-production-6d75.up.railway.app/group/fetchAllGroups/${instanceName}?getParticipants=false`
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

    // Process and save groups to database
    const processedGroups = []
    
    for (const group of groupsData) {
      try {
        const groupId = group.id
        const groupName = group.subject || 'Sem nome'
        const groupSize = group.size || 0
        const groupOwner = group.owner
        const groupDescription = group.desc || null
        
        // Convert Unix timestamp to ISO string
        const groupCreatedAt = group.creation 
          ? new Date(group.creation * 1000).toISOString()
          : null

        if (!groupId) {
          console.warn('⚠️ Skipping group without ID:', group)
          continue
        }

        console.log(`💾 Processing group: ${groupName} (${groupId})`)

        // Smart upsert: only update changed fields
        // First check if group exists and get current values
        const { data: existingGroup } = await supabase
          .from('whatsapp_groups')
          .select('group_name, group_size, group_owner, group_created_at, group_description, monitoring')
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
          group_description: groupDescription,
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
            existingGroup.group_description !== groupDescription ||
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
          processedGroups.push(upsertedGroup)
        }

      } catch (error) {
        console.error('❌ Error processing individual group:', error)
      }
    }

    console.log(`🎯 Successfully processed ${processedGroups.length} groups`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${processedGroups.length} groups`,
        groups: processedGroups,
        totalFromAPI: groupsData.length,
        totalProcessed: processedGroups.length
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