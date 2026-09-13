import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  FeedbackCreate,
  FeedbackUpdate,
  FeedbackResponse,
  FeedbackStats,
  FeedbackPeriod,
} from '../../../core/models/feedback.model';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly basePath = '/v1/feedback';
  private readonly api = inject(ApiService);

  submit(data: FeedbackCreate): Observable<FeedbackResponse> {
    return this.api.post<FeedbackResponse>(`${this.basePath}/`, data);
  }

  getMine(messageIds: number[]): Observable<FeedbackResponse[]> {
    return this.api.get<FeedbackResponse[]>(`${this.basePath}/me`).pipe(
      map(list => list.filter(f => f.message_id != null && messageIds.includes(f.message_id)))
    );
  }

  getAll(params?: {
    period?: FeedbackPeriod;
    assistant_id?: number;
    rating?: number;
    skip?: number;
    limit?: number;
  }): Observable<FeedbackResponse[]> {
    return this.api.get<FeedbackResponse[]>(
      `${this.basePath}/`,
      params as Record<string, string | number | boolean>,
    );
  }

  getStats(assistantId?: number, period: FeedbackPeriod = 'month'): Observable<FeedbackStats> {
    const params: Record<string, string | number> = { period };
    if (assistantId != null) params['assistant_id'] = assistantId;
    return this.api.get<FeedbackStats>(`${this.basePath}/stats`, params);
  }

  updateStatus(id: number, data: FeedbackUpdate): Observable<FeedbackResponse> {
    return this.api.patch<FeedbackResponse>(`${this.basePath}/${id}/status`, data);
  }

  convertToGap(id: number, question: string): Observable<FeedbackResponse> {
    return this.api.post<FeedbackResponse>(`${this.basePath}/${id}/convert-gap`, { question });
  }

  exportCsv(assistantId?: number, period: FeedbackPeriod = 'month'): Observable<Blob> {
    const parts: string[] = [`period=${period}`];
    if (assistantId != null) parts.push(`assistant_id=${assistantId}`);
    return this.api.getBlob(`${this.basePath}/export?${parts.join('&')}`);
  }
}
