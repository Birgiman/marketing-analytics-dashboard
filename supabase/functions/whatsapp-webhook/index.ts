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
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'string' && value.endsWith('@g.us')) {
          ids.push(`${path}${key}: ${value}`);
        } else if (typeof value === 'object') {
          searchObject(value, `${path}${key}.`);
        }
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
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (nameFields.indexOf(key.toLowerCase()) !== -1 && typeof value === 'string') {
          names.push(`${path}${key}: ${value}`);
        } else if (typeof value === 'object') {
          searchObject(value, `${path}${key}.`);
        }
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
    
    // Log event for group-participants.update only
    if (event === 'group-participants.update') {
      console.log('📋 GROUP PARTICIPANTS EVENT:', {
        event: event,
        instance: instance,
        data_keys: webhookData ? Object.keys(webhookData) : [],
        group_id: webhookData?.id,
        participants: webhookData?.participants,
        action: webhookData?.action
      });
    }
    
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
    
    /* 
    // BACKUP: Special focus on CHATS_UPDATE (commented out - using GROUPS events now)
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
    */
    
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

    // Find user_id and api_token from whatsapp_instances table using instance name
    console.log('🔍 Searching for user_id and api_token using instance:', instance);
    const { data: instanceData, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('user_id, api_token')
      .eq('instance_name', instance)
      .single();

    if (instanceError) {
      console.error('❌ Error finding user_id and api_token:', instanceError);
    }

    const user_id = instanceData?.user_id || null;
    const api_token = instanceData?.api_token || null;
    console.log('👤 Found user_id:', user_id, 'has_token:', !!api_token);

    // Helper function to fetch group info from Evolution API
    const fetchGroupInfoFromEvolutionAPI = async (groupId: string, instanceName: string, checkParticipation: boolean = false) => {
      try {
        console.log('🔄 Fetching group info from Evolution API...');
        
        // Get API URL from environment variable (global config)
        // @ts-ignore
        const apiUrl = Deno.env.get('EVOLUTION_API_URL');
        if (!apiUrl) {
          console.log('⚠️ EVOLUTION_API_URL environment variable not set');
          return null;
        }
        
        // Get API token and instance info from instance table
        let configData = null;
        if (checkParticipation) {
          const { data: instanceConfig, error: configError } = await supabase
            .from('whatsapp_instances')
            .select('api_token, instance_phone')
            .eq('instance_name', instanceName)
            .single();

          if (configError || !instanceConfig?.api_token) {
            console.log('⚠️ Could not get API token for instance:', instanceName);
            return null;
          }
          configData = instanceConfig;
        }
        
        // Use the api_token that was already fetched or get from configData
        const apiToken = configData?.api_token || api_token;
        if (!apiToken) {
          console.log('⚠️ No API token available for instance:', instanceName);
          return null;
        }

        const cleanApiUrl = apiUrl.replace(/\/$/, '');
        
        // Use getParticipants=true when we need to check participation
        const getParticipants = checkParticipation ? 'true' : 'false';
        console.log(`🔄 Calling Evolution API: GET ${cleanApiUrl}/group/fetchAllGroups/${instanceName}?getParticipants=${getParticipants}`);
        
        const response = await fetch(`${cleanApiUrl}/group/fetchAllGroups/${instanceName}?getParticipants=${getParticipants}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiToken
          }
        });

        if (!response || !response.ok) {
          console.log('⚠️ Evolution API call failed:', response ? `${response.status} ${response.statusText}` : 'No response');
          return null;
        }

        const allGroups = await response.json();
        console.log(`✅ Fetched ${allGroups.length} groups from Evolution API`);
        
        // Find the specific group by ID
        const targetGroup = allGroups.find((group: any) => group.id === groupId);
        
        if (targetGroup) {
          // Get group size for logging purposes
          const groupSize = targetGroup.size || 0;

          // Log participation info if available (removed blocking validation)
          if (checkParticipation && targetGroup.participants && configData) {
            const instancePhone = configData.instance_phone;
            if (instancePhone) {
              const isParticipant = targetGroup.participants.some((p: any) =>
                p.id && (p.id.includes(instancePhone) || p.id === `${instancePhone}@s.whatsapp.net`)
              );
              console.log('ℹ️ Instance participation status:', {
                id: targetGroup.id,
                subject: targetGroup.subject,
                instance_phone: instancePhone,
                is_participant: isParticipant
              });
            }
          }
          
          console.log('✅ Found valid group:', { id: targetGroup.id, subject: targetGroup.subject, size: groupSize });
          return {
            id: targetGroup.id,
            subject: targetGroup.subject,
            owner: targetGroup.owner,
            creation: targetGroup.creation,
            size: groupSize,
            participants: checkParticipation ? targetGroup.participants : undefined
          };
        } else {
          console.log('⚠️ Group not found in Evolution API response');
          return null;
        }
      } catch (error) {
        console.error('❌ Error fetching from Evolution API:', error);
        return null;
      }
    };

    // Helper function to fetch only active groups (where user participates)
    const fetchActiveGroupsFromEvolutionAPI = async (instanceName: string) => {
      try {
        console.log('🔄 Fetching active groups from Evolution API...');
        
        // Get API URL from environment variable (global config)
        // @ts-ignore
        const apiUrl = Deno.env.get('EVOLUTION_API_URL');
        if (!apiUrl) {
          console.log('⚠️ EVOLUTION_API_URL environment variable not set');
          return [];
        }
        
        // Get API token and instance info from instance table
        const { data: configData, error: configError } = await supabase
          .from('whatsapp_instances')
          .select('api_token, instance_phone')
          .eq('instance_name', instanceName)
          .single();

        if (configError || !configData?.api_token) {
          console.log('⚠️ Could not get API token for instance:', instanceName);
          return [];
        }

        const cleanApiUrl = apiUrl.replace(/\/$/, '');
        
        // Fetch all groups with participants to check participation
        console.log(`🔄 Calling Evolution API: GET ${cleanApiUrl}/group/fetchAllGroups/${instanceName}?getParticipants=true`);
        
        const response = await fetch(`${cleanApiUrl}/group/fetchAllGroups/${instanceName}?getParticipants=true`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': configData.api_token
          }
        });

        if (!response || !response.ok) {
          console.log('⚠️ Evolution API call failed:', response ? `${response.status} ${response.statusText}` : 'No response');
          return [];
        }

        const allGroups = await response.json();
        console.log(`✅ Fetched ${allGroups.length} total groups from Evolution API`);
        
        // Filter for active groups only
        const instancePhone = configData.instance_phone;
        const activeGroups = allGroups.filter((group: any) => {
          // Rule 1: Group must have at least 1 participant
          const groupSize = group.size || 0;
          if (groupSize === 0) {
            console.log(`⚠️ Filtering out group with 0 participants: ${group.subject || group.id}`);
            return false;
          }

          // Rule 2: Instance must be a participant (if we have phone number)
          if (instancePhone && group.participants) {
            const isParticipant = group.participants.some((p: any) => 
              p.id && (p.id.includes(instancePhone) || p.id === `${instancePhone}@s.whatsapp.net`)
            );
            
            if (!isParticipant) {
              console.log(`⚠️ Filtering out group where instance is not participant: ${group.subject || group.id}`);
              return false;
            }
          }

          console.log(`✅ Active group: ${group.subject || group.id} (${groupSize} participants)`);
          return true;
        });

        console.log(`✅ Found ${activeGroups.length} active groups out of ${allGroups.length} total`);
        
        return activeGroups.map((group: any) => ({
          id: group.id,
          subject: group.subject,
          owner: group.owner,
          creation: group.creation,
          size: group.size
        }));
      } catch (error) {
        console.error('❌ Error fetching active groups from Evolution API:', error);
        return [];
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

      /*
      // BACKUP: SPECIAL HANDLING FOR CHATS.UPDATE (commented out - using GROUPS events now)
      if (eventType && eventType.toLowerCase().includes('chats.update')) {
        console.log('🎯 CHATS.UPDATE detected - checking if group name actually changed...');
        
        if (instance) {
          // First, get the cached group name from database
          const { data: cachedGroup, error: cacheError } = await supabase
            .from('whatsapp_groups')
            .select('group_name')
            .eq('group_id', group_id)
            .eq('user_id', user_id)
            .maybeSingle();
          
          if (cacheError) {
            console.log('⚠️ Error reading cached group name:', cacheError);
          }
          
          const cachedGroupName = cachedGroup?.group_name;
          console.log('📄 Cached group name:', cachedGroupName);
          
          // Fetch current group info from Evolution API with participation check
          const groupInfo = await fetchGroupInfoFromEvolutionAPI(group_id, instance, true);
          if (groupInfo?.subject) {
            const currentGroupName = groupInfo.subject;
            console.log('🆕 Current group name from Evolution API:', currentGroupName);
            
            // Compare cached name with current name
            if (cachedGroupName && cachedGroupName === currentGroupName) {
              console.log('✋ Group name unchanged - skipping database update');
              console.log(`📌 Name remains: "${currentGroupName}"`);
              return { 
                processed: false, 
                reason: 'group_name_unchanged',
                group_id,
                cached_name: cachedGroupName,
                current_name: currentGroupName
              };
            } else {
              console.log('🎯 Group name changed - proceeding with database update');
              console.log(`📝 From: "${cachedGroupName || 'N/A'}" → To: "${currentGroupName}"`);
              group_name = currentGroupName;
            }
            
            console.log('✅ Got current group info from Evolution API:', {
              name: group_name,
              owner: groupInfo.owner,
              creation: groupInfo.creation,
              size: groupInfo.size
            });
          } else {
            console.log('⚠️ Could not fetch group info from Evolution API');
            group_name = `[Group Updated] ${group_id.substring(0, 15)}...`;
          }
        } else {
          console.log('⚠️ No instance available for Evolution API fetch');
          group_name = `[Group Updated] ${group_id.substring(0, 15)}...`;
        }
      }
      */
      // For other events, validate group activity before processing  
      if (!group_name && instance) {
        console.log('🔄 No group name in payload, validating group activity...');
        const groupInfo = await fetchGroupInfoFromEvolutionAPI(group_id, instance, true);
        if (groupInfo?.subject) {
          group_name = groupInfo.subject;
          console.log('✅ Got group name from Evolution API:', group_name);
        } else {
          console.log('ℹ️ Could not fetch group name from Evolution API, using fallback');
          group_name = `Group ${group_id.substring(0, 12)}...`;
        }
      } else if (!group_name) {
        console.log('ℹ️ No group name available, using fallback');
        group_name = `Group ${group_id.substring(0, 12)}...`;
      }
      
      // Get participant count from Evolution API for cache update
      let participant_count = null;
      if (instance) {
        const groupInfo = await fetchGroupInfoFromEvolutionAPI(group_id, instance);
        if (groupInfo?.size) {
          participant_count = groupInfo.size;
          console.log('✅ Got participant count from Evolution API:', participant_count);
        }
      }

      // Insert or update group in cache table with participant count
      const { data: groupCacheData, error: groupCacheError } = await supabase
        .from('whatsapp_groups')
        .upsert(
          {
            group_id,
            group_name,
            participant_count,
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
      'GROUP_UPDATE', 'GROUPS_UPDATE', 'GROUPS_UPSERT'
      // 'CHATS_UPDATE', 'CHATS_UPSERT', 'CHATS_SET' // Commented out - using GROUPS events now
    ];
    
    const isGroupEvent = event && event !== 'group-participants.update' && (
      event.includes('groups') || 
      event.includes('group') || 
      // event.includes('chats') ||    // Commented out - using GROUPS events now
      // event.includes('chat') ||     // Commented out - using GROUPS events now
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

    const group_id = webhookData.id;
    const participants = webhookData.participants || [];
    const action = webhookData.action;
    
    // Get group info including name and participant count
    let group_name = null;
    let participant_count = null;
    
    // Try to get group info from cache first
    if (user_id && group_id) {
      const { data: groupCache, error: groupCacheError } = await supabase
        .from('whatsapp_groups')
        .select('group_name, participant_count')
        .eq('group_id', group_id)
        .eq('user_id', user_id)
        .maybeSingle();
      
      if (!groupCacheError && groupCache) {
        group_name = groupCache.group_name;
        participant_count = groupCache.participant_count;
      }
    }
    
    // If no cached name or we need fresh data, fetch from Evolution API
    if (!group_name && instance) {
      const freshInfo = await fetchGroupInfoFromEvolutionAPI(group_id, instance, true);
      if (freshInfo?.subject) {
        group_name = freshInfo.subject;
        participant_count = freshInfo.size || null;

        // Update cache with fresh info
        if (user_id) {
          await supabase
            .from('whatsapp_groups')
            .upsert({
              group_id,
              group_name,
              participant_count,
              user_id,
              updated_at: new Date().toISOString()
            }, { onConflict: 'group_id,user_id' });
        }
      } else {
        group_name = `Group ${group_id.substring(0, 12)}...`;
      }
    }
    
    // Use group ID as fallback name if still no name
    if (!group_name) {
      group_name = `Group ${group_id.substring(0, 12)}...`;
    }

    // Map Evolution API actions to our events
    let normalizedAction;
    if (action === 'add') {
      normalizedAction = 'join';
    } else if (action === 'remove') {
      normalizedAction = 'leave';
    } else {
      console.error('❌ Webhook falhou: Invalid action value - Grupo:', group_name);
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

    // 🚀 LOG INICIAL (1 por evento)
    console.log(`🚀 Webhook iniciado: ${normalizedAction} evento - ${participants.length} usuário(s) no grupo "${group_name}"`);

    // Validate required fields
    if (!group_id || participants.length === 0 || !action) {
      console.error('❌ Webhook falhou: Missing required fields - Grupo:', group_name);
      return new Response(
        JSON.stringify({
          error: 'Missing required fields'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Process each participant in the event
    const insertedRecords = [];
    const currentTime = new Date().toISOString();
    
    for (const participant of participants) {
      // Extract phone number from WhatsApp ID (e.g., "555181999999999@s.whatsapp.net" -> "5581999999999")
      const extractPhoneNumber = (whatsappId: string): string => {
        // Remove @s.whatsapp.net and @c.us suffixes
        const phoneOnly = whatsappId.replace(/@(s\.whatsapp\.net|c\.us)$/, '');
        
        // Format: Country Code + Area Code + Number (e.g., "5581999999999")
        // You can add more formatting here if needed
        return phoneOnly;
      };

      const phoneNumber = extractPhoneNumber(participant);
      
      const insertData = {
        id_grupo: group_id,
        group_name: group_name,
        whatsapp_phone_id: participant,
        phone_number: phoneNumber,
        event: normalizedAction,
        user_id: user_id,
        created_at: currentTime
      };

      // Insert into whatsapp_groups_log table
      const { data, error } = await supabase
        .from('whatsapp_groups_log')
        .insert([insertData])
        .select();

      if (error) {
        continue; // Continue processing other participants
      }

      if (data && data[0]) {
        insertedRecords.push(data[0]);
      }
    }

    // ✅ LOG FINAL (1 por evento)
    console.log(`✅ Webhook finalizado: ${insertedRecords.length}/${participants.length} registros salvos na whatsapp_groups_log`);

    // Return success response
    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Group participant event(s) processed successfully',
        summary: {
          total_participants: participants.length,
          successfully_logged: insertedRecords.length,
          action: normalizedAction,
          group_id,
          group_name
        }
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