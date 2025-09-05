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
    const { data: webhookData, instance } = eventData;
    
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

    const group_id = webhookData.id;
    const group_name = instance || 'Unknown Group'; // Use instance name as fallback
    const participant = webhookData.participants?.[0]; // Get first participant from array
    const action = webhookData.action;
    
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
      user_id: null, // Will be null for now as requested
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