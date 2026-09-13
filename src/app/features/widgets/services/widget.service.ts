import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Widget, WidgetCreate, WidgetUpdate } from '../../../core/models/widget.model';

@Injectable({ providedIn: 'root' })
export class WidgetService {
  private readonly basePath = '/v1/widgets';
  private readonly api = inject(ApiService);

  getWidgets(): Observable<Widget[]> {
    return this.api.get<Widget[]>(`${this.basePath}/`, { limit: 100 });
  }

  getWidget(id: string): Observable<Widget> {
    return this.api.get<Widget>(`${this.basePath}/${id}`);
  }

  createWidget(data: WidgetCreate): Observable<Widget> {
    return this.api.post<Widget>(`${this.basePath}/`, data);
  }

  updateWidget(id: string, data: WidgetUpdate): Observable<Widget> {
    return this.api.put<Widget>(`${this.basePath}/${id}`, data);
  }

  deleteWidget(id: string): Observable<void> {
    return this.api.delete<void>(`${this.basePath}/${id}`);
  }
}
