export interface Source {
  document_id: number;
  text: string;
  document_name?: string;
  score?: number;
  /**
   * Qué fragmento del documento sustenta la respuesta, no solo de qué
   * documento procede. Una consulta recupera a menudo varios fragmentos del
   * mismo PDF —en la evaluación ocurrió en la mitad de los casos—, y sin este
   * dato son indistinguibles entre sí.
   */
  chunk_index?: number;
  /** Identificador del vector, `doc-{id}-chunk-{i}`. Único por fragmento. */
  chunk_id?: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  token_count?: number;
  cost_usd?: number;
  created_at: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: number;
  assistant_id?: number;
}

export interface ChatResponse {
  message_id: number;
  conversation_id: number;
  role: string;
  content: string;
  sources: Source[];
  created_at: string;
  assistant_id?: number;
  cost_usd?: number;
}
