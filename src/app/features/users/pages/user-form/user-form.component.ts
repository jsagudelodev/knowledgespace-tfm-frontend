import {
  Component, OnInit, Input, Output, EventEmitter,
  DestroyRef, inject, ChangeDetectorRef
} from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { User, UserCreate, UserUpdate } from '../../../../core/models/user.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit {
  @Input() userId: number | null = null;
  @Output() userSaved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  isEditMode = false;
  loading    = false;
  error: string | null = null;

  private readonly destroyRef  = inject(DestroyRef);
  private readonly cdr         = inject(ChangeDetectorRef);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly fb          = inject(FormBuilder);

  readonly userForm: FormGroup = this.fb.group({
    email:      ['', [Validators.required, Validators.email]],
    full_name:  ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    password:   ['', [Validators.required, Validators.minLength(8)]],
    role:       ['user', Validators.required],
    status:     ['active']
  });

  get fullNameValue(): string {
    return (this.userForm.get('full_name')?.value as string) || '';
  }

  ngOnInit(): void {
    if (this.userId) {
      this.isEditMode = true;
      // La contraseña no es requerida en edición
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
      this.loadUser();
    }
  }

  loadUser(): void {
    if (!this.userId) return;
    this.loading = true;
    this.userService.getUser(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user: User) => {
          this.userForm.patchValue({
            email:     user.email,
            full_name: user.full_name,
            role:      user.role,
            status:    user.is_active ? 'active' : 'inactive'
          });
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error   = 'Error al cargar el usuario';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error   = null;
    const v = this.userForm.value as {
      email: string; full_name: string; password: string;
      role: 'superadmin' | 'admin' | 'user'; status: string;
    };

    if (this.isEditMode && this.userId) {
      const data: UserUpdate = {
        full_name: v.full_name,
        role:      v.role,
        is_active: v.status === 'active'
      };
      this.userService.updateUser(this.userId, data)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next:  () => { this.loading = false; this.userSaved.emit(); },
          error: () => {
            this.error   = 'Error al actualizar el usuario';
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
    } else {
      const data: UserCreate = {
        email:      v.email,
        full_name:  v.full_name,
        password:   v.password,
        company_id: this.authService.getCurrentUserValue()!.company_id,
        role:       v.role
      };
      this.userService.createUser(data)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next:  () => { this.loading = false; this.userSaved.emit(); },
          error: () => {
            this.error   = 'Error al crear el usuario';
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
    }
  }

  onCancel(): void { this.cancelled.emit(); }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (!field) return '';
    if (field.hasError('required'))  return 'Este campo es requerido';
    if (field.hasError('email'))     return 'Email inválido';
    if (field.hasError('minlength')) return `Mínimo ${(field.errors?.['minlength'] as { requiredLength: number }).requiredLength} caracteres`;
    if (field.hasError('maxlength')) return `Máximo ${(field.errors?.['maxlength'] as { requiredLength: number }).requiredLength} caracteres`;
    return '';
  }
}
