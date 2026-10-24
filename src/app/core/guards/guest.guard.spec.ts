import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';

describe('guestGuard', () => {
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
      guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as boolean;
  }

  it('permite el acceso a /auth/login cuando no hay sesión', () => {
    isAuthenticated.mockReturnValue(false);

    expect(ejecutar()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('deniega el acceso y redirige al dashboard si ya hay sesión', () => {
    isAuthenticated.mockReturnValue(true);

    expect(ejecutar()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
