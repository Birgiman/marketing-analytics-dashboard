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
    qr_code: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];