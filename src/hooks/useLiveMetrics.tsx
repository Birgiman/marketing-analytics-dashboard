import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useState } from 'react';

export interface LiveMetrics {
  liveId: string;
  since: string;
  until: string;
  total_spend: number | null;
  total_leads: number | null;
  qualified_leads: number | null;
  cpl_bruto: number | null;
  cpl_liquido: number | null;
  cpl_meta: number | null;
}

interface UseLiveMetricsOptions {
  liveId: string;
  since: string;
  until: string;
  enabled?: boolean;
}

interface UseLiveMetricsReturn {
  metrics: LiveMetrics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLiveMetrics({
  liveId,
  since,
  until,
  enabled = true
}: UseLiveMetricsOptions): UseLiveMetricsReturn {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!enabled || !liveId || !since || !until) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {

      // TEMPORÁRIO: Usar cálculo local até a Edge Function estar disponível
      
      // Buscar dados da Live para calcular métricas
      const { data: liveData, error: liveError } = await supabase
        .from('lives')
        .select('id, name, ad_budget, leads_goal, user_id')
        .eq('id', liveId)
        .single();

      if (liveError || !liveData) {
        throw new Error('Live não encontrada');
      }

      // Buscar campanhas vinculadas
      const { data: liveCampaigns, error: campaignsError } = await supabase
        .from('live_campaigns')
        .select('campaign_id, account_id')
        .eq('live_id', liveId);

      if (campaignsError) {
        throw new Error('Erro ao buscar campanhas');
      }

      // Buscar insights das campanhas
      let totalSpend = 0;
      let totalLeads = 0;

      if (liveCampaigns && liveCampaigns.length > 0) {
        // Buscar token de acesso do Meta
        const { data: metaIntegration, error: metaError } = await supabase
          .from('meta_integrations')
          .select('access_token')
          .eq('user_id', liveData.user_id)
          .eq('is_active', true)
          .single();

        if (metaIntegration?.access_token) {
          // Importar função de busca de insights
          const { fetchMetaInsights } = await import('@/utils/metaApi');
          
          // Buscar insights para cada campanha
          for (const campaign of liveCampaigns) {
            try {
              const insights = await fetchMetaInsights(
                campaign.campaign_id,
                metaIntegration.access_token,
                {
                  level: 'campaign',
                  fields: ['spend', 'actions'],
                  timeRange: { since, until }
                }
              );

              // Calcular métricas
              insights.forEach(insight => {
                totalSpend += parseFloat(insight.spend || '0');
                
                if (insight.actions) {
                  insight.actions.forEach((action: any) => {
                    if (action.action_type === 'lead') {
                      totalLeads += parseInt(action.value || '0');
                    }
                  });
                }
              });
            } catch (error) {
              console.error('Erro ao buscar insights da campanha:', campaign.campaign_id, error);
            }
          }
        }
      }

                  // Buscar leads qualificados do WhatsApp
                  // NOTA: A tabela whatsapp_events ainda não existe
                  // Por enquanto, usamos o group_size da tabela live_groups como proxy
                  const { data: liveGroups, error: groupsError } = await supabase
                    .from('live_groups')
                    .select('group_size')
                    .eq('live_id', liveId);

                  let qualifiedLeads = 0;
                  if (liveGroups && liveGroups.length > 0) {
                    // Usar a soma do tamanho dos grupos como proxy para leads qualificados
                    qualifiedLeads = liveGroups.reduce((sum, group) => sum + (group.group_size || 0), 0);
                  }

      // Calcular CPLs
      const cpl_bruto = totalLeads > 0 ? totalSpend / totalLeads : null;
      const cpl_liquido = qualifiedLeads > 0 ? totalSpend / qualifiedLeads : cpl_bruto;
      const cpl_meta = (liveData.ad_budget && liveData.leads_goal && liveData.leads_goal > 0) ? 
        liveData.ad_budget / liveData.leads_goal : null;

      const calculatedMetrics = {
        liveId,
        since,
        until,
        total_spend: totalSpend,
        total_leads: totalLeads,
        qualified_leads: qualifiedLeads,
        cpl_bruto,
        cpl_liquido,
        cpl_meta
      };

      setMetrics(calculatedMetrics);

    } catch (err: unknown) {
      console.error('❌ [useLiveMetrics] Erro:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar métricas';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [liveId, since, until, enabled]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refetch: fetchMetrics
  };
}

/**
 * Formata valores monetários para exibição
 */
export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) {
    return '-';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata números para exibição
 */
export function formatNumber(value: number | null): string {
  if (value === null || value === undefined) {
    return '-';
  }
  
  return new Intl.NumberFormat('pt-BR').format(value);
}

/**
 * Formata valores decimais para exibição
 */
export function formatDecimal(value: number | null, decimals: number = 2): string {
  if (value === null || value === undefined) {
    return '-';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}
