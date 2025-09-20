import { MetricCard } from "@/components/MetricCard";
import { Activity, Target, TrendingDown, TrendingUp, Users } from "lucide-react";

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
      <MetricCard
        title="CPL Líquido"
        value={cplLiquido}
        icon={Target}
        type="currency"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="CPL Meta"
        value={cplMeta}
        icon={Target}
        type="currency"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="Tx de Retenção"
        value={retentionRate}
        icon={Activity}
        type="percentage"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="Entrou no Grupo"
        value={groupMembers}
        icon={TrendingUp}
        type="integer"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="Saiu do Grupo"
        value={groupExits}
        icon={TrendingDown}
        type="integer"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="Leads Ativos"
        value={activeLeads}
        icon={Users}
        type="integer"
        isLoading={isLoading}
      />
    </div>
  );
}
