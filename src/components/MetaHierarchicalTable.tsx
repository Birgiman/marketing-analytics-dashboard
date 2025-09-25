/**
 * Tabela Hierárquica Meta Ads
 * Exibe dados em estrutura: Campanhas → Conjuntos de Anúncios → Anúncios
 * Usa dados do cached_traffic_data.campaignsWithInsights
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, Filter, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { useState, useMemo } from "react";

// Tipos para a estrutura hierárquica
interface HierarchicalData {
  campaigns: CampaignNode[];
  totalSpend: number;
  totalLeads: number;
  avgCPL: number;
}

interface CampaignNode {
  id: string;
  name: string;
  status: string;
  spend: number;
  leads: number;
  cpl: number;
  impressions: number;
  adSets: AdSetNode[];
  expanded?: boolean;
  selected?: boolean;
}

interface AdSetNode {
  id: string;
  name: string;
  spend: number;
  leads: number;
  cpl: number;
  impressions: number;
  ads: AdNode[];
  expanded?: boolean;
  selected?: boolean;
}

interface AdNode {
  id: string;
  name: string;
  spend: number;
  leads: number;
  cpl: number;
  impressions: number;
  date: string;
  selected?: boolean;
}

interface MetaHierarchicalTableProps {
  campaignsWithInsights: Array<{
    campaign_id: string;
    campaign_name?: string;
    insights: Array<{
      campaign_name?: string;
      ad_name?: string;
      date_start?: string;
      spend?: string;
      impressions?: string;
      actions?: Array<{
        action_type: string;
        value: string;
      }>;
    }>;
  }>;
  isLoading?: boolean;
}

type ViewLevel = 'campaigns' | 'adsets' | 'ads';

export const MetaHierarchicalTable = ({ campaignsWithInsights, isLoading }: MetaHierarchicalTableProps) => {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('campaigns');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Processar dados em estrutura hierárquica
  const hierarchicalData = useMemo((): HierarchicalData => {
    if (!campaignsWithInsights || campaignsWithInsights.length === 0) {
      return { campaigns: [], totalSpend: 0, totalLeads: 0, avgCPL: 0 };
    }

    const campaigns = campaignsWithInsights.map(campaign => {
      // Agrupar insights por ad_name para simular ad sets
      const adSetGroups = new Map<string, AdNode[]>();
      let campaignSpend = 0;
      let campaignLeads = 0;
      let campaignImpressions = 0;

      campaign.insights.forEach(insight => {
        const spend = parseFloat(insight.spend || '0') / 100; // Converter de cents
        const impressions = parseInt(insight.impressions || '0');
        const leads = insight.actions?.find(a => a.action_type === 'lead')?.value || '0';
        const leadsNum = parseInt(leads);
        const cpl = leadsNum > 0 ? spend / leadsNum : 0;

        campaignSpend += spend;
        campaignLeads += leadsNum;
        campaignImpressions += impressions;

        // Agrupar por ad_name (simular ad set)
        const adSetName = insight.ad_name || 'Conjunto sem nome';
        if (!adSetGroups.has(adSetName)) {
          adSetGroups.set(adSetName, []);
        }

        const adNode: AdNode = {
          id: `${campaign.campaign_id}-${adSetName}-${insight.date_start}`,
          name: insight.ad_name || 'Anúncio sem nome',
          spend,
          leads: leadsNum,
          cpl,
          impressions,
          date: insight.date_start || '',
        };

        adSetGroups.get(adSetName)!.push(adNode);
      });

      // Criar ad sets a partir dos grupos
      const adSets: AdSetNode[] = Array.from(adSetGroups.entries()).map(([adSetName, ads]) => {
        const adSetSpend = ads.reduce((sum, ad) => sum + ad.spend, 0);
        const adSetLeads = ads.reduce((sum, ad) => sum + ad.leads, 0);
        const adSetImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
        const adSetCPL = adSetLeads > 0 ? adSetSpend / adSetLeads : 0;

        return {
          id: `${campaign.campaign_id}-${adSetName}`,
          name: adSetName,
          spend: adSetSpend,
          leads: adSetLeads,
          cpl: adSetCPL,
          impressions: adSetImpressions,
          ads,
        };
      });

      return {
        id: campaign.campaign_id,
        name: campaign.campaign_name || 'Campanha sem nome',
        status: 'ACTIVE', // Assumir ativa se tem insights
        spend: campaignSpend,
        leads: campaignLeads,
        cpl: campaignLeads > 0 ? campaignSpend / campaignLeads : 0,
        impressions: campaignImpressions,
        adSets,
      };
    });

    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);
    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;

    return { campaigns, totalSpend, totalLeads, avgCPL };
  }, [campaignsWithInsights]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const toggleExpanded = (type: 'campaign' | 'adset', id: string) => {
    if (type === 'campaign') {
      const newExpanded = new Set(expandedCampaigns);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      setExpandedCampaigns(newExpanded);
    } else {
      const newExpanded = new Set(expandedAdSets);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      setExpandedAdSets(newExpanded);
    }
  };

  const toggleSelected = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const renderCampaignRow = (campaign: CampaignNode) => (
    <TableRow key={campaign.id} className="border-b">
      <TableCell className="w-8">
        <Checkbox
          checked={selectedItems.has(campaign.id)}
          onCheckedChange={() => toggleSelected(campaign.id)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => toggleExpanded('campaign', campaign.id)}
          >
            {expandedCampaigns.has(campaign.id) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <Target className="h-4 w-4 text-blue-600" />
          <div>
            <div className="font-medium">{campaign.name}</div>
            <div className="text-sm text-muted-foreground">
              {campaign.adSets.length} conjunto(s) de anúncios
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(campaign.spend)}
      </TableCell>
      <TableCell className="text-right font-medium text-blue-600">
        {campaign.leads}
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(campaign.cpl)}
      </TableCell>
      <TableCell className="text-right">
        {campaign.impressions.toLocaleString('pt-BR')}
      </TableCell>
      <TableCell className="text-right">
        <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
          {campaign.status}
        </Badge>
      </TableCell>
    </TableRow>
  );

  const renderAdSetRow = (adSet: AdSetNode, campaignId: string) => (
    <TableRow key={adSet.id} className="bg-muted/50">
      <TableCell className="w-8">
        <Checkbox
          checked={selectedItems.has(adSet.id)}
          onCheckedChange={() => toggleSelected(adSet.id)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 pl-8">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => toggleExpanded('adset', adSet.id)}
          >
            {expandedAdSets.has(adSet.id) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <div className="h-4 w-4 rounded bg-green-600" />
          <div>
            <div className="font-medium text-sm">{adSet.name}</div>
            <div className="text-xs text-muted-foreground">
              {adSet.ads.length} anúncio(s)
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(adSet.spend)}
      </TableCell>
      <TableCell className="text-right font-medium text-blue-600">
        {adSet.leads}
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(adSet.cpl)}
      </TableCell>
      <TableCell className="text-right">
        {adSet.impressions.toLocaleString('pt-BR')}
      </TableCell>
      <TableCell className="text-right">
        <Badge variant="outline">Conjunto</Badge>
      </TableCell>
    </TableRow>
  );

  const renderAdRow = (ad: AdNode) => (
    <TableRow key={ad.id} className="bg-muted/20">
      <TableCell className="w-8">
        <Checkbox
          checked={selectedItems.has(ad.id)}
          onCheckedChange={() => toggleSelected(ad.id)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 pl-16">
          <div className="h-3 w-3 rounded-full bg-orange-600" />
          <div>
            <div className="font-medium text-sm">{ad.name}</div>
            <div className="text-xs text-muted-foreground">{ad.date}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(ad.spend)}
      </TableCell>
      <TableCell className="text-right font-medium text-blue-600">
        {ad.leads}
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(ad.cpl)}
      </TableCell>
      <TableCell className="text-right">
        {ad.impressions.toLocaleString('pt-BR')}
      </TableCell>
      <TableCell className="text-right">
        <Badge variant="outline" className="text-xs">Anúncio</Badge>
      </TableCell>
    </TableRow>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Análise Hierárquica Meta Ads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground">Carregando dados...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hierarchicalData.campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Análise Hierárquica Meta Ads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum dado encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Verifique sua integração Meta Ads e período de insights
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Análise Hierárquica Meta Ads
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {hierarchicalData.campaigns.length} campanha(s)
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardTitle>

        {/* Resumo das métricas */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-bold">{formatCurrency(hierarchicalData.totalSpend)}</div>
            <div className="text-xs text-muted-foreground">Total Investido</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{hierarchicalData.totalLeads}</div>
            <div className="text-xs text-muted-foreground">Total Leads</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(hierarchicalData.avgCPL)}
            </div>
            <div className="text-xs text-muted-foreground">CPL Médio</div>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="pt-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Nível de Visualização</label>
                <Select value={viewLevel} onValueChange={(value: ViewLevel) => setViewLevel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campaigns">Campanhas</SelectItem>
                    <SelectItem value="adsets">Conjuntos de Anúncios</SelectItem>
                    <SelectItem value="ads">Anúncios Individuais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Expandir Tudo
                </Button>
                <Button variant="outline" size="sm">
                  Recolher Tudo
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Nome / Hierarquia</TableHead>
              <TableHead className="text-right">Investimento</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">CPL</TableHead>
              <TableHead className="text-right">Impressões</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hierarchicalData.campaigns.map(campaign => (
              <React.Fragment key={campaign.id}>
                {renderCampaignRow(campaign)}
                
                {/* Renderizar Ad Sets se expandido */}
                {expandedCampaigns.has(campaign.id) && campaign.adSets.map(adSet => (
                  <React.Fragment key={adSet.id}>
                    {renderAdSetRow(adSet, campaign.id)}
                    
                    {/* Renderizar Ads se expandido */}
                    {expandedAdSets.has(adSet.id) && adSet.ads.map(ad => (
                      renderAdRow(ad)
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>

        {selectedItems.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                {selectedItems.size} item(s) selecionado(s)
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Comparar Selecionados
                </Button>
                <Button variant="outline" size="sm">
                  Exportar Dados
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};