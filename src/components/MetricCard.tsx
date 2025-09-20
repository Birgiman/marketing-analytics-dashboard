import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

type MetricType = 'currency' | 'percentage' | 'numeric' | 'integer';

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  type?: MetricType;
  isLoading?: boolean;
  className?: string;
  subtitle?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  type = 'numeric',
  isLoading = false,
  className = "",
  subtitle
}: MetricCardProps) {
  const formatValue = (val: number, metricType: MetricType): string => {
    if (val === 0 || val === null || val === undefined) {
      switch (metricType) {
        case 'currency':
          return 'R$ 0,00';
        case 'percentage':
          return '0%';
        case 'numeric':
        case 'integer':
          return '0';
        default:
          return '0';
      }
    }

    switch (metricType) {
      case 'currency':
        return `R$ ${val.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`;
      case 'percentage':
        return `${val.toFixed(2)}%`;
      case 'integer':
        return val.toLocaleString('pt-BR');
      case 'numeric':
      default:
        return val.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        });
    }
  };

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
            formatValue(value, type)
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
