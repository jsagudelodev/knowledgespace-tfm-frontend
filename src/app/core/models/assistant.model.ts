export interface Assistant {
  id: number;
  company_id: number;
  name: string;
  description?: string | null;
  system_prompt?: string | null;
  model: string;
  temperature: number;
  avatar?: string | null;
  quick_prompts?: string[] | null;
  is_active: boolean;
  document_count: number;
  widget_count: number;
  created_at: string;
  updated_at?: string;
}

export interface AssistantCreate {
  name: string;
  description?: string | null;
  system_prompt?: string | null;
  model?: string;
  temperature?: number;
  avatar?: string | null;
  quick_prompts?: string[] | null;
}

export interface AssistantUpdate {
  name?: string;
  description?: string | null;
  system_prompt?: string | null;
  model?: string;
  temperature?: number;
  avatar?: string | null;
  is_active?: boolean;
  quick_prompts?: string[] | null;
}
