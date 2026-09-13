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
import { CategoryService } from '../../services/category.service';
import { Category, CategoryCreate, CategoryUpdate } from '../../../../core/models/category.model';

const DEFAULT_COLOR = '#6366f1';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './category-form.component.html',
  styleUrls: ['./category-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryFormComponent implements OnInit {
  @Input() categoryId: number | null = null;
  @Output() categorySaved = new EventEmitter<void>();
  @Output() cancel        = new EventEmitter<void>();

  // ── Servicios ─────────────────────────────────────────────────────────────
  private readonly destroyRef      = inject(DestroyRef);
  private readonly categoryService = inject(CategoryService);
  private readonly fb              = inject(FormBuilder);

  // ── Estado ────────────────────────────────────────────────────────────────
  isEditMode = false;
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  readonly categoryForm: FormGroup = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    description: [''],
    color:       [DEFAULT_COLOR],
    icon:        ['folder'],
    sort_order:  [0, [Validators.min(0)]],
    is_active:   [true]
  });

  // ── Getters ───────────────────────────────────────────────────────────────
  get colorValue(): string  { return (this.categoryForm.get('color')?.value as string) || DEFAULT_COLOR; }
  get nameValue(): string   { return (this.categoryForm.get('name')?.value as string)  || ''; }
  get iconValue(): string   { return (this.categoryForm.get('icon')?.value as string)  || 'folder'; }

  ngOnInit(): void {
    if (this.categoryId) {
      this.isEditMode = true;
      this.loadCategory();
    }
  }

  loadCategory(): void {
    if (!this.categoryId) return;
    this.loading.set(true);
    this.categoryService.getCategory(this.categoryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cat: Category) => {
          this.categoryForm.patchValue({
            name:        cat.name,
            description: cat.description ?? '',
            color:       cat.color       ?? DEFAULT_COLOR,
            icon:        cat.icon        ?? 'folder',
            sort_order:  cat.sort_order,
            is_active:   cat.is_active
          });
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Error al cargar la categoría.');
          this.loading.set(false);
        }
      });
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) { this.categoryForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set(null);

    const v = this.categoryForm.value as {
      name: string; description: string; color: string;
      icon: string; sort_order: number; is_active: boolean;
    };

    if (this.isEditMode && this.categoryId) {
      const payload: CategoryUpdate = {
        name:        v.name,
        description: v.description || null,
        color:       v.color,
        icon:        v.icon        || null,
        sort_order:  v.sort_order,
        is_active:   v.is_active
      };
      this.categoryService.updateCategory(this.categoryId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next:  () => { this.loading.set(false); this.categorySaved.emit(); },
          error: () => { this.error.set('Error al actualizar la categoría.'); this.loading.set(false); }
        });
    } else {
      const payload: CategoryCreate = {
        name:        v.name,
        description: v.description || null,
        color:       v.color,
        icon:        v.icon        || null,
        sort_order:  v.sort_order
      };
      this.categoryService.createCategory(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next:  () => { this.loading.set(false); this.categorySaved.emit(); },
          error: () => { this.error.set('Error al crear la categoría.'); this.loading.set(false); }
        });
    }
  }

  onCancel(): void { this.cancel.emit(); }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.categoryForm.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  getErrorMessage(field: string): string {
    const ctrl = this.categoryForm.get(field);
    if (!ctrl) return '';
    if (ctrl.hasError('required'))  return 'Este campo es requerido';
    if (ctrl.hasError('minlength')) {
      const req = (ctrl.errors?.['minlength'] as { requiredLength: number }).requiredLength;
      return `Mínimo ${req} caracteres`;
    }
    if (ctrl.hasError('maxlength')) {
      const req = (ctrl.errors?.['maxlength'] as { requiredLength: number }).requiredLength;
      return `Máximo ${req} caracteres`;
    }
    if (ctrl.hasError('min')) return 'El valor mínimo es 0';
    return '';
  }
}
