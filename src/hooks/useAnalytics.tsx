import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_CREATIVES, DEMO_GROUPS, DEMO_LIVES, DEMO_MODE } from '@/lib/demo-mode';
import { Creative, Group, Live } from '@/types';
import { useCallback, useEffect, useState } from 'react';

interface AnalyticsData {
  creatives: Creative[];
  groups: Group[];
  captações: Live[];
  loading: boolean;
  error: string | null;
}

export const useAnalytics = (userId?: string) => {
  const [data, setData] = useState<AnalyticsData>({
    creatives: [],
    groups: [],
    captações: [],
    loading: true,
    error: null
  });
  const { toast } = useToast();

  const loadAnalyticsData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      if (DEMO_MODE) {
        // Modo demo - usar dados fictícios
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
        setData({
          creatives: DEMO_CREATIVES || [],
          groups: DEMO_GROUPS || [],
          captações: DEMO_LIVES || [],
          loading: false,
          error: null
        });
        return;
      }

      if (!userId) {
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      // Load all analytics data in parallel
      const [creativesRes, groupsRes, livesRes] = await Promise.all([
        supabase.from('criativos').select('*').eq('user_id', userId),
        supabase.from('grupos').select('*').eq('user_id', userId),
        supabase.from('captações').select('*').eq('user_id', userId)
      ]);

      if (creativesRes.error) throw creativesRes.error;
      if (groupsRes.error) throw groupsRes.error;
      if (livesRes.error) throw livesRes.error;

      setData({
        creatives: Array.isArray(creativesRes.data) ? creativesRes.data : [],
        groups: Array.isArray(groupsRes.data) ? groupsRes.data : [],
        captações: Array.isArray(livesRes.data) ? livesRes.data : [],
        loading: false,
        error: null
      });
    } catch (error: unknown) {

      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar dados de analytics';
      setData(prev => ({
        ...prev,
        creatives: prev.creatives || [],
        groups: prev.groups || [],
        captações: prev.captações || [],
        loading: false,
        error: errorMessage
      }));
      toast({
        title: "Erro ao carregar dados",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  const createLive = useCallback(async (liveData: Omit<Live, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: live, error } = await supabase
        .from('captações')
        .insert(liveData)
        .select()
        .single();

      if (error) throw error;

      setData(prev => ({
        ...prev,
        captações: [...(Array.isArray(prev.captações) ? prev.captações : []), live]
      }));

      toast({
        title: "Live criada",
        description: "Nova live foi criada com sucesso",
      });

      return live;
    } catch (error: unknown) {

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro ao criar live",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const updateLive = useCallback(async (id: string, updates: Partial<Live>) => {
    try {
      const { data: live, error } = await supabase
        .from('captações')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setData(prev => ({
        ...prev,
        captações: (Array.isArray(prev.captações) ? prev.captações : []).map(l => l.id === id ? live : l)
      }));

      return live;
    } catch (error: unknown) {

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro ao atualizar live",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const deleteLive = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('captações')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setData(prev => ({
        ...prev,
        captações: (Array.isArray(prev.captações) ? prev.captações : []).filter(l => l.id !== id)
      }));

      toast({
        title: "Live deletada",
        description: "Live foi removida com sucesso",
      });
    } catch (error: unknown) {

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro ao deletar live",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  return {
    ...data,
    refetch: loadAnalyticsData,
    createLive,
    updateLive,
    deleteLive
  };
};