import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, DollarSign, Target, Activity } from "lucide-react";
import PerformanceAnalysis from "@/components/PerformanceAnalysis";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Live, Creative, Group } from "@/types";
import { DEMO_MODE } from "@/lib/demo-mode";

const Details = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const liveId = searchParams.get('live');
  
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState<Live | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!liveId || DEMO_MODE) {
        // Para demo mode, criar dados fictícios
        setLive({
          id: 'demo-live-1',
          name: 'Live Demo',
          user_id: 'demo-user',
          live_date: new Date().toISOString(),
          participants: 1250,
          sales: 45,
          revenue: 15680.50,
          current_viewers: 320,
          peak_viewers: 580,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        setCreatives([
          {
            id: '1',
            campaign_name: 'Campanha Live Demo',
            ad_set_name: 'Público Interesse',
            ad_name: 'Criativo Principal',
            amount_spent: 2500,
            leads: 125,
            cost_per_lead: 20,
            day: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            user_id: 'demo-user'
          }
        ]);
        
        setGroups([
          {
            id: '1',
            nome_grupo: 'Grupo VIP Live',
            evento: 'ENTROU',
            telefone: '11999999999',
            data_hora: new Date().toISOString(),
            created_at: new Date().toISOString(),
            user_id: 'demo-user'
          }
        ]);
        
        setLoading(false);
        return;
      }

      try {
        // Buscar dados da live
        const { data: liveData, error: liveError } = await supabase
          .from('lives')
          .select('*')
          .eq('id', liveId)
          .single();

        if (liveError) throw liveError;
        setLive(liveData);

        // Buscar dados de criativos (campanhas)
        const { data: creativesData, error: creativesError } = await supabase
          .from('creatives')
          .select('*')
          .eq('user_id', liveData.user_id);

        if (creativesError) throw creativesError;
        setCreatives(creativesData || []);

        // Buscar dados de grupos
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .eq('user_id', liveData.user_id);

        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [liveId, navigate]);

  // Calcular CPL Líquido
  const calculateCPLLiquido = () => {
    if (!creatives || !groups || creatives.length === 0 || groups.length === 0) return 0;
    
    const totalSpent = creatives.reduce((sum, item) => {
      const amount = item.amount_spent || 0;
      return sum + amount;
    }, 0);
    
    const totalEntrou = groups.filter(grupo => grupo.evento === 'ENTROU').length;
    return totalEntrou > 0 ? totalSpent / totalEntrou : 0;
  };

  // Calcular dados dos grupos
  const calculateGroupData = () => {
    if (!groups || groups.length === 0) {
      return { entrou: 0, saiu: 0, ativos: 0 };
    }
    
    const entrou = groups.filter(grupo => grupo.evento === 'ENTROU').length;
    const saiu = groups.filter(grupo => grupo.evento === 'SAIU').length;
    const ativos = entrou - saiu;
    
    return { entrou, saiu, ativos };
  };

  // Calcular taxa de retenção
  const calculateRetentionRate = () => {
    if (!creatives || creatives.length === 0) return 0;
    
    const totalLeads = creatives.reduce((sum, item) => {
      const leads = item.leads || 0;
      return sum + leads;
    }, 0);
    
    const { entrou } = calculateGroupData();
    
    return totalLeads > 0 ? Math.round(entrou / totalLeads * 100) : 0;
  };

  // Calcular CPL Meta
  const calculateCPLMeta = () => {
    if (!creatives || creatives.length === 0) return 0;
    
    const totalSpent = creatives.reduce((sum, item) => {
      const amount = item.amount_spent || 0;
      return sum + amount;
    }, 0);
    
    const totalLeads = creatives.reduce((sum, item) => {
      const leads = item.leads || 0;
      return sum + leads;
    }, 0);
    
    return totalLeads > 0 ? totalSpent / totalLeads : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando detalhes...</div>
      </div>
    );
  }

  if (!live) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Live não encontrada</div>
      </div>
    );
  }

  const cplLiquido = calculateCPLLiquido();
  const groupData = calculateGroupData();
  const retentionRate = calculateRetentionRate();
  const cplMeta = calculateCPLMeta();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Detalhes da Live</h1>
            <p className="text-muted-foreground mt-1">{live.name}</p>
          </div>
        </div>

        {/* Métricas Principais */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPL Líquido</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {cplLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPL Meta</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {cplMeta.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tx de Retenção</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {retentionRate}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entrou no Grupo</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {groupData.entrou.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saiu do Grupo</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {groupData.saiu.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {groupData.ativos.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Análise de Performance */}
        <PerformanceAnalysis />
      </div>
    </div>
  );
};

export default Details;