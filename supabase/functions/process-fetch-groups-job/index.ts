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

interface ProcessJobResponse {
  success: boolean;
  processedJobs: number;
  message?: string;
  error?: string;
}

// Configurações
const REQUEST_TIMEOUT = 60000; // 60 segundos por requisição
const RETRY_ATTEMPTS = 2; // 2 tentativas

serve(async (req: any) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    console.log('🚀 [process-fetch-groups-job] === INÍCIO DA FUNÇÃO ===');
    console.log('📝 [process-fetch-groups-job] Method:', req.method);
    console.log('📝 [process-fetch-groups-job] URL:', req.url);
    console.log(`⏰ [process-fetch-groups-job] Iniciado em: ${new Date().toISOString()}`);

    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('✅ [process-fetch-groups-job] Cliente Supabase criado com sucesso');

    // Parse do body (se existir)
    let requestData: ProcessJobRequest = {};
    try {
      if (req.method === 'POST') {
        const contentLength = req.headers.get('content-length');
        console.log('📝 [process-fetch-groups-job] Content-Length:', contentLength);

        if (contentLength && parseInt(contentLength) > 0) {
          const bodyText = await req.text();
          console.log('📝 [process-fetch-groups-job] Body recebido:', bodyText);

          if (bodyText.trim()) {
            requestData = JSON.parse(bodyText);
            console.log('📝 [process-fetch-groups-job] Dados parseados:', requestData);
          }
        }
      }
    } catch (parseError) {
      console.error('❌ [process-fetch-groups-job] Erro ao parsear body:', parseError);
      // Continuar mesmo com erro de parse
    }

    console.log('🔄 [process-fetch-groups-job] Iniciando processamento de jobs');

    let jobs;
    let jobsError;

    if (requestData.jobId) {
      // Buscar job específico
      console.log(`🎯 [process-fetch-groups-job] Buscando job específico: ${requestData.jobId}`);
      const result = await supabase
        .from('whatsapp_group_fetch_jobs')
        .select('*')
        .eq('id', requestData.jobId)
        .single();

      jobs = result.data ? [result.data] : [];
      jobsError = result.error;
    } else {
      // Buscar jobs pendentes ou que estão rodando há muito tempo (> 5 min sem update)
      console.log('🔍 [process-fetch-groups-job] Buscando jobs pendentes automaticamente');
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const result = await supabase
        .from('whatsapp_group_fetch_jobs')
        .select('*')
        .or(`status.eq.pending,and(status.eq.running,updated_at.lt.${fiveMinutesAgo})`)
        .order('created_at', { ascending: true })
        .limit(5); // Processar até 5 jobs por execução

      jobs = result.data;
      jobsError = result.error;
    }

    if (jobsError) {
      console.error('❌ [process-fetch-groups-job] Error fetching jobs:', jobsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error fetching jobs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jobs || jobs.length === 0) {
      console.log('📭 [process-fetch-groups-job] Nenhum job pendente encontrado');
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

    console.log(`🎯 [process-fetch-groups-job] Encontrados ${jobs.length} jobs para processar`);

    let processedJobs = 0;

    for (const job of jobs) {
      try {
        const jobStartTime = Date.now();
        console.log(`🚀 [process-fetch-groups-job] Processando job ${job.id} (status: ${job.status})`);

        // Marcar job como running se ainda estiver pending
        if (job.status === 'pending') {
          console.log(`📝 [process-fetch-groups-job] Marcando job ${job.id} como 'running'`);
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
        console.log(`🔍 [process-fetch-groups-job] Buscando instância: ${job.instance_name} para user: ${job.user_id}`);
        const { data: instanceData, error: instanceError } = await supabase
          .from('whatsapp_instances')
          .select('api_token')
          .eq('instance_name', job.instance_name)
          .eq('user_id', job.user_id)
          .single();

        if (instanceError || !instanceData?.api_token) {
          console.error(`❌ [process-fetch-groups-job] Instance not found for job ${job.id}:`, instanceError);
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
        console.log(`✅ [process-fetch-groups-job] API Token encontrado para instância ${job.instance_name}`);

        // @ts-ignore
        const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://evolution-api-2-3-0-production-6d75.up.railway.app';
        const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');

        // A Evolution API retorna todos os grupos de uma vez, não respeita paginação
        console.log(`📊 [process-fetch-groups-job] Buscando todos os grupos para job ${job.id}`);

        const evolutionUrl = `${cleanApiUrl}/group/fetchAllGroups/${job.instance_name}?getParticipants=false`;
        console.log(`🔗 [process-fetch-groups-job] URL da Evolution API: ${evolutionUrl.replace(apiKey, '***')}`);

        let allGroups: GroupData[] = [];
        let requestSuccess = false;
        let lastError: Error | null = null;

        // Retry logic para buscar grupos
        for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
          try {
            console.log(`🔄 [process-fetch-groups-job] Tentativa ${attempt}/${RETRY_ATTEMPTS} para buscar grupos`);

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
            console.log(`✅ [process-fetch-groups-job] Grupos carregados: ${allGroups.length} grupos (${requestTime}ms)`);
            break;

          } catch (error) {
            lastError = error as Error;
            console.log(`❌ [process-fetch-groups-job] Tentativa ${attempt} falhou: ${error instanceof Error ? error.message : 'Unknown error'}`);

            if (attempt < RETRY_ATTEMPTS) {
              const backoffDelay = 2000 * Math.pow(2, attempt - 1); // 2s, 4s
              console.log(`⏳ [process-fetch-groups-job] Aguardando ${backoffDelay}ms antes da próxima tentativa...`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
          }
        }

        if (!requestSuccess) {
          console.error(`❌ [process-fetch-groups-job] Falha ao buscar grupos após ${RETRY_ATTEMPTS} tentativas`);
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
          console.log(`🔍 [process-fetch-groups-job] Filtro '${job.search_term}': ${filteredGroups.length}/${validGroups.length} grupos`);
        }

        let totalGroupsFound = 0;
        const allSavedGroupIds: string[] = [];

        // Verificar quais grupos já existem no banco (em chunks para evitar URLs muito longas)
        if (filteredGroups.length > 0) {
          console.log(`🔍 [process-fetch-groups-job] Verificando duplicatas para ${filteredGroups.length} grupos`);

          const CHUNK_SIZE = 100; // Processar em grupos de 100 para evitar URL muito longa
          const existingGroupIds = new Set<string>();
          const checkErrors: any[] = [];

          // Verificar em chunks
          for (let i = 0; i < filteredGroups.length; i += CHUNK_SIZE) {
            const chunk = filteredGroups.slice(i, i + CHUNK_SIZE);
            const groupIds = chunk.map(g => g.id);
            
            console.log(`🔍 [process-fetch-groups-job] Verificando chunk ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(filteredGroups.length/CHUNK_SIZE)} (${groupIds.length} grupos)`);

            try {
              const { data: existingGroups, error: checkError } = await supabase
                .from('whatsapp_groups')
                .select('group_id')
                .eq('user_id', job.user_id)
                .in('group_id', groupIds);

              if (checkError) {
                console.error(`❌ [process-fetch-groups-job] Erro ao verificar chunk ${Math.floor(i/CHUNK_SIZE) + 1}:`, checkError);
                checkErrors.push(checkError);
              } else if (existingGroups) {
                existingGroups.forEach(g => existingGroupIds.add(g.group_id));
              }
            } catch (error) {
              console.error(`❌ [process-fetch-groups-job] Erro crítico no chunk ${Math.floor(i/CHUNK_SIZE) + 1}:`, error);
              checkErrors.push(error);
            }
          }

          if (checkErrors.length > 0) {
            console.log(`⚠️ [process-fetch-groups-job] ${checkErrors.length} erros durante verificação, mas continuando...`);
          }

          const newGroups = filteredGroups.filter(group => !existingGroupIds.has(group.id));

          console.log(`📊 [process-fetch-groups-job] Grupos: ${filteredGroups.length} total, ${existingGroupIds.size} já existem, ${newGroups.length} novos`);

          // Salvar apenas grupos novos (também em chunks)
          if (newGroups.length > 0) {
            console.log(`💾 [process-fetch-groups-job] Salvando ${newGroups.length} grupos novos em chunks`);

            for (let i = 0; i < newGroups.length; i += CHUNK_SIZE) {
              const chunk = newGroups.slice(i, i + CHUNK_SIZE);
              
              console.log(`💾 [process-fetch-groups-job] Salvando chunk ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(newGroups.length/CHUNK_SIZE)} (${chunk.length} grupos)`);

              const groupsToInsert = chunk.map(group => ({
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
                const { error: insertError } = await supabase
                  .from('whatsapp_groups')
                  .insert(groupsToInsert);

                if (insertError) {
                  console.error(`❌ [process-fetch-groups-job] Erro ao salvar chunk ${Math.floor(i/CHUNK_SIZE) + 1}:`, insertError);
                } else {
                  totalGroupsFound += chunk.length;
                  const savedIds = chunk.map(g => g.id);
                  allSavedGroupIds.push(...savedIds);
                  console.log(`✅ [process-fetch-groups-job] Chunk ${Math.floor(i/CHUNK_SIZE) + 1} salvo: ${chunk.length} grupos`);
                }
              } catch (error) {
                console.error(`❌ [process-fetch-groups-job] Erro crítico ao salvar chunk ${Math.floor(i/CHUNK_SIZE) + 1}:`, error);
              }
            }

            console.log(`✅ [process-fetch-groups-job] Total salvo: ${totalGroupsFound} grupos novos`);
            if (allSavedGroupIds.length > 0) {
              console.log(`🆔 [process-fetch-groups-job] Primeiros IDs salvos:`, allSavedGroupIds.slice(0, 5).join(', '), allSavedGroupIds.length > 5 ? `... (+${allSavedGroupIds.length - 5} mais)` : '');
            }
          } else {
            console.log(`ℹ️ [process-fetch-groups-job] Nenhum grupo novo para salvar`);
          }
        }

        // Como a Evolution API retorna todos os grupos de uma vez, marcamos como completo
        const jobEndTime = Date.now();
        const jobDuration = jobEndTime - jobStartTime;

        // Marcar job como completado
        await supabase
          .from('whatsapp_group_fetch_jobs')
          .update({
            status: 'completed',
            current_page: 1,
            total_pages: 1,
            result_count: totalGroupsFound,
            finished_at: new Date().toISOString()
          })
          .eq('id', job.id);

        console.log(`🎉 [process-fetch-groups-job] Job ${job.id} concluído!`);
        console.log(`📊 [process-fetch-groups-job] Estatísticas do job:`);
        console.log(`   • Total de grupos processados: ${allGroups.length}`);
        console.log(`   • Grupos após filtros: ${filteredGroups.length}`);
        console.log(`   • Total de grupos novos salvos: ${totalGroupsFound}`);
        console.log(`   • Tempo de processamento: ${jobDuration}ms (${(jobDuration / 1000).toFixed(2)}s)`);
        if (allSavedGroupIds.length > 0) {
          console.log(`🆔 [process-fetch-groups-job] IDs salvos:`, allSavedGroupIds.join(', '));
        }

        processedJobs++;

      } catch (jobError) {
        console.error(`❌ [process-fetch-groups-job] Erro ao processar job ${job.id}:`, jobError);

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

    const response: ProcessJobResponse = {
      success: true,
      processedJobs,
      message: `Processados ${processedJobs} jobs`
    };

    console.log(`✅ [process-fetch-groups-job] === FIM DA FUNÇÃO ===`);
    console.log(`📊 [process-fetch-groups-job] Resumo da execução:`);
    console.log(`   • Jobs processados: ${processedJobs}`);
    console.log(`   • Tempo total: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`⏰ [process-fetch-groups-job] Finalizado em: ${new Date().toISOString()}`);

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
    console.error('❌ [process-fetch-groups-job] Unexpected error:', error);

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