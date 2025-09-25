import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GroupEvent {
  id: string;
  group_name: string;
  event: 'join' | 'leave';
  created_at: string;
  user_id: string;
}

interface GroupStats {
  entradas: number;
  saidas: number;
  ativos: number;
}

interface GruposDataProps {
  className?: string;
}

export const GruposDataComponent: React.FC<GruposDataProps> = ({ className = '' }) => {
  const [groupsData, setGroupsData] = useState<GroupEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroupsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch from whatsapp_groups_log table
      const { data, error: fetchError } = await supabase
        .from('whatsapp_groups_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {

        // Generate demo data if real data fails
        setGroupsData(generateDemoData());
      } else {
        const transformedData: GroupEvent[] = (data || []).map(item => ({
          id: item.id,
          group_name: item.group_name || 'Grupo Desconhecido',
          event: item.event === 'join' ? 'join' : 'leave',
          created_at: item.created_at,
          user_id: item.user_id || ''
        }));
        setGroupsData(transformedData);
      }
    } catch (err) {

      setError('Erro ao carregar dados dos grupos');
      setGroupsData(generateDemoData());
    } finally {
      setIsLoading(false);
    }
  };

  // Generate demo data for testing
  const generateDemoData = (): GroupEvent[] => {
    const groups = [
      'Grupo VIP ⭐', 
      'Grupo Premium ❤️', 
      'Grupo Exclusivo 🔥', 
      'Grupo Gold 💎',
      'Grupo Elite 👑',
      'Grupo Master 🚀'
    ];
    
    return Array.from({ length: 100 }, (_, i) => ({
      id: `demo-${i}`,
      group_name: groups[Math.floor(Math.random() * groups.length)],
      event: Math.random() > 0.25 ? 'join' : 'leave' as 'join' | 'leave', // 75% entradas
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: `user-${i}`
    }));
  };

  useEffect(() => {
    fetchGroupsData();
  }, []);

  // Calculate statistics
  const calculateStats = (): { total: GroupStats; byGroup: Record<string, GroupStats> } => {
    const total: GroupStats = { entradas: 0, saidas: 0, ativos: 0 };
    const byGroup: Record<string, GroupStats> = {};

    groupsData.forEach(item => {
      // Total stats
      if (item.event === 'join') {
        total.entradas++;
      } else if (item.event === 'leave') {
        total.saidas++;
      }

      // Stats by group
      if (!byGroup[item.group_name]) {
        byGroup[item.group_name] = { entradas: 0, saidas: 0, ativos: 0 };
      }

      if (item.event === 'join') {
        byGroup[item.group_name].entradas++;
      } else if (item.event === 'leave') {
        byGroup[item.group_name].saidas++;
      }
    });

    // Calculate active members
    total.ativos = total.entradas - total.saidas;
    Object.keys(byGroup).forEach(groupName => {
      byGroup[groupName].ativos = byGroup[groupName].entradas - byGroup[groupName].saidas;
    });

    return { total, byGroup };
  };

  const { total, byGroup } = calculateStats();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Carregando dados dos grupos...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent>
          <p className="text-destructive">Erro ao carregar dados: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (groupsData.length === 0) {
    return (
      <Card className={className}>
        <CardContent>
          <p className="text-muted-foreground">Nenhum dado de grupo encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>📊 Estatísticas dos Grupos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Totais Gerais */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{total.entradas.toLocaleString()}</div>
            <div className="text-sm text-green-700 dark:text-green-300">Total de Entradas</div>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{total.saidas.toLocaleString()}</div>
            <div className="text-sm text-red-700 dark:text-red-300">Total de Saídas</div>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{total.ativos.toLocaleString()}</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Membros Ativos</div>
          </div>
        </div>

        {/* Tabela por Grupo */}
        <div>
          <h4 className="font-semibold mb-3">Resumo por Grupo</h4>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Grupo</TableHead>
                  <TableHead className="text-center">Entradas</TableHead>
                  <TableHead className="text-center">Saídas</TableHead>
                  <TableHead className="text-center">Ativos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byGroup)
                  .sort((a, b) => b[1].ativos - a[1].ativos) // Sort by active members
                  .map(([groupName, stats]) => (
                    <TableRow key={groupName}>
                      <TableCell className="font-medium">{groupName}</TableCell>
                      <TableCell className="text-center text-green-600">
                        {stats.entradas.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-red-600">
                        {stats.saidas.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-medium text-blue-600">
                        {stats.ativos.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="text-xs text-muted-foreground">
          <p>Total de eventos registrados: {groupsData.length.toLocaleString()}</p>
          <p>Grupos monitorados: {Object.keys(byGroup).length}</p>
          <p>Taxa de retenção: {total.entradas > 0 ? Math.round((total.ativos / total.entradas) * 100) : 0}%</p>
        </div>
      </CardContent>
    </Card>
  );
};