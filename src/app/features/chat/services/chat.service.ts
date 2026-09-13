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
