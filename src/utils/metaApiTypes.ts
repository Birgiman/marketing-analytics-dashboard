// Type definitions for Meta API to fix type issues

export interface MetaInsightBase {
  impressions?: number;
  amount_spent?: number;
  clicks?: number;
  leads?: number;
  [key: string]: any;
}

export interface MetaCampaignCreative extends MetaInsightBase {
  id: string;
  name?: string;
  status?: string;
}

export type MetaInsightLevel = 'campaign' | 'account' | 'adset' | 'ad';

export interface MetaInsightsOptions {
  level: MetaInsightLevel;
  fields?: string[];
  timeRange?: {
    since: string;
    until: string;
  };
  datePreset?: string;
  filtering?: Array<{
    field: string;
    operator: 'IN' | 'EQUAL' | 'NOT_EQUAL' | 'GREATER_THAN' | 'LESS_THAN' | 'NOT_IN' | 'CONTAIN' | 'NOT_CONTAIN';
    value: string | number | string[];
  }>;
  limit?: number;
  timeIncrement?: number;
}

export interface CreativeTableData {
  id: string;
  day: string;
  campaign_name: string;
  ad_set_name: string;
  ad_name: string;
  amount_spent: number;
  leads: number;
  cpl: number;
  creative_link: string | null;
  created_at: string;
  user_id: string | null;
}