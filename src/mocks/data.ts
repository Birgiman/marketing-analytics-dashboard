// Dados mockados para o projeto demo
// Estrutura baseada no objeto real da plataforma

export const MOCK_USER = {
  id: 'demo-user-123',
  email: 'demo@marketing-analytics.com',
  created_at: '2025-01-01T10:00:00.000Z',
  
  // Perfil do usuário
  first_name: 'Demo',
  last_name: 'User',
  phone: '+5511999999999',
  company_name: 'Marketing Analytics Demo',
  company_instagram: '@marketingdemo',
  address: 'Rua Exemplo, 123',
  city: 'São Paulo',
  state: 'SP',
  zip_code: '01234-567',
  country: 'Brasil',
  status: 'approved',
  is_admin: false
};

export const MOCK_META_ACCOUNT = {
  id: 'act_123456789',
  name: 'Meta Conta Exemplo',
  account_status: 1,
  currency: 'BRL',
  timezone_name: 'America/Sao_Paulo'
};

export const MOCK_WHATSAPP_GROUPS = [
  {
    id: 'group-1',
    group_id: '120363025654567890@g.us',
    name: 'WhatsApp Grupos Teste #1',
    participants: 500,
    group_size: 500,
    status: 'active',
    monitoring: true,
    user_id: 'demo-user-123',
    created_at: '2025-01-01T10:00:00.000Z'
  },
  {
    id: 'group-2',
    group_id: '120363025654567891@g.us',
    name: 'WhatsApp Grupos Teste #2',
    participants: 235,
    group_size: 235,
    status: 'active',
    monitoring: true,
    user_id: 'demo-user-123',
    created_at: '2025-01-01T10:00:00.000Z'
  },
  {
    id: 'group-3',
    group_id: '120363025654567892@g.us',
    name: 'WhatsApp Grupos Teste #3',
    participants: 125,
    group_size: 125,
    status: 'active',
    monitoring: true,
    user_id: 'demo-user-123',
    created_at: '2025-01-01T10:00:00.000Z'
  }
];

export const MOCK_META_CAMPAIGNS = [
  {
    id: 'campaign-1',
    campaign_id: '23812345678901234',
    name: 'Meta Campanha Exemplo #1',
    status: 'ACTIVE',
    objective: 'CONVERSIONS',
    daily_budget: '100.00',
    lifetime_budget: '1000.00',
    created_time: '2025-01-01T10:00:00Z',
    updated_time: '2025-01-15T18:30:00Z',
    account_name: 'Meta Conta Exemplo',
    account_id: 'act_123456789'
  },
  {
    id: 'campaign-2',
    campaign_id: '23812345678901235',
    name: 'Meta Campanha Exemplo #2',
    status: 'ACTIVE',
    objective: 'CONVERSIONS',
    daily_budget: '150.00',
    lifetime_budget: '1500.00',
    created_time: '2025-01-05T14:00:00Z',
    updated_time: '2025-01-20T16:45:00Z',
    account_name: 'Meta Conta Exemplo',
    account_id: 'act_123456789'
  }
];

export const MOCK_LIVE = {
  // Dados básicos da Live
  id: 'live-1',
  user_id: 'demo-user-123',
  name: 'Campanha Teste',
  live_date: '2025-01-01T10:00:00.000Z',
  captacao_start: '2025-01-01T08:00:00.000Z',
  ta_rolando_start: '2025-01-01T10:00:00.000Z',
  ta_rolando_end: '2025-01-31T18:00:00.000Z',
  
  // Metas e orçamento
  sales_goal: 2000,
  leads_goal: 5000,
  ad_budget: 2000.00,
  
  // Resultados da Live
  participants: 1250,
  sales: 342,
  revenue: 45600.50,
  current_viewers: 0,
  peak_viewers: 1250,
  
  // Configurações de análise
  insights_date_since: '2025-01-01',
  insights_date_until: '2025-01-31',
  campaign_search_term: 'Meta Campanha',
  whatsapp_search_term: 'WhatsApp Grupos Teste',
  
  // Timestamps
  created_at: '2025-01-01T10:00:00.000Z',
  updated_at: '2025-01-01T10:00:00.000Z',
  last_synced_at: '2025-01-01T10:00:00.000Z',
  traffic_last_synced_at: '2025-01-01T10:00:00.000Z',
  campaigns_hierarchy_last_synced_at: '2025-01-01T10:00:00.000Z',
  
  // DADOS CACHE - Métricas calculadas
  cached_metrics: {
    cplLiquido: 12.50,
    cplMeta: 8.75,
    retentionRate: 68.5,
    cplLiquidoPlanejamento: 10.00
  },
  
  // DADOS CACHE - Grupos WhatsApp
  cached_group_data: {
    totalGroups: 3,
    totalMembers: 1250,
    entries: 89,
    exits: 12,
    activeMembers: 77
  },
  
  // DADOS CACHE - Dados Meta
  cached_meta_data: {
    totalSpend: 2000.00,
    totalLeads: 514,
    totalImpressions: 125000,
    totalClicks: 3200,
    averageCPL: 8.75,
    averageCTR: 2.56,
    campaignCount: 2
  },
  
  // DADOS CACHE - Dados de tráfego incrementado para gráficos
  cached_traffic_data_incremented: {
    campaignsByDate: {
      '2025-01-01': [
        {
          campaign_id: 'campaign-1',
          campaign_name: 'Meta Campanha Exemplo #1',
          spend: 150.50,
          leads: 45,
          impressions: 8500,
          clicks: 250,
          whatsapp_joins: 32,
          whatsapp_exits: 2,
          date: '2025-01-01'
        }
      ],
      '2025-01-02': [
        {
          campaign_id: 'campaign-1',
          campaign_name: 'Meta Campanha Exemplo #1',
          spend: 180.75,
          leads: 52,
          impressions: 9200,
          clicks: 280,
          whatsapp_joins: 38,
          whatsapp_exits: 3,
          date: '2025-01-02'
        }
      ],
      '2025-01-03': [
        {
          campaign_id: 'campaign-1',
          campaign_name: 'Meta Campanha Exemplo #1',
          spend: 165.30,
          leads: 48,
          impressions: 8800,
          clicks: 265,
          whatsapp_joins: 35,
          whatsapp_exits: 1,
          date: '2025-01-03'
        }
      ],
      '2025-01-04': [
        {
          campaign_id: 'campaign-1',
          campaign_name: 'Meta Campanha Exemplo #1',
          spend: 195.20,
          leads: 58,
          impressions: 10200,
          clicks: 310,
          whatsapp_joins: 42,
          whatsapp_exits: 4,
          date: '2025-01-04'
        }
      ],
      '2025-01-05': [
        {
          campaign_id: 'campaign-1',
          campaign_name: 'Meta Campanha Exemplo #1',
          spend: 175.80,
          leads: 51,
          impressions: 9100,
          clicks: 275,
          whatsapp_joins: 37,
          whatsapp_exits: 2,
          date: '2025-01-05'
        }
      ]
    }
  },
  
  // RELAÇÕES - Grupos da Live
  live_groups: MOCK_WHATSAPP_GROUPS.map((group, index) => ({
    id: `live-group-${index + 1}`,
    live_id: 'live-1',
    group_id: group.group_id,
    group_name: group.name,
    group_size: group.participants,
    monitoring: true,
    user_id: 'demo-user-123',
    created_at: '2025-01-01T10:00:00.000Z',
    updated_at: '2025-01-01T10:00:00.000Z'
  })),
  
  // RELAÇÕES - Campanhas da Live
  live_campaigns: [
    {
      id: 'live-campaign-1',
      live_id: 'live-1',
      user_id: 'demo-user-123',
      instance_name: 'analytics_demo_user',
      campaign_id: 'campaign-1',
      campaign_name: 'Meta Campanha Exemplo #1',
      ad_set_name: 'Lookalike Compradores',
      account_id: 'act_123456789',
      account_name: 'Meta Conta Exemplo',
      objective: 'CONVERSIONS',
      status: 'ACTIVE',
      daily_budget: 100.00,
      lifetime_budget: 1000.00,
      budget_remaining: 500.00,
      start_time: '2025-01-01T00:00:00.000Z',
      stop_time: '2025-01-31T23:59:59.000Z',
      leads: 250,
      spend: 1000.00,
      impressions: 50000,
      clicks: 1500,
      cpl: 8.00,
      cpm: 20.00,
      ctr: 3.00,
      last_insight_sync_at: '2025-01-01T10:00:00.000Z',
      created_at: '2025-01-01T10:00:00.000Z',
      updated_at: '2025-01-01T10:00:00.000Z'
    },
    {
      id: 'live-campaign-2',
      live_id: 'live-1',
      user_id: 'demo-user-123',
      instance_name: 'analytics_demo_user',
      campaign_id: 'campaign-2',
      campaign_name: 'Meta Campanha Exemplo #2',
      ad_set_name: 'Interesse Moda',
      account_id: 'act_123456789',
      account_name: 'Meta Conta Exemplo',
      objective: 'CONVERSIONS',
      status: 'ACTIVE',
      daily_budget: 150.00,
      lifetime_budget: 1500.00,
      budget_remaining: 750.00,
      start_time: '2025-01-01T00:00:00.000Z',
      stop_time: '2025-01-31T23:59:59.000Z',
      leads: 264,
      spend: 1000.00,
      impressions: 75000,
      clicks: 1700,
      cpl: 7.58,
      cpm: 13.33,
      ctr: 2.27,
      last_insight_sync_at: '2025-01-01T10:00:00.000Z',
      created_at: '2025-01-01T10:00:00.000Z',
      updated_at: '2025-01-01T10:00:00.000Z'
    }
  ]
};

