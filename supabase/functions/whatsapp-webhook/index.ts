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

    // Parse request body
    let eventData: GroupParticipantEvent;
    try {
      eventData = await req.json();
      console.log('📨 Received event data:', JSON.stringify(eventData, null, 2));
    } catch (error) {
      console.error('❌ Failed to parse JSON:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract fields from Evolution API payload structure
    const { data: webhookData, instance, event } = eventData;
    
    console.log('🎯 Event type:', event);
    
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

    // Handle different event types
    if (event === 'groups.upsert') {
      console.log('📝 Processing GROUPS_UPSERT event');
      
      // GROUPS_UPSERT sends data as array, get first group
      const groupData = Array.isArray(webhookData) ? webhookData[0] : webhookData;
      const group_id = groupData?.id;
      const group_name = groupData?.subject || groupData?.name || group_id;
      
      console.log('📝 Group info - ID:', group_id, 'Name:', group_name);
      
      if (!group_id || !group_name || !user_id) {
        console.log('⚠️ Missing required fields for group cache, skipping');
        return new Response(
          JSON.stringify({ 
            ok: true,
            message: 'Groups upsert event processed (incomplete data)',
            missing_fields: { group_id: !group_id, group_name: !group_name, user_id: !user_id }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
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
      } else {
        console.log('✅ Group cached successfully:', groupCacheData);
      }
      
      return new Response(
        JSON.stringify({ 
          ok: true,
          message: 'Groups upsert event processed and cached',
          group_id,
          group_name,
          cached: !groupCacheError
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle GROUP_PARTICIPANTS_UPDATE
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
    
    // Get group name from whatsapp_groups cache table
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
        console.log('⚠️ Group not found in cache, using group_id as name');
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