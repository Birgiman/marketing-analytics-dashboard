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

interface JobStatusResponse {
  success: boolean;
  job?: {
    id: string;
    status: string;
    instanceName: string;
    searchTerm: string | null;
    resultCount: number;
    lastError: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    progress?: {
      percentage: number;
      message: string;
      estimatedTimeRemaining?: string;
    };
  };
  error?: string;
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

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Job ID is required as query parameter: ?jobId=your-job-id' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 [job-status] Consultando status do job: ${jobId}`);

    // Buscar dados do job
    const { data: job, error: jobError } = await supabase
      .from('whatsapp_group_fetch_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) {
      console.error('❌ [job-status] Job not found:', jobError);
      return new Response(
        JSON.stringify({ success: false, error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular progresso (nova lógica sem paginação)
    let progress: JobStatusResponse['job']['progress'] = undefined;

    if (job.status === 'running') {
      // Para jobs running, mostrar progresso baseado no tempo decorrido
      if (job.started_at) {
        const startTime = new Date(job.started_at).getTime();
        const currentTime = new Date().getTime();
        const elapsedTime = currentTime - startTime;
        const elapsedMinutes = Math.floor(elapsedTime / (1000 * 60));
        const elapsedSeconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);
        
        // Estimativa baseada em tempo médio (45-60s)
        const estimatedProgress = Math.min(85, (elapsedTime / 50000) * 100); // 50s como referência
        
        progress = {
          percentage: Math.round(estimatedProgress),
          message: `Processando grupos... (${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')} decorridos)`,
          estimatedTimeRemaining: estimatedProgress < 80 ? '1-2 min restantes' : 'Finalizando...'
        };
      } else {
        progress = {
          percentage: 10,
          message: 'Iniciando processamento...'
        };
      }
    } else if (job.status === 'pending') {
      progress = {
        percentage: 0,
        message: 'Aguardando na fila para processamento...'
      };
    } else if (job.status === 'completed') {
      progress = {
        percentage: 100,
        message: `Concluído! ${job.result_count} grupos processados`
      };
    } else if (job.status === 'failed') {
      progress = {
        percentage: 0,
        message: `Falha no processamento: ${job.last_error || 'Erro desconhecido'}`
      };
    }

    console.log(`📊 [job-status] Status: ${job.status}, Progress: ${progress?.percentage || 0}%`);

    const response: JobStatusResponse = {
      success: true,
      job: {
        id: job.id,
        status: job.status,
        instanceName: job.instance_name,
        searchTerm: job.search_term,
        resultCount: job.result_count,
        lastError: job.last_error,
        startedAt: job.started_at,
        finishedAt: job.finished_at,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        progress
      }
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
    console.error('❌ [job-status] Unexpected error:', error);

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