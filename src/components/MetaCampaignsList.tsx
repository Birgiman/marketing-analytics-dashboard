/**
 * Componente para listar campanhas Meta Ads na página de detalhes
 * Substitui visualização da tabela 'creatives'
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MetaCampaignsListProps {
  creatives: any[];
  isLoading?: boolean;
}

export const MetaCampaignsList = ({ creatives, isLoading }: MetaCampaignsListProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campanhas Meta Ads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-sm text-gray-600">Carregando campanhas...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!creatives || creatives.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campanhas Meta Ads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma campanha encontrada</p>
            <p className="text-sm text-gray-500 mt-1">
              Verifique sua integração Meta Ads
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por campanha para melhor visualização
  const groupedCampaigns = creatives.reduce((acc, creative) => {
    const campaignName = creative.campaign_name || 'Campanha sem nome';
    if (!acc[campaignName]) {
      acc[campaignName] = [];
    }
    acc[campaignName].push(creative);
    return acc;
  }, {} as Record<string, any[]>);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getCPLColor = (cpl: number) => {
    if (cpl === 0) return 'text-gray-500';
    if (cpl <= 2000) return 'text-green-600'; // <= R$ 20
    if (cpl <= 5000) return 'text-yellow-600'; // <= R$ 50
    return 'text-red-600'; // > R$ 50
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campanhas Meta Ads
          </div>
          <Badge variant="secondary">
            {Object.keys(groupedCampaigns).length} campanha(s)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedCampaigns).map(([campaignName, campaignCreatives]: [string, any[]]) => {
          // Calcular totais da campanha
          const totalSpent = campaignCreatives.reduce((sum: number, c: any) => sum + (c.amount_spent || 0), 0);
          const totalLeads = campaignCreatives.reduce((sum: number, c: any) => sum + (c.leads || 0), 0);
          const totalImpressions = campaignCreatives.reduce((sum: number, c: any) => sum + (c.impressions || 0), 0);
          const avgCPL = totalLeads > 0 ? totalSpent / totalLeads : 0;

          return (
            <div key={campaignName} className="border rounded-lg p-4 space-y-3">
              {/* Header da Campanha */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-lg truncate">{campaignName}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {campaignCreatives.length} anúncio(s) • Período: {campaignCreatives[0]?.day || 'N/A'}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>

              {/* Métricas da Campanha */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold">{formatCurrency(totalSpent)}</div>
                  <div className="text-xs text-gray-600">Investido</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{totalLeads}</div>
                  <div className="text-xs text-gray-600">Leads</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className={`text-lg font-bold ${getCPLColor(avgCPL)}`}>
                    {formatCurrency(avgCPL)}
                  </div>
                  <div className="text-xs text-gray-600">CPL Médio</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {totalImpressions.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-xs text-gray-600">Impressões</div>
                </div>
              </div>

              {/* Lista de Anúncios da Campanha */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Anúncios ({campaignCreatives.length})
                </h5>
                <div className="space-y-1">
                  {campaignCreatives.slice(0, 3).map((creative: any, index: number) => (
                    <div key={creative.id || index} className="flex items-center justify-between p-2 bg-white border rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {creative.ad_name || 'Anúncio sem nome'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {creative.ad_set_name || 'Público não definido'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          {formatCurrency(creative.cost_per_lead || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {creative.leads || 0} leads
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {campaignCreatives.length > 3 && (
                    <div className="text-center py-2">
                      <Button variant="ghost" size="sm" className="text-xs">
                        Ver mais {campaignCreatives.length - 3} anúncio(s)
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div className="text-center pt-4 border-t">
          <p className="text-xs text-gray-500">
            Dados atualizados automaticamente do Facebook Marketing API v23.0
          </p>
        </div>
      </CardContent>
    </Card>
  );
};