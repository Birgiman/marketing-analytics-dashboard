import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, BarChart3 } from "lucide-react";

interface PerformanceAnalysisProps {
  className?: string;
  live?: {
    ad_budget?: number;
    leads_goal?: number;
  };
  totalSpend?: number;
  totalGroupMembers?: number;
  cplLiquido?: number;
  cplMeta?: number;
}

const PerformanceAnalysis = ({
  className,
  live,
  totalSpend = 0,
  totalGroupMembers = 0,
  cplLiquido = 0,
  cplMeta = 0
}: PerformanceAnalysisProps) => {
  // Calculate real metrics
  const orcamentoPlanejado = live?.ad_budget || 0;
  const investimentoExecutado = totalSpend;
  const verbRestante = orcamentoPlanejado - investimentoExecutado;
  const metaLeads = live?.leads_goal || 0;
  const pessoasGrupo = totalGroupMembers;

  // Calculate progress percentages
  const progressoGrupo = metaLeads > 0 ? (pessoasGrupo / metaLeads) * 100 : 0;
  const progressoInvestimento = orcamentoPlanejado > 0 ? (investimentoExecutado / orcamentoPlanejado) * 100 : 0;

  // Calculate projections
  const leadsEstimados = cplLiquido > 0 && verbRestante > 0 ? Math.floor(verbRestante / cplLiquido) : 0;
  const totalFinalEstimado = pessoasGrupo + leadsEstimados;
  const deficit = metaLeads - totalFinalEstimado;

  // CPL Meta Target (use prop value or calculate 10% lower than current as target)
  const cplMetaTarget = cplMeta > 0 ? cplMeta : cplLiquido * 0.9;
  const percentualCPL = cplMetaTarget > 0 ? ((cplLiquido - cplMetaTarget) / cplMetaTarget) * 100 : 0;
  const isAboveMeta = percentualCPL > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Análise de Performance
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Resumo da evolução das campanhas baseado em dados reais
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
                <span className="text-sm font-bold">
                  {cplLiquido > 0 ? `R$ ${cplLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                </span>
              </div>
              {cplLiquido > 0 && cplMetaTarget > 0 ? (
                <div className={`text-xs mb-2 flex items-center gap-1 ${isAboveMeta ? 'text-red-600' : 'text-green-600'}`}>
                  <AlertTriangle className="h-3 w-3" />
                  {isAboveMeta ? '+' : ''}{percentualCPL.toFixed(1)}% da meta (R$ {cplMetaTarget.toFixed(2)})
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    isAboveMeta ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {isAboveMeta ? 'Acima da meta' : 'Dentro da meta'}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-gray-500 mb-2">Dados insuficientes para análise</div>
              )}
            </div>

            {/* Pessoas no Grupo */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Pessoas no Grupo</span>
                <span className="text-sm font-bold">
                  {pessoasGrupo.toLocaleString('pt-BR')} / {metaLeads.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(progressoGrupo, 100)}%` }}
                ></div>
              </div>
              <span className="text-xs text-muted-foreground">{progressoGrupo.toFixed(1)}% da meta</span>
            </div>

            {/* Investimento */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Orçamento</span>
                <span className="text-sm font-bold">
                  R$ {investimentoExecutado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / R$ {orcamentoPlanejado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${Math.min(progressoInvestimento, 100)}%` }}
                ></div>
              </div>
              <span className="text-xs text-muted-foreground">{progressoInvestimento.toFixed(1)}% do orçamento</span>
            </div>
          </div>

          {/* Coluna Direita - Projeção com Verba Restante */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium mb-4 text-blue-900">💍 Projeção com Verba Restante</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Verba restante:</span>
                <span className="font-bold text-blue-900">
                  R$ {verbRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-blue-700">CPL atual:</span>
                <span className="font-bold text-blue-900">
                  {cplLiquido > 0 ? `R$ ${cplLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-blue-700">Déficit/Superávit:</span>
                <span className={`font-bold ${deficit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {deficit < 0 ? '' : '+'}{deficit.toLocaleString('pt-BR')} pessoas
                </span>
              </div>

              <div className="flex justify-between pt-2 border-t border-blue-300">
                <span className="text-blue-700">Total final estimado:</span>
                <span className="font-bold text-blue-900">
                  {totalFinalEstimado.toLocaleString('pt-BR')} leads
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceAnalysis;