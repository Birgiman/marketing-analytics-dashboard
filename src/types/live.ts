/**
 * Interfaces centrais para o sistema de Lives
 * Criado para substituir 'any' types e melhorar type safety
 */

// Interface para Lives do banco
export interface Live {
  id: string;
  name: string;
  user_id: string;
  live_date?: string;
  captacao_start?: string;
  ta_rolando_start?: string;
  ta_rolando_end?: string;
  sales_goal?: number;
  leads_goal?: number;
  ad_budget?: number;
  insights_date_since?: string;
  insights_date_until?: string;
  created_at: string;
  updated_at: string;
  // Relações
  live_groups?: LiveGroup[];
  live_campaigns?: LiveCampaign[];
}

// Interface para Grupos do WhatsApp
export interface LiveGroup {
  id: string;
  live_id: string;
  group_id: string;
  group_name: string;
  group_size: number;
  group_owner?: string;
  group_created_at?: string;
  group_created_formatted?: string;
  group_owner_formatted?: string;
  created_at: string;
  updated_at: string;
  // Props específicas para componentes
  selectable?: boolean;
}

// Interface para Campanhas vinculadas à Live
export interface LiveCampaign {
  id: string;
  live_id: string;
  campaign_id: string;
  campaign_name: string;
  account_id?: string;
  account_name?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Interface para dados da campanha com insights
export interface LiveCampaignWithInsights extends LiveCampaign {
  meta_data?: {
    effective_status?: string;
    buying_type?: string;
    bid_strategy?: string;
    start_time?: string;
    stop_time?: string;
    created_time?: string;
    updated_time?: string;
  };
  insights?: {
    campaign_name?: string;
    ad_name?: string;
    date_start?: string;
    date_stop?: string;
    spend?: string;
    impressions?: string;
    clicks?: string;
    reach?: string;
    frequency?: string;
    cpm?: string;
    ctr?: string;
    cpp?: string;
    cost_per_unique_click?: string;
    actions?: MetaAction[];
  };
}

// Interface para ações do Meta Ads
export interface MetaAction {
  action_type: string;
  value: string;
}

// Interface para métricas calculadas
export interface LiveMetrics {
  cplLiquido: number;
  cplMeta: number;
  retentionRate: number;
  totalSpent: number;
  totalLeads: number;
  totalGroupMembers: number;
}

// Interface para dados completos da Live (cache)
export interface LiveCacheData {
  liveId: string;
  live: Live;
  groups: LiveGroup[];
  campaigns: LiveCampaign[];
  campaignsWithInsights: LiveCampaignWithInsights[];
  metrics: LiveMetrics;
  lastUpdated: number;
  lastMetaFetch: number;
}

// Interface para opções de insights do Meta
export interface MetaInsightsOptions {
  level: 'campaign' | 'account' | 'adset' | 'ad';
  fields?: string[];
  timeRange?: {
    since: string;
    until: string;
  };
  datePreset?: string;
}

// Interface para instância do WhatsApp
export interface WhatsAppInstance {
  id: string;
  instance_name: string;
  status: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Interface para dados do usuário
export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

// Interface para props de componentes que recebem Live
export interface LiveComponentProps {
  live: Live;
  onEdit?: (live: Live) => void;
  onDelete?: (live: Live) => void;
  onView?: (live: Live) => void;
}