import { TestBed } from '@angular/core/testing';
import { HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { StorageService } from '../services/storage.service';

describe('authInterceptor', () => {
  let getItem: ReturnType<typeof vi.fn>;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getItem = vi.fn();
    next = vi.fn().mockReturnValue(of(new HttpResponse()));

    TestBed.configureTestingModule({
      providers: [{ provide: StorageService, useValue: { getItem } }]
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

  it('no añade ningún header cuando no hay token — deja que el backend responda 401', () => {
    getItem.mockReturnValue(null);
    const req = new HttpRequest('GET', '/api/v1/documents');

    ejecutar(req);

    expect(next).toHaveBeenCalledTimes(1);
    const peticionEnviada = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(peticionEnviada.headers.has('Authorization')).toBe(false);
    // Es la misma petición, no una clonada innecesariamente.
    expect(peticionEnviada).toBe(req);
  });
});
