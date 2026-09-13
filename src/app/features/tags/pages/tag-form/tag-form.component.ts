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
import { TagService } from '../../services/tag.service';
import { Tag, TagCreate, TagUpdate } from '../../../../core/models/tag.model';

const DEFAULT_TAG_COLOR = '#6366f1';

@Component({
  selector: 'app-tag-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './tag-form.component.html',
  styleUrls: ['./tag-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagFormComponent implements OnInit {
  @Input() tagId: number | null = null;
  @Output() tagSaved = new EventEmitter<void>();
  @Output() cancel   = new EventEmitter<void>();

  // ── Servicios ─────────────────────────────────────────────────────────────
  private readonly destroyRef = inject(DestroyRef);
  private readonly tagService = inject(TagService);
  private readonly fb         = inject(FormBuilder);

  // ── Estado ────────────────────────────────────────────────────────────────
  isEditMode = false;
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  readonly tagForm: FormGroup = this.fb.group({
    name:  ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    color: [DEFAULT_TAG_COLOR]
  });

  get colorValue(): string {
    return (this.tagForm.get('color')?.value as string) || DEFAULT_TAG_COLOR;
  }

  get nameValue(): string {
    return (this.tagForm.get('name')?.value as string) || '';
  }

  ngOnInit(): void {
    if (this.tagId) {
      this.isEditMode = true;
      this.loadTag();
    }
  }

  loadTag(): void {
    if (!this.tagId) return;
    this.loading.set(true);
    this.tagService.getTag(this.tagId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tag: Tag) => {
          this.tagForm.patchValue({
            name:  tag.name,
            color: tag.color ?? DEFAULT_TAG_COLOR
          });
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Error al cargar la etiqueta.');
          this.loading.set(false);
        }
      });
  }

  onSubmit(): void {
    if (this.tagForm.invalid) {
      this.tagForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const v = this.tagForm.value as { name: string; color: string };

    if (this.isEditMode && this.tagId) {
      const payload: TagUpdate = { name: v.name, color: v.color };
      this.tagService.updateTag(this.tagId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next:  () => { this.loading.set(false); this.tagSaved.emit(); },
          error: () => {
            this.error.set('Error al actualizar la etiqueta. Intenta de nuevo.');
            this.loading.set(false);
          }
        });
    } else {
      const payload: TagCreate = { name: v.name, color: v.color };
      this.tagService.createTag(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next:  () => { this.loading.set(false); this.tagSaved.emit(); },
          error: () => {
            this.error.set('Error al crear la etiqueta. Intenta de nuevo.');
            this.loading.set(false);
          }
        });
    }
  }

  onCancel(): void { this.cancel.emit(); }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.tagForm.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  getErrorMessage(field: string): string {
    const ctrl = this.tagForm.get(field);
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
    return '';
  }
}
