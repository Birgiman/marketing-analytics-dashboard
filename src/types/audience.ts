// Types for Public Audiences functionality

export interface PublicAudience {
  id: string;
  user_id: string;
  live_id: string;
  title: string;
  campaign_term: string;
  emoji: string;
  created_at: string;
  updated_at: string;
}

export interface PublicAudienceCreate {
  title: string;
  campaign_term: string;
  emoji: string;
}

export interface PublicAudienceCorrelation {
  id: string;
  title: string;
  campaign_term: string;
  emoji: string;
  // Campanhas correlacionadas
  campaigns: {
    id: string;
    name: string;
    spend: number;
    leads: number;
    cpl: number;
  }[];
  // Grupos correlacionados
  groups: {
    id: string;
    name: string;
    size: number;
  }[];
  // Métricas agregadas
  metrics: {
    totalSpend: number;
    totalLeads: number;
    totalGroupMembers: number;
    cplMeta: number;
    cplLiquido: number;
    groupEntradas: number;
    groupSaidas: number;
    groupAtivos: number;
  };
}

export interface CampaignData {
  id: string;
  name: string;
  spend: number;
  leads: number;
  cpl: number;
}

export interface GroupData {
  id: string;
  name: string;
  size: number;
}
