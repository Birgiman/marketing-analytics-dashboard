import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  isLoading?: boolean;
  className?: string;
  subtitle?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  isLoading = false,
  className = "",
  subtitle
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-xs font-medium">{title}</CardTitle>
        <Icon className="h-3 w-3 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-1">
        <div className="text-lg font-bold">
          {isLoading ? (
            <div className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
          ) : (
            typeof value === 'number' 
              ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : value
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
