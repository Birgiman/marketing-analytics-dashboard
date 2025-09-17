import { MetricsCard } from "@/components/MetricsCard";
import { Activity, Target, TrendingUp, TrendingDown, Users } from "lucide-react";

interface LiveMetricsCardsProps {
  cplLiquido: number;
  cplMeta: number;
  retentionRate: number;
  groupMembers: number;
  groupExits: number;
  activeLeads: number;
  isLoading?: boolean;
  className?: string;
}

export function LiveMetricsCards({
  cplLiquido,
  cplMeta,
  retentionRate,
  groupMembers,
  groupExits,
  activeLeads,
  isLoading = false,
  className = ""
}: LiveMetricsCardsProps) {
  return (
    <div className={`grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 ${className}`}>
      <MetricsCard
        title="CPL Líquido"
        value={cplLiquido > 0 ? `R$ ${cplLiquido.toFixed(2)}` : 'R$ 0,00'}
        icon={Target}
        isLoading={isLoading}
      />
      
      <MetricsCard
        title="CPL Meta"
        value={cplMeta > 0 ? `R$ ${cplMeta.toFixed(2)}` : 'R$ 0,00'}
        icon={Target}
        isLoading={isLoading}
      />
      
      <MetricsCard
        title="Tx de Retenção"
        value={`${retentionRate}%`}
        icon={Activity}
        isLoading={isLoading}
      />
      
      <MetricsCard
        title="Entrou no Grupo"
        value={groupMembers.toLocaleString('pt-BR')}
        icon={TrendingUp}
        isLoading={isLoading}
      />
      
      <MetricsCard
        title="Saiu do Grupo"
        value={groupExits.toLocaleString('pt-BR')}
        icon={TrendingDown}
        isLoading={isLoading}
      />
      
      <MetricsCard
        title="Leads Ativos"
        value={activeLeads.toLocaleString('pt-BR')}
        icon={Users}
        isLoading={isLoading}
      />
    </div>
  );
}
