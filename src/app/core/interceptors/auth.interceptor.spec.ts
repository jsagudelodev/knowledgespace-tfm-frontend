import { TestBed } from '@angular/core/testing';
import { HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { StorageService } from '../services/storage.service';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';
import { Company } from '../models/company.model';

function usuario(role: User['role'], company_id: number): User {
  return { id: 1, company_id, email: 'x@x.com', full_name: 'X', role, is_active: true, created_at: '' };
}

function empresa(id: number, name = 'Empresa'): Company {
  return {
    id, name, email: 'e@e.com', plan: 'basic', max_users: 1, max_documents: 1,
    is_active: true, created_at: '',
  };
}

describe('authInterceptor', () => {
  let getItem: ReturnType<typeof vi.fn>;
  let next: ReturnType<typeof vi.fn>;
  let getCurrentUserValue: ReturnType<typeof vi.fn>;
  let selectedCompany: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getItem = vi.fn();
    next = vi.fn().mockReturnValue(of(new HttpResponse()));
    getCurrentUserValue = vi.fn().mockReturnValue(null);
    selectedCompany = vi.fn().mockReturnValue(null);

    TestBed.configureTestingModule({
      providers: [
        { provide: StorageService, useValue: { getItem } },
        { provide: AuthService, useValue: { getCurrentUserValue, selectedCompany } },
      ]
    });
  });

  function ejecutar(req: HttpRequest<unknown>) {
    return TestBed.runInInjectionContext(() => authInterceptor(req, next as unknown as HttpHandlerFn));
  }

  it('añade el header Authorization cuando hay un token guardado', () => {
    getItem.mockReturnValue('un-token-jwt');
    const req = new HttpRequest('GET', '/api/v1/documents');

    ejecutar(req);

    expect(next).toHaveBeenCalledTimes(1);
    const peticionEnviada = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(peticionEnviada.headers.get('Authorization')).toBe('Bearer un-token-jwt');
  });

  it('no añade ningún header cuando no hay token ni cambio de empresa — deja que el backend responda 401', () => {
    getItem.mockReturnValue(null);
    const req = new HttpRequest('GET', '/api/v1/documents');

    ejecutar(req);

    expect(next).toHaveBeenCalledTimes(1);
    const peticionEnviada = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(peticionEnviada.headers.has('Authorization')).toBe(false);
    // Es la misma petición, no una clonada innecesariamente.
    expect(peticionEnviada).toBe(req);
  });

  // ── Contexto de empresa (selector del superadmin) ──────────────────────

  it('un superadmin viendo otra empresa manda X-Company-Context', () => {
    getCurrentUserValue.mockReturnValue(usuario('superadmin', 3));
    selectedCompany.mockReturnValue(empresa(8));
    const req = new HttpRequest('GET', '/api/v1/documents');

    ejecutar(req);

    const peticionEnviada = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(peticionEnviada.headers.get('X-Company-Context')).toBe('8');
  });

  it('un superadmin viendo SU PROPIA empresa no manda el header de más', () => {
    getCurrentUserValue.mockReturnValue(usuario('superadmin', 8));
    selectedCompany.mockReturnValue(empresa(8));
    const req = new HttpRequest('GET', '/api/v1/documents');

    ejecutar(req);

    const peticionEnviada = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(peticionEnviada.headers.has('X-Company-Context')).toBe(false);
  });

  it('un admin de empresa nunca manda X-Company-Context, aunque haya una empresa "seleccionada"', () => {
    // El backend ya lo ignora para quien no es superadmin (ver
    // get_company_context), pero el frontend tampoco debe sugerirlo.
    getCurrentUserValue.mockReturnValue(usuario('admin', 3));
    selectedCompany.mockReturnValue(empresa(8));
    const req = new HttpRequest('GET', '/api/v1/documents');

    ejecutar(req);

    const peticionEnviada = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(peticionEnviada.headers.has('X-Company-Context')).toBe(false);
  });
});
