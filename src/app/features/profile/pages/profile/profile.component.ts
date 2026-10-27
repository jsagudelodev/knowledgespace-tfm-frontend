/**
 * Mi perfil: editar el propio nombre y cambiar la propia contraseña.
 *
 * El backend (`PUT /v1/auth/me`, `PUT /v1/auth/change-password`) ya existía
 * completo desde antes — nadie lo había conectado a una pantalla. Por eso
 * esta página es deliberadamente simple: dos formularios independientes, sin
 * modal ni wizard, porque no hay nada más que editar de uno mismo (el email,
 * el rol y la empresa los asigna un admin, no el propio usuario).
 */
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { User } from '../../../../core/models/user.model';

/** Las contraseñas nueva y de confirmación deben coincidir — se valida en el
 * grupo, no en el campo, porque depende del valor de los dos a la vez. */
function passwordsCoinciden(group: AbstractControl): ValidationErrors | null {
  const nueva = group.get('new_password')?.value;
  const confirmacion = group.get('confirm_password')?.value;
  return nueva && confirmacion && nueva !== confirmacion ? { noCoincide: true } : null;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  user: 'Usuario',
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = signal<User | null>(null);
  readonly loadingUser = signal(true);

  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);

  readonly profileForm: FormGroup = this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
  });

  readonly passwordForm: FormGroup = this.fb.group(
    {
      current_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required],
    },
    { validators: passwordsCoinciden },
  );

  ngOnInit(): void {
    this.authService
      .getCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.user.set(user);
          this.authService.setCurrentUser(user); // refresca el header si algo cambió en otra pestaña
          this.profileForm.patchValue({ full_name: user.full_name });
          this.loadingUser.set(false);
        },
        error: () => {
          // Se mantiene lo que ya había en memoria (header/login) en vez de
          // dejar la pantalla en blanco por un fallo de red puntual.
          this.user.set(this.authService.getCurrentUserValue());
          this.loadingUser.set(false);
        },
      });
  }

  roleLabel(role: string | undefined): string {
    return ROLE_LABELS[role ?? ''] ?? 'Usuario';
  }

  initials(name: string | undefined): string {
    return (name ?? '').split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() || 'U';
  }

  isProfileFieldInvalid(field: string): boolean {
    const ctrl = this.profileForm.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  isPasswordFieldInvalid(field: string): boolean {
    const ctrl = this.passwordForm.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  /** Error de "no coinciden" vive en el grupo, no en el campo — solo se
   * muestra cuando el usuario ya tocó la confirmación, para no marcarla en
   * rojo mientras todavía está escribiendo la primera. */
  passwordsNoCoinciden(): boolean {
    const confirm = this.passwordForm.get('confirm_password');
    return this.passwordForm.hasError('noCoincide') && !!confirm && (confirm.dirty || confirm.touched);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    this.authService
      .updateProfile({ full_name: this.profileForm.value.full_name })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.user.set(user);
          this.savingProfile.set(false);
          this.notifications.success('Perfil actualizado.');
        },
        error: () => {
          this.savingProfile.set(false);
          this.notifications.error('No se pudo actualizar el perfil.');
        },
      });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    const { current_password, new_password } = this.passwordForm.value;
    this.authService
      .changePassword({ current_password, new_password })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingPassword.set(false);
          this.passwordForm.reset();
          this.notifications.success('Contraseña actualizada.');
        },
        error: (e) => {
          this.savingPassword.set(false);
          // El backend ya da un mensaje concreto ("la contraseña actual es
          // incorrecta", "debe ser diferente a la actual") — se muestra tal
          // cual en vez de uno genérico que oculte cuál fue el problema.
          const detalle = e?.error?.detail;
          this.notifications.error(typeof detalle === 'string' ? detalle : 'No se pudo cambiar la contraseña.');
        },
      });
  }
}
