// Demo mode para testes sem Supabase
export const DEMO_MODE = true; // Ativar modo demo para testes

export const DEMO_USER = {
  id: 'demo-user-123',
  email: 'demo@liveshop.com',
  created_at: new Date().toISOString()
};

export const DEMO_PROFILE = {
  id: 'demo-profile-123',
  user_id: 'demo-user-123',
  first_name: 'Demo',
  last_name: 'User',
  phone: '+5511999999999',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const DEMO_STATS = {
  totalViews: 12450,
  totalSales: 89,
  totalRevenue: 15670.50,
  whatsappInstances: 1
};

export const DEMO_WHATSAPP_INSTANCES = [
  {
    id: 'demo-instance-1',
    user_id: 'demo-user-123',
    instance_name: 'liveshop_demo_user',
    instance_id: 'demo-123',
    phone_number: '+5511999999999',
    status: 'disconnected' as const,
    qr_code: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const DEMO_LIVES = [
  {
    id: 'demo-live-1',
    name: 'Live de Produto - Moda Feminina',
    live_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    captacao_start: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    ta_rolando_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    ta_rolando_end: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    participants: 2340,
    sales: 45,
    revenue: 8900.50,
    current_viewers: 0,
    peak_viewers: 2340,
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-live-2',
    name: 'Live Especial - Black Friday',
    live_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    captacao_start: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
    ta_rolando_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ta_rolando_end: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    participants: 0,
    sales: 0,
    revenue: 0,
    current_viewers: 0,
    peak_viewers: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const DEMO_CREATIVES = [
  {
    id: 'demo-creative-1',
    day: '2024-01-15',
    campaign_name: 'Campanha Moda Verão',
    ad_set_name: 'Público Feminino 25-45',
    ad_name: 'Vestidos Florais - Vídeo',
    amount_spent: 1250.90,
    leads: 87,
    cost_per_lead: 14.38,
    creative_link: 'https://facebook.com/ads/demo/creative1',
    created_at: new Date().toISOString(),
    user_id: 'demo-user-123'
  },
  {
    id: 'demo-creative-2',
    day: '2024-01-16',
    campaign_name: 'Campanha Acessórios',
    ad_set_name: 'Lookalike Compradores',
    ad_name: 'Bolsas Premium - Carrossel',
    amount_spent: 890.50,
    leads: 45,
    cost_per_lead: 19.79,
    creative_link: 'https://facebook.com/ads/demo/creative2',
    created_at: new Date().toISOString(),
    user_id: 'demo-user-123'
  }
];

export const DEMO_GROUPS = [
  {
    id: 'demo-group-1',
    data_hora: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    data: '2024-01-17',
    hora: '14:30',
    id_grupo: 'demo-group-moda@g.us',
    nome_grupo: 'Grupo VIP - Moda Feminina',
    telefone: '+5511987654321',
    evento: 'entrada',
    created_at: new Date().toISOString(),
    user_id: 'demo-user-123'
  },
  {
    id: 'demo-group-2',
    data_hora: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    data: '2024-01-17',
    hora: '12:15',
    id_grupo: 'demo-group-ofertas@g.us',
    nome_grupo: 'Ofertas Exclusivas',
    telefone: '+5511876543210',
    evento: 'mensagem',
    created_at: new Date().toISOString(),
    user_id: 'demo-user-123'
  },
  {
    id: 'demo-group-3',
    data_hora: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    data: '2024-01-17',
    hora: '10:45',
    id_grupo: 'demo-group-moda@g.us',
    nome_grupo: 'Grupo VIP - Moda Feminina',
    telefone: '+5511765432109',
    evento: 'saida',
    created_at: new Date().toISOString(),
    user_id: 'demo-user-123'
  }
];