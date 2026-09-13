export interface Company {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  plan: 'basic' | 'pro' | 'enterprise';
  max_users: number;
  max_documents: number;
  monthly_message_limit?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CompanyCreate {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  plan?: 'basic' | 'pro' | 'enterprise';
  max_users?: number;
  max_documents?: number;
  monthly_message_limit?: number | null;
}

export interface CompanyUpdate {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  plan?: 'basic' | 'pro' | 'enterprise';
  max_users?: number;
  max_documents?: number;
  monthly_message_limit?: number | null;
  is_active?: boolean;
}
