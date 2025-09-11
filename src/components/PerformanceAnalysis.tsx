import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface PerformanceAnalysisProps {
  className?: string;
}

const PerformanceAnalysis = ({ className }: PerformanceAnalysisProps) => {
  // Dados de exemplo para o gráfico de barras
  const performanceData = [
    {
      metric: "CPL Meta",
      valor: 15.50,
      meta: 20.00,
      status: "positivo"
    },
    {
      metric: "CPL Líquido",
      valor: 18.20,
      meta: 25.00,
      status: "positivo"
    },
    {
      metric: "Taxa Retenção",
      valor: 75,
      meta: 70,
      status: "positivo"
    },
    {
      metric: "Conversão",
      valor: 3.2,
      meta: 2.5,
      status: "positivo"
    },
    {
      metric: "Engajamento",
      valor: 62,
      meta: 65,
      status: "atencao"
    }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Análise de Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Gráfico de Barras */}
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="metric" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }}
              />
              <Bar 
                dataKey="valor" 
                fill="hsl(var(--primary))" 
                name="Atual"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="meta" 
                fill="hsl(var(--muted))" 
                name="Meta"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Análise por Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Pontos Positivos</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• CPL dentro da meta estabelecida</li>
              <li>• Alta taxa de retenção (75%)</li>
              <li>• Conversão acima do esperado</li>
            </ul>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-600">Pontos de Atenção</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Engajamento abaixo da meta</li>
              <li>• Variação no CPL por campanha</li>
              <li>• Monitorar qualidade do tráfego</li>
            </ul>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-600">Oportunidades</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Otimizar criativos para engajamento</li>
              <li>• Testar novos públicos</li>
              <li>• Melhorar qualificação de leads</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceAnalysis;