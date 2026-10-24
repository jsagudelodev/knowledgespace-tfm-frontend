import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let isAuthenticated: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    isAuthenticated = vi.fn();
    navigate = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated } },
        { provide: Router, useValue: { navigate } }
      ]
    });
  });

  function ejecutar(): boolean {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as boolean;
  }

  it('permite el acceso cuando hay una sesión válida', () => {
    isAuthenticated.mockReturnValue(true);

    expect(ejecutar()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('deniega el acceso y redirige a /auth/login cuando no hay sesión', () => {
    isAuthenticated.mockReturnValue(false);

    expect(ejecutar()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
