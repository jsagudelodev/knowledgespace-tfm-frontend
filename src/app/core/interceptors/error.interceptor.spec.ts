import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { throwError, firstValueFrom } from 'rxjs';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

describe('errorInterceptor', () => {
  let logout: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let error: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logout = vi.fn();
    navigate = vi.fn();
    error = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { logout } },
        { provide: Router, useValue: { navigate } },
        { provide: NotificationService, useValue: { error } }
      ]
    });
  });

  /** Simula un `next` cuya petición falla con el estado dado. */
  function nextQueFalla(status: number) {
    return vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
  }

  async function ejecutarYEsperarError(url: string, status: number): Promise<HttpErrorResponse> {
    const req = new HttpRequest('GET', url);
    const resultado$ = TestBed.runInInjectionContext(() =>
      errorInterceptor(req, nextQueFalla(status) as unknown as HttpHandlerFn)
    );
    try {
      await firstValueFrom(resultado$);
      throw new Error('se esperaba que el observable fallara, no que completara');
    } catch (e) {
      return e as HttpErrorResponse;
    }
  }

  it('401 fuera del login: cierra sesión, avisa y redirige al login', async () => {
    const err = await ejecutarYEsperarError('/api/v1/documents', 401);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('Tu sesión expiró. Inicia sesión de nuevo.');
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(err.status).toBe(401); // el error original sigue propagándose
  });

  it('401 en la propia petición de login: no cierra sesión ni redirige — es contraseña incorrecta, no sesión caducada', async () => {
    const err = await ejecutarYEsperarError('/api/v1/auth/login', 401);

    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(err.status).toBe(401);
  });

  it('403: avisa del permiso sin cerrar sesión', async () => {
    await ejecutarYEsperarError('/api/v1/companies', 403);

    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('No tienes permiso para realizar esta acción.');
  });

  it('fallo de red (status 0): avisa de un error de servidor', async () => {
    await ejecutarYEsperarError('/api/v1/chat/message', 0);

    expect(error).toHaveBeenCalledWith('Error del servidor. Intenta de nuevo en unos segundos.');
  });

  it('error 500: avisa de un error de servidor', async () => {
    await ejecutarYEsperarError('/api/v1/chat/message', 500);

    expect(error).toHaveBeenCalledWith('Error del servidor. Intenta de nuevo en unos segundos.');
  });

  it('un 404 de negocio no dispara ningún aviso global — lo maneja el propio componente', async () => {
    const err = await ejecutarYEsperarError('/api/v1/documents/999', 404);

    expect(error).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(err.status).toBe(404); // pero el error sigue llegando a quien hizo la petición
  });
});
