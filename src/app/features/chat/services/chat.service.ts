/**
 * Acceso al chat RAG: conversaciones, mensajes y envío de preguntas.
 *
 * No hereda de `CrudService` porque cubre tres recursos distintos del backend
 * (`/v1/conversations`, `/v1/messages` y `/v1/chat`), de ahí que su `basePath`
 * sea solo `/v1`.
 *
 * **Dos formas de enviar un mensaje, a propósito (2026-10-24):**
 *
 * - `sendMessage`: HTTP síncrono. `POST /v1/chat/message` devuelve la
 *   respuesta completa cuando el pipeline RAG ha terminado.
 * - `sendMessageStream`: `POST /v1/chat/message/stream`, Server-Sent Events.
 *   El texto llega token a token según lo genera el modelo. No reduce el
 *   tiempo TOTAL de la consulta —el RAG hace el mismo trabajo en ambos
 *   casos—, reduce la ESPERA hasta que aparece el primer token. La usa
 *   `ChatDetailComponent`.
 *
 * Ninguna sustituye a la otra: conviven porque cambiar la ruta síncrona
 * habría significado volver a medir la latencia que ya está documentada para
 * la memoria sin necesidad.
 */
import { Injectable, inject } from '@angular/core';
import { HttpEventType, HttpDownloadProgressEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Conversation, ConversationCreate, ConversationUpdate } from '../../../core/models/conversation.model';
import { Message, ChatRequest, ChatResponse, ChatStreamEvent } from '../../../core/models/message.model';

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

  /**
   * Igual que `sendMessage`, pero emite un `ChatStreamEvent` por cada trozo de
   * texto que llega del backend, en vez de un único valor al final.
   *
   * El backend entrega *Server-Sent Events* (`data: {...}\n\n`). Angular no
   * trae un cliente SSE — `EventSource` solo hace GET, y esto es un POST con
   * token de autenticación —, así que se lee con `ApiService.postStream`
   * (progreso de descarga del propio `HttpClient`) y se parsean las líneas
   * aquí.
   *
   * `partialText` llega ACUMULADO (todo el texto recibido hasta ese momento,
   * no solo lo nuevo), y un evento SSE puede llegar partido entre dos
   * notificaciones de progreso si el trozo de red no coincide con el borde
   * `\n\n`. Por eso se lleva la cuenta de cuánto se procesó (`longitudLeida`)
   * y un `buffer` con el resto incompleto de la última línea.
   */
  sendMessageStream(data: ChatRequest): Observable<ChatStreamEvent> {
    return new Observable<ChatStreamEvent>((subscriber) => {
      let longitudLeida = 0;
      let buffer = '';

      const procesarTextoAcumulado = (textoAcumulado: string): void => {
        buffer += textoAcumulado.slice(longitudLeida);
        longitudLeida = textoAcumulado.length;

        const bloques = buffer.split('\n\n');
        buffer = bloques.pop() ?? ''; // el último puede venir incompleto

        for (const bloque of bloques) {
          const linea = bloque.trim();
          if (!linea.startsWith('data: ')) continue;
          try {
            subscriber.next(JSON.parse(linea.slice('data: '.length)) as ChatStreamEvent);
          } catch {
            // Un trozo de JSON corrupto no debe tumbar el resto del stream.
          }
        }
      };

      const subscription = this.api
        .postStream(`${this.basePath}/chat/message/stream`, data)
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.DownloadProgress) {
              const partial = (event as HttpDownloadProgressEvent).partialText;
              if (partial) procesarTextoAcumulado(partial);
            } else if (event.type === HttpEventType.Response) {
              // Red de seguridad: si el navegador no emitió progreso para el
              // último trozo, aquí llega el texto completo de todos modos.
              const body = (event as HttpResponse<string>).body;
              if (body) procesarTextoAcumulado(body);
              subscriber.complete();
            }
          },
          error: (err) => subscriber.error(err),
        });

      return () => subscription.unsubscribe();
    });
  }
}
