import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';

/** Construye un JWT sintético válido en estructura (header.payload.firma),
 * sin firma real — a `isAuthenticated` solo le importa decodificar el
 * payload y leer `exp`, nunca verifica la firma en el cliente (eso es
 * responsabilidad del backend en cada petición). */
function construirJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'none' }));
  const payload = btoa(JSON.stringify({ exp }));
  return `${header}.${payload}.firma-falsa`;
}

describe('AuthService.isAuthenticated', () => {
  let getItem: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getItem = vi.fn().mockReturnValue(null);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: {} },
        { provide: StorageService, useValue: { getItem } }
      ]
    });
  });

  function servicio(): AuthService {
    return TestBed.inject(AuthService);
  }

  it('no hay sesión si no hay ningún token guardado', () => {
    getItem.mockReturnValue(null);
    expect(servicio().isAuthenticated()).toBe(false);
  });

  it('hay sesión con un token cuya expiración está en el futuro', () => {
    const enUnaHora = Math.floor(Date.now() / 1000) + 3600;
    getItem.mockImplementation((key: string) => (key === 'access_token' ? construirJwt(enUnaHora) : null));

    expect(servicio().isAuthenticated()).toBe(true);
  });

  it('no hay sesión con un token ya caducado', () => {
    const haceUnaHora = Math.floor(Date.now() / 1000) - 3600;
    getItem.mockImplementation((key: string) => (key === 'access_token' ? construirJwt(haceUnaHora) : null));

    expect(servicio().isAuthenticated()).toBe(false);
  });

  it('no hay sesión si el token guardado no es un JWT válido — no lanza, responde false', () => {
    getItem.mockImplementation((key: string) => (key === 'access_token' ? 'esto-no-es-un-jwt' : null));

    expect(servicio().isAuthenticated()).toBe(false);
  });
});

// Permisos por rol (2026-11-02): el backend los exige; esto decide qué botones
// de gestión se muestran. Un usuario puede gestionar lo que subió él.
describe('AuthService · rol', () => {
  function conUsuario(user: object | null): AuthService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: {} },
        { provide: StorageService, useValue: { getItem: (k: string) => (k === 'user' ? user : null) } },
      ],
    });
    return TestBed.inject(AuthService);
  }

  it('admin y superadmin son administradores; user no', () => {
    expect(conUsuario({ id: 1, role: 'admin' }).isAdmin()).toBe(true);
    expect(conUsuario({ id: 1, role: 'superadmin' }).isAdmin()).toBe(true);
    expect(conUsuario({ id: 1, role: 'user' }).isAdmin()).toBe(false);
    expect(conUsuario(null).isAdmin()).toBe(false);
  });

  it('un usuario gestiona solo los documentos que subió', () => {
    const auth = conUsuario({ id: 14, role: 'user' });
    expect(auth.canManageDocument({ uploaded_by: 14 })).toBe(true);
    expect(auth.canManageDocument({ uploaded_by: 8 })).toBe(false);
  });

  it('un admin gestiona cualquier documento', () => {
    expect(conUsuario({ id: 8, role: 'admin' }).canManageDocument({ uploaded_by: 14 })).toBe(true);
  });
});
