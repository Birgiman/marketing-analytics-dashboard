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

interface FetchGroupsRequest {
  instanceName: string;
  userId: string;
  searchTerm?: string;
}

interface GroupData {
  id: string;
  subject?: string;
  size?: number;
  owner?: string;
  creation?: number;
  participants?: any[];
}

// CONFIGURAÇÕES DE PAGINAÇÃO
const CHUNK_SIZE = 50; // Grupos por página (configurável)
const MAX_PAGES = 20; // Limite máximo de páginas para evitar loop infinito
const REQUEST_TIMEOUT = 45000; // 45 segundos por requisição (Edge Function timeout é 60s)
const RETRY_ATTEMPTS = 2; // Tentativas de retry por página

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

    const { instanceName, userId, searchTerm }: FetchGroupsRequest = await req.json();
    
    console.log('🚀 [fetch-groups-chunked] Iniciando busca paginada de grupos');
    console.log('📋 [fetch-groups-chunked] Parâmetros:', {
      instanceName,
      userId: userId.substring(0, 8) + '...', // Mascarar userId sensível
      searchTerm,
      chunkSize: CHUNK_SIZE
    });

    if (!instanceName || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'instanceName and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Evolution API credentials
    const { data: instanceData, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('api_token')
      .eq('instance_name', instanceName)
      .eq('user_id', userId)
      .single();

    if (instanceError || !instanceData?.api_token) {
      console.error('❌ [fetch-groups-chunked] Instance not found or no API token');
      return new Response(
        JSON.stringify({ success: false, error: 'Instance not found or no API token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = instanceData.api_token;
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://evolution-api-2-3-0-production-6d75.up.railway.app';
    const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');

    // Log mascarado para não vazar URLs sensíveis no frontend
    console.log('🔗 [fetch-groups-chunked] Evolution API configurada (URL mascarada)');
    
    // Array para consolidar todos os grupos
    const allGroups: GroupData[] = [];
    let currentPage = 1;
    let hasMorePages = true;
    let totalRequests = 0;
    let totalGroupsReceived = 0;

    console.log('🔄 [fetch-groups-chunked] Iniciando paginação (sem timeout)...');

    // Loop de paginação
    while (hasMorePages && currentPage <= MAX_PAGES) {
      console.log(`📄 [fetch-groups-chunked] Processando página ${currentPage}/${MAX_PAGES}`);
      
      const evolutionUrl = `${cleanApiUrl}/group/fetchAllGroups/${instanceName}?getParticipants=false&limit=${CHUNK_SIZE}&page=${currentPage}`;

      let pageGroups: GroupData[] = [];
      let pageSuccess = false;
      let lastError: Error | null = null;

      // Retry logic para cada página com timeout controlado
      for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
          console.log(`🔄 [fetch-groups-chunked] Tentativa ${attempt}/${RETRY_ATTEMPTS} para página ${currentPage} (timeout: ${REQUEST_TIMEOUT/1000}s)`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

          const response = await fetch(evolutionUrl, {
            method: 'GET',
            headers: {
              'apikey': apiKey,
              'User-Agent': 'Supabase-Edge-Function-Chunked',
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          totalRequests++;

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const groupsData = await response.json();
          
          if (!Array.isArray(groupsData)) {
            throw new Error('Invalid response format from Evolution API');
          }

          pageGroups = groupsData;
          pageSuccess = true;
          
          console.log(`✅ [fetch-groups-chunked] Página ${currentPage} processada com sucesso: ${pageGroups.length} grupos`);
          break;

        } catch (error) {
          lastError = error as Error;
          console.log(`❌ [fetch-groups-chunked] Tentativa ${attempt} falhou para página ${currentPage}: ${error instanceof Error ? error.message : 'Unknown error'}`);

          if (attempt < RETRY_ATTEMPTS) {
            console.log(`⏳ [fetch-groups-chunked] Aguardando 2s antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!pageSuccess) {
        console.error(`❌ [fetch-groups-chunked] Falha ao processar página ${currentPage} após ${RETRY_ATTEMPTS} tentativas`);
        throw lastError || new Error(`Failed to fetch page ${currentPage}`);
      }

      // Adicionar grupos da página atual ao array consolidado
      allGroups.push(...pageGroups);
      totalGroupsReceived += pageGroups.length;

      // Verificar se há mais páginas
      if (pageGroups.length < CHUNK_SIZE) {
        hasMorePages = false;
        console.log(`🏁 [fetch-groups-chunked] Última página detectada (${pageGroups.length} < ${CHUNK_SIZE})`);
      } else {
        currentPage++;
        console.log(`➡️ [fetch-groups-chunked] Continuando para próxima página...`);
      }
    }

    // Aplicar filtro de busca se fornecido
    let filteredGroups = allGroups;
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase().trim();
      filteredGroups = allGroups.filter(group => {
        const groupName = (group.subject || '').toLowerCase();
        return groupName.includes(searchLower);
      });
      console.log(`🔍 [fetch-groups-chunked] Filtro aplicado: ${filteredGroups.length}/${allGroups.length} grupos`);
    }

    // Filtrar grupos "fantasma" (sem participantes, sem nome)
    const validGroups = filteredGroups.filter(group => {
      const groupSize = group.size || 0;
      const groupName = group.subject || '';
      return groupSize > 0 && groupName.trim() !== '';
    });

    console.log(`🎯 [fetch-groups-chunked] Processamento concluído:`);
    console.log(`   • Total de requisições: ${totalRequests}`);
    console.log(`   • Total de grupos recebidos: ${totalGroupsReceived}`);
    console.log(`   • Grupos após filtro: ${filteredGroups.length}`);
    console.log(`   • Grupos válidos: ${validGroups.length}`);

    // Salvar grupos na tabela whatsapp_groups
    if (validGroups.length > 0) {
      console.log(`💾 [fetch-groups-chunked] Salvando ${validGroups.length} grupos na tabela whatsapp_groups`);
      
      try {
        // Preparar dados para inserção
        const groupsToInsert = validGroups.map(group => ({
          group_id: group.id,
          group_name: group.subject || '',
          user_id: userId,
          group_size: group.size || 0,
          group_owner: group.owner || '',
          group_created_at: group.creation ? new Date(group.creation * 1000).toISOString() : null,
          participants_count: group.participants?.length || 0,
          monitor: false, // Padrão: não monitorar
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        // Upsert (inserir ou atualizar) grupos na tabela
        const { error: upsertError } = await supabase
          .from('whatsapp_groups')
          .upsert(groupsToInsert, {
            onConflict: 'group_id,user_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('❌ [fetch-groups-chunked] Erro ao salvar grupos no banco');
        } else {
          console.log(`✅ [fetch-groups-chunked] ${validGroups.length} grupos salvos com sucesso`);
        }
      } catch (error) {
        console.error('❌ [fetch-groups-chunked] Erro ao processar grupos para salvar');
      }
    }

    // Retornar no mesmo formato da Evolution API
    return new Response(
      JSON.stringify(validGroups),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ [fetch-groups-chunked] Erro na função');

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno na sincronização de grupos',
        errorType: 'FunctionError',
        timestamp: new Date().toISOString()
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
