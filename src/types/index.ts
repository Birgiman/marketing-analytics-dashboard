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
  instance_id?: string;
  phone_number?: string;
  status: WhatsAppStatus;
  qr_code?: string;
  created_at: string;
  updated_at: string;
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
  day?: string;
  campaign_name?: string;
  ad_set_name?: string;
  ad_name?: string;
  amount_spent?: number;
  leads?: number;
  cost_per_lead?: number;
  creative_link?: string;
  created_at: string;
  user_id: string;
}

export interface Group {
  id: string;
  data_hora?: string;
  data?: string;
  hora?: string;
  id_grupo?: string;
  nome_grupo?: string;
  telefone?: string;
  evento?: string;
  created_at: string;
  user_id: string;
}

export interface Live {
  id: string;
  name: string;
  live_date?: string;
  captacao_start?: string;
  ta_rolando_start?: string;
  ta_rolando_end?: string;
  participants?: number;
  sales?: number;
  revenue?: number;
  current_viewers?: number;
  peak_viewers?: number;
  created_at: string;
  updated_at: string;
}

export interface Pesquisa {
  id: string;
  data?: any;
  created_at: string;
  user_id: string;
}