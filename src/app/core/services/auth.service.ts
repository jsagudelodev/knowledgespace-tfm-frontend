import { Injectable, signal, inject } from '@angular/core';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { User, ProfileUpdate, ChangePasswordRequest } from '../models/user.model';
import { Company } from '../models/company.model';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiService = inject(ApiService);
  private storage = inject(StorageService);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  readonly selectedCompany = signal<Company | null>(null);

  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const user = this.storage.getItem<User>('user');
    if (user) this.currentUserSubject.next(user);
    const company = this.storage.getItem<Company>('selected_company');
    if (company) this.selectedCompany.set(company);
  }

  setSelectedCompany(company: Company | null): void {
    if (company) {
      this.storage.setItem('selected_company', company);
    } else {
      this.storage.removeItem('selected_company');
    }
    this.selectedCompany.set(company);
  }

  login(credentials: LoginRequest): Observable<TokenResponse> {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    return this.apiService.postFormData<TokenResponse>('/v1/auth/login', formData);
  }

  getCurrentUser(): Observable<User> {
    return this.apiService.get<User>('/v1/auth/me');
  }

  /** Actualiza el nombre del usuario autenticado y refresca la copia local
   * (`currentUser$`/localStorage) con la respuesta del servidor, para que el
   * header y cualquier otra pantalla que lea `getCurrentUserValue()` vean el
   * cambio sin tener que recargar la página. */
  updateProfile(data: ProfileUpdate): Observable<User> {
    return this.apiService.put<User>('/v1/auth/me', data).pipe(
      tap((user) => this.setCurrentUser(user)),
    );
  }

  changePassword(data: ChangePasswordRequest): Observable<{ message: string }> {
    return this.apiService.put<{ message: string }>('/v1/auth/change-password', data);
  }

  setCurrentUser(user: User): void {
    this.storage.setItem('user', user);
    this.currentUserSubject.next(user);
  }

  setAccessToken(token: string): void {
    this.storage.setItem('access_token', token);
  }

  getAccessToken(): string | null {
    return this.storage.getItem<string>('access_token');
  }

  logout(): void {
    this.storage.removeItem('access_token');
    this.storage.removeItem('user');
    this.storage.removeItem('selected_company');
    this.currentUserSubject.next(null);
    this.selectedCompany.set(null);
  }

  isAuthenticated(): boolean {
    const token = this.storage.getItem<string>('access_token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /** Admin de empresa o superadmin: los únicos que gestionan lo que el asistente
   * responde a todos (asistentes, categorías, documentos ajenos, preguntas sin
   * respuesta, feedback de otros). El backend lo exige igual; esto solo oculta. */
  isAdmin(): boolean {
    const role = this.currentUserSubject.value?.role;
    return role === 'admin' || role === 'superadmin';
  }

  /** Puede borrar, recategorizar o reprocesar este documento: lo subió él o es admin. */
  canManageDocument(doc: { uploaded_by: number }): boolean {
    return this.isAdmin() || doc.uploaded_by === this.currentUserSubject.value?.id;
  }
}
