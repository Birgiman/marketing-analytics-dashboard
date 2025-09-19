/**
 * Hook para consumir dados do Meta Ads nas Lives
 * Substitui dados mockados da tabela 'creatives' com dados reais
 */

import { useState, useEffect, useCallback } from 'react';
import { getCreativesData, getUserMetaToken } from '@/utils/metaApiLives';
import { DEMO_MODE } from '@/lib/demo-mode';

interface UseMetaLivesDataReturn {
  // Dados
  creatives: any[];
  isLoading: boolean;
  isConnected: boolean;
  hasMetaIntegration: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Ações
  refreshData: () => Promise<void>;
  clearError: () => void;
}

const DEMO_CREATIVES = [
  {
    id: 'demo_1',
    day: new Date().toISOString().split('T')[0],
    campaign_name: 'Campanha Black Friday Demo',
    ad_set_name: 'Público Interesse Alto',
    ad_name: 'Criativo Principal - Video',
    amount_spent: 12500, // R$ 125,00
    leads: 45,
    cost_per_lead: 2778, // R$ 27,78
    creative_link: null,
    created_at: new Date().toISOString(),
    user_id: 'demo-user'
  },
  {
    id: 'demo_2', 
    day: new Date().toISOString().split('T')[0],
    campaign_name: 'Retargeting VIP Demo',
    ad_set_name: 'Público Lookalike',
    ad_name: 'Criativo Carousel - Produtos',
    amount_spent: 8900, // R$ 89,00
    leads: 28,
    cost_per_lead: 3179, // R$ 31,79
    creative_link: null,
    created_at: new Date().toISOString(),
    user_id: 'demo-user'
  }
];

export function useMetaLivesData(userId?: string): UseMetaLivesDataReturn {
  const [creatives, setCreatives] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMetaIntegration, setHasMetaIntegration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const isConnected = hasMetaIntegration && creatives.length > 0;

  const refreshData = useCallback(async () => {
    if (!userId) {
      setCreatives([]);
      setIsLoading(false);
      return;
    }

    if (DEMO_MODE) {
      setCreatives(DEMO_CREATIVES);
      setHasMetaIntegration(true);
      setIsLoading(false);
      setLastUpdated(new Date());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Verificar se usuário tem token Meta
      const userToken = await getUserMetaToken(userId);
      setHasMetaIntegration(!!userToken);

      if (!userToken) {
        console.log('User has no Meta integration, returning empty data');
        setCreatives([]);
        setLastUpdated(new Date());
        return;
      }

      // 2. Buscar dados reais do Meta Ads
      console.log('Fetching Meta Ads data for user:', userId);
      const metaData = await getCreativesData(userId, {
        dateRange: {
          since: getDateDaysAgo(30), // Últimos 30 dias
          until: getDateDaysAgo(0)   // Hoje
        }
      });

      if (metaData.length === 0) {
        console.log('No Meta Ads data found, returning empty data');
        setCreatives([]);
      } else {
        console.log(`Loaded ${metaData.length} Meta Ads records`);
        setCreatives(metaData.map(item => ({ ...item, user_id: userId })));
      }

      setLastUpdated(new Date());

    } catch (err: unknown) {
      console.error('Error loading Meta Ads data:', err);
      setError((err as Error).message || 'Erro ao carregar dados do Meta Ads');
      
      // Em caso de erro, retornar dados vazios
      setCreatives([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-carregar dados quando userId mudar
  useEffect(() => {
    refreshData();
  }, [userId]); // Apenas userId como dependência

  // Auto-refresh a cada 10 minutos se conectado
  useEffect(() => {
    if (!isConnected || DEMO_MODE) return;

    const interval = setInterval(() => {
      console.log('Auto-refreshing Meta Ads data...');
      refreshData();
    }, 10 * 60 * 1000); // 10 minutos

    return () => clearInterval(interval);
  }, [isConnected, refreshData]);

  return {
    creatives,
    isLoading,
    isConnected,
    hasMetaIntegration,
    error,
    lastUpdated,
    refreshData,
    clearError
  };
}

/**
 * Helper: Gerar data X dias atrás no formato YYYY-MM-DD
 */
function getDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

/**
 * Hook simplificado para componentes que só precisam dos dados
 */
export function useMetaCreatives(userId?: string) {
  const { creatives, isLoading } = useMetaLivesData(userId);
  return { creatives, isLoading };
}