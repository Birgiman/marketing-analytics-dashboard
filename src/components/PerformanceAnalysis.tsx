import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, AlertTriangle } from "lucide-react";

interface PerformanceAnalysisProps {
  className?: string;
}

const PerformanceAnalysis = ({ className }: PerformanceAnalysisProps) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Análise de Performance
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Resumo da evolução das campanhas baseado em dados
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Coluna Esquerda - Planejado vs Executado */}
          <div>
            <h3 className="font-medium mb-4">📊 Planejado vs Executado</h3>
            
            {/* CPL Líquido */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">CPL Líquido</span>
                <span className="text-sm font-bold">R$ 3,91</span>
              </div>
              <div className="text-xs text-red-600 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                +91,1% da meta (R$ 3,00)
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
                  Acima da meta
                </span>
              </div>
            </div>

            {/* Pessoas no Grupo */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Pessoas no Grupo</span>
                <span className="text-sm font-bold">2.202 / 8.330</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: "26.4%" }}></div>
              </div>
              <span className="text-xs text-muted-foreground">26,4% da meta</span>
            </div>

            {/* Investimento */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Investimento</span>
                <span className="text-sm font-bold">R$ 8.612,19 / R$ 25.000,00</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: "34.4%" }}></div>
              </div>
              <span className="text-xs text-muted-foreground">34,4% do orçamento</span>
            </div>
          </div>

          {/* Coluna Direita - Projeção com Verba Restante */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium mb-4 text-blue-900">💍 Projeção com Verba Restante</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Verba restante:</span>
                <span className="font-bold text-blue-900">R$ 16.387,81</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-blue-700">CPL atual:</span>
                <span className="font-bold text-blue-900">R$ 3,91</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-blue-700">Déficit/Superávit:</span>
                <span className="font-bold text-red-600">-1.938 pessoas</span>
              </div>
              
              <div className="flex justify-between pt-2 border-t border-blue-300">
                <span className="text-blue-700">Total final estimado:</span>
                <span className="font-bold text-blue-900">6.392 leads</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceAnalysis;