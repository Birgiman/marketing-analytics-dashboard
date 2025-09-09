/**
 * Hook para gerenciar integração com Meta Ads
 * Baseado no padrão do useWhatsAppConnection
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { metaAdsService, type MetaAdAccount, type MetaCampaign } from '@/services/metaAdsService';
import { DEMO_MODE } from '@/lib/demo-mode';

interface MetaAdsData {
  accounts: MetaAdAccount[];
  campaigns: MetaCampaign[];
  insights: any[];
  logs: any[];
}

interface UseMetaAdsReturn {
  // Estado
  data: MetaAdsData;
  isLoading: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncAt: Date | null;
  
  // Ações
  connectAccount: (accessToken: string) => Promise<void>;
  disconnectAccount: (accountId: string) => Promise<void>;
  syncData: (accountId?: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DEMO_DATA: MetaAdsData = {
  accounts: [
    {
      ad_account_id: 'act_123456789',
      account_name: 'Conta Demo - Live Shop',
      currency: 'BRL',
      timezone_name: 'America/Sao_Paulo',
      access_token: 'demo_token'
    }
  ],
  campaigns: [
    {
      campaign_id: 'camp_001',
      name: 'Campanha Black Friday 2024',
      status: 'ACTIVE',
      objective: 'LEAD_GENERATION',
      daily_budget: 5000, // R$ 50,00
      start_time: '2024-11-01T00:00:00Z',
      created_time: '2024-10-15T10:30:00Z',
      updated_time: '2024-11-20T08:15:00Z'
    },
    {
      campaign_id: 'camp_002',
      name: 'Retargeting - Visitantes Site',
      status: 'ACTIVE',
      objective: 'CONVERSIONS',
      lifetime_budget: 200000, // R$ 2.000,00
      start_time: '2024-10-01T00:00:00Z',
      created_time: '2024-09-28T14:20:00Z',
      updated_time: '2024-11-15T16:45:00Z'
    }
  ],
  insights: [
    {
      campaign_id: 'camp_001',
      date_start: '2024-11-01',
      date_stop: '2024-11-20',
      impressions: 45230,
      clicks: 1205,
      spend: 47850, // R$ 478,50
      reach: 12500,
      leads: 89,
      cost_per_lead: 538, // R$ 5,38
      ctr: 2.66
    }
  ],
  logs: []
};

export function useMetaAds(): UseMetaAdsReturn {
  const [data, setData] = useState<MetaAdsData>({
    accounts: [],
    campaigns: [],
    insights: [],
    logs: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Computed values
  const isConnected = data.accounts.length > 0;
  const lastSyncAt = data.accounts.length > 0 
    ? new Date(Math.max(...data.accounts.map(acc => new Date(acc.last_sync_at || 0).getTime())))
    : null;
  
  // Buscar ID do usuário
  useEffect(() => {
    const getUser = async () => {
      if (DEMO_MODE) {
        setUserId('demo-user');
        setData(DEMO_DATA);
        setIsLoading(false);
        return;
      }
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
        }
      } catch (err) {
        console.error('Error getting user:', err);
        setError('Erro ao buscar usuário');
      }
    };
    
    getUser();
  }, []);
  
  // Carregar dados quando userId estiver disponível
  useEffect(() => {
    if (userId && !DEMO_MODE) {
      refreshData();
    }
  }, [userId]);
  
  // Conectar nova conta Meta
  const connectAccount = useCallback(async (accessToken: string) => {
    if (!userId) {
      setError('Usuário não autenticado');
      return;
    }
    
    if (DEMO_MODE) {
      setError('Conectar conta não disponível no modo demo');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const accounts = await metaAdsService.validateAndSaveToken(accessToken, userId);
      
      // Atualizar estado local
      setData(prev => ({
        ...prev,
        accounts: [...prev.accounts, ...accounts]
      }));
      
      // Fazer primeira sincronização
      await syncData();
      
    } catch (err: any) {
      console.error('Error connecting Meta account:', err);
      setError(err.message || 'Erro ao conectar conta Meta');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);
  
  // Desconectar conta
  const disconnectAccount = useCallback(async (accountId: string) => {
    if (!userId || DEMO_MODE) return;
    
    try {
      // Desativar conta no banco
      await supabase
        .from('meta_ad_accounts')
        .update({ is_active: false })
        .eq('id', accountId)
        .eq('user_id', userId);
      
      // Atualizar estado local
      setData(prev => ({
        ...prev,
        accounts: prev.accounts.filter(acc => acc.ad_account_id !== accountId)
      }));
      
    } catch (err: any) {
      console.error('Error disconnecting account:', err);
      setError('Erro ao desconectar conta');
    }
  }, [userId]);
  
  // Sincronizar dados
  const syncData = useCallback(async (accountId?: string) => {
    if (!userId) return;
    
    if (DEMO_MODE) {
      setError('Sincronização não disponível no modo demo');
      return;
    }
    
    setIsSyncing(true);
    setError(null);
    
    try {
      await metaAdsService.fullSync(userId, accountId);
      await refreshData();
      
    } catch (err: any) {
      console.error('Error syncing Meta data:', err);
      setError('Erro na sincronização: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);
  
  // Recarregar dados
  const refreshData = useCallback(async () => {
    if (!userId) return;
    
    if (DEMO_MODE) {
      setData(DEMO_DATA);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const userData = await metaAdsService.getUserData(userId);
      setData(userData);
      
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      setError('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);
  
  // Auto-refresh dos dados a cada 5 minutos se conectado
  useEffect(() => {
    if (!isConnected || DEMO_MODE) return;
    
    const interval = setInterval(() => {
      refreshData();
    }, 5 * 60 * 1000); // 5 minutos
    
    return () => clearInterval(interval);
  }, [isConnected, refreshData]);
  
  return {
    data,
    isLoading,
    isConnected,
    isSyncing,
    error,
    lastSyncAt,
    connectAccount,
    disconnectAccount,
    syncData,
    refreshData
  };
}