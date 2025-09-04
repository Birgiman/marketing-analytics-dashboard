// Database Types
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export type ApprovalStatus = 'pending' | 'active' | 'blocked';
export type UserRoleType = 'user' | 'admin' | 'superadmin';

export interface UserApprovalStatus {
  id: string;
  user_id: string;
  status: ApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: UserRoleType;
  created_at: string;
}

// WhatsApp Types
export type WhatsAppStatus = 'disconnected' | 'connecting' | 'pending-qr' | 'connected' | 'error';

export interface WhatsAppInstance {
  id: string;
  user_id: string;
  instance_name: string;
  instance_id?: string | null;
  phone_number?: string | null;
  status: WhatsAppStatus;
  qr_code?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WhatsAppLog {
  id: string;
  user_id: string;
  instance_name: string;
  user_name?: string;
  action: string;
  data?: any;
  error?: string;
  user_agent?: string;
  timestamp: string;
  created_at: string;
}

export interface WhatsAppDeletionLog {
  id: string;
  user_id: string;
  instance_name: string;
  action: string;
  validation_passed: boolean;
  ip_address?: string;
  user_agent?: string;
  error?: string;
  timestamp: string;
}

export interface CreateInstanceResponse {
  success: boolean;
  instance_name: string;
  qr_code?: string;
}

export interface ConnectionStatusResponse {
  status: string;
  connected: boolean;
}

// Analytics Types
export interface Creative {
  id: string;
  day?: string | null;
  campaign_name?: string | null;
  ad_set_name?: string | null;
  ad_name?: string | null;
  amount_spent?: number | null;
  leads?: number | null;
  cost_per_lead?: number | null;
  creative_link?: string | null;
  created_at: string | null;
  user_id: string | null;
}

export interface Group {
  id: string;
  data_hora?: string | null;
  data?: string | null;
  hora?: string | null;
  id_grupo?: string | null;
  nome_grupo?: string | null;
  telefone?: string | null;
  evento?: string | null;
  created_at: string | null;
  user_id: string | null;
}

export interface Live {
  id: string;
  name: string;
  live_date?: string | null;
  captacao_start?: string | null;
  ta_rolando_start?: string | null;
  ta_rolando_end?: string | null;
  participants?: number | null;
  sales?: number | null;
  revenue?: number | null;
  current_viewers?: number | null;
  peak_viewers?: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Pesquisa {
  id: string;
  data?: any;
  created_at: string;
  user_id: string;
}