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
  /** true mientras un mensaje del asistente se está escribiendo por streaming
   * (`ChatService.sendMessageStream`). No existe en mensajes ya guardados —
   * el backend no lo conoce, es puramente de presentación: oculta copiar,
   * feedback y costo hasta que la respuesta está completa. */
  streaming?: boolean;
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

/** Eventos del streaming de `POST /v1/chat/message/stream`. Misma forma que
 * emite el backend — ver `_generar_eventos_sse` en `api/app/routers/v1/chat.py`. */
export interface ChatStreamDelta {
  type: 'delta';
  content: string;
}

export interface ChatStreamDone {
  type: 'done';
  message_id: number;
  conversation_id: number;
  sources: Source[];
  assistant_id?: number | null;
  cost_usd?: number | null;
}

export interface ChatStreamError {
  type: 'error';
  /** La etapa del pipeline que falló (p.ej. "generación de la respuesta",
   * "búsqueda vectorial") — la misma que trae `RAGUnavailableError` en el backend. */
  etapa: string;
}

export type ChatStreamEvent = ChatStreamDelta | ChatStreamDone | ChatStreamError;
