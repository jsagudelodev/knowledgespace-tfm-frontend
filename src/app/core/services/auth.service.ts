import { Injectable, signal } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { User } from '../models/user.model';
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
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  readonly selectedCompany = signal<Company | null>(null);

  constructor(private apiService: ApiService, private storage: StorageService) {
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
}
