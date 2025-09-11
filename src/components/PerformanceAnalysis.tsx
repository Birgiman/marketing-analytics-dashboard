import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface PerformanceAnalysisProps {
  className?: string;
}

const PerformanceAnalysis = ({ className }: PerformanceAnalysisProps) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Análise de Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Pontos Positivos</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Taxa de conversão acima da média</li>
              <li>• Boa retenção de leads</li>
              <li>• CPL dentro do esperado</li>
            </ul>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-600">Pontos de Atenção</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Aumento de saídas de grupos</li>
              <li>• Variação no engagement</li>
              <li>• Necessário monitorar CPL</li>
            </ul>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-600">Oportunidades</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Otimizar públicos frios</li>
              <li>• Melhorar criativos</li>
              <li>• Testar novos formatos</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceAnalysis;