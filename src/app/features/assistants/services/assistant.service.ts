import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CrudService } from '../../../core/services/crud.service';
import { Assistant, AssistantCreate, AssistantUpdate } from '../../../core/models/assistant.model';
import { Document } from '../../../core/models/document.model';
import { Widget } from '../../../core/models/widget.model';

@Injectable({ providedIn: 'root' })
export class AssistantService extends CrudService<Assistant, AssistantCreate, AssistantUpdate> {
  protected readonly basePath = '/v1/assistants';

  getAssistants(): Observable<Assistant[]> {
    return this.list();
  }

  getAssistant(id: number): Observable<Assistant> {
    return this.getById(id);
  }

  createAssistant(data: AssistantCreate): Observable<Assistant> {
    return this.create(data);
  }

  updateAssistant(id: number, data: AssistantUpdate): Observable<Assistant> {
    return this.update(id, data);
  }

  deleteAssistant(id: number): Observable<void> {
    return this.remove(id);
  }

  getAssistantDocuments(assistantId: number): Observable<Document[]> {
    return this.api.get<Document[]>(`${this.basePath}/${assistantId}/documents`);
  }

  getAssistantWidgets(assistantId: number): Observable<Widget[]> {
    return this.api.get<Widget[]>(`${this.basePath}/${assistantId}/widgets`);
  }
}
