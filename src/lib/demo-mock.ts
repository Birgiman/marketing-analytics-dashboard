// Mock único com todos os dados necessários para o demo
// Estrutura baseada no objeto real da plataforma

export const DEMO_MOCK = {
  user: {
    // Dados básicos do usuário
    id: 'demo-user-123',
    email: 'demo@marketing-analytics.com',
    created_at: new Date().toISOString(),
    
    // Perfil do usuário
    profile: {
      id: 'profile-demo-123',
      user_id: 'demo-user-123',
      first_name: 'Demo',
      last_name: 'User',
      phone: '+5511999999999',
      email: 'demo@marketing-analytics.com',
      company_name: 'Marketing Analytics Demo',
      company_instagram: '@marketingdemo',
      address: 'Rua Exemplo, 123',
      city: 'São Paulo',
      state: 'SP',
      zip_code: '01234-567',
      country: 'Brasil',
      status: 'approved',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    
    // Integração Meta
    meta_integration: {
      id: 'meta-integration-demo',
      user_id: 'demo-user-123',
      access_token: 'demo_token',
      is_active: true,
      account_count: 1,
      ad_accounts: [
        {
          id: 'act_123456789',
          name: 'Meta Conta Exemplo',
          currency: 'BRL',
          timezone_name: 'America/Sao_Paulo'
        }
      ],
      connected_at: new Date().toISOString(),
      last_validated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    
    // Instâncias WhatsApp
    whatsapp_instances: [
      {
        id: 'whatsapp-instance-demo',
        user_id: 'demo-user-123',
        instance_name: 'analytics_demo_user',
        instance_id: 'instance_demo_123',
        status: 'connected',
        qr_code: null,
        phone_number: '+5511999999999',
        api_token: 'demo_api_token',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  },
  
  whatsappGroups: [
    {
      id: 'group-1',
      name: 'WhatsApp Grupos Teste #1',
      participants: 500,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'group-2', 
      name: 'WhatsApp Grupos Teste #2',
      participants: 235,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'group-3',
      name: 'WhatsApp Grupos Teste #3', 
      participants: 125,
      created_at: '2025-01-01T00:00:00Z'
    }
  ],
  
  metaAccount: {
    id: 'act_123456789',
    name: 'Meta Conta Exemplo',
    account_status: 1,
    currency: 'BRL',
    timezone_name: 'America/Sao_Paulo'
  },
  
  metaCampaigns: [
    {
      id: 'campaign-1',
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
  ],
  
  captações: [
    {
      // Dados básicos da Live
      id: 'live-demo-1',
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      traffic_last_synced_at: new Date().toISOString(),
      campaigns_hierarchy_last_synced_at: new Date().toISOString(),
      
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
        averageCTR: 2.56
      },
      
      // RELAÇÕES - Grupos da Live
      live_groups: [
        {
          id: 'live-group-1',
          live_id: 'live-demo-1',
          group_id: '120363025654567890@g.us',
          group_name: 'WhatsApp Grupos Teste #1',
          group_size: 500,
          monitoring: true,
          user_id: 'demo-user-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'live-group-2',
          live_id: 'live-demo-1',
          group_id: '120363025654567891@g.us',
          group_name: 'WhatsApp Grupos Teste #2',
          group_size: 235,
          monitoring: true,
          user_id: 'demo-user-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'live-group-3',
          live_id: 'live-demo-1',
          group_id: '120363025654567892@g.us',
          group_name: 'WhatsApp Grupos Teste #3',
          group_size: 125,
          monitoring: true,
          user_id: 'demo-user-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      
      // RELAÇÕES - Campanhas da Live
      live_campaigns: [
        {
          id: 'live-campaign-1',
          live_id: 'live-demo-1',
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
          last_insight_sync_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'live-campaign-2',
          live_id: 'live-demo-1',
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
          last_insight_sync_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    }
  ]
};

// Funções simples para buscar dados
export function getDemoUser() {
  return DEMO_MOCK.user;
}

export function getDemoWhatsAppGroups() {
  return DEMO_MOCK.whatsappGroups;
}

export function searchDemoWhatsAppGroups(searchTerm: string) {
  if (!searchTerm) return DEMO_MOCK.whatsappGroups;
  return DEMO_MOCK.whatsappGroups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

export function getDemoMetaAccount() {
  return DEMO_MOCK.metaAccount;
}

export function getDemoMetaCampaigns() {
  return DEMO_MOCK.metaCampaigns;
}

export function searchDemoMetaCampaigns(searchTerm: string) {
  if (!searchTerm) return DEMO_MOCK.metaCampaigns;
  return DEMO_MOCK.metaCampaigns.filter(campaign => 
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

export function getDemoLives() {
  return DEMO_MOCK.captações;
}

export function addDemoLive(live: any) {
  const newLive = {
    ...live,
    id: `live-${Date.now()}`,
    created_at: new Date().toISOString()
  };
  DEMO_MOCK.captações.push(newLive);
  return newLive;
}

export function updateDemoLive(id: string, updates: any) {
  const index = DEMO_MOCK.captações.findIndex(live => live.id === id);
  if (index !== -1) {
    DEMO_MOCK.captações[index] = { ...DEMO_MOCK.captações[index], ...updates };
    return DEMO_MOCK.captações[index];
  }
  return null;
}

export function deleteDemoLive(id: string) {
  const index = DEMO_MOCK.captações.findIndex(live => live.id === id);
  if (index !== -1) {
    DEMO_MOCK.captações.splice(index, 1);
    return true;
  }
  return false;
}

export function addDemoWhatsAppGroup(group: any) {
  const newGroup = {
    ...group,
    id: `group-${Date.now()}`,
    created_at: new Date().toISOString()
  };
  DEMO_MOCK.whatsappGroups.push(newGroup);
  return newGroup;
}
