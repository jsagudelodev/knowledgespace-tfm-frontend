export interface Category {
  id:          number;
  company_id:  number;
  name:        string;
  description: string | null;
  color:       string | null;
  icon:        string | null;
  sort_order:  number;
  is_active:   boolean;
  created_at:  string;
  updated_at:  string | null;
}

export interface CategoryCreate {
  name:        string;
  description?: string | null;
  color?:      string | null;
  icon?:       string | null;
  sort_order?: number;
}

export interface CategoryUpdate {
  name?:        string;
  description?: string | null;
  color?:       string | null;
  icon?:        string | null;
  sort_order?:  number;
  is_active?:   boolean;
}
