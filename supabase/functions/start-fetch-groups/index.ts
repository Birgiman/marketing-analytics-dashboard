// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface StartFetchGroupsRequest {
  instanceName: string;
  userId: string;
  searchTerm?: string;
}

interface StartFetchGroupsResponse {
  success: boolean;
  jobId?: string;
  error?: string;
  message?: string;
}

serve(async (req: any) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { instanceName, userId, searchTerm }: StartFetchGroupsRequest = await req.json();

    if (!instanceName || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'instanceName and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se a instância existe e está ativa
    const { data: instanceData, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('api_token, status')
      .eq('instance_name', instanceName)
      .eq('user_id', userId)
      .single();

    if (instanceError || !instanceData?.api_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Instance not found or no API token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já existe um job running/pending para esta instância
    const { data: existingJobs, error: existingJobError } = await supabase
      .from('whatsapp_group_fetch_jobs')
      .select('id, status, created_at')
      .eq('user_id', userId)
      .eq('instance_name', instanceName)
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingJobError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Error checking existing jobs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingJobs && existingJobs.length > 0) {
      const existingJob = existingJobs[0];

      return new Response(
        JSON.stringify({
          success: true,
          jobId: existingJob.id,
          message: `Job já existe com status: ${existingJob.status}`,
          isExisting: true
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Criar novo job - Evolution API processa todos os grupos de uma vez
    const { data: newJob, error: createJobError } = await supabase
      .from('whatsapp_group_fetch_jobs')
      .insert({
        user_id: userId,
        instance_name: instanceName,
        search_term: searchTerm || null,
        status: 'pending',
        chunk_size: 10, // Valor legacy (não usado mais, mas mantido para compatibilidade)
        page_delay: 500, // Valor legacy (não usado mais, mas mantido para compatibilidade)
        result_count: 0
      })
      .select()
      .single();

    if (createJobError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Error creating job', details: createJobError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response: StartFetchGroupsResponse = {
      success: true,
      jobId: newJob.id,
      message: 'Job created successfully. Processing will begin shortly.'
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});