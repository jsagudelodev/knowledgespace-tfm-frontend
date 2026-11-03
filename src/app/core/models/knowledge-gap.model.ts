export interface KnowledgeGapVariant {
  text: string;
  count: number;
}

export interface KnowledgeGapCandidate {
  document_id: number;
  chunk_id: number;
  name: string;
  score: number;
}

export type GapStatus = 'open' | 'in_progress' | 'resolved' | 'ignored';
export type GapType   = 'hard' | 'soft';
export type GapTrend  = 'rising' | 'stable' | 'declining';
export type GapTab    = 'open' | 'resolved' | 'ignored';
export type GapSort   = 'recent' | 'impact';
export type ResMode   = 'link' | 'answer';
export type IgnoreReason = 'out_of_scope' | 'one_off' | 'duplicate';

export interface KnowledgeGap {
  id: number;
  company_id: number;
  user_id: number | null;
  conversation_id: number | null;
  widget_id: string | null;
  assistant_id: number | null;

  question: string;
  sources_count: number;
  rag_score: number | null;
  gap_type: GapType;

  status: GapStatus;
  answer_text: string | null;
  resolved_by: number | null;
  resolved_at: string | null;
  resolved_document_id: number | null;

  ignore_reason: string | null;

  assigned_to: number | null;
  requested_at: string | null;
  due_at: string | null;
  note: string | null;

  recurrence_count: number;
  reopened_at: string | null;

  verify_score_before: number | null;
  verify_score_after: number | null;
  verified_at: string | null;
  verify_passed: boolean | null;

  variants: KnowledgeGapVariant[] | null;
  candidates: KnowledgeGapCandidate[] | null;

  volume: number;
  channel: string | null;
  trend: GapTrend | null;

  created_at: string;

  // Enriched
  assistant_name: string | null;
  resolved_document_name: string | null;
}

export interface KnowledgeGapSummary {
  open_count: number;
  resolved_count: number;
  ignored_count: number;
  open_volume: number;
  resolved_this_period: number;
  coverage_pct: number;
}
