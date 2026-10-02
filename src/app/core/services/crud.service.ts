/**
 * Base genérica para los servicios de entidad del backend.
 *
 * Los módulos de negocio (asistentes, categorías, documentos, empresas,
 * etiquetas, usuarios) exponen el mismo CRUD contra `/v1/<recurso>`, así que
 * heredan de aquí y solo declaran su `basePath`. Lo que cambia entre ellos son
 * los tipos, no las rutas.
 *
 * Los métodos son `protected` a propósito: cada servicio decide qué parte del
 * CRUD publica y con qué nombre de dominio — `AssistantService` expone
 * `getAssistants()`, no `list()`. Así un componente no puede llamar a `remove()`
 * sobre un recurso cuyo servicio no haya decidido permitir el borrado.
 *
 * El JWT no se añade aquí: lo inyecta `auth.interceptor.ts` en cada petición.
 */
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
