import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

describe('adminGuard', () => {
  let getCurrentUserValue: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getCurrentUserValue = vi.fn();
    navigate = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { getCurrentUserValue } },
        { provide: Router, useValue: { navigate } }
      ]
    });
  });

  function ejecutar(): boolean {
    return TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as boolean;
  }

  function usuarioConRol(role: User['role']): Partial<User> {
    return { role };
  }

  it('permite el acceso a un admin', () => {
    getCurrentUserValue.mockReturnValue(usuarioConRol('admin'));

    expect(ejecutar()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('permite el acceso a un superadmin', () => {
    getCurrentUserValue.mockReturnValue(usuarioConRol('superadmin'));

    expect(ejecutar()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('deniega el acceso a un usuario normal y lo manda al dashboard', () => {
    getCurrentUserValue.mockReturnValue(usuarioConRol('user'));

    expect(ejecutar()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('deniega el acceso cuando no hay usuario en sesión', () => {
    getCurrentUserValue.mockReturnValue(null);

    expect(ejecutar()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
