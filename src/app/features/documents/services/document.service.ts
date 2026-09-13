import { Injectable } from '@angular/core';
import { HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CrudService } from '../../../core/services/crud.service';
import { Document, DocumentUpdate } from '../../../core/models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService extends CrudService<Document, never, DocumentUpdate> {
  protected readonly basePath = '/v1/documents';

  uploadDocument(file: File, categoryId?: number | null, assistantId?: number | null): Observable<HttpEvent<Document>> {
    const formData = new FormData();
    formData.append('file', file);
    if (categoryId != null) formData.append('category_id', categoryId.toString());
    if (assistantId != null) formData.append('assistant_id', assistantId.toString());
    return this.api.postFormDataWithProgress<Document>(`${this.basePath}/upload`, formData);
  }

  retryDocument(id: number): Observable<Document> {
    return this.api.post<Document>(`${this.basePath}/${id}/retry`, {});
  }

  getDownloadUrl(id: number): Observable<{ url: string; filename: string }> {
    return this.api.get<{ url: string; filename: string }>(`${this.basePath}/${id}/download`);
  }

  getDocuments(): Observable<Document[]> {
    return this.list();
  }

  getDocument(id: number): Observable<Document> {
    return this.getById(id);
  }

  updateDocument(id: number, data: DocumentUpdate): Observable<Document> {
    return this.update(id, data);
  }

  deleteDocument(id: number): Observable<void> {
    return this.remove(id);
  }
}
