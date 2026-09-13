import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CompanyService } from '../../services/company.service';
import { Company, CompanyCreate, CompanyUpdate } from '../../../../core/models/company.model';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './company-form.component.html',
  styleUrls: ['./company-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompanyFormComponent implements OnInit {
  /** ID de la empresa a editar. Nulo = modo creación. */
  @Input() companyId: number | null = null;
  /** Oculta el header propio y el card-styling cuando el form vive dentro de un modal. */
  @Input() isEmbedded = false;

  @Output() companySaved = new EventEmitter<void>();
  @Output() cancel       = new EventEmitter<void>();

  // ── Servicios ─────────────────────────────────────────────────────────────
  private readonly destroyRef     = inject(DestroyRef);
  private readonly companyService = inject(CompanyService);
  private readonly fb             = inject(FormBuilder);

  // ── Estado ────────────────────────────────────────────────────────────────
  isEditMode = false;
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  readonly companyForm: FormGroup = this.fb.group({
    name:                  ['', [Validators.required, Validators.minLength(2)]],
    email:                 ['', [Validators.required, Validators.email]],
    phone:                 [''],
    address:               [''],
    plan:                  ['basic', Validators.required],
    max_users:             [5,   [Validators.required, Validators.min(1)]],
    max_documents:         [100, [Validators.required, Validators.min(1)]],
    monthly_message_limit: [null, [Validators.min(1)]],
    is_active:             [true]
  });

  ngOnInit(): void {
    if (this.companyId) {
      this.isEditMode = true;
      this.loadCompany();
    }
  }

  loadCompany(): void {
    if (!this.companyId) return;
    this.loading.set(true);
    this.companyService.getCompany(this.companyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (company: Company) => {
          this.companyForm.patchValue({
            name:                  company.name,
            email:                 company.email,
            phone:                 company.phone ?? '',
            address:               company.address ?? '',
            plan:                  company.plan,
            max_users:             company.max_users,
            max_documents:         company.max_documents,
            monthly_message_limit: company.monthly_message_limit ?? null,
            is_active:             company.is_active
          });
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Error al cargar la empresa.');
          this.loading.set(false);
        }
      });
  }

  onSubmit(): void {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const v = this.companyForm.value as {
      name: string; email: string; phone: string; address: string;
      plan: 'basic' | 'pro' | 'enterprise'; max_users: number;
      max_documents: number; monthly_message_limit: number | null; is_active: boolean;
    };

    if (this.isEditMode && this.companyId) {
      const payload: CompanyUpdate = {
        name:                  v.name,
        email:                 v.email,
        phone:                 v.phone || undefined,
        address:               v.address || undefined,
        plan:                  v.plan,
        max_users:             v.max_users,
        max_documents:         v.max_documents,
        monthly_message_limit: v.monthly_message_limit || null,
        is_active:             v.is_active
      };
      this.companyService.updateCompany(this.companyId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next:  () => { this.loading.set(false); this.companySaved.emit(); },
          error: () => {
            this.error.set('Error al actualizar la empresa. Intenta de nuevo.');
            this.loading.set(false);
          }
        });
    } else {
      const payload: CompanyCreate = {
        name:                  v.name,
        email:                 v.email,
        phone:                 v.phone || undefined,
        address:               v.address || undefined,
        plan:                  v.plan,
        max_users:             v.max_users,
        max_documents:         v.max_documents,
        monthly_message_limit: v.monthly_message_limit || null
      };
      this.companyService.createCompany(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next:  () => { this.loading.set(false); this.companySaved.emit(); },
          error: () => {
            this.error.set('Error al crear la empresa. Intenta de nuevo.');
            this.loading.set(false);
          }
        });
    }
  }

  onCancel(): void { this.cancel.emit(); }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.companyForm.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  getErrorMessage(field: string): string {
    const ctrl = this.companyForm.get(field);
    if (!ctrl) return '';
    if (ctrl.hasError('required'))  return 'Este campo es requerido';
    if (ctrl.hasError('email'))     return 'Email inválido';
    if (ctrl.hasError('minlength')) {
      const req = (ctrl.errors?.['minlength'] as { requiredLength: number }).requiredLength;
      return `Mínimo ${req} caracteres`;
    }
    if (ctrl.hasError('min')) {
      const min = (ctrl.errors?.['min'] as { min: number }).min;
      return `Valor mínimo: ${min}`;
    }
    return '';
  }
}
