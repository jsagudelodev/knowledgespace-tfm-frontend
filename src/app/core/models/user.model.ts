export interface User {
  id: number;
  company_id: number;
  email: string;
  full_name: string;
  role: 'superadmin' | 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
  company_id: number;
  role?: 'superadmin' | 'admin' | 'user';
}

export interface UserUpdate {
  full_name?: string;
  role?: 'superadmin' | 'admin' | 'user';
  is_active?: boolean;
}
