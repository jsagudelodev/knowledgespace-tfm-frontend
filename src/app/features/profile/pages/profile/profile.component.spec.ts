import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { User } from '../../../../core/models/user.model';

function usuario(overrides: Partial<User> = {}): User {
  return {
    id: 1, company_id: 8, email: 'ana@empresa.com', full_name: 'Ana Pérez',
    role: 'user', is_active: true, created_at: '2026-01-01T00:00:00Z', ...overrides,
  };
}

describe('ProfileComponent', () => {
  let authMock: {
    getCurrentUser: ReturnType<typeof vi.fn>;
    getCurrentUserValue: ReturnType<typeof vi.fn>;
    setCurrentUser: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
  };
  let notifMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authMock = {
      getCurrentUser: vi.fn().mockReturnValue(of(usuario())),
      getCurrentUserValue: vi.fn().mockReturnValue(usuario()),
      setCurrentUser: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
    };
    notifMock = { success: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: NotificationService, useValue: notifMock },
      ],
    });
  });

  function montar(): ProfileComponent {
    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges(); // dispara ngOnInit
    return fixture.componentInstance;
  }

  it('carga el perfil y precarga el nombre en el formulario', () => {
    const c = montar();
    expect(c.user()?.email).toBe('ana@empresa.com');
    expect(c.profileForm.value.full_name).toBe('Ana Pérez');
  });

  it('si falla la carga, usa lo que ya había en memoria en vez de dejar la pantalla vacía', () => {
    authMock.getCurrentUser.mockReturnValue(throwError(() => new Error('red caída')));
    const c = montar();
    expect(c.user()?.email).toBe('ana@empresa.com'); // viene de getCurrentUserValue()
  });

  // ── Validador de contraseñas coincidentes ──────────────────────────────

  it('marca error cuando la confirmación no coincide con la nueva contraseña', () => {
    const c = montar();
    c.passwordForm.patchValue({
      current_password: 'actual123', new_password: 'nueva12345', confirm_password: 'otra-cosa',
    });
    expect(c.passwordForm.hasError('noCoincide')).toBe(true);
  });

  it('no hay error cuando coinciden', () => {
    const c = montar();
    c.passwordForm.patchValue({
      current_password: 'actual123', new_password: 'nueva12345', confirm_password: 'nueva12345',
    });
    expect(c.passwordForm.hasError('noCoincide')).toBe(false);
  });

  // ── Guardar perfil ──────────────────────────────────────────────────────

  it('guardar perfil llama a updateProfile con el nombre nuevo y avisa éxito', () => {
    authMock.updateProfile.mockReturnValue(of(usuario({ full_name: 'Ana Gómez' })));
    const c = montar();
    c.profileForm.patchValue({ full_name: 'Ana Gómez' });

    c.saveProfile();

    expect(authMock.updateProfile).toHaveBeenCalledWith({ full_name: 'Ana Gómez' });
    expect(notifMock.success).toHaveBeenCalled();
    expect(c.user()?.full_name).toBe('Ana Gómez');
  });

  it('no llama al servicio si el nombre queda vacío', () => {
    const c = montar();
    c.profileForm.patchValue({ full_name: '' });

    c.saveProfile();

    expect(authMock.updateProfile).not.toHaveBeenCalled();
  });

  // ── Cambiar contraseña ──────────────────────────────────────────────────

  it('cambiar contraseña llama al servicio y limpia el formulario al terminar', () => {
    authMock.changePassword.mockReturnValue(of({ message: 'ok' }));
    const c = montar();
    c.passwordForm.patchValue({
      current_password: 'actual123', new_password: 'nueva12345', confirm_password: 'nueva12345',
    });

    c.savePassword();

    expect(authMock.changePassword).toHaveBeenCalledWith({
      current_password: 'actual123', new_password: 'nueva12345',
    });
    expect(notifMock.success).toHaveBeenCalled();
    expect(c.passwordForm.value.current_password).toBeFalsy();
  });

  it('si no coinciden las contraseñas, no se envía nada al backend', () => {
    const c = montar();
    c.passwordForm.patchValue({
      current_password: 'actual123', new_password: 'nueva12345', confirm_password: 'distinta',
    });

    c.savePassword();

    expect(authMock.changePassword).not.toHaveBeenCalled();
  });

  it('muestra el motivo exacto que da el backend si la contraseña actual es incorrecta', () => {
    authMock.changePassword.mockReturnValue(
      throwError(() => ({ error: { detail: 'La contraseña actual es incorrecta' } })),
    );
    const c = montar();
    c.passwordForm.patchValue({
      current_password: 'mala', new_password: 'nueva12345', confirm_password: 'nueva12345',
    });

    c.savePassword();

    expect(notifMock.error).toHaveBeenCalledWith('La contraseña actual es incorrecta');
  });
});
