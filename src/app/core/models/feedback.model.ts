export type FeedbackStatus = 'new' | 'reviewed' | 'converted' | 'dismissed' | 'stale';
export type FeedbackPeriod  = 'month' | '90d' | '12m';

export interface FeedbackCreate {
  assistant_id?: number | null;
  message_id?: number | null;
  widget_id?: string | null;
  rating: number;
  comment?: string | null;
}

export interface FeedbackUpdate {
  status: FeedbackStatus;
  knowledge_gap_id?: number | null;
}

export interface FeedbackResponse {
  id: number;
  company_id: number;
  user_id?: number | null;
  widget_id?: string | null;
  assistant_id?: number | null;
  message_id?: number | null;
  rating: number;
  comment?: string | null;
  status: FeedbackStatus;
  knowledge_gap_id?: number | null;
  knowledge_gap_status?: string | null;  // 'open' | 'resolved' | 'ignored'
  created_at: string;
  // enriched
  assistant_name?: string | null;
  question?: string | null;
  answer?: string | null;
  conversation_id?: number | null;
  sources_count?: number | null;
  rag_score?: number | null;
  user_full_name?: string | null;
}

export interface WeekStats {
  week: string;
  avg: number;
}

export interface ThemeSample {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ThemeCount {
  label: string;
  count: number;
  trend?: 'up' | 'down' | null;
  trend_pct?: number | null;   // variación % vs período anterior, e.g. 14 => "+14%"
  summary?: string | null;
  samples?: ThemeSample[];
}

export interface SignalBand {
  copied: number;        // % "Copió o siguió adelante"
  source_opened: number; // % "Abrió la fuente citada"
  reformulated: number;  // % "Reformuló la pregunta"
  abandoned: number;     // % "Se fue sin más"
}

export interface FeedbackStats {
  // KPI 1 – Satisfacción
  average_rating: number;
  average_rating_delta: number | null;
  // KPI 2 – Respuestas calificadas
  rated_count: number;
  messages_count: number;
  rated_pct: number;
  // KPI 3 – Negativas
  negatives: number;
  // KPI 4 – En seguimiento
  with_gap: number;
  // extras
  total: number;
  thumbs_up: number;
  thumbs_down: number;
  satisfaction_rate: number;
  distribution: Partial<Record<number, number>>;
  // Banda de señal implícita
  signal_band: SignalBand;
  // Temas en quejas
  themes: ThemeCount[];
  // Semanal (retenido en modelo para compat, no se muestra)
  weeks?: WeekStats[];
}
