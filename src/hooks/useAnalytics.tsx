import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Creative, Group, Live } from '@/types';
import { DEMO_MODE, DEMO_LIVES, DEMO_CREATIVES, DEMO_GROUPS } from '@/lib/demo-mode';
import { useToast } from './useToast';

interface AnalyticsData {
  creatives: Creative[];
  groups: Group[];
  lives: Live[];
  loading: boolean;
  error: string | null;
}

export const useAnalytics = (userId?: string) => {
  const [data, setData] = useState<AnalyticsData>({
    creatives: [],
    groups: [],
    lives: [],
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
          lives: DEMO_LIVES || [],
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
        supabase.from('lives').select('*')
      ]);

      if (creativesRes.error) throw creativesRes.error;
      if (groupsRes.error) throw groupsRes.error;
      if (livesRes.error) throw livesRes.error;

      setData({
        creatives: Array.isArray(creativesRes.data) ? creativesRes.data : [],
        groups: Array.isArray(groupsRes.data) ? groupsRes.data : [],
        lives: Array.isArray(livesRes.data) ? livesRes.data : [],
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Error loading analytics data:', error);
      setData(prev => ({
        ...prev,
        creatives: prev.creatives || [],
        groups: prev.groups || [],
        lives: prev.lives || [],
        loading: false,
        error: error.message || 'Erro ao carregar dados de analytics'
      }));
      toast({
        title: "Erro ao carregar dados",
        description: error.message || 'Falha ao carregar dados de analytics',
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  const createLive = useCallback(async (liveData: Omit<Live, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: live, error } = await supabase
        .from('lives')
        .insert(liveData)
        .select()
        .single();

      if (error) throw error;

      setData(prev => ({
        ...prev,
        lives: [...(prev.lives || []), live]
      }));

      toast({
        title: "Live criada",
        description: "Nova live foi criada com sucesso",
      });

      return live;
    } catch (error: any) {
      console.error('Error creating live:', error);
      toast({
        title: "Erro ao criar live",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const updateLive = useCallback(async (id: string, updates: Partial<Live>) => {
    try {
      const { data: live, error } = await supabase
        .from('lives')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setData(prev => ({
        ...prev,
        lives: (prev.lives || []).map(l => l.id === id ? live : l)
      }));

      return live;
    } catch (error: any) {
      console.error('Error updating live:', error);
      toast({
        title: "Erro ao atualizar live",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const deleteLive = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('lives')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setData(prev => ({
        ...prev,
        lives: (prev.lives || []).filter(l => l.id !== id)
      }));

      toast({
        title: "Live deletada",
        description: "Live foi removida com sucesso",
      });
    } catch (error: any) {
      console.error('Error deleting live:', error);
      toast({
        title: "Erro ao deletar live",
        description: error.message,
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