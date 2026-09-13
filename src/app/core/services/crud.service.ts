import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, QueryParams } from './api.service';

export abstract class CrudService<T, C = Partial<T>, U = Partial<T>> {
  protected abstract readonly basePath: string;
  protected readonly api = inject(ApiService);

  protected list(params?: QueryParams): Observable<T[]> {
    return this.api.get<T[]>(`${this.basePath}/`, params);
  }

  protected getById(id: number): Observable<T> {
    return this.api.get<T>(`${this.basePath}/${id}`);
  }

  protected create(data: C): Observable<T> {
    return this.api.post<T>(`${this.basePath}/`, data);
  }

  protected update(id: number, data: U): Observable<T> {
    return this.api.put<T>(`${this.basePath}/${id}`, data);
  }

  protected remove(id: number): Observable<void> {
    return this.api.delete<void>(`${this.basePath}/${id}`);
  }
}
