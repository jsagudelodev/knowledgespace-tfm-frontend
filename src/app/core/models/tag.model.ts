export interface Tag {
  id:         number;
  company_id: number;
  name:       string;
  color?:     string | null;
  created_at: string;
}

export interface TagCreate {
  name:   string;
  color?: string | null;
}

export interface TagUpdate {
  name?:  string;
  color?: string | null;
}
