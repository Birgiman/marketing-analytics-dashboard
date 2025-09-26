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

interface GroupData {
  id: string;
  subject?: string;
  size?: number;
  owner?: string;
  creation?: number;
  participants?: any[];
}

interface ProcessJobRequest {
  jobId?: string; // Opcional: processar job específico
}

// Função para validar UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

interface ProcessJobResponse {
  success: boolean;
  processedJobs: number;
  message?: string;
  error?: string;
}

// Configurações
const REQUEST_TIMEOUT = 55000; // 55 segundos por requisição
const RETRY_ATTEMPTS = 2; // 2 tentativas
const CHUNK_SIZE = 50; // Processar em chunks de 50

serve(async (req: any) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const summary = {
    bodyReceived: null,
    jobsFound: [],
    groupsLoaded: { count: 0, timeMs: 0 },
    totalProcessed: 0,
    errors: [],
    status: 'success'
  };

  try {
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse e validação do body (se existir)
    const requestData: ProcessJobRequest = {};
    try {
      if (req.method === 'POST') {
        const contentLength = req.headers.get('content-length');

        if (contentLength && parseInt(contentLength) > 0) {
          const bodyText = await req.text();
          summary.bodyReceived = bodyText;

          if (bodyText.trim()) {
            const parsedData = JSON.parse(bodyText);

            // Validação rigorosa do body
            if (Object.keys(parsedData).length > 0) {
              // Se tem conteúdo, deve ter APENAS o campo jobId válido
              const allowedKeys = ['jobId'];
              const receivedKeys = Object.keys(parsedData);
              const invalidKeys = receivedKeys.filter(key => !allowedKeys.includes(key));

              if (invalidKeys.length > 0) {
                summary.status = 'error';
                summary.errors.push(`Campos inválidos: ${invalidKeys.join(', ')}`);
                return new Response(
                  JSON.stringify({ 
                    success: false, 
                    error: `Campos inválidos: ${invalidKeys.join(', ')}` 
                  }),
                  { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              // Validar jobId se fornecido
              if (parsedData.jobId !== undefined) {
                if (typeof parsedData.jobId !== 'string') {
                  summary.status = 'error';
                  summary.errors.push('jobId deve ser string');
                  return new Response(
                    JSON.stringify({ 
                      success: false, 
                      error: 'jobId deve ser uma string válida' 
                    }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }

                if (parsedData.jobId.trim() === '') {
                  summary.status = 'error';
                  summary.errors.push('jobId vazio');
                  return new Response(
                    JSON.stringify({ 
                      success: false, 
                      error: 'jobId deve ser um UUID válido.' 
                    }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }

                if (!isValidUUID(parsedData.jobId)) {
                  summary.status = 'error';
                  summary.errors.push(`UUID inválido: ${parsedData.jobId}`);
                  return new Response(
                    JSON.stringify({ 
                      success: false, 
                      error: 'jobId deve ser um UUID válido.' 
                    }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }

                requestData.jobId = parsedData.jobId.trim();
              }
            }
          }
        }
      }
    } catch (parseError) {
      summary.status = 'error';
      summary.errors.push(`JSON inválido: ${parseError}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'JSON inválido. Verifique a documentação da API.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let jobs;
    let jobsError;

    if (requestData.jobId) {
      // Buscar job específico
      const result = await supabase
        .from('whatsapp_group_fetch_jobs')
        .select('*')
        .eq('id', requestData.jobId)
        .single();

      jobs = result.data ? [result.data] : [];
      jobsError = result.error;
    } else {
      // Buscar jobs pendentes, failed ou que estão rodando há muito tempo (> 5 min sem update)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const result = await supabase
        .from('whatsapp_group_fetch_jobs')
        .select('*')
        .or(`status.eq.pending,status.eq.failed,and(status.eq.running,updated_at.lt.${fiveMinutesAgo})`)
        .order('created_at', { ascending: true })
        .limit(5); // Processar até 5 jobs por execução

      jobs = result.data;
      jobsError = result.error;
    }

    if (jobsError) {
      summary.status = 'error';
      summary.errors.push(`Erro ao buscar jobs: ${jobsError.message}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Error fetching jobs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jobs || jobs.length === 0) {
      summary.jobsFound = [];
      return new Response(
        JSON.stringify({
          success: true,
          processedJobs: 0,
          message: 'No jobs to process'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    summary.jobsFound = jobs.map(job => job.id);

    let processedJobs = 0;

    for (const job of jobs) {
      try {
        const jobStartTime = Date.now();

        // Validar se job pode ser executado
        if (job.status === 'completed') {
          processedJobs++; // Contar como processado para dar feedback ao usuário
          continue;
        }
        
        if (job.status === 'failed') {
          // Reprocessar job que falhou
        }

        // Marcar job como running se ainda estiver pending ou failed
        if (job.status === 'pending' || job.status === 'failed') {
          await supabase
            .from('whatsapp_group_fetch_jobs')
            .update({
              status: 'running',
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
        }

        // Buscar dados da instância
        const { data: instanceData, error: instanceError } = await supabase
          .from('whatsapp_instances')
          .select('api_token')
          .eq('instance_name', job.instance_name)
          .eq('user_id', job.user_id)
          .single();

        if (instanceError || !instanceData?.api_token) {
          await supabase
            .from('whatsapp_group_fetch_jobs')
            .update({
              status: 'failed',
              last_error: 'Instance not found or no API token',
              finished_at: new Date().toISOString()
            })
            .eq('id', job.id);
          continue;
        }

        const apiKey = instanceData.api_token;

        // @ts-ignore
        const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://evolution-api-2-3-0-production-6d75.up.railway.app';
        const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');

        // A Evolution API retorna todos os grupos de uma vez, não respeita paginação
        const evolutionUrl = `${cleanApiUrl}/group/fetchAllGroups/${job.instance_name}?getParticipants=false`;

        let allGroups: GroupData[] = [];
        let requestSuccess = false;
        let lastError: Error | null = null;

        // Retry logic para buscar grupos
        for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
          try {
            // Delay pequeno antes da primeira tentativa para evitar problemas de timing
            if (attempt === 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const requestStartTime = Date.now();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            const response = await fetch(evolutionUrl, {
              method: 'GET',
              headers: {
                'apikey': apiKey,
                'User-Agent': 'Supabase-Edge-Function-Worker',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const groupsData = await response.json();

            if (!Array.isArray(groupsData)) {
              throw new Error('Invalid response format from Evolution API');
            }

            allGroups = groupsData;
            requestSuccess = true;

            const requestTime = Date.now() - requestStartTime;
            summary.groupsLoaded = { count: allGroups.length, timeMs: requestTime };
            break;

          } catch (error) {
            lastError = error as Error;

            if (attempt < RETRY_ATTEMPTS) {
              const backoffDelay = 2000 * Math.pow(2, attempt - 1); // 2s, 4s
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
          }
        }

        if (!requestSuccess) {
          await supabase
            .from('whatsapp_group_fetch_jobs')
            .update({
              status: 'failed',
              last_error: lastError?.message || 'Failed to fetch groups from Evolution API',
              finished_at: new Date().toISOString()
            })
            .eq('id', job.id);
          continue;
        }

        // Filtrar grupos válidos
        const validGroups = allGroups.filter(group => {
          const groupSize = group.size || 0;
          const groupName = group.subject || '';
          return groupSize > 0 && groupName.trim() !== '';
        });

        // Aplicar filtro de busca se fornecido
        let filteredGroups = validGroups;
        if (job.search_term && job.search_term.trim() !== '') {
          const searchLower = job.search_term.toLowerCase().trim();
          filteredGroups = validGroups.filter(group => {
            const groupName = (group.subject || '').toLowerCase();
            return groupName.includes(searchLower);
          });
        }

        let totalGroupsFound = 0;

        // Fazer UPSERT de todos os grupos (não precisa verificar duplicatas)
        if (filteredGroups.length > 0) {
          // Processar todos os grupos em chunks
          for (let i = 0; i < filteredGroups.length; i += CHUNK_SIZE) {
            const chunk = filteredGroups.slice(i, i + CHUNK_SIZE);

            const groupsToUpsert = chunk.map(group => ({
              group_id: group.id,
              group_name: group.subject || '',
              user_id: job.user_id,
              group_size: group.size || 0,
              group_owner: group.owner || '',
              group_created_at: group.creation ? new Date(group.creation * 1000).toISOString() : null,
              participant_count: group.participants?.length || 0,
              monitoring: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));

            try {
              const { error: upsertError } = await supabase
                .from('whatsapp_groups')
                .upsert(groupsToUpsert, { 
                  onConflict: 'group_id,user_id',
                  ignoreDuplicates: false 
                });

              if (upsertError) {
                summary.errors.push(`Erro upsert chunk ${Math.floor(i/CHUNK_SIZE) + 1}: ${upsertError.message}`);
              } else {
                totalGroupsFound += chunk.length;
              }
            } catch (error) {
              summary.errors.push(`Erro crítico upsert chunk ${Math.floor(i/CHUNK_SIZE) + 1}: ${error}`);
            }
          }
        }

        summary.totalProcessed += totalGroupsFound;

        // Como a Evolution API retorna todos os grupos de uma vez, marcamos como completo
        const jobEndTime = Date.now();
        const jobDuration = jobEndTime - jobStartTime;

        // Marcar job como completado
        await supabase
          .from('whatsapp_group_fetch_jobs')
          .update({
            status: 'completed',
            result_count: totalGroupsFound,
            finished_at: new Date().toISOString()
          })
          .eq('id', job.id);

        processedJobs++;

      } catch (jobError) {
        summary.errors.push(`Erro job ${job.id}: ${jobError instanceof Error ? jobError.message : 'Unknown error'}`);

        await supabase
          .from('whatsapp_group_fetch_jobs')
          .update({
            status: 'failed',
            last_error: jobError instanceof Error ? jobError.message : 'Unknown error',
            finished_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Criar mensagem mais descritiva
    let message = '';
    if (processedJobs === 0) {
      message = 'Nenhum job encontrado para processar';
    } else if (processedJobs === 1) {
      // Verificar se o job específico já estava completed
      if (requestData.jobId && jobs && jobs.length > 0 && jobs[0].status === 'completed') {
        message = 'Job já foi processado anteriormente com sucesso';
      } else {
        message = 'Job processado com sucesso';
      }
    } else {
      message = `Processados ${processedJobs} jobs com sucesso`;
    }

    const response: ProcessJobResponse = {
      success: true,
      processedJobs,
      message
    };

    // LOG ÚNICO RESUMIDO
    console.log(`📊 [process-fetch-groups-job] RESUMO: Body: ${summary.bodyReceived || '{}'} | Jobs: [${summary.jobsFound.join(', ')}] | Grupos: ${summary.groupsLoaded.count} (${summary.groupsLoaded.timeMs}ms) | Processados: ${summary.totalProcessed} | Tempo: ${totalDuration}ms (${(totalDuration/1000).toFixed(2)}s) | Status: ${summary.status}${summary.errors.length > 0 ? ` | Erros: ${summary.errors.join('; ')}` : ''}`);

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
    summary.status = 'error';
    summary.errors.push(`Erro crítico: ${error instanceof Error ? error.message : 'Unknown error'}`);

    // LOG ÚNICO DE ERRO
    console.log(`❌ [process-fetch-groups-job] ERRO: ${summary.errors.join('; ')}`);

    return new Response(
      JSON.stringify({
        success: false,
        processedJobs: 0,
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