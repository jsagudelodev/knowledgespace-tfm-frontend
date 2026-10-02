/**
 * Acceso al chat RAG: conversaciones, mensajes y envío de preguntas.
 *
 * No hereda de `CrudService` porque cubre tres recursos distintos del backend
 * (`/v1/conversations`, `/v1/messages` y `/v1/chat`), de ahí que su `basePath`
 * sea solo `/v1`.
 *
 * **El envío de mensajes es HTTP síncrono, no streaming.** `POST /v1/chat/message`
 * devuelve la respuesta completa cuando el pipeline RAG ha terminado: embedding
 * de la pregunta, búsqueda en Pinecone, filtrado por umbral de relevancia y
 * generación con el LLM. El usuario espera unos segundos sin ver texto parcial.
 *
 * Es una limitación asumida, no un olvido: el backend no expone WebSocket ni
 * SSE, y añadir streaming token por token habría exigido rehacer el transporte
 * en ambos lados sin aportar nada a la calidad de las respuestas, que es el
 * objeto del trabajo. La espera se cubre en la UI con el indicador de
 * escritura. Ver `doc/FEATURES.md`, sección de pendientes.
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Conversation, ConversationCreate, ConversationUpdate } from '../../../core/models/conversation.model';
import { Message, ChatRequest, ChatResponse } from '../../../core/models/message.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly basePath = '/v1';
  private readonly api = inject(ApiService);

  // Conversations
  createConversation(data: ConversationCreate): Observable<Conversation> {
    return this.api.post<Conversation>(`${this.basePath}/conversations/`, data);
  }

  getConversations(skip = 0, limit = 20): Observable<Conversation[]> {
    return this.api.get<Conversation[]>(`${this.basePath}/conversations/`, { skip, limit });
  }

  getConversation(id: number): Observable<Conversation> {
    return this.api.get<Conversation>(`${this.basePath}/conversations/${id}`);
  }

  updateConversation(id: number, data: ConversationUpdate): Observable<Conversation> {
    return this.api.put<Conversation>(`${this.basePath}/conversations/${id}`, data);
  }

  deleteConversation(id: number): Observable<void> {
    return this.api.delete<void>(`${this.basePath}/conversations/${id}`);
  }

  // Messages
  getMessages(conversationId: number, skip = 0, limit = 50): Observable<Message[]> {
    return this.api.get<Message[]>(`${this.basePath}/messages/`, { conversation_id: conversationId, skip, limit });
  }

  // Chat
  sendMessage(data: ChatRequest): Observable<ChatResponse> {
    return this.api.post<ChatResponse>(`${this.basePath}/chat/message`, data);
  }
}
