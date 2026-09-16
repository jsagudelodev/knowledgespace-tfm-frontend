export interface ThemeConfig {
  primary_color: string;
  chat_bg_color: string;
  bot_bubble_color: string;
  user_bubble_color: string;
  bot_text_color: string;
  user_text_color: string;
  placeholder_text: string;
  welcome_message: string;
  font_family: string;
  border_radius: string;
}

export interface Widget {
  id: string;
  company_id: number;
  name: string;
  is_active: boolean;
  position: string;
  widget_size: string;
  theme_config: ThemeConfig;
  bot_name: string;
  bot_avatar_url?: string | null;
  company_logo_url?: string | null;
  quick_replies: string[];
  default_language: string;
  supported_languages: string[];
  daily_message_limit: number;
  // Obligatorio: modelo/prompt/documentos se heredan del Assistant enlazado,
  // no se duplican en el widget (ver docs/MODELO_DATOS.md §2.9 en el backend).
  assistant_id: number;
  created_at: string;
  updated_at?: string;
}

export interface WidgetCreate {
  name: string;
  is_active?: boolean;
  position?: string;
  widget_size?: string;
  theme_config?: Partial<ThemeConfig>;
  bot_name?: string;
  bot_avatar_url?: string | null;
  company_logo_url?: string | null;
  quick_replies?: string[];
  default_language?: string;
  supported_languages?: string[];
  daily_message_limit?: number;
  assistant_id: number;
}

export type WidgetUpdate = Partial<WidgetCreate>;
