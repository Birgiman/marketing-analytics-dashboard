/**
 * Simplified Meta Integration Hook
 * Only handles token validation and connection status
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { metaTokenService, type MetaIntegration, type MetaTokenValidation } from '@/services/metaTokenService';
import { DEMO_MODE } from '@/lib/demo-mode';

interface UseMetaIntegrationReturn {
  // Estado
  integration: MetaIntegration | null;
  isLoading: boolean;
  isConnected: boolean;
  isValidating: boolean;
  error: string | null;
  
  // Ações
  connectWithToken: (accessToken: string) => Promise<void>;
  disconnect: () => Promise<void>;
  validateConnection: () => Promise<void>;
  clearError: () => void;
}

const DEMO_INTEGRATION: MetaIntegration = {
  id: 'demo-integration',
  user_id: 'demo-user',
  // REMOVIDO: access_token (nunca mais exposto no frontend)
  is_active: true,
  account_count: 3,
  connected_at: '2024-11-01T10:00:00Z',
  last_validated_at: '2024-11-20T15:30:00Z'
};

export function useMetaIntegration(): UseMetaIntegrationReturn {
  const [integration, setIntegration] = useState<MetaIntegration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const isConnected = integration?.is_active || false;

  // Buscar ID do usuário
  useEffect(() => {
    const getUser = async () => {
      if (DEMO_MODE) {
        setUserId('demo-user');
        setIntegration(DEMO_INTEGRATION);
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
        }
      } catch (err) {

        setError('Erro ao buscar usuário');
      }
    };

    getUser();
  }, []);

  // Carregar integração quando userId estiver disponível
  useEffect(() => {
    if (userId && !DEMO_MODE) {
      loadIntegration();
    }
  }, [userId]);

  const loadIntegration = useCallback(async () => {
    if (!userId || DEMO_MODE) return;

    setIsLoading(true);
    setError(null);

    try {
      const userIntegration = await metaTokenService.getUserIntegration(userId);
      setIntegration(userIntegration);
    } catch (err: unknown) {

      setError('Erro ao carregar integração');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const connectWithToken = useCallback(async (accessToken: string) => {
    if (!userId) {
      setError('Usuário não autenticado');
      return;
    }

    if (DEMO_MODE) {
      setError('Conectar conta não disponível no modo demo');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // SEGURANÇA: Conectar via Edge Function segura (valida + salva + criptografa)
      const validation = await metaTokenService.connectWithToken(userId, accessToken);

      if (!validation.isValid) {
        setError(validation.error || 'Token inválido');
        return;
      }

      // Buscar integração atualizada (sem token)
      const newIntegration = await metaTokenService.getUserIntegration(userId);
      setIntegration(newIntegration);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar com token';
      setError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  }, [userId]);

  const disconnect = useCallback(async () => {
    if (!userId || DEMO_MODE) return;

    setIsLoading(true); // Adicionar loading state
    setError(null);

    try {
      await metaTokenService.disconnectIntegration(userId);
      setIntegration(null);

      // Forçar refresh do status após desconectar
      await loadIntegration();
    } catch (err: unknown) {
      setError('Erro ao desconectar');
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadIntegration]);

  const validateConnection = useCallback(async () => {
    if (!integration || DEMO_MODE) return;

    setIsValidating(true);
    setError(null);

    try {
      const isValid = await metaTokenService.revalidateIntegration(integration);

      if (!isValid) {
        setIntegration(null);
        setError('Token expirado ou inválido');
      } else {
        // Recarregar integração com dados atualizados
        await loadIntegration();
      }
    } catch (err: unknown) {
      setError('Erro na validação');
    } finally {
      setIsValidating(false);
    }
  }, [integration, loadIntegration]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-validar conexão a cada 30 minutos se conectado
  useEffect(() => {
    if (!isConnected || DEMO_MODE) return;

    const interval = setInterval(() => {
      validateConnection();
    }, 30 * 60 * 1000); // 30 minutos

    return () => clearInterval(interval);
  }, [isConnected, validateConnection]);

  return {
    integration,
    isLoading,
    isConnected,
    isValidating,
    error,
    connectWithToken,
    disconnect,
    validateConnection,
    clearError
  };
}