// LocalStorage Demo System - Simulates database for demo version
// This file manages all demo data stored in browser's localStorage

export interface DemoUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: 'approved' | 'pending' | 'rejected' | 'disabled';
  created_at: string;
}

export interface DemoLive {
  id: string;
  user_id: string;
  name: string;
  liveStart: string;
  liveEnd: string;
  whatsapp_groups: string[];
  meta_campaigns: string[];
  metrics: {
    views: number;
    sales: number;
    revenue: number;
    conversion_rate: number;
  };
  created_at: string;
}

export interface DemoWhatsAppGroup {
  id: string;
  user_id: string;
  name: string;
  participants: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface DemoMetaCampaign {
  id: string;
  user_id: string;
  name: string;
  status: 'active' | 'paused';
  created_at: string;
}

export interface DemoMetaAccount {
  id: string;
  user_id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  created_at: string;
}

const STORAGE_KEYS = {
  USER: 'demo_user',
  LIVES: 'demo_lives',
  WHATSAPP_GROUPS: 'demo_whatsapp_groups',
  META_CAMPAIGNS: 'demo_meta_campaigns',
  META_ACCOUNTS: 'demo_meta_accounts',
  LOGGED_IN: 'demo_logged_in',
  HAS_CREATED_CAMPAIGN: 'demo_has_created_campaign'
};

// Initialize demo data if not exists
export function initializeDemoData() {
  if (!localStorage.getItem(STORAGE_KEYS.USER)) {
    const demoUser: DemoUser = {
      id: 'demo-user-123',
      email: 'demo@marketing-analytics.com',
      first_name: 'Demo',
      last_name: 'User',
      phone: '+5511999999999',
      status: 'approved',
      created_at: new Date().toISOString()
    };
    
    const demoLives: DemoLive[] = [
      {
        id: 'live-1',
        user_id: 'demo-user-123',
        name: 'Black Friday Sale',
        liveStart: '2025-11-24T10:00:00',
        liveEnd: '2025-11-24T18:00:00',
        whatsapp_groups: ['group-1', 'group-2'],
        meta_campaigns: ['campaign-1'],
        metrics: {
          views: 15230,
          sales: 342,
          revenue: 45600,
          conversion_rate: 2.25
        },
        created_at: new Date().toISOString()
      },
      {
        id: 'live-2',
        user_id: 'demo-user-123',
        name: 'Cyber Monday',
        liveStart: '2025-11-27T14:00:00',
        liveEnd: '2025-11-27T22:00:00',
        whatsapp_groups: ['group-1'],
        meta_campaigns: ['campaign-2'],
        metrics: {
          views: 18900,
          sales: 421,
          revenue: 58900,
          conversion_rate: 2.23
        },
        created_at: new Date().toISOString()
      }
    ];
    
    const demoGroups: DemoWhatsAppGroup[] = [
      {
        id: 'group-1',
        user_id: 'demo-user-123',
        name: 'WhatsApp Grupos Teste #1',
        participants: 500,
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 'group-2',
        user_id: 'demo-user-123',
        name: 'WhatsApp Grupos Teste #2',
        participants: 235,
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 'group-3',
        user_id: 'demo-user-123',
        name: 'WhatsApp Grupos Teste #3',
        participants: 125,
        status: 'active',
        created_at: new Date().toISOString()
      }
    ];
    
    const demoCampaigns: DemoMetaCampaign[] = [
      {
        id: 'campaign-1',
        user_id: 'demo-user-123',
        name: 'Meta Campanha Exemplo #1',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 'campaign-2',
        user_id: 'demo-user-123',
        name: 'Meta Campanha Exemplo #2',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ];
    
    const demoAccounts: DemoMetaAccount[] = [
      {
        id: 'act_123456789',
        user_id: 'demo-user-123',
        name: 'Meta Conta Exemplo',
        account_status: 1,
        currency: 'BRL',
        timezone_name: 'America/Sao_Paulo',
        created_at: new Date().toISOString()
      }
    ];
    
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(demoUser));
    localStorage.setItem(STORAGE_KEYS.LIVES, JSON.stringify(demoLives));
    localStorage.setItem(STORAGE_KEYS.WHATSAPP_GROUPS, JSON.stringify(demoGroups));
    localStorage.setItem(STORAGE_KEYS.META_CAMPAIGNS, JSON.stringify(demoCampaigns));
    localStorage.setItem(STORAGE_KEYS.META_ACCOUNTS, JSON.stringify(demoAccounts));
  }
}

// User operations
export function getDemoUser(): DemoUser | null {
  const userData = localStorage.getItem(STORAGE_KEYS.USER);
  return userData ? JSON.parse(userData) : null;
}

export function setLoggedIn(isLoggedIn: boolean) {
  localStorage.setItem(STORAGE_KEYS.LOGGED_IN, JSON.stringify(isLoggedIn));
}

export function isLoggedIn(): boolean {
  const loggedIn = localStorage.getItem(STORAGE_KEYS.LOGGED_IN);
  return loggedIn ? JSON.parse(loggedIn) : false;
}

// Captações operations
export function getDemoLives(): DemoLive[] {
  const livesData = localStorage.getItem(STORAGE_KEYS.LIVES);
  return livesData ? JSON.parse(livesData) : [];
}

export function addDemoLive(live: Omit<DemoLive, 'id' | 'created_at'>): DemoLive {
  const captações = getDemoLives();
  const newLive: DemoLive = {
    ...live,
    id: `live-${Date.now()}`,
    created_at: new Date().toISOString()
  };
  captações.push(newLive);
  localStorage.setItem(STORAGE_KEYS.LIVES, JSON.stringify(captações));
  return newLive;
}

export function updateDemoLive(id: string, updates: Partial<DemoLive>): DemoLive | null {
  const captações = getDemoLives();
  const index = captações.findIndex(l => l.id === id);
  if (index === -1) return null;
  
  captações[index] = { ...captações[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.LIVES, JSON.stringify(captações));
  return captações[index];
}

export function deleteDemoLive(id: string): boolean {
  const captações = getDemoLives();
  const filtered = captações.filter(l => l.id !== id);
  localStorage.setItem(STORAGE_KEYS.LIVES, JSON.stringify(filtered));
  return filtered.length < captações.length;
}

// WhatsApp Groups operations
export function getDemoWhatsAppGroups(): DemoWhatsAppGroup[] {
  const groupsData = localStorage.getItem(STORAGE_KEYS.WHATSAPP_GROUPS);
  return groupsData ? JSON.parse(groupsData) : [];
}

export function searchDemoWhatsAppGroups(searchTerm: string): DemoWhatsAppGroup[] {
  const groups = getDemoWhatsAppGroups();
  console.log('🔍 Searching groups with term:', searchTerm);
  console.log('📋 Available groups:', groups);
  if (!searchTerm) return groups;
  const filtered = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  console.log('✅ Filtered groups:', filtered);
  return filtered;
}

export function addDemoWhatsAppGroup(group: Omit<DemoWhatsAppGroup, 'id' | 'created_at'>): DemoWhatsAppGroup {
  const groups = getDemoWhatsAppGroups();
  const newGroup: DemoWhatsAppGroup = {
    ...group,
    id: `group-${Date.now()}`,
    created_at: new Date().toISOString()
  };
  groups.push(newGroup);
  localStorage.setItem(STORAGE_KEYS.WHATSAPP_GROUPS, JSON.stringify(groups));
  return newGroup;
}

// Meta Campaigns operations
export function getDemoMetaCampaigns(): DemoMetaCampaign[] {
  const campaignsData = localStorage.getItem(STORAGE_KEYS.META_CAMPAIGNS);
  return campaignsData ? JSON.parse(campaignsData) : [];
}

export function searchDemoMetaCampaigns(searchTerm: string): DemoMetaCampaign[] {
  const campaigns = getDemoMetaCampaigns();
  if (!searchTerm) return campaigns;
  return campaigns.filter(campaign => 
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

export function addDemoMetaCampaign(campaign: Omit<DemoMetaCampaign, 'id' | 'created_at'>): DemoMetaCampaign {
  const campaigns = getDemoMetaCampaigns();
  const newCampaign: DemoMetaCampaign = {
    ...campaign,
    id: `campaign-${Date.now()}`,
    created_at: new Date().toISOString()
  };
  campaigns.push(newCampaign);
  localStorage.setItem(STORAGE_KEYS.META_CAMPAIGNS, JSON.stringify(campaigns));
  return newCampaign;
}

// Meta Accounts operations
export function getDemoMetaAccounts(): DemoMetaAccount[] {
  const accountsData = localStorage.getItem(STORAGE_KEYS.META_ACCOUNTS);
  return accountsData ? JSON.parse(accountsData) : [];
}

export function addDemoMetaAccount(account: Omit<DemoMetaAccount, 'id' | 'created_at'>): DemoMetaAccount {
  const accounts = getDemoMetaAccounts();
  const newAccount: DemoMetaAccount = {
    ...account,
    id: `act_${Date.now()}`,
    created_at: new Date().toISOString()
  };
  accounts.push(newAccount);
  localStorage.setItem(STORAGE_KEYS.META_ACCOUNTS, JSON.stringify(accounts));
  return newAccount;
}

// Flag para controlar se o usuário já "criou" uma campanha
export function hasCreatedCampaign(): boolean {
  return localStorage.getItem(STORAGE_KEYS.HAS_CREATED_CAMPAIGN) === 'true';
}

export function setHasCreatedCampaign(value: boolean) {
  localStorage.setItem(STORAGE_KEYS.HAS_CREATED_CAMPAIGN, value.toString());
}

// Clear all demo data
export function clearDemoData() {
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.LIVES);
  localStorage.removeItem(STORAGE_KEYS.WHATSAPP_GROUPS);
  localStorage.removeItem(STORAGE_KEYS.META_CAMPAIGNS);
  localStorage.removeItem(STORAGE_KEYS.META_ACCOUNTS);
  localStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
  localStorage.removeItem(STORAGE_KEYS.HAS_CREATED_CAMPAIGN);
}
