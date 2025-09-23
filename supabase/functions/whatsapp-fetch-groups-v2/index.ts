// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchGroupsRequest {
  instanceName: string;
  userId: string;
  searchTerm?: string;
}

// V2 OPTIMIZATIONS
const MAX_GROUPS_TO_PROCESS = 50; // Limite para evitar timeout
const EVOLUTION_API_TIMEOUT = 25000; // 25 segundos timeout

serve(async (req: any) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 [whatsapp-fetch-groups-v2] Function started');
    console.log('📋 [whatsapp-fetch-groups-v2] Request method:', req.method);

    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { instanceName, userId, searchTerm }: FetchGroupsRequest = await req.json()
    
    console.log('📥 [whatsapp-fetch-groups-v2] Request parsed:', {
      instanceName,
      userId,
      searchTerm,
      hasInstanceName: !!instanceName,
      hasUserId: !!userId
    });
    
    if (!instanceName || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'instanceName and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 [V2] Fetching groups for instance: ${instanceName}, userId: ${userId}${searchTerm ? `, searchTerm: "${searchTerm}"` : ''}`)

    // Get Evolution API credentials
    const { data: instanceData, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('api_token')
      .eq('user_id', userId)
      .eq('instance_name', instanceName)
      .single()

    if (instanceError || !instanceData?.api_token) {
      console.error('❌ [V2] Instance or API token not found:', { instanceError, instanceData })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Instance not found or API token missing. Please reconnect your WhatsApp instance.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = instanceData.api_token

    // Get Evolution API URL
    // @ts-ignore
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://evolution-api-2-3-0-production-6d75.up.railway.app'
    const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '')
    
    const evolutionUrl = `${cleanApiUrl}/group/fetchAllGroups/${instanceName}?getParticipants=false`
    console.log(`🌐 [V2] Calling Evolution API: ${evolutionUrl}`)

    // V2 OPTIMIZATION: Retry logic with adaptive timeout
    let response;
    let lastError;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`📡 [V2] Attempt ${attempt}/3 to fetch groups`)
        response = await fetch(evolutionUrl, {
          method: 'GET',
          headers: {
            'apikey': apiKey,
            'User-Agent': 'Supabase-Edge-Function-V2',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(EVOLUTION_API_TIMEOUT)
        })
        
        if (response.ok) {
          console.log(`✅ [V2] Successfully fetched groups on attempt ${attempt}`)
          break;
        } else {
          console.log(`⚠️ [V2] Attempt ${attempt} failed with status: ${response.status}`)
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        console.log(`❌ [V2] Attempt ${attempt} failed:`, error)
        lastError = error
        if (attempt < 3) {
          console.log(`⏳ [V2] Waiting 3s before retry...`)
          await new Promise(resolve => setTimeout(resolve, 3000))
        }
      }
    }
    
    if (!response || !response.ok) {
      throw lastError || new Error('Failed to fetch groups after 3 attempts')
    }

    const groupsData = await response.json()
    console.log(`📊 [V2] Received ${groupsData?.length || 0} groups from Evolution API`)

    if (!Array.isArray(groupsData)) {
      console.error('❌ [V2] Invalid response format from Evolution API')
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid response format from Evolution API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // V2 OPTIMIZATION: Filter groups BEFORE processing
    console.log(`🔍 [V2] Applying filters to ${groupsData.length} groups...`)
    
    const filteredGroups = groupsData.filter(group => {
      const groupId = group.id
      const groupName = group.subject || 'Sem nome'
      const groupSize = group.size || 0
      
      // Skip groups without ID
      if (!groupId) {
        console.warn('⚠️ [V2] Skipping group without ID:', group)
        return false
      }

      // Apply quality filters
      const shouldFilterOut = (
        groupSize === 0 || // Groups with no participants
        !group.subject || // Groups without names
        group.subject.trim() === '' // Groups with empty names
      );

      if (shouldFilterOut) {
        console.log(`🚫 [V2] Filtered out group: ${groupName} (${groupId}) - Reason: quality filter`)
        return false;
      }

      // Apply search term filter
      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase().trim();
        const groupNameLower = (group.subject || '').toLowerCase();
        
        if (!groupNameLower.includes(searchLower)) {
          console.log(`🔍 [V2] Search filtered out group: ${groupName} (doesn't match "${searchTerm}")`)
          return false;
        }
      }

      return true;
    });

    console.log(`✅ [V2] Filtered to ${filteredGroups.length} relevant groups`)

    // V2 OPTIMIZATION: Limit processing to avoid timeout
    const groupsToProcess = filteredGroups.slice(0, MAX_GROUPS_TO_PROCESS);
    console.log(`🎯 [V2] Processing first ${groupsToProcess.length} groups (limit: ${MAX_GROUPS_TO_PROCESS})`)

    if (groupsToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No groups found matching criteria',
          groups: [],
          totalFromAPI: groupsData.length,
          totalProcessed: 0,
          totalFilteredOut: filteredGroups.length,
          debug: {
            searchTerm,
            totalGroups: groupsData.length,
            filteredGroups: filteredGroups.length
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // V2 OPTIMIZATION: Prepare data for bulk upsert
    const groupsToUpsert = groupsToProcess.map(group => {
      const groupId = group.id
      const groupName = group.subject || 'Sem nome'
      const groupSize = group.size || 0
      const groupOwner = group.owner
      
      const groupCreatedAt = group.creation 
        ? new Date(group.creation * 1000).toISOString()
        : null

      return {
        user_id: userId,
        group_id: groupId,
        group_name: groupName,
        group_size: groupSize,
        group_owner: groupOwner,
        group_created_at: groupCreatedAt,
        monitoring: true, // New groups monitored by default
        updated_at: new Date().toISOString()
      }
    });

    console.log(`💾 [V2] Performing bulk upsert for ${groupsToUpsert.length} groups`)

    // V2 OPTIMIZATION: Bulk upsert instead of individual operations
    const { data: upsertedGroups, error: upsertError } = await supabase
      .from('whatsapp_groups')
      .upsert(groupsToUpsert, {
        onConflict: 'user_id,group_id',
        ignoreDuplicates: false
      })
      .select()

    if (upsertError) {
      console.error('❌ [V2] Error in bulk upsert:', upsertError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database error during bulk upsert',
          details: upsertError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // V2 OPTIMIZATION: Enrich data for frontend
    const processedGroups = (upsertedGroups || []).map(group => ({
      ...group,
      group_participants: group.group_size,
      group_created_formatted: group.group_created_at ? new Date(group.group_created_at).toLocaleDateString('pt-BR') : null,
      group_owner_formatted: group.group_owner ? group.group_owner.replace('@s.whatsapp.net', '') : null,
      selectable: true
    }));

    console.log(`🎯 [V2] Successfully processed ${processedGroups.length} groups`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${processedGroups.length} groups (V2 optimized)`,
        groups: processedGroups,
        totalFromAPI: groupsData.length,
        totalProcessed: processedGroups.length,
        totalFilteredOut: filteredGroups.length - processedGroups.length,
        debug: {
          searchTerm,
          maxGroupsLimit: MAX_GROUPS_TO_PROCESS,
          analysis: {
            totalGroups: groupsData.length,
            filteredGroups: filteredGroups.length,
            processedGroups: processedGroups.length,
            skippedDueToLimit: Math.max(0, filteredGroups.length - MAX_GROUPS_TO_PROCESS)
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ [whatsapp-fetch-groups-v2] Function error:', error)
    console.error('❌ [whatsapp-fetch-groups-v2] Error stack:', (error as Error).stack)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message,
        errorType: (error as Error).name,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
