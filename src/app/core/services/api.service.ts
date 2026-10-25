import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type QueryParamValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryParamValue>;

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);

  private apiUrl = environment.apiUrl;

  private buildUrl(endpoint: string): string {
    return `${this.apiUrl}${endpoint}`.replace(/([^:])\/\//g, '$1/');
  }

  get<T>(endpoint: string, params?: QueryParams): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value);
        }
      });
    }
    return this.http.get<T>(this.buildUrl(endpoint), { params: httpParams });
  }

  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.buildUrl(endpoint), body);
  }

  put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.buildUrl(endpoint), body);
  }

  patch<T>(endpoint: string, body: unknown, params?: QueryParams): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value);
        }
      });
    }
    return this.http.patch<T>(this.buildUrl(endpoint), body, { params: httpParams });
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(endpoint));
  }

  postFormData<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.http.post<T>(this.buildUrl(endpoint), formData);
  }

  postFormDataWithProgress<T>(endpoint: string, formData: FormData): Observable<HttpEvent<T>> {
    return this.http.post<T>(this.buildUrl(endpoint), formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  getBlob(endpoint: string): Observable<Blob> {
    return this.http.get(this.buildUrl(endpoint), { responseType: 'blob' });
  }

  /**
   * POST cuya respuesta se lee a medida que llega, no de un solo golpe al
   * final — para un backend que responde con Server-Sent Events.
   *
   * `reportProgress: true` + `observe: 'events'` hace que el backend XHR de
   * Angular emita un `HttpDownloadProgressEvent` por cada trozo recibido, con
   * `partialText`: el texto acumulado hasta ese momento (no solo lo nuevo).
   * Es un detalle del backend XHR, no del backend `fetch` —este proyecto no
   * usa `provideHttpClient(withFetch())`, así que esto funciona tal cual—.
   * Quien llama se encarga de quedarse solo con lo nuevo en cada evento.
   */
  postStream(endpoint: string, body: unknown): Observable<HttpEvent<string>> {
    return this.http.post(this.buildUrl(endpoint), body, {
      responseType: 'text',
      reportProgress: true,
      observe: 'events',
    });
  }
}
