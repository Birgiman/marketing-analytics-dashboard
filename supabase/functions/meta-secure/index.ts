// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ========================================================================================
// UTILITÁRIO DE CRIPTOGRAFIA - APENAS PARA USO INTERNO DA EDGE FUNCTION
// ========================================================================================

/**
 * Utilitário de criptografia AES-256-GCM para tokens sensíveis
 * SEGURANÇA: Este código roda apenas no ambiente seguro da Edge Function
 */
class TokenCrypto {
  private static cryptoKey: CryptoKey | null = null;

  private static async getCryptoKey(): Promise<CryptoKey> {
    if (this.cryptoKey) {
      return this.cryptoKey;
    }

    const secretKey = Deno.env.get('AES_SECRET_KEY');

    if (!secretKey) {
      throw new Error('Chave de criptografia não encontrada no environment');
    }

    const keyData = new TextEncoder().encode(secretKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);

    this.cryptoKey = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );

    return this.cryptoKey;
  }

  static async encryptToken(plaintext: string): Promise<string> {
    try {
      const key = await this.getCryptoKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = new TextEncoder().encode(plaintext);

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv, tagLength: 128 },
        key,
        data
      );

      const encryptedArray = new Uint8Array(encrypted);
      const encryptedData = encryptedArray.slice(0, -16);
      const tag = encryptedArray.slice(-16);

      return JSON.stringify({
        encrypted: btoa(String.fromCharCode(...encryptedData)),
        iv: btoa(String.fromCharCode(...iv)),
        tag: btoa(String.fromCharCode(...tag))
      });
    } catch (error) {
      throw new Error(`Falha na criptografia: ${error.message}`);
    }
  }

  static async decryptToken(encryptedString: string): Promise<string> {
    try {
      const key = await this.getCryptoKey();
      const { encrypted, iv, tag } = JSON.parse(encryptedString);

      const ivArray = new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0)));
      const encryptedArray = new Uint8Array(atob(encrypted).split('').map(c => c.charCodeAt(0)));
      const tagArray = new Uint8Array(atob(tag).split('').map(c => c.charCodeAt(0)));

      const combinedData = new Uint8Array(encryptedArray.length + tagArray.length);
      combinedData.set(encryptedArray, 0);
      combinedData.set(tagArray, encryptedArray.length);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivArray, tagLength: 128 },
        key,
        combinedData
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error(`Falha na descriptografia: ${error.message}`);
    }
  }

  static isEncrypted(value: string): boolean {
    try {
      const parsed = JSON.parse(value);
      return !!(parsed.encrypted && parsed.iv && parsed.tag);
    } catch {
      return false;
    }
  }
}

// ========================================================================================
// EDGE FUNCTION PRINCIPAL
// ========================================================================================

interface MetaTokenValidation {
  isValid: boolean;
  accountCount: number;
  error?: string;
}

const BASE_URL = 'https://graph.facebook.com/v23.0';

/**
 * Monitora headers de rate limit do Meta API
 */
function logRateLimitHeaders(response: Response, endpoint: string): void {
  const appUsage = response.headers.get('X-App-Usage');
  const bucUsage = response.headers.get('X-Business-Use-Case-Usage');

  if (appUsage) {
    try {
      const usage = JSON.parse(appUsage);
      console.log(`📊 [Rate Limit] ${endpoint} - App Usage:`, {
        call_count: usage.call_count || 0,
        total_time: usage.total_time || 0,
        total_cputime: usage.total_cputime || 0
      });

      // Avisar se próximo do limite (>80%)
      if (usage.call_count > 80 || usage.total_time > 80 || usage.total_cputime > 80) {
        console.warn('⚠️ [Rate Limit] Próximo do limite! Considere reduzir chamadas');
      }
    } catch (e) {
      console.log(`📊 [Rate Limit] ${endpoint} - App Usage (raw):`, appUsage);
    }
  }

  if (bucUsage) {
    try {
      const usage = JSON.parse(bucUsage);
      console.log(`📊 [Rate Limit] ${endpoint} - Business Use Case:`, usage);
    } catch (e) {
      console.log(`📊 [Rate Limit] ${endpoint} - BUC Usage (raw):`, bucUsage);
    }
  }
}

/**
 * Valida um token de acesso do Meta/Facebook
 */
async function validateMetaToken(accessToken: string): Promise<MetaTokenValidation> {
  try {
    // 1. Verificar se é um User Token válido
    const userResponse = await fetch(`${BASE_URL}/me?access_token=${accessToken}`, {
      signal: AbortSignal.timeout(15000)
    });

    // Log headers de rate limit
    logRateLimitHeaders(userResponse, '/me');

    if (!userResponse.ok) {
      return {
        isValid: false,
        accountCount: 0,
        error: 'Token inválido ou expirado'
      };
    }

    // 2. Tentar acessar ad accounts - se falhar por rate limit, token ainda é válido
    const adAccountsResponse = await fetch(
      `${BASE_URL}/me/adaccounts?fields=id,name&limit=1&access_token=${accessToken}`,
      { signal: AbortSignal.timeout(15000) }
    );

    // Log headers de rate limit
    logRateLimitHeaders(adAccountsResponse, '/me/adaccounts');

    if (!adAccountsResponse.ok) {
      const error = await adAccountsResponse.json();

      // Se for rate limit (80004), token ainda é válido
      if (error.error?.code === 80004) {
        console.warn('⚠️ [Rate Limit] Rate limit atingido para /me/adaccounts, mas token é válido');
        return {
          isValid: true,
          accountCount: 0,
          error: 'Rate limit temporário - token válido'
        };
      }

      return {
        isValid: false,
        accountCount: 0,
        error: error.error?.message || 'Não foi possível acessar contas de anúncios'
      };
    }

    // 3. Se chegou aqui, conseguiu acessar - contar contas na mesma resposta
    const accountsData = await adAccountsResponse.json();
    const accountCount = accountsData.data?.length || 0;

    return {
      isValid: true,
      accountCount
    };

  } catch (error) {
    return {
      isValid: false,
      accountCount: 0,
      error: 'Erro na validação do token'
    };
  }
}

/**
 * ✅ CORREÇÃO: Sincroniza contas de anúncios em JSONB
 * Busca todas as contas do Meta e salva em ad_accounts (JSONB)
 */
async function syncAdAccounts(supabaseClient: any, userId: string, accessToken: string): Promise<number> {
  try {
    const response = await fetch(
      `${BASE_URL}/me/adaccounts?fields=id,name,currency,timezone_name,account_status&access_token=${accessToken}`,
      { signal: AbortSignal.timeout(15000) }
    );

    // Log headers de rate limit
    logRateLimitHeaders(response, '/me/adaccounts (sync)');

    if (!response.ok) {
      const errorData = await response.json();

      // Se for rate limit, não sincronizar mas não falhar
      if (errorData.error?.code === 80004) {
        console.warn('⚠️ [Rate Limit] Rate limit atingido para sync de ad accounts - pulando sincronização');
        return 0;
      }

      console.warn(`❌ [Sync] Erro ao acessar ad accounts: ${errorData.error?.message || 'Unknown error'}`);
      return 0;
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return 0;
    }

    // ✅ NOVA ESTRUTURA: Preparar dados JSONB
    const adAccountsData = {
      accounts: data.data.map((account: any) => ({
        ad_account_id: account.id,
        account_name: account.name,
        currency: account.currency,
        timezone_name: account.timezone_name,
        account_status: account.account_status,
        is_active: account.account_status === 1 // 1 = ativo, 101 = desabilitado
      })),
      total_count: data.data.length,
      active_count: data.data.filter((a: any) => a.account_status === 1).length,
      last_synced_at: new Date().toISOString()
    };

    // ✅ ATUALIZAR meta_integrations com JSONB
    const { error: updateError } = await supabaseClient
      .from('meta_integrations')
      .update({
        ad_accounts: adAccountsData,
        account_count: adAccountsData.total_count, // ✅ USAR total_count do JSONB
        last_validated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (updateError) {
      console.error('❌ [Sync] Erro ao atualizar ad_accounts:', updateError);
      return 0;
    }

    console.log(`✅ [Sync] ${adAccountsData.total_count} contas sincronizadas com sucesso`);
    return adAccountsData.total_count;

  } catch (error) {
    console.warn('Erro ao sincronizar ad accounts:', error.message);
    return 0;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, accessToken, userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID é obrigatório', status: 'error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'connect': {
        if (!accessToken) {
          return new Response(
            JSON.stringify({ error: 'Access token é obrigatório', status: 'error' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validar token
        const validation = await validateMetaToken(accessToken);

        if (!validation.isValid) {
          return new Response(
            JSON.stringify({
              error: validation.error || 'Token inválido',
              status: 'error'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Criptografar token antes de salvar
        const encryptedToken = await TokenCrypto.encryptToken(accessToken);
        console.log('🔐 [Security] Token Meta criptografado com sucesso');

        // Preparar dados da integração
        const integrationData = {
          access_token: encryptedToken, // Token criptografado
          is_active: true,
          account_count: 0, // ✅ Inicializar com 0, será atualizado pelo syncAdAccounts
          ad_accounts: { accounts: [], total_count: 0, active_count: 0, last_synced_at: new Date().toISOString() },
          connected_at: new Date().toISOString(),
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Desativar todas as integrações existentes do usuário
        await supabaseClient
          .from('meta_integrations')
          .update({ is_active: false })
          .eq('user_id', userId);

        // Verificar se já existe uma integração para este usuário
        const { data: existingIntegration } = await supabaseClient
          .from('meta_integrations')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let result;
        if (existingIntegration) {
          // Atualizar integração existente
          const { data, error } = await supabaseClient
            .from('meta_integrations')
            .update(integrationData)
            .eq('id', existingIntegration.id)
            .select()
            .single();

          if (error) throw error;
          result = data;
        } else {
          // Criar nova integração
          const { data, error } = await supabaseClient
            .from('meta_integrations')
            .insert({
              user_id: userId,
              ...integrationData
            })
            .select()
            .single();

          if (error) throw error;
          result = data;
        }

        // ✅ SINCRONIZAR CONTAS E OBTER CONTAGEM CORRETA
        const accountCount = await syncAdAccounts(supabaseClient, userId, accessToken);

        // SEGURANÇA: Resposta SEM token - apenas status
        return new Response(
          JSON.stringify({
            success: true,
            status: 'connected',
            account_count: accountCount // ✅ USAR VALOR DO JSONB
            // NÃO retornar token ou user_info para o frontend
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disconnect': {
        // Desativar TODAS as integrações do usuário
        await supabaseClient
          .from('meta_integrations')
          .update({ is_active: false })
          .eq('user_id', userId);

        return new Response(
          JSON.stringify({
            success: true,
            status: 'disconnected'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'status': {
        // Buscar integração ativa do usuário
        const { data: integration, error } = await supabaseClient
          .from('meta_integrations')
          .select('access_token, account_count, ad_accounts, connected_at, last_validated_at')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();

        if (error || !integration) {
          return new Response(
            JSON.stringify({
              status: 'disconnected',
              connected: false
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Descriptografar token para validação
        let accessToken: string;
        try {
          if (TokenCrypto.isEncrypted(integration.access_token)) {
            accessToken = await TokenCrypto.decryptToken(integration.access_token);
          } else {
            // Token ainda em plaintext (durante migração)
            accessToken = integration.access_token;
            console.warn('⚠️ [Security] Token Meta em plaintext detectado');
          }
        } catch (error) {
          // Token corrompido - marcar como desconectado
          await supabaseClient
            .from('meta_integrations')
            .update({ is_active: false })
            .eq('user_id', userId);

          return new Response(
            JSON.stringify({
              status: 'disconnected',
              connected: false,
              error: 'Token corrompido'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validar token atual
        const validation = await validateMetaToken(accessToken);

        if (!validation.isValid) {
          // Verificar se o erro é rate limit
          if (validation.error?.includes('Rate limit temporário')) {
            // Token válido mas com rate limit - manter como ativo
            return new Response(
              JSON.stringify({
                status: 'connected',
                connected: true,
                message: 'Meta conectado (rate limit temporário em /me/adaccounts)',
                warning: validation.error
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          // Token inválido - desativar integração
          await supabaseClient
            .from('meta_integrations')
            .update({ is_active: false })
            .eq('user_id', userId);

          return new Response(
            JSON.stringify({
              status: 'disconnected',
              connected: false,
              error: validation.error
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // ✅ CORREÇÃO: Contar contas no JSONB
        let accountCount = 0;
        
        if (integration.ad_accounts && integration.ad_accounts.accounts) {
          accountCount = integration.ad_accounts.accounts.length;
          console.log(`📊 [Status] Contando contas no JSONB: ${accountCount} contas`);
        } else {
          console.log(`⚠️ [Status] JSONB vazio, usando account_count: ${integration.account_count}`);
          accountCount = integration.account_count || 0;
        }

        // Atualizar timestamp de validação
        await supabaseClient
          .from('meta_integrations')
          .update({
            last_validated_at: new Date().toISOString(),
            account_count: accountCount
          })
          .eq('user_id', userId)
          .eq('is_active', true);

        // SEGURANÇA: Resposta SEM token - apenas status
        const response = {
          status: 'connected',
          connected: true,
          account_count: accountCount, // ✅ USAR VALOR DO JSONB
          connected_at: integration.connected_at,
          last_validated_at: new Date().toISOString(),
          message: 'Meta conectado com sucesso!'
          // NÃO retornar token ou user_info para o frontend
        };

        // Adicionar warning se houver rate limit
        if (validation.error?.includes('Rate limit temporário')) {
          response.warning = validation.error;
        }

        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            error: `Ação não suportada: ${action}`,
            status: 'error'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

  } catch (error) {
    console.error('❌ [Meta Secure] Erro:', error);

    return new Response(
      JSON.stringify({
        error: error?.message || 'Erro interno do servidor',
        status: 'error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});