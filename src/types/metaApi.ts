// Meta Marketing API Types and Enums
// Based on Meta Marketing API v23.0 structure from Insomnia testing

// Levels for insights API calls
export enum MetaInsightLevel {
  ACCOUNT = 'account',
  CAMPAIGN = 'campaign',
  ADSET = 'adset',
  AD = 'ad',
  DELIVERY_AD = 'delivery_ad',
  POLITICAL_AD = 'politicalad',
  SALES_MANAGER = 'sales_manager',
  INSTAGRAM_ADS_ORGANIC_MEDIA_IGID = 'instagram_ads_organic_media_igid',
  ORGANIC_POST_ID = 'organic_post_id'
}

// Filter operators for Meta API filtering
export enum MetaFilterOperator {
  EQUAL = 'EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN = 'LESS_THAN',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  CONTAIN = 'CONTAIN',
  NOT_CONTAIN = 'NOT_CONTAIN',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH'
}

// Campaign effective status options
export enum MetaCampaignStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DELETED = 'DELETED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  DISAPPROVED = 'DISAPPROVED',
  PREAPPROVED = 'PREAPPROVED',
  PENDING_BILLING_INFO = 'PENDING_BILLING_INFO',
  CAMPAIGN_PAUSED = 'CAMPAIGN_PAUSED',
  ARCHIVED = 'ARCHIVED',
  ADSET_PAUSED = 'ADSET_PAUSED',
  IN_PROCESS = 'IN_PROCESS',
  WITH_ISSUES = 'WITH_ISSUES'
}

// Date presets available in Meta API
export enum MetaDatePreset {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_QUARTER = 'this_quarter',
  MAXIMUM = 'maximum',
  DATA_MAXIMUM = 'data_maximum',
  LAST_3D = 'last_3d',
  LAST_7D = 'last_7d',
  LAST_14D = 'last_14d',
  LAST_28D = 'last_28d',
  LAST_30D = 'last_30d',
  LAST_90D = 'last_90d',
  WEEK_MON_SUN = 'week_mon_sun',
  WEEK_SUN_SAT = 'week_sun_sat',
  LAST_WEEK_MON_SUN = 'last_week_mon_sun',
  LAST_WEEK_SUN_SAT = 'last_week_sun_sat'
}

// Standard fields for different Meta API endpoints
export const MetaApiFields = {
  // Campaign fields
  CAMPAIGN: [
    'id',
    'name',
    'status',
    'objective',
    'daily_budget',
    'lifetime_budget',
    'start_time',
    'stop_time',
    'created_time',
    'updated_time',
    'effective_status',
    'buying_type',
    'bid_strategy'
  ],

  // Insights fields for campaigns
  CAMPAIGN_INSIGHTS: [
    'campaign_id',
    'campaign_name',
    'impressions',
    'clicks',
    'spend',
    'reach',
    'frequency',
    'actions',
    'cost_per_action_type',
    'cpm',
    'ctr',
    'cpp',
    'cost_per_unique_click',
    'cpc',
    'date_start',
    'date_stop'
  ],

  // Account level insights (aggregated)
  ACCOUNT_INSIGHTS: [
    'campaign_id',
    'campaign_name',
    'impressions',
    'ctr',
    'cpc',
    'spend',
    'date_start',
    'date_stop',
    'actions',
    'cost_per_action_type'
  ],

  // AdSet fields
  ADSET: [
    'id',
    'name',
    'status',
    'daily_budget',
    'lifetime_budget',
    'optimization_goal',
    'targeting',
    'created_time',
    'updated_time'
  ],

  // Ad fields
  AD: [
    'id',
    'name',
    'status',
    'creative',
    'configured_status',
    'effective_status',
    'created_time',
    'updated_time'
  ]
} as const;

// Interface for Meta API filter
export interface MetaApiFilter {
  field: string;
  operator: MetaFilterOperator;
  value: string | string[] | number | number[];
}

// Interface for Meta API time range
export interface MetaTimeRange {
  since: string; // YYYY-MM-DD format
  until: string; // YYYY-MM-DD format
}

// Interface for Meta API insights request options
export interface MetaInsightsOptions {
  level?: MetaInsightLevel;
  fields?: string[];
  dateRange?: MetaTimeRange;
  datePreset?: MetaDatePreset;
  filtering?: MetaApiFilter[];
  limit?: number;
}

// Interface for standardized Meta API request parameters
export interface MetaApiRequestParams {
  access_token: string;
  fields?: string;
  level?: MetaInsightLevel;
  time_range?: string; // JSON string of MetaTimeRange
  date_preset?: MetaDatePreset;
  filtering?: string; // JSON string of MetaApiFilter[]
  limit?: number;
}

// Campaign insights response interface
export interface MetaCampaignInsight {
  campaign_id: string;
  campaign_name?: string;
  date_start: string;
  date_stop: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  frequency?: string;
  cpm?: string;
  ctr?: string;
  cpp?: string;
  cpc?: string;
  cost_per_unique_click?: string;
  actions?: any[];
  cost_per_action_type?: any[];
}

// Campaign data response interface
export interface MetaCampaignData {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  stop_time?: string;
  created_time: string;
  updated_time: string;
  effective_status: MetaCampaignStatus;
  buying_type?: string;
  bid_strategy?: string;
}

// Utility function to build Meta API URL with parameters
export function buildMetaApiUrl(
  baseUrl: string,
  endpoint: string,
  params: MetaApiRequestParams
): string {
  const url = new URL(`${baseUrl}/${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });

  return url.toString();
}

// Utility function to create standardized filtering for campaigns
export function createCampaignStatusFilter(
  statuses: MetaCampaignStatus[]
): MetaApiFilter {
  return {
    field: 'campaign.effective_status',
    operator: MetaFilterOperator.IN,
    value: statuses
  };
}

// Utility function to create campaign name filter
export function createCampaignNameFilter(
  searchTerm: string
): MetaApiFilter {
  return {
    field: 'campaign.name',
    operator: MetaFilterOperator.CONTAIN,
    value: searchTerm
  };
}

// Utility function to create campaign ID filter
export function createCampaignIdFilter(
  campaignIds: string[]
): MetaApiFilter {
  return {
    field: 'campaign.id',
    operator: MetaFilterOperator.IN,
    value: campaignIds
  };
}