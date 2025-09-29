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
 * Valida um token de acesso do Meta/Facebook
 */
async function validateMetaToken(accessToken: string): Promise<MetaTokenValidation> {
  try {
    // 1. Verificar se é um User Token válido
    const userResponse = await fetch(`${BASE_URL}/me?access_token=${accessToken}`, {
      signal: AbortSignal.timeout(15000)
    });

    if (!userResponse.ok) {
      return {
        isValid: false,
        accountCount: 0,
        error: 'Token inválido ou expirado'
      };
    }

    const userData = await userResponse.json();

    // 2. Verificar se pode acessar ad accounts
    const adAccountsResponse = await fetch(
      `${BASE_URL}/me/adaccounts?fields=id,name&limit=1&access_token=${accessToken}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!adAccountsResponse.ok) {
      const error = await adAccountsResponse.json();
      return {
        isValid: false,
        accountCount: 0,
        error: error.error?.message || 'Não foi possível acessar contas de anúncios'
      };
    }

    // 3. Contar total de contas
    const countResponse = await fetch(
      `${BASE_URL}/me/adaccounts?summary=1&access_token=${accessToken}`,
      { signal: AbortSignal.timeout(15000) }
    );

    let accountCount = 0;
    if (countResponse.ok) {
      const countData = await countResponse.json();
      accountCount = countData.data?.length || 0;
    }

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
 * Sincroniza contas de anúncios para compatibilidade com sistema existente
 */
async function syncAdAccounts(supabaseClient: any, userId: string, accessToken: string): Promise<void> {
  try {
    const response = await fetch(
      `${BASE_URL}/me/adaccounts?fields=id,name,currency,timezone_name&access_token=${accessToken}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) {
      return;
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return;
    }

    // Desativar contas anteriores
    await supabaseClient
      .from('meta_ad_accounts')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Inserir novas contas
    for (const account of data.data) {
      const adAccountData = {
        user_id: userId,
        ad_account_id: account.id,
        access_token: accessToken,
        account_name: account.name,
        currency: account.currency,
        timezone_name: account.timezone_name,
        is_active: true,
        last_sync_at: new Date().toISOString()
      };

      await supabaseClient
        .from('meta_ad_accounts')
        .upsert(adAccountData, {
          onConflict: 'user_id,ad_account_id',
          ignoreDuplicates: false
        });
    }

  } catch (error) {
    // Não falhar a integração por causa disso
    console.warn('Erro ao sincronizar ad accounts:', error.message);
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
          account_count: validation.accountCount,
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

        // Sincronizar ad accounts para compatibilidade
        await syncAdAccounts(supabaseClient, userId, accessToken);

        // SEGURANÇA: Resposta SEM token - apenas status
        return new Response(
          JSON.stringify({
            success: true,
            status: 'connected',
            account_count: validation.accountCount
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

        // Desativar contas de anúncios para compatibilidade
        await supabaseClient
          .from('meta_ad_accounts')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('is_active', true);

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
          .select('access_token, account_count, connected_at, last_validated_at')
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

        // Atualizar timestamp de validação
        await supabaseClient
          .from('meta_integrations')
          .update({
            last_validated_at: new Date().toISOString(),
            account_count: validation.accountCount
          })
          .eq('user_id', userId)
          .eq('is_active', true);

        // SEGURANÇA: Resposta SEM token - apenas status
        return new Response(
          JSON.stringify({
            status: 'connected',
            connected: true,
            account_count: validation.accountCount,
            connected_at: integration.connected_at,
            last_validated_at: new Date().toISOString()
            // NÃO retornar token ou user_info para o frontend
          }),
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