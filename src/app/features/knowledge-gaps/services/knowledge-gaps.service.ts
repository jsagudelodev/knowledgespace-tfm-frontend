import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  KnowledgeGap,
  KnowledgeGapSummary,
  GapTab,
  GapSort,
} from '../../../core/models/knowledge-gap.model';

@Injectable({ providedIn: 'root' })
export class KnowledgeGapsService {
  private readonly base = '/v1/knowledge-gaps';
  private readonly api = inject(ApiService);

  getSummary(period = 'month'): Observable<KnowledgeGapSummary> {
    return this.api.get<KnowledgeGapSummary>(`${this.base}/summary`, { period });
  }

  getList(params: {
    status?: GapTab;
    sort?: GapSort;
    q?: string;
    skip?: number;
    limit?: number;
  }): Observable<KnowledgeGap[]> {
    const p: Record<string, string | number> = {};
    if (params.status) p['status'] = params.status;
    if (params.sort)   p['sort']   = params.sort;
    if (params.q)      p['q']      = params.q;
    if (params.skip != null)  p['skip']  = params.skip;
    if (params.limit != null) p['limit'] = params.limit;
    return this.api.get<KnowledgeGap[]>(`${this.base}/`, p);
  }

  getById(id: number): Observable<KnowledgeGap> {
    return this.api.get<KnowledgeGap>(`${this.base}/${id}`);
  }

  link(id: number, body: { document_id: number; chunk_id: number }): Observable<KnowledgeGap> {
    return this.api.post<KnowledgeGap>(`${this.base}/${id}/link`, body);
  }

  answer(id: number, body: { answer_text: string }): Observable<KnowledgeGap> {
    return this.api.post<KnowledgeGap>(`${this.base}/${id}/answer`, body);
  }

  ignore(id: number, body: { reason: string }): Observable<KnowledgeGap> {
    return this.api.post<KnowledgeGap>(`${this.base}/${id}/ignore`, body);
  }

  verify(id: number): Observable<KnowledgeGap> {
    return this.api.post<KnowledgeGap>(`${this.base}/${id}/verify`, {});
  }
}
