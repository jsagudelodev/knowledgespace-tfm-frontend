import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { superadminGuard } from './superadmin.guard';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

describe('superadminGuard', () => {
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
      superadminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as boolean;
  }

  it('permite el acceso a un superadmin', () => {
    getCurrentUserValue.mockReturnValue({ role: 'superadmin' } as Partial<User>);
    expect(ejecutar()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('deniega a un admin de empresa: Empresas es de plataforma', () => {
    getCurrentUserValue.mockReturnValue({ role: 'admin' } as Partial<User>);
    expect(ejecutar()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('deniega a un usuario normal y sin sesión', () => {
    getCurrentUserValue.mockReturnValue({ role: 'user' } as Partial<User>);
    expect(ejecutar()).toBe(false);
    getCurrentUserValue.mockReturnValue(null);
    expect(ejecutar()).toBe(false);
  });
});
