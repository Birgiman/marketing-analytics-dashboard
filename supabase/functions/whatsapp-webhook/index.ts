// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GroupParticipantEvent {
  group_id?: string;
  group_name?: string;
  participant?: string;
  action?: string;
  [key: string]: any;
}

console.log('WhatsApp Webhook function loaded');

// Helper functions for event analysis
const extractPotentialGroupIds = (data: any): string[] => {
  const ids: string[] = [];
  
  const searchObject = (obj: any, path = '') => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.endsWith('@g.us')) {
        ids.push(`${path}${key}: ${value}`);
      } else if (typeof value === 'object') {
        searchObject(value, `${path}${key}.`);
      }
    }
  };
  
  if (Array.isArray(data)) {
    data.forEach((item, index) => searchObject(item, `[${index}].`));
  } else {
    searchObject(data);
  }
  
  return ids;
};

const extractPotentialGroupNames = (data: any): string[] => {
  const names: string[] = [];
  const nameFields = ['subject', 'name', 'title', 'groupName', 'group_name'];
  
  const searchObject = (obj: any, path = '') => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      if (nameFields.includes(key.toLowerCase()) && typeof value === 'string') {
        names.push(`${path}${key}: ${value}`);
      } else if (typeof value === 'object') {
        searchObject(value, `${path}${key}.`);
      }
    }
  };
  
  if (Array.isArray(data)) {
    data.forEach((item, index) => searchObject(item, `[${index}].`));
  } else {
    searchObject(data);
  }
  
  return names;
};

// @ts-ignore
Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== WHATSAPP WEBHOOK DEBUG ===');
  console.log('TIMESTAMP:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      console.log('❌ Method not allowed:', req.method);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get environment variables
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client initialized');

    // Parse request body with multiple format support
    let eventData: GroupParticipantEvent;
    const contentType = req.headers.get('content-type') || '';
    console.log('📋 Content-Type:', contentType);
    
    try {
      // Try different parsing methods based on content type
      if (contentType.includes('application/json')) {
        eventData = await req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData();
        eventData = {};
        const entries = Array.from(formData.entries());
        for (const [key, value] of entries) {
          if (typeof value === 'string') {
            try {
              eventData[key] = JSON.parse(value);
            } catch {
              eventData[key] = value;
            }
          }
        }
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        eventData = {};
        const entries = Array.from(formData.entries());
        for (const [key, value] of entries) {
          if (typeof value === 'string') {
            try {
              eventData[key] = JSON.parse(value);
            } catch {
              eventData[key] = value;
            }
          }
        }
      } else {
        // Default to JSON if no specific content type
        eventData = await req.json();
      }
      
      console.log('📨 Received event data:', JSON.stringify(eventData, null, 2));
    } catch (error) {
      console.error('❌ Failed to parse request body:', error);
      console.error('❌ Raw content type:', contentType);
      console.error('❌ Request headers:', JSON.stringify(Array.from(req.headers.entries()), null, 2));
      
      // Try to read raw body for debugging
      try {
        const rawBody = await req.text();
        console.error('❌ Raw body:', rawBody);
      } catch (bodyError) {
        console.error('❌ Could not read raw body:', bodyError);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse request body',
          content_type: contentType,
          parsing_error: error instanceof Error ? error.message : 'Unknown error'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract fields from Evolution API payload structure with fallbacks
    let { data: webhookData, instance, event } = eventData;
    
    // Try multiple ways to get the event type
    if (!event) {
      event = eventData.type || eventData.action || eventData.eventType || 
               req.headers.get('x-evolution-event') || req.headers.get('x-event-type');
    }
    
    console.log('🎯 Event type:', event);
    console.log('📋 Full event data keys:', Object.keys(eventData));
    console.log('🔍 Headers for event detection:', {
      'x-evolution-event': req.headers.get('x-evolution-event'),
      'x-event-type': req.headers.get('x-event-type'),
      'x-webhook-event': req.headers.get('x-webhook-event')
    });
    
    // Log ALL events for complete debugging
    console.log('🌟 COMPLETE EVENT LOG:', {
      event: event,
      instance: instance,
      timestamp: new Date().toISOString(),
      payload_structure: {
        has_data: !!webhookData,
        data_type: Array.isArray(webhookData) ? 'array' : typeof webhookData,
        data_length: Array.isArray(webhookData) ? webhookData.length : undefined,
        data_keys: webhookData ? Object.keys(Array.isArray(webhookData) ? webhookData[0] || {} : webhookData) : []
      },
      full_payload: JSON.stringify(eventData, null, 2)
    });
    
    // Log specific events we're interested in
    const interestingEvents = [
      'GROUP_UPDATE', 'GROUPS_UPDATE', 'GROUPS_UPSERT', 'CHATS_UPDATE', 
      'CHATS_UPSERT', 'CHATS_SET', 'GROUP_PARTICIPANTS_UPDATE'
    ];
    
    if (event && interestingEvents.some(e => event.toUpperCase().includes(e.replace('_', '').replace('S', '')))) {
      console.log('🎯 INTERESTING EVENT DETECTED:', event);
      console.log('📄 Detailed payload analysis:', {
        event_type: event,
        webhook_data: webhookData,
        potential_group_ids: extractPotentialGroupIds(webhookData),
        potential_group_names: extractPotentialGroupNames(webhookData)
      });
    }
    
    // Special focus on CHATS_UPDATE since it's likely the right event for group name changes
    if (event && event.toUpperCase() === 'CHATS_UPDATE') {
      console.log('🎯🎯🎯 CHATS_UPDATE EVENT DETECTED - This might be our GROUP NAME UPDATE!');
      console.log('📋 CHATS_UPDATE Full Analysis:', {
        raw_event: event,
        instance: instance,
        webhook_data_structure: {
          is_array: Array.isArray(webhookData),
          length: Array.isArray(webhookData) ? webhookData.length : 'not_array',
          keys: webhookData ? Object.keys(Array.isArray(webhookData) ? webhookData[0] || {} : webhookData) : []
        },
        complete_payload: JSON.stringify(eventData, null, 2)
      });
    }
    
    if (!webhookData) {
      console.error('❌ Missing data object in payload');
      return new Response(
        JSON.stringify({ 
          error: 'Missing data object in payload',
          received: eventData 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find user_id from whatsapp_instances table using instance name
    console.log('🔍 Searching for user_id using instance:', instance);
    const { data: instanceData, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('user_id')
      .eq('instance_name', instance)
      .single();

    if (instanceError) {
      console.error('❌ Error finding user_id:', instanceError);
    }

    const user_id = instanceData?.user_id || null;
    console.log('👤 Found user_id:', user_id);

    // Helper function to fetch group info from Evolution API as fallback
    const fetchGroupInfoFromEvolutionAPI = async (groupId: string, instanceName: string) => {
      try {
        console.log('🔄 Fetching group info from Evolution API as fallback...');
        
        // Get Evolution API configuration
        console.log('🔍 Fetching Evolution API config for:', { instanceName });
        
        // Get API URL from environment variable (global config)
        // @ts-ignore
        const apiUrl = Deno.env.get('EVOLUTION_API_URL');
        if (!apiUrl) {
          console.log('⚠️ EVOLUTION_API_URL environment variable not set');
          return null;
        }
        
        // Get API token from instance table (instance-specific)
        const { data: configData, error: configError } = await supabase
          .from('whatsapp_instances')
          .select('api_token, instance_name')
          .eq('instance_name', instanceName)
          .single();
        
        console.log('🔍 Evolution API config query result:', { 
          has_api_url: !!apiUrl, 
          api_token_found: !!configData?.api_token, 
          configError 
        });

        if (configError || !configData?.api_token) {
          console.log('⚠️ Could not get API token for instance:', instanceName);
          return null;
        }

        const cleanApiUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
        const response = await fetch(`${cleanApiUrl}/group/findOne/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': configData.api_token
          },
          body: JSON.stringify({ groupJid: groupId })
        });

        if (!response.ok) {
          console.log('⚠️ Evolution API call failed:', response.status, response.statusText);
          return null;
        }

        const groupInfo = await response.json();
        console.log('✅ Fetched group info from Evolution API:', groupInfo);
        
        return {
          id: groupInfo.id || groupId,
          subject: groupInfo.subject || groupInfo.name || null
        };
      } catch (error) {
        console.error('❌ Error fetching from Evolution API:', error);
        return null;
      }
    };

    // Universal group detection and processing
    const processGroupUpdate = async (data: any, eventType: string) => {
      console.log('📝 Processing GROUP event:', eventType);
      
      // Try to extract group data from various payload structures
      let groupData = data;
      if (Array.isArray(data)) {
        groupData = data[0]; // For groups.upsert that sends arrays
      }
      
      // Try multiple fields for group ID - enhanced for chats.update
      const group_id = groupData?.id || groupData?.jid || groupData?.key?.remoteJid || 
                       groupData?.remoteJid || groupData?.chat?.id || groupData?.chatId;
      
      // Try multiple fields for group name
      let group_name = groupData?.subject || groupData?.name || groupData?.title || 
                       groupData?.chat?.name || groupData?.chat?.subject;
      
      console.log('📝 Group info - ID:', group_id, 'Name:', group_name);
      console.log('📝 Available data keys:', Object.keys(groupData || {}));
      console.log('📝 Event type for processing:', eventType);
      
      // Check if this is actually a group (ends with @g.us)
      const isGroup = typeof group_id === 'string' && group_id.endsWith('@g.us');
      
      if (!isGroup) {
        console.log('⚠️ Not a group chat, skipping:', group_id);
        return { processed: false, reason: 'not_a_group' };
      }
      
      if (!group_id || !user_id) {
        console.log('⚠️ Missing required fields (group_id or user_id)');
        return { processed: false, reason: 'missing_required_fields', missing_fields: { group_id: !group_id, user_id: !user_id } };
      }

      // SPECIAL HANDLING FOR CHATS.UPDATE - Always fetch from Evolution API since it only sends ID
      if (eventType && eventType.toLowerCase().includes('chats.update')) {
        console.log('🎯 CHATS.UPDATE detected - forcing Evolution API fetch for group name...');
        if (instance) {
          const fallbackInfo = await fetchGroupInfoFromEvolutionAPI(group_id, instance);
          if (fallbackInfo?.subject) {
            group_name = fallbackInfo.subject;
            console.log('✅ Got updated group name from Evolution API for CHATS.UPDATE:', group_name);
          } else {
            console.log('❌ Evolution API failed for CHATS.UPDATE, cannot get group name');
            return { processed: false, reason: 'evolution_api_failed_for_chats_update' };
          }
        } else {
          console.log('❌ No instance available for CHATS.UPDATE Evolution API fetch');
          return { processed: false, reason: 'no_instance_for_chats_update' };
        }
      }
      // For other events, try fallback only if name is missing
      else if (!group_name && instance) {
        console.log('🔄 No group name in payload, trying Evolution API fallback...');
        const fallbackInfo = await fetchGroupInfoFromEvolutionAPI(group_id, instance);
        if (fallbackInfo?.subject) {
          group_name = fallbackInfo.subject;
          console.log('✅ Got group name from Evolution API fallback:', group_name);
        } else {
          console.log('⚠️ Evolution API fallback failed, using group_id as name');
          group_name = group_id; // Ultimate fallback
        }
      } else if (!group_name) {
        console.log('⚠️ No group name and no instance for fallback, using group_id as name');
        group_name = group_id; // Ultimate fallback
      }
      
      // Insert or update group in cache table
      const { data: groupCacheData, error: groupCacheError } = await supabase
        .from('whatsapp_groups')
        .upsert(
          {
            group_id,
            group_name,
            user_id,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'group_id,user_id' }
        )
        .select();

      if (groupCacheError) {
        console.error('❌ Error caching group data:', groupCacheError);
        return { processed: false, reason: 'database_error', error: groupCacheError };
      } else {
        console.log('✅ Group cached successfully:', groupCacheData);
        return { processed: true, group_id, group_name, cached_data: groupCacheData };
      }
    };

    // Handle different event types - Universal group event detection
    const groupRelatedEvents = [
      'GROUP_UPDATE', 'GROUPS_UPDATE', 'GROUPS_UPSERT', 
      'CHATS_UPDATE', 'CHATS_UPSERT', 'CHATS_SET'
    ];
    
    const isGroupEvent = event && (
      event.includes('groups') || 
      event.includes('group') || 
      event.includes('chats') ||
      event.includes('chat') ||
      groupRelatedEvents.some(e => event.toUpperCase() === e)
    );
    
    if (isGroupEvent) {
      console.log(`🎯 PROCESSING GROUP-RELATED EVENT: ${event}`);
      
      const result = await processGroupUpdate(webhookData, event);
      
      return new Response(
        JSON.stringify({ 
          ok: true,
          message: `Event ${event} processed`,
          event_type: event,
          ...result
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log UNKNOWN events for investigation
    if (event && !isGroupEvent && event !== 'group-participants.update') {
      console.log('🔮 UNKNOWN/UNHANDLED EVENT:', {
        event_type: event,
        instance: instance,
        has_webhook_data: !!webhookData,
        webhook_data_preview: webhookData ? JSON.stringify(webhookData, null, 2).substring(0, 500) + '...' : null,
        potential_group_content: extractPotentialGroupIds(webhookData).length > 0 || extractPotentialGroupNames(webhookData).length > 0,
        group_ids_found: extractPotentialGroupIds(webhookData),
        group_names_found: extractPotentialGroupNames(webhookData)
      });
      
      // Special attention to potential GROUP_UPDATE variants
      if (event.toUpperCase().includes('GROUP') || event.toUpperCase().includes('CHAT')) {
        console.log('🚨 POTENTIAL GROUP UPDATE EVENT FOUND:', event);
        console.log('📋 FULL PAYLOAD FOR GROUP EVENT:', JSON.stringify(eventData, null, 2));
      }
      
      // If unknown event has group content, try to process it anyway
      const hasGroupContent = extractPotentialGroupIds(webhookData).length > 0;
      if (hasGroupContent) {
        console.log('🎯 UNKNOWN EVENT HAS GROUP CONTENT - PROCESSING ANYWAY');
        const result = await processGroupUpdate(webhookData, `${event} (unknown-with-group-content)`);
        
        return new Response(
          JSON.stringify({ 
            ok: true,
            message: `Unknown event ${event} with group content processed`,
            event_type: event,
            was_unknown: true,
            ...result
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Fallback: Try to detect any group-related payload and process it
    if (!event && webhookData) {
      console.log('🔍 No event type detected, checking payload for group indicators...');
      
      // Check if payload contains group-like data
      let groupData = webhookData;
      if (Array.isArray(webhookData)) {
        groupData = webhookData[0];
      }
      
      const potentialGroupId = groupData?.id || groupData?.jid || groupData?.key?.remoteJid;
      const isGroupPayload = typeof potentialGroupId === 'string' && potentialGroupId.endsWith('@g.us');
      
      if (isGroupPayload) {
        console.log('🎯 Group payload detected without event type, processing as group update...');
        const result = await processGroupUpdate(webhookData, 'unknown-group-event');
        
        return new Response(
          JSON.stringify({ 
            ok: true,
            message: 'Group payload processed without event type',
            detected_group_id: potentialGroupId,
            ...result
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Handle GROUP_PARTICIPANTS_UPDATE and try fallback sync for group metadata
    if (event !== 'group-participants.update') {
      console.log('⚠️ Unsupported event type:', event);
      return new Response(
        JSON.stringify({ 
          ok: true,
          message: 'Event type not processed',
          event_type: event
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('👥 Processing GROUP_PARTICIPANTS_UPDATE event');
    
    const group_id = webhookData.id;
    const participant = webhookData.participants?.[0]; // Get first participant from array
    const action = webhookData.action;
    
    // Get group name from whatsapp_groups cache table, with fallback sync
    let group_name = group_id; // Default fallback
    
    if (user_id && group_id) {
      console.log('🔍 Looking up group name from cache...');
      const { data: groupCache, error: groupCacheError } = await supabase
        .from('whatsapp_groups')
        .select('group_name')
        .eq('group_id', group_id)
        .eq('user_id', user_id)
        .maybeSingle();
      
      if (groupCacheError) {
        console.error('❌ Error fetching group name from cache:', groupCacheError);
      } else if (groupCache?.group_name) {
        group_name = groupCache.group_name;
        console.log('✅ Found group name from cache:', group_name);
      } else {
        console.log('⚠️ Group not found in cache, trying Evolution API sync...');
        
        // DURING PARTICIPANT EVENTS: Only fetch name for logging, DON'T update cache
        if (instance) {
          console.log('🔍 Trying to get group name for participant event logging (read-only)...');
          const fallbackInfo = await fetchGroupInfoFromEvolutionAPI(group_id, instance);
          if (fallbackInfo?.subject) {
            group_name = fallbackInfo.subject;
            console.log('✅ Got group name from Evolution API (for logging only):', group_name);
            // NOTE: NOT updating the cache here - this is just for the participant log entry
          } else {
            console.log('⚠️ Evolution API fetch failed, will use group_id as fallback name');
            group_name = group_id; // Use group_id as fallback for the log entry
          }
        } else {
          console.log('⚠️ No instance available for Evolution API fetch, using group_id as name');
          group_name = group_id; // Use group_id as fallback for the log entry
        }
      }
    }
    
    // Validate required fields
    if (!group_id || !participant || !action) {
      const missingFields = [];
      if (!group_id) missingFields.push('group_id (data.id)');
      if (!participant) missingFields.push('participant (data.participants[0])');
      if (!action) missingFields.push('action (data.action)');
      
      console.error('❌ Missing required fields:', missingFields.join(', '));
      console.log('Discarding insertion due to missing fields');
      
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          missing: missingFields,
          received: eventData 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Map Evolution API actions to our events
    let normalizedAction;
    if (action === 'add') {
      normalizedAction = 'join';
    } else if (action === 'remove') {
      normalizedAction = 'leave';
    } else {
      console.error('❌ Invalid action value:', action);
      console.log('Expected "add" or "remove", got:', action);
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid action value', 
          expected: ['add', 'remove'],
          received: action 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare data for insertion
    const insertData = {
      id_grupo: group_id,
      nome_grupo: group_name,
      telefone: participant,
      evento: normalizedAction,
      user_id: user_id, // Use the found user_id from whatsapp_instances
      created_at: new Date().toISOString()
    };

    console.log('💾 Inserting data into whatsapp_groups_log:', JSON.stringify(insertData, null, 2));

    // Insert into whatsapp_groups_log table
    const { data, error } = await supabase
      .from('whatsapp_groups_log')
      .insert([insertData])
      .select();

    if (error) {
      console.error('❌ Database insertion error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Database insertion failed', 
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Successfully inserted data:', JSON.stringify(data, null, 2));
    console.log('📝 Group participant event logged successfully');

    // Return success response
    return new Response(
      JSON.stringify({ 
        ok: true,
        message: 'Webhook processed successfully',
        inserted_id: data?.[0]?.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});